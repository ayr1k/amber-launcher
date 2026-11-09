// SPDX-License-Identifier: MPL-2.0
// Informational native timing; fixed synthetic seed, no files or personal worlds.
import {SeedMap} from '../desktop/seed134.mjs';
import {bufferedRequest} from '../src/seed-view134.mjs';
import assert from 'node:assert/strict';
const p={seed:'230686175948231322',version:35,dimension:0,x:0,z:0,y:64,scale:16};
const rows=[];
for(let i=0;i<3;i++){
 const engine=new SeedMap(),pair=[];
 for(const structures of [true,false]){
  const start=performance.now(),result=await engine.map(bufferedRequest(p,false,structures));
  rows.push({iteration:i,structures,ms:Math.round((performance.now()-start)*10)/10,features:result.features.length});pair.push(result);
 }
 assert.deepEqual(pair[0].biomes,pair[1].biomes);assert.equal(pair[1].features.length,0);engine.cancel();
}
console.log(JSON.stringify({seed:p.seed,scale:p.scale,rows,notes:'Three local process-inclusive samples, not a universal FPS or performance guarantee. Biomes identical with structure search disabled.'},null,2));
