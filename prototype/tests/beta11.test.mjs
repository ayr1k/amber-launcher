import {PRODUCT_NAME,REPOSITORY_URL,REPOSITORY_NAME} from '../desktop/edition.mjs';
// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,realpath,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {beginMicrosoftLogin,copyMicrosoftCode} from '../desktop/login-actions.mjs';
import {compareVersions,releaseCandidate,AppUpdates,backupUpgradeConfig} from '../desktop/app-updates.mjs';
import {ModUpdates,recoverModUpdate,validateUpdateGraph,contentStamp} from '../desktop/mod-updates.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {atomicJson} from '../desktop/core.mjs';
import {sameProcessStart,sessionAlive} from '../desktop/process-session.mjs';
const sha=b=>createHash('sha1').update(b).digest('hex');
test('stale game sessions do not mistake reused Windows process IDs for a running game',async()=>{
 assert.equal(sameProcessStart('2025-01-01T00:00:00Z','2025-01-01T00:00:01Z'),true);
 assert.equal(sameProcessStart('2025-01-01T00:00:00Z','2026-01-01T00:00:00Z'),false);
 assert.equal(await sessionAlive({pid:-1}),false);
 assert.equal(await sessionAlive({pid:process.pid,game:true}),true);
 if(process.platform==='win32')assert.equal(await sessionAlive({pid:process.pid,game:true,startedAt:'2020-01-01T00:00:00Z'}),false);
});
async function temporary(t){const base=await realpath(tmpdir()),root=await mkdtemp(join(base,'amber-beta11-'));t.after(async()=>{assert.ok(resolve(root).startsWith(base+sep));await rm(root,{recursive:true,force:true});});return root;}
async function settled(core,j){while(core.jobs.find(x=>x.id===j.id).state==='running')await new Promise(r=>setTimeout(r,5));return core.jobs.find(x=>x.id===j.id);}
test('login copies only user code once, then opens browser, retaining recoverable fallbacks',async()=>{
 const device={state:'pending',code:'ABCD-1234',url:'https://microsoft.com/link',expiresAt:Date.now()+60000},accounts={list:()=>({device}),startMicrosoft:async()=>({device,accounts:[]})},calls=[];
 const result=await beginMicrosoftLogin(accounts,{writeText:async v=>calls.push(v)},async u=>calls.push(u));assert.deepEqual(calls,[device.code,device.url]);assert.match(result.feedback,/已复制/);
 const failed=await beginMicrosoftLogin(accounts,{writeText:async()=>{throw Error();}},async()=>{throw Error();});assert.equal(failed.device.state,'pending');assert.match(failed.feedback,/手动/);assert.match(failed.feedback,/浏览器/);
 device.expiresAt=0;await assert.rejects(copyMicrosoftCode(accounts,{writeText:()=>assert.fail()}),/失效/);
});
const release=(v='1.0.0-beta.3')=>({tag_name:'v'+v,draft:false,body:'notes',assets:[{name:`${PRODUCT_NAME}-${v}-Setup-x64.exe`,state:'uploaded',size:100,digest:'sha256:'+'a'.repeat(64),browser_download_url:`${REPOSITORY_URL}/releases/download/v${v}/${PRODUCT_NAME}-${v}-Setup-x64.exe`}]});
test('app updates handle beta ordering and reject wrong repository, missing digest and old releases',()=>{
 assert.equal(compareVersions('1.0.0-beta.10','1.0.0-beta.2'),1);assert.equal(compareVersions('1.0.0','1.0.0-rc.2'),1);
 assert.equal(releaseCandidate([release()],'1.0.0-beta.2').version,'1.0.0-beta.3');assert.equal(releaseCandidate([release('1.0.0-beta.1')],'1.0.0-beta.2'),null);
 const bad=release();bad.assets[0].browser_download_url=bad.assets[0].browser_download_url.replace('/ayr1k/','/attacker/');assert.equal(releaseCandidate([bad],'1.0.0-beta.2'),null);bad.assets[0].digest=null;assert.equal(releaseCandidate([bad],'1.0.0-beta.2'),null);
});
test('downloaded app updates require matching hash and can be retried after cancellation',async t=>{
 const root=await temporary(t),bytes=Buffer.from('installer'),r=release();r.assets[0].size=bytes.length;r.assets[0].digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 const updates=new AppUpdates(root,'1.0.0-beta.2',{fetcher:async url=>{if(String(url).includes('api.github.com'))assert.equal(url,`https://api.github.com/repos/${REPOSITORY_NAME}/releases?per_page=30`);return new Response(String(url).includes('api.github.com')?JSON.stringify([r]):bytes);}});
 await updates.check();await updates.download();const path=await updates.installer();assert.deepEqual(await readFile(path),bytes);await writeFile(path,'corrupt');await assert.rejects(updates.installer(),/校验/);
 updates.fetcher=async()=>{updates.cancel();return new Response(bytes);};await assert.rejects(updates.download());assert.equal(updates.state.phase,'cancelled');updates.fetcher=async()=>new Response(bytes);await updates.download();assert.equal(updates.state.phase,'ready');
});
test('pre-upgrade config backups preserve encrypted bytes and data location without changing source',async t=>{
 const root=await temporary(t),library=join(root,'library');await mkdir(library);await writeFile(join(root,'storage.json'),JSON.stringify({path:library}));await writeFile(join(library,'accounts.json'),'encrypted-fixture');
 const backup=await backupUpgradeConfig(root,library,'1.0.0-beta.2');assert.equal(await readFile(join(backup,'library/accounts.json'),'utf8'),'encrypted-fixture');assert.equal(await readFile(join(library,'accounts.json'),'utf8'),'encrypted-fixture');
});
async function fixture(t){
 const root=await temporary(t),core=new VanillaLauncher(root,{fetcher:async url=>new Response(Buffer.from(String(url).split('/').at(-1)))});await core.init();const id=randomUUID(),dir=join(root,'instances',id);await mkdir(dir);for(const f of ['mods','resourcepacks','shaderpacks'])await mkdir(join(dir,f));
 await atomicJson(join(dir,'instance.json'),{schema:1,id,name:'test',createdAt:new Date().toISOString(),game:'1.21.4',loader:'fabric'});await atomicJson(join(dir,'version.json'),{id:'1.21.4'});
 const file=(project,version,{dependencies=[],enabled=true}={})=>({projectId:project,versionId:version,title:project,version,type:'mod',relative:`mods/${version}.jar`,hash:sha(Buffer.from(version)),size:version.length,url:'https://cdn.modrinth.com/'+version,dependencies,enabled});
 const old=file('a','a1');await writeFile(join(dir,old.relative),'a1');await atomicJson(join(dir,'content.json'),{schema:1,files:[old]});
 const content=new Modrinth(core),updates=new ModUpdates(core,content),versions={a1:{...file('a','a1'),date_published:'2025-01-01'},a2:{...file('a','a2'),date_published:'2025-02-01'}};
 content.api=async path=>{if(path.startsWith('project/'))return {id:path.slice(8),title:path.slice(8),project_type:'mod'};const f=versions[path.slice(8)];if(!f)throw Error('unknown version');return {id:f.versionId,project_id:f.projectId,version_number:f.version,date_published:f.date_published,version_type:'release',game_versions:['1.21.4'],loaders:['fabric'],files:[{primary:true,filename:f.relative.slice(5),hashes:{sha1:f.hash},size:f.size,url:f.url}],dependencies:f.dependencies};};
 content.versions=async(_id,project)=>Promise.all(Object.values(versions).filter(v=>v.projectId===project).sort((a,b)=>b.date_published.localeCompare(a.date_published)).map(v=>content.api('version/'+v.versionId)));
 return {root,core,id,dir,file,old,content,updates,versions};
}
test('mod update scan, locks, replacement and one-step restore preserve enabled state and files',async t=>{
 const f=await fixture(t),{updates,id,core,dir,content}=f;
 assert.equal((await updates.scan(id)).rows[0].versionId,'a2');await settled(core,await updates.lock(id,'a',true));await assert.rejects(updates.preview(id,[{projectId:'a',versionId:'a2'}]),/锁定/);await settled(core,await updates.lock(id,'a',false));
 const p=await updates.preview(id,[{projectId:'a',versionId:'a2'}]);assert.deepEqual(p.blockers,[]);const j=await settled(core,await updates.install(id,p.id));assert.equal(j.state,'done',j.error);assert.equal(await readFile(join(dir,'mods/a2.jar'),'utf8'),'a2');await assert.rejects(readFile(join(dir,'mods/a1.jar')),/ENOENT/);
 const h=await updates.history(id);assert.equal(h[0].restorable,true);const rollback=await settled(core,await updates.restore(id,h[0].id));assert.equal(rollback.state,'done',rollback.error);assert.equal((await content.manifest(dir)).files[0].versionId,'a1');assert.equal(await readFile(join(dir,'mods/a1.jar'),'utf8'),'a1');
});
test('disabled mods stay disabled and changed files are never overwritten by updates',async t=>{
 const {core,id,dir,content,updates}=await fixture(t);await content.toggle(id,'mods/a1.jar');const p=await updates.preview(id,[{projectId:'a',versionId:'a2'}]);assert.equal(p.files[0].enabled,false);
 let job=await settled(core,await updates.install(id,p.id));assert.equal(job.state,'done',job.error);assert.equal(await readFile(join(dir,'mods/a2.jar.disabled'),'utf8'),'a2');
 const h=await updates.history(id);await writeFile(join(dir,'mods/a2.jar.disabled'),'edited');job=await settled(core,await updates.restore(id,h[0].id));assert.equal(job.state,'failed');assert.equal(await readFile(join(dir,'mods/a2.jar.disabled'),'utf8'),'edited');
});
test('batch dependencies support required opt-out and retain exact-version dependent protection',async t=>{
 const {updates,id,versions,file,dir,content}=await fixture(t);versions.a2.dependencies=[{dependency_type:'required',project_id:'b',version_id:'b2'}];versions.b2={...file('b','b2'),date_published:'2025-02-01'};
 let p=await updates.preview(id,[{projectId:'a',versionId:'a2'}]);assert.equal(p.required[0].selected,true);assert.equal(p.files.length,2);
 p=await updates.preview(id,[{projectId:'a',versionId:'a2'}],[],['a2:0']);assert.equal(p.files.length,1);assert.deepEqual(p.files[0].ignoredRequired,['a2:0']);assert.deepEqual(p.blockers,[]);
 const m=await content.manifest(dir);m.files.push(file('c','c1',{dependencies:[{dependency_type:'required',version_id:'a1'}]}));await writeFile(join(dir,'mods/c1.jar'),'c1');await atomicJson(join(dir,'content.json'),m);p=await updates.preview(id,[{projectId:'a',versionId:'a2'}]);assert.ok(p.blockers.some(s=>s.includes('指定依赖版本')));
});
test('stale plans and cancellation leave original mod set intact',async t=>{
 const {updates,id,core,dir}=await fixture(t);let p=await updates.preview(id,[{projectId:'a',versionId:'a2'}]);await settled(core,await updates.lock(id,'a',true));let j=await settled(core,await updates.install(id,p.id));assert.equal(j.state,'failed');assert.equal(await readFile(join(dir,'mods/a1.jar'),'utf8'),'a1');
 await settled(core,await updates.lock(id,'a',false));p=await updates.preview(id,[{projectId:'a',versionId:'a2'}]);const active=await updates.install(id,p.id);core.cancel(active.id);j=await settled(core,active);assert.equal(j.state,'cancelled');assert.equal(await readFile(join(dir,'mods/a1.jar'),'utf8'),'a1');
});
test('interrupted replacement recovers old files; external modifications block recovery',async t=>{
 const {dir,file,old,content}=await fixture(t),next=file('a','a2'),before=await content.manifest(dir),tx={schema:1,id:randomUUID(),before,after:{files:[next]},old:[old],next:[next]};
 const backup=join(dir,'content-updates',tx.id,'files/mods');await mkdir(backup,{recursive:true});await copyFile(join(dir,'mods/a1.jar'),join(backup,'a1.jar'));await unlinkFixture(join(dir,'mods/a1.jar'));await writeFile(join(dir,'mods/a2.jar'),'a2');await atomicJson(join(dir,'content-update.json'),tx);await recoverModUpdate(dir);assert.equal(await readFile(join(dir,'mods/a1.jar'),'utf8'),'a1');await assert.rejects(readFile(join(dir,'mods/a2.jar')),/ENOENT/);
 await atomicJson(join(dir,'content-update.json'),tx);await writeFile(join(dir,'mods/a2.jar'),'external');await assert.rejects(recoverModUpdate(dir),/外部修改/);assert.equal(await readFile(join(dir,'mods/a2.jar'),'utf8'),'external');
});
async function unlinkFixture(path){await rm(path);}
test('mod conflict graph rejects conflicts and preserves author-required dependency exceptions',()=>{
 const a={projectId:'a',versionId:'a1',title:'a',relative:'mods/a.jar',dependencies:[{dependency_type:'required',project_id:'b'}]};assert.throws(()=>validateUpdateGraph([a]),/依赖/);validateUpdateGraph([{...a,ignoredRequired:['a1:0']}]);assert.throws(()=>validateUpdateGraph([{...a,dependencies:[{dependency_type:'incompatible',project_id:'b'}]},{projectId:'b',relative:'mods/b.jar'}]),/不兼容/);
});
