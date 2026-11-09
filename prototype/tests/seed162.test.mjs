// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {structureCoverage,markerMatches,legacyMarkerMatches,validMarks,addFeatureMarker,nearbyFeatures,biomeChinese} from '../src/seed-details162.mjs';
import {LatestMapQueue,bufferedRequest} from '../src/seed-view134.mjs';
import {coordinateText} from '../desktop/seed134.mjs';
const camera={seed:'1',version:35,dimension:0,x:0,z:0,y:64,scale:16};
test('clipboard coordinate contract accepts bounded integers only',()=>{
 assert.equal(coordinateText({x:-204,z:-1692} ),'-204 -1692');
 for(const value of [null,{}, {x:NaN,z:0},{x:1.5,z:0},{x:'1',z:0},{x:30000000,z:0},{x:0,z:Infinity}])assert.throws(()=>coordinateText(value),/Invalid coordinates/);
});
test('completeness is specific to current context, coverage and enabled types',()=>{
 const request=bufferedRequest(camera,false),result={structureStatus:[{type:'village',status:'complete'},{type:'treasure',status:'region_limit'},{type:'mansion',status:'feature_limit'}]};
 const layers=[{request,result}];
 assert.deepEqual(structureCoverage(layers,camera,false,['village']),{covered:true,issues:[]});
 assert.deepEqual(structureCoverage(layers,camera,false,['treasure','mansion']).issues.map(s=>s.status),['region_limit','feature_limit']);
 for(const changed of [{seed:'2'},{version:24},{dimension:1},{y:32},{x:20000}])assert.equal(structureCoverage(layers,{...camera,...changed},false,['village']).covered,false);
 assert.equal(structureCoverage(layers,camera,true,['village']).covered,false);
 assert.equal(structureCoverage([{request,result:{}}],camera,false,['village']).issues[0].status,'unknown');
 const complete={request,result:{structureStatus:[{type:'treasure',status:'complete'}]}};
 assert.equal(structureCoverage([...layers,complete],camera,false,['treasure']).issues.length,0);
 assert.equal(structureCoverage([complete,...layers],camera,false,['treasure']).issues[0].status,'region_limit');
});
test('markers preserve legacy entries without silently assigning versions, duplicate actions are idempotent',()=>{
 const old={name:'Old',seed:'1',dimension:0,x:10,z:20};assert.equal(validMarks([old]),true);assert.equal(legacyMarkerMatches(old,camera),true);assert.equal(markerMatches(old,camera),false);
 const f={type:'village',x:10,z:20};const marks=addFeatureMarker([old],f,camera,'Village');
 assert.equal(marks.length,2);assert.equal(markerMatches(marks[1],camera),true);assert.equal(addFeatureMarker(marks,f,camera,'Village'),marks);
 assert.equal(markerMatches(marks[1],{...camera,version:24}),false);assert.equal(markerMatches(marks[1],{...camera,dimension:-1}),false);assert.equal(markerMatches(marks[1],{...camera,seed:'2'}),false);
 assert.equal(validMarks([{...old,version:36}]),false);assert.equal(validMarks([{...old,x:1.5}]),false);
 assert.throws(()=>addFeatureMarker(Array.from({length:500},()=>old),f,camera,'Village'),/500/);
});
test('overlapping structure picking retains all nearby candidates in stable distance order',()=>{
 const rows=[{type:'village',x:10,z:0},{type:'stronghold',x:0,z:0},{type:'mansion',x:0,z:0},{type:'igloo',x:100,z:100}];
 assert.deepEqual(nearbyFeatures(rows,{x:0,z:0},4).map(f=>f.type),['mansion','stronghold','village']);
 assert.ok(Object.keys(biomeChinese).length>90);
});
test('queued old scene results never replace a newly requested seed/version/dimension',async()=>{
 for(const change of [{seed:'2'},{version:24},{dimension:-1},{terrain:true}]){
  const received=[],resolvers=[];const q=new LatestMapQueue(()=>new Promise(r=>resolvers.push(r)),d=>received.push(d),e=>{throw e},()=>{});
  q.enqueue(camera);q.enqueue({...camera,...change});resolvers.shift()('old');await new Promise(r=>setImmediate(r));assert.equal(received.length,0);
  resolvers.shift()('current');await new Promise(r=>setImmediate(r));assert.equal(received.length,1);assert.equal(received[0].result,'current');q.dispose();
 }
});
