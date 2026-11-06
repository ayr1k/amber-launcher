// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rename,rm,lstat,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Screenshots} from '../desktop/home-services.mjs';
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'amber145-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const dir=join(root,'instance'),shots=join(dir,'screenshots');await mkdir(shots,{recursive:true});
 const png=Buffer.alloc(24);Buffer.from('89504e470d0a1a0a','hex').copy(png);png.writeUInt32BE(20,16);png.writeUInt32BE(10,20);
 const path=join(shots,'sample.png');await writeFile(path,png);
 const service=new Screenshots({root,instancePath:async id=>{assert.equal(id,'fixture');return dir;}}),[item]=await service.list('fixture');return {root,dir,path,png,service,item};
}
test('screenshot trash moves only a registered image and invalidates its token',async t=>{
 const {root,path,png,service,item}=await fixture(t),trash=join(root,'synthetic-trash.png');
 await service.trash(item.token,p=>rename(p,trash));assert.deepEqual(await readFile(trash),png);await assert.rejects(lstat(path),{code:'ENOENT'});await assert.rejects(service.read(item.token));assert.deepEqual(await service.list('fixture'),[]);
});
test('failed system trash does not fall back to permanent removal and can retry',async t=>{
 const {root,path,png,service,item}=await fixture(t);await assert.rejects(service.trash(item.token,async()=>{throw Error('trash unavailable');}),/trash unavailable/);assert.deepEqual(await readFile(path),png);assert.deepEqual((await service.read(item.token)).bytes,png);await service.trash(item.token,p=>rename(p,join(root,'recovered.png')));
});
test('changed screenshots and arbitrary paths cannot be deleted with stale tokens',async t=>{
 const {path,png,service,item}=await fixture(t);let called=false;const trash=async()=>{called=true;};
 await assert.rejects(service.trash('../../accounts.json',trash));await writeFile(path,Buffer.concat([png,Buffer.from('changed')]));await assert.rejects(service.trash(item.token,trash),/changed/);assert.equal(called,false);assert.equal((await readFile(path)).length,png.length+7);
});
test('duplicate deletion is rejected while a move is pending',async t=>{
 const {root,service,item}=await fixture(t);let entered;const started=new Promise(r=>entered=r);let finish;const gate=new Promise(r=>finish=r);const first=service.trash(item.token,async p=>{entered();await gate;await rename(p,join(root,'trash.png'));});await started;await assert.rejects(service.trash(item.token,async()=>{}),/in progress/);finish();await first;
});
test('a screenshot directory replaced by a linked path is rejected',async t=>{
 const {root,dir,service,item}=await fixture(t),shots=join(dir,'screenshots'),away=join(root,'away');await rename(shots,away);await symlink(away,shots,'junction');let called=false;await assert.rejects(service.trash(item.token,async()=>{called=true;}));assert.equal(called,false);assert.ok(await readFile(join(away,'sample.png')));
});
