// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SeedMap} from '../desktop/seed134.mjs';
const binary=fileURLToPath(new URL(process.platform==='win32'?'../desktop/bin/seed-engine.exe':`../desktop/bin/seed-engine-${process.platform}-${process.arch}`,import.meta.url));
const defaults={seed:0,version:35,dimension:0,x:-32768,z:-32768,scale:4096,width:16,height:16,y:64,terrain:0,structures:1};
function run(overrides={}){const p={...defaults,...overrides};return JSON.parse(execFileSync(binary,['seed','version','dimension','x','z','scale','width','height','y','terrain','structures'].map(k=>String(p[k])),{timeout:25000,maxBuffer:4*1024*1024}));}
const status=(d,type)=>d.structureStatus.find(s=>s.type===type);
test('native region budget reports exactly 1600 processed versus over-budget skipped, never empty-as-complete',()=>{
 const at=run({version:10,x:0,z:0,scale:256,width:78,height:78});
 assert.equal(status(at,'village').regions,1600);assert.equal(status(at,'village').scanned,1600);assert.equal(status(at,'village').status,'complete');
 const over=run({version:10,x:0,z:0,scale:256,width:80,height:80});
 assert.equal(status(over,'village').regions,1681);assert.equal(status(over,'village').scanned,0);assert.equal(status(over,'village').status,'region_limit');
 assert.equal(over.features.some(f=>f.type==='village'),false);
});
test('native global feature cap preserves partial counts and marks later supported layers incomplete',()=>{
 const d=run({dimension:-1,x:0,z:0,scale:64,width:256,height:256});
 assert.equal(d.features.length,1200);const partial=status(d,'bastion'),later=status(d,'nether_portal');
 assert.equal(partial.status,'feature_limit');assert.ok(partial.scanned>0&&partial.scanned<partial.regions);assert.ok(partial.count>0);
 assert.equal(later.status,'feature_limit');assert.equal(later.scanned,0);
 for(const s of d.structureStatus)assert.equal(s.count,d.features.filter(f=>f.type===s.type).length);
});
test('stronghold final positions match pinned Cubiomes reference, include all 3/128 and not first approximation',()=>{
 // Direct Cubiomes initFirstStronghold + nextStronghold(&iterator,&generator)
 // reference seed 0; these are staircase chunk anchors, not generated-world acceptance.
 const hashes={10:'ba3084c00dffc52912f5116aa6de2341d103b2b251a9b054761b7784e5a3670f',24:'59c17ddb8921e83dfafce5623740aa56399f727179dc73280404a0080ef52f18',35:'e0e045885e87ed230feb61af3b59da9a82535299837d8eb8dfcbc640a6faa2db'};
 const vectors={10:[[-140,-652],[1076,516],[-588,628]],24:[[-204,-1692],[2004,916],[-1388,1140]],35:[[-204,-1692],[2004,916],[-1388,1140]]};
 for(const [version,first] of Object.entries(vectors)){
  const d=run({version:Number(version)}),rows=d.features.filter(f=>f.type==='stronghold');
  assert.deepEqual(d.strongholds,rows);
  assert.equal(rows.length,Number(version)<12?3:128);assert.equal(status(d,'stronghold').scanned,rows.length);assert.equal(status(d,'stronghold').status,'complete');
  assert.deepEqual(rows.slice(0,3).map(f=>[f.x,f.z]),first);
  assert.equal(createHash('sha256').update(JSON.stringify(rows.map(f=>[f.x,f.z]))).digest('hex'),hashes[version]);
  assert.equal(new Set(rows.map(f=>`${f.x}:${f.z}`)).size,rows.length);
  for(const f of rows){assert.equal(((f.x%16)+16)%16,4);assert.equal(((f.z%16)+16)%16,4);}
 }
});
test('native disabled, unsupported and complete-empty layers are distinct and scoped to each request',()=>{
 const off=run({structures:0});assert.deepEqual(off.strongholds,[]);assert.equal(off.features.length,0);assert.ok(off.structureStatus.every(s=>s.status==='disabled'));
 const end=run({dimension:1});assert.deepEqual(end.strongholds,[]);assert.equal(status(end,'stronghold').status,'unsupported');assert.equal(status(end,'village').status,'unsupported');
 const empty=run({x:1000000,z:1000000,scale:1,width:1,height:1});assert.equal(status(empty,'stronghold').status,'complete');assert.equal(status(empty,'stronghold').count,0);
});
test('native stronghold calculation can be cancelled and a later map can succeed',async()=>{
 const map=new SeedMap();const pending=map.map({...defaults,seed:'0'});map.cancel();await assert.rejects(pending,/cancelled|failed/);
 const result=await map.map({...defaults,seed:'1',structures:false});assert.equal(result.features.length,0);assert.ok(result.structureStatus.every(s=>s.status==='disabled'));map.cancel();
});

test('stronghold navigation includes final positions beyond the viewport without changing in-view counts',()=>{
 for(const version of [10,35]){
  const d=run({version,x:1000000,z:1000000,scale:1,width:1,height:1});
  assert.equal(d.features.some(f=>f.type==='stronghold'),false);assert.equal(status(d,'stronghold').count,0);
  assert.equal(d.strongholds.length,version===10?3:128);
  assert.deepEqual(d.strongholds,run({version}).strongholds);
 }
});
