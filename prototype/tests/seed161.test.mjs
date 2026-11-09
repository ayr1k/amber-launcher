// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {zoomCamera,reliefShade,keyboardPanCamera} from '../src/seed-math161.mjs';
import {mapPosition} from '../src/seed-view134.mjs';
import {resolveWorldVersion} from '../desktop/world-version161.mjs';
import {readWorldNBT} from '../desktop/seed134.mjs';
import {visibleStructures,supportedStructures} from '../src/seed-results161.mjs';
import {bufferedRequest} from '../src/seed-view134.mjs';
test('structure capability filters separate dimensions and unsupported versions',()=>{
 assert.deepEqual(supportedStructures({version:35,dimension:-1}),['fortress','bastion','nether_portal']);
 assert.deepEqual(supportedStructures({version:35,dimension:1}),['end_city']);
 assert.equal(supportedStructures({version:10,dimension:0}).includes('igloo'),false);
 assert.equal(supportedStructures({version:25,dimension:0}).includes('trial_chambers'),false);
 assert.equal(supportedStructures({version:34,dimension:0}).includes('abandoned_camp'),false);
 assert.equal(supportedStructures({version:35,dimension:0}).includes('abandoned_camp'),true);
 assert.deepEqual(supportedStructures({version:36,dimension:0}),[]);
});
test('structure results exclude stale scenes, hidden types and offscreen points; deduplicate and cap by distance',()=>{
 const camera={seed:'1',version:35,dimension:0,y:64,x:0,z:0,scale:1},request=bufferedRequest(camera,false);
 const features=Array.from({length:110},(_,i)=>({type:'village',x:i-55,z:0}));
 const layers=[{request,result:{features:[...features,{type:'igloo',x:0,z:0},{type:'village',x:1000,z:0}]}},{request,result:{features}},{request:{...request,seed:'2'},result:{features:[{type:'village',x:1,z:1}]}}];
 const result=visibleStructures(layers,camera,false,['village']);
 assert.equal(result.covered,true);assert.equal(result.total,110);assert.equal(result.rows.length,100);assert.equal(result.rows[0].distance,0);
 assert.ok(result.rows.every(f=>f.z===0&&f.type==='village'));
 assert.equal(visibleStructures(layers,{...camera,dimension:1},false,['village']).total,0);
 assert.equal(visibleStructures(layers,{...camera,x:10000},false,['village']).covered,false);
 assert.equal(visibleStructures(layers,camera,false,[]).total,0);
});
test('hiding all structures disables native searching and does not report full structure coverage',()=>{
 const camera={seed:'1',version:35,dimension:0,y:64,x:0,z:0,scale:16};
 const request=bufferedRequest(camera,false,false);assert.equal(request.structures,false);
 assert.equal(visibleStructures([{request,result:{features:[]}}],camera,false,['village']).covered,false);
 assert.equal(bufferedRequest(camera,false).structures,true);
});
test('wheel zoom anchors the world point under the pointer and respects world bounds',()=>{
 const camera={x:128,z:-256,scale:16},bounds={width:1200,height:720};
 for(const point of [[0,0],[600,360],[300,450],[1200,720]]){
  const next=zoomCamera(camera,4,...point,bounds);
  assert.deepEqual(mapPosition(next,...point,bounds),mapPosition(camera,...point,bounds));
  const restored=zoomCamera(next,16,...point,bounds);
  assert.deepEqual(restored,camera);
 }
 assert.equal(zoomCamera({...camera,x:29899999},1,1200,360,bounds).x,29899999);
});
test('relief does not wrap across rows and physical slopes are scale independent',()=>{
 assert.equal(reliefShade([100,100,100,100],2,2,4),1);
 assert.equal(reliefShade([0,4,8,0,4,8,0,4,8],3,4,4),reliefShade([0,16,32,0,16,32,0,16,32],3,4,16));
 assert.equal(reliefShade([0,0,0,100,100,100,200,200,200],3,3,4),reliefShade([0,0,0,100,100,100,200,200,200],3,4,4));
 assert.equal(reliefShade([],0,0,4),1);
});
test('world version resolution distinguishes exact, approximate and unsupported versions',()=>{
 const versions=[{id:25,name:'1.20.6'},{id:26,name:'1.21.1'},{id:30,name:'1.21.6'},{id:35,name:'26.3'}];
 assert.deepEqual(resolveWorldVersion('1.21.1',versions),{id:26,exact:true});
 assert.deepEqual(resolveWorldVersion('1.20.1',versions),{id:25,exact:false});
 assert.deepEqual(resolveWorldVersion('1.21.8',versions),{id:30,exact:false});
 for(const name of ['1.22','26.4','1.21.99','26.3 snapshot','','custom'])assert.equal(resolveWorldVersion(name,versions),null);
});
function world(coords){
 const str=s=>{const b=Buffer.from(s),n=Buffer.alloc(2);n.writeUInt16BE(b.length);return Buffer.concat([n,b]);};
 const seed=Buffer.alloc(8);seed.writeBigInt64BE(-9223372036854775808n);
 const fields=Object.entries(coords).map(([key,value])=>{const b=Buffer.alloc(4);b.writeInt32BE(value);return Buffer.concat([Buffer.from([3]),str(key),b]);});
 return Buffer.concat([Buffer.from([10,0,0,4]),str('RandomSeed'),seed,...fields,Buffer.from([0])]);
}
test('NBT distinguishes missing spawn from actual origin and preserves zero height',()=>{
 const origin=readWorldNBT(world({SpawnX:0,SpawnY:0,SpawnZ:0}));
 assert.equal(origin.spawnKnown,true);assert.equal(origin.y,0);assert.equal(origin.seed,'-9223372036854775808');
 const missing=readWorldNBT(world({}));assert.equal(missing.spawnKnown,false);assert.equal(missing.x,null);assert.equal(missing.y,null);
 assert.equal(readWorldNBT(world({SpawnX:30000000,SpawnY:64,SpawnZ:0})).spawnKnown,false);
});

test('keyboard pan clamps every edge at every scale and remains recoverable after repeat',()=>{
 for(const scale of [1,4,16,64,256,1024,4096])for(const [key,reverse,axis,sign] of [['ArrowLeft','ArrowRight','x',-1],['ArrowRight','ArrowLeft','x',1],['ArrowUp','ArrowDown','z',-1],['ArrowDown','ArrowUp','z',1]]){
  let camera={seed:'1',version:35,dimension:0,y:64,x:0,z:0,scale,[axis]:sign*29899998};
  for(let i=0;i<100;i++){
   camera=keyboardPanCamera(camera,key);assert.equal(camera[axis],sign*29899999);
   assert.ok(Math.abs(camera.x)<29900000&&Math.abs(camera.z)<29900000);
   const request=bufferedRequest(camera,false);assert.ok(Math.abs(request.x)<=29900000&&Math.abs(request.z)<=29900000);
  }
  const restored=keyboardPanCamera(camera,reverse);assert.equal(restored[axis],sign*(29899999-scale*40));
 }
 const center={x:0,z:0,scale:16};assert.deepEqual(keyboardPanCamera(center,'ArrowRight'),{...center,x:640});assert.equal(keyboardPanCamera(center,'Enter'),center);
});
