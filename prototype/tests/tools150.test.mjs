// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {validateEnchantSelection} from '../src/enchant150.mjs';
import data from '../src/vendor/enchant-order/data.mjs';
import {validatePort150} from '../desktop/ports150.mjs';
test('enchantment validation rejects impossible combinations and out-of-range levels',()=>{
 assert.throws(()=>validateEnchantSelection('sword',{sharpness:5,smite:5}));
 assert.throws(()=>validateEnchantSelection('sword',{protection:4}));
 assert.throws(()=>validateEnchantSelection('sword',{sharpness:6}));
 assert.throws(()=>validateEnchantSelection('sword',{}));
 assert.deepEqual(validateEnchantSelection('sword',{sharpness:5,unbreaking:3}),[['sharpness',5],['unbreaking',3]]);
});
test('bundled upstream worker computes single and combined books offline',async()=>{
 const source=await readFile(new URL('../src/vendor/enchant-order/work.js',import.meta.url),'utf8');
 for(const enchants of [[['sharpness',5]],[['sharpness',5],['unbreaking',3]]]){
  const output=[],context={self:{},postMessage:r=>output.push(r)};vm.createContext(context);vm.runInContext(source,context);context.self.onmessage({data:{msg:'set_data',data}});context.input={data:{msg:'process',item:'sword',enchants,mode:'levels'}};vm.runInContext('self.onmessage(input)',context,{timeout:3000});
  assert.equal(output.at(-1).msg,'complete');assert.equal(output.at(-1).instructions.length,enchants.length);assert.ok(output.at(-1).instructions.every(step=>step[2]<=39));
 }
});
test('port records retain actual transport and reject invalid values',()=>{
 assert.equal(validatePort150({name:'Voice',protocol:'udp',port:24454}).protocol,'udp');
 for(const port of [0,1023,65536,1.5,'25565'])assert.throws(()=>validatePort150({name:'Game',protocol:'tcp',port}));
 assert.throws(()=>validatePort150({name:'',protocol:'udp',port:24454}));
 assert.throws(()=>validatePort150({name:'Web',protocol:'http',port:8123}));
});
