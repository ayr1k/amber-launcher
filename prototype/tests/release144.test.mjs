// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rename,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {ServerUpdates144} from '../desktop/server-updates144.mjs';
import {recoverServerUpdate144} from '../desktop/server-transactions144.mjs';
import {Bandwidth144} from '../desktop/bandwidth144.mjs';
import {TransferQueue} from '../desktop/task-queue132.mjs';
import {parseMetrics144,summarize144,Performance144} from '../desktop/performance144.mjs';
import {validateNetwork} from '../desktop/network.mjs';
const hash=b=>createHash('sha512').update(b).digest('hex');
async function fixture(type='paper',curseForge=false){
 const root=await mkdtemp(join(tmpdir(),'amber144-')),core=new VanillaLauncher(root),servers=await new Servers(core).init(),item=await servers.create({name:'Fixture',type,game:'1.21.1'}),dir=await servers.dir(item.id),folder=type==='quilt'?'mods':'plugins',versions={},payloads=new Map();
 const projectId=key=>curseForge?'cf-'+({a:101,d:102})[key]:key;
 const versionId=key=>curseForge?projectId(key[0])+'-'+({a1:1011,a2:1012,a3:1013,d1:1021,d2:1022})[key]:key;
 const version=(key,project,date,dependencies=[])=>{
  const id=versionId(key),bytes=Buffer.from('PK-fixture-'+id),fileId=id.split('-').at(-1);
  const hashes=curseForge?{sha1:createHash('sha1').update(bytes).digest('hex')}:{sha512:hash(bytes)};
  const url=curseForge?'https://edge.forgecdn.net/files/'+fileId[0]+'/'+fileId.slice(1)+'/'+id+'.jar':'https://cdn.modrinth.com/'+id;
  payloads.set(id,bytes);
  versions[id]={id,project_id:projectId(project),version_number:id,date_published:date,version_type:'release',loaders:[type],dependencies,files:[{filename:id+'.jar',url,hashes,size:bytes.length}],changelog:'Changes '+id};
 };
 version('a1','a','2025-01-01');version('d1','d','2025-01-01');version('d2','d','2025-02-01');version('a2','a','2025-02-01',[{project_id:projectId('d'),version_id:versionId('d2'),dependency_type:'required'}]);
 await mkdir(join(dir,folder));
 const files=[];
 for(const key of ['a1','d1']){
  const v=versions[versionId(key)],file=v.files[0],algorithm=curseForge?'sha1':'sha512';
  await writeFile(join(dir,folder,file.filename),payloads.get(v.id));
  files.push({title:v.project_id,projectId:v.project_id,versionId:v.id,version:v.id,filename:file.filename,hash:file.hashes[algorithm],algorithm,size:file.size,dependencies:[]});
 }
 await writeFile(join(dir,'content-manifest.json'),JSON.stringify({files}));await mkdir(join(dir,'world'));await writeFile(join(dir,'world','level.dat'),'preserve-world');
 servers.contentVersions=async(id,p)=>Object.values(versions).filter(v=>v.project_id===p).reverse();servers.json=async url=>{const path=new URL(url).pathname,key=path.split('/').at(-1);return path.includes('/version/')?structuredClone(versions[key]):{title:key,server_side:'required'};};
 core.fetcher=async url=>new Response(payloads.get(new URL(url).pathname.slice(1)));
 let backups=0;servers.beforeProtectedAction=async()=>{backups++;};return {root,core,servers,item,dir,folder,versions,payloads,projectId,versionId,updates:new ServerUpdates144(servers),backups:()=>backups};
}
async function settle(f,j){for(let i=0;i<1000;i++){const job=f.core.jobs.find(x=>x.id===j.id);if(job.state!=='running')return job;await delay(10);}throw Error('Job timed out');}
test('server update installs dependencies transactionally, preserves worlds, and restores SHA512 files',async()=>{const f=await fixture(),id=f.item.id,scan=await f.updates.scan(id);assert.equal(scan.rows.find(r=>r.projectId==='a').versionId,'a2');const p=await f.updates.preview(id,[{projectId:'a',versionId:'a2'}]);assert.deepEqual(p.blockers,[]);assert.equal(p.rows.length,2);assert.equal((await settle(f,await f.updates.install(id,p.token))).state,'done');assert.equal(f.backups(),1);assert.deepEqual(await readFile(join(f.dir,f.folder,'a2.jar')),f.payloads.get('a2'));const history=await f.updates.history(id);assert.equal(history[0].restorable,true);assert.equal((await settle(f,await f.updates.restore(id,history[0].id))).state,'done');assert.deepEqual(await readFile(join(f.dir,f.folder,'a1.jar')),f.payloads.get('a1'));assert.equal(await readFile(join(f.dir,'world','level.dat'),'utf8'),'preserve-world');});
test('locked dependencies block a batch; stale previews and running servers cannot change files',async()=>{const f=await fixture(),id=f.item.id;await f.updates.lock(id,'d',true);assert.ok((await f.updates.preview(id,[{projectId:'a',versionId:'a2'}])).blockers.some(s=>s.includes('Locked')));await f.updates.lock(id,'d',false);const p=await f.updates.preview(id,[{projectId:'a',versionId:'a2'}]);await f.updates.lock(id,'a',true);await assert.rejects(f.updates.install(id,p.token),/changed/);f.servers.runs.set(id,{state:'running'});await assert.rejects(f.updates.lock(id,'a',false),/Stop/);assert.deepEqual(await readFile(join(f.dir,f.folder,'a1.jar')),f.payloads.get('a1'));});
test('explicit dependency disagreement is blocked, manual collision and download failure preserve old files',async()=>{const f=await fixture(),id=f.item.id;let p=await f.updates.preview(id,[{projectId:'a',versionId:'a2'},{projectId:'d',versionId:'d1'}]);assert.ok(p.blockers.length);p=await f.updates.preview(id,[{projectId:'a',versionId:'a2'}]);f.core.fetcher=async()=>new Response('denied',{status:403});assert.equal((await settle(f,await f.updates.install(id,p.token))).state,'failed');assert.deepEqual(await readFile(join(f.dir,f.folder,'a1.jar')),f.payloads.get('a1'));f.core.fetcher=async url=>new Response(f.payloads.get(new URL(url).pathname.slice(1)));await writeFile(join(f.dir,f.folder,'a2.jar'),'manual');assert.equal((await settle(f,await f.updates.install(id,p.token))).state,'failed');assert.equal(await readFile(join(f.dir,f.folder,'a2.jar'),'utf8'),'manual');});
test('CurseForge updates authorize exact files and retain disabled state; Quilt-native outranks Fabric',async t=>{
 const previous=process.env.AMBER_CURSEFORGE_API_KEY;
 t.after(()=>previous===undefined?delete process.env.AMBER_CURSEFORGE_API_KEY:process.env.AMBER_CURSEFORGE_API_KEY=previous);
 process.env.AMBER_CURSEFORGE_API_KEY='test-only-server-update';
 const f=await fixture('quilt',true),id=f.item.id,project=f.projectId('a'),oldVersion=f.versionId('a1'),target=f.versionId('a2'),fabric=f.versionId('a3');
 f.versions[fabric]={...f.versions[target],id:fabric,date_published:'2025-03-01',loaders:['fabric']};
 const authorized=[];
 f.core.fetcher=async (address,options)=>{
  assert.equal(new Headers(options.headers).get('x-api-key'),'test-only-server-update');
  const url=new URL(address),parts=url.pathname.split('/');
  if(url.hostname==='edge.forgecdn.net')return new Response(f.payloads.get(parts.at(-1).replace(/\.jar$/,'')));
  assert.equal(url.hostname,'api.curseforge.com');
  const modId=Number(parts[3]);
  if(parts.length===4)return Response.json({data:{id:modId,allowModDistribution:true}});
  const fileId=Number(parts[5]),exact='cf-'+modId+'-'+fileId,file=f.versions[exact].files[0];
  authorized.push(exact);
  return Response.json({data:{modId,id:fileId,downloadUrl:file.url,fileLength:file.size,hashes:[{algo:1,value:file.hashes.sha1}]}});
 };
 await rename(join(f.dir,'mods',oldVersion+'.jar'),join(f.dir,'mods',oldVersion+'.jar.disabled'));
 assert.equal((await f.updates.scan(id)).rows.find(r=>r.projectId===project).versionId,target);
 const p=await f.updates.preview(id,[{projectId:project,versionId:target}]);
 assert.equal(p.rows.find(r=>r.projectId===project).enabled,false);
 const job=await settle(f,await f.updates.install(id,p.token));
 assert.equal(job.state,'done',job.error);
 assert.deepEqual(authorized.sort(),[target,f.versionId('d2')].sort());
 assert.deepEqual(await readFile(join(f.dir,'mods',target+'.jar.disabled')),f.payloads.get(target));
});
test('process-interrupted transaction restores original files from verified journal backups',async()=>{const f=await fixture(),id=f.item.id,p=await f.updates.preview(id,[{projectId:'a',versionId:'a2'}]),plan=f.updates.plans.get(p.token),token='11111111-1111-1111-1111-111111111111',old=plan.before.files,next=plan.files;for(const file of old){const path=join(f.dir,'server-content-updates',token,'files',file.relative);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,f.payloads.get(file.versionId));}await writeFile(join(f.dir,'server-content-update.json'),JSON.stringify({schema:1,id:token,old,next,before:plan.before,after:plan.after}));await rename(join(f.dir,'plugins','a1.jar'),join(f.dir,'a1.removed'));await writeFile(join(f.dir,'plugins','a2.jar'),f.payloads.get('a2'));await recoverServerUpdate144(f.dir);assert.deepEqual(await readFile(join(f.dir,'plugins','a1.jar')),f.payloads.get('a1'));await assert.rejects(lstat(join(f.dir,'plugins','a2.jar')),{code:'ENOENT'});});
test('shared bandwidth bucket enforces aggregate rate and cancellation frees queued streams',async()=>{const limiter=new Bandwidth144();limiter.configure(64);const start=Date.now();await Promise.all([limiter.take(16384),limiter.take(16384)]);assert.ok(Date.now()-start>=430);const c=new AbortController(),rejected=assert.rejects(limiter.take(1000000,c.signal),/cancel/);c.abort(Error('cancel'));await rejected;limiter.configure(0);await limiter.take(1000000);assert.equal(limiter.queue.length,0);assert.throws(()=>validateNetwork({bandwidthKib:-1}));});
test('priority changes future admission without interrupting running streams',async()=>{const q=new TransferQueue(1),order=[];let release;const barrier=new Promise(r=>release=r),a={job:{}},b={job:{downloadPriority:true}};const first=q.run(a,()=>barrier),second=q.run(a,()=>order.push('normal')),third=q.run(b,()=>order.push('priority'));release();await Promise.all([first,second,third]);assert.deepEqual(order,['priority','normal']);});
test('performance parsing rejects non-numeric metrics, reports missing data and bounds history',async()=>{assert.deepEqual(parseMetrics144('AMBER_METRICS144 {"tps":19.5,"mspt":35}'),{tps:19.5,mspt:35});assert.deepEqual(parseMetrics144('AMBER_METRICS144 {"tps":"20","mspt":-1}'),{tps:null,mspt:null});assert.deepEqual(summarize144([{cpu:100,tps:null,mspt:null}]).findings,['tick-metrics-unavailable']);const id='test',servers={runs:new Map([[id,{state:'running',startedAt:'session',sampledAt:Date.now(),cpu:12,memoryBytes:1024}]]),read:async()=>({item:{type:'paper',game:'1.21.1'}}),dir:async()=>{throw Error('No bridge');}},p=new Performance144(servers);p.console(id,'Done (1s)!\nPlayer joined the game\nAMBER_METRICS144 {"tps":17,"mspt":65}\n');await p.collect(id);for(let i=0;i<220;i++)await p.sample();p.finish(id);const state=await p.state(id);assert.equal(state.samples.length,200);assert.equal(state.events.length,2);assert.ok(state.report.summary.findings.includes('slow-ticks'));servers.runs.get(id).startedAt='new';assert.equal((await p.state(id)).samples.length,0);});
