// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,readdir} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Workflows,validateManifest} from '../desktop/workflows.mjs';
import {Transfers174} from '../desktop/transfers174.mjs';
import {Libraries170} from '../desktop/libraries170.mjs';
import {Environment140,validateEnvironment140} from '../desktop/environment140.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {atomicJson} from '../desktop/core.mjs';
import {planMigration174,snapshot174} from '../desktop/migration-plan174.mjs';
const hash=b=>createHash('sha1').update(b).digest('hex');
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'amber-transfer174-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const versions=new Map(),projects=new Map(),payloads=new Map(),running=new Set(),calls=[];
 function version(project,id,game='1.21.1',dependencies=[]){const bytes=Buffer.from('synthetic-'+id),v={id,project_id:project,version_number:id,game_versions:[game],loaders:['fabric'],date_published:'2026-01-01',version_type:'release',dependencies,files:[{filename:project+'.jar',url:'https://cdn.modrinth.com/data/'+id,hashes:{sha1:hash(bytes)},size:bytes.length}]};versions.set(id,v);projects.set(project,{id:project,title:project,project_type:'mod',client_side:'required'});payloads.set(id,bytes);return v;}
 version('a','aold','1.20.1');version('dep','depnew');version('a','anew','1.21.1',[{dependency_type:'required',project_id:'dep',version_id:'depnew'}]);version('b','bnew');version('legacy','legacyold','1.20.1');
 async function api(path){calls.push(path);const [type,id,sub]=path.split('/');if(type==='version_file')throw Error('Unknown synthetic JAR');if(type==='project'&&sub?.startsWith('version'))return [...versions.values()].filter(v=>v.project_id===id);const value=(type==='project'?projects:versions).get(id);if(!value)throw Error('Synthetic 404 '+path);return structuredClone(value);}
 async function graph(path){const core=new VanillaLauncher(path);await core.init();core.catalog=[{id:'1.20.1'},{id:'1.21.1'}];
  core.requireStopped=async dir=>{core.workflowGuard?.(basename(dir));if(running.has(dir))throw Error('Stop the running fixture');};
  core.createInstance=async input=>{const item={schema:1,id:randomUUID(),createdAt:new Date().toISOString(),name:input.name,game:input.game,loader:input.loader||'vanilla',loaderVersion:input.version||null,status:'installed'},dir=join(path,'instances',item.id);for(const folder of ['mods','saves','resourcepacks','shaderpacks'])await mkdir(join(dir,folder),{recursive:true});await atomicJson(join(dir,'instance.json'),item);await atomicJson(join(dir,'version.json'),{id:item.game});return item;};
  core.prepareJava=async()=>{};core.install=async()=>{};core.configureLoader=async(id,loader,ver)=>{const {dir,item}=await core.metadata(id);await atomicJson(join(dir,'instance.json'),{...item,loader,loaderVersion:ver});};
  core.fetcher=async url=>new Response(payloads.get(String(url).split('/').at(-1))||'invalid');const content=new Modrinth(core);content.api=api;const workflows=new Workflows(core,content);workflows.choices=async()=>[{version:'0.16'}];return {core,content,workflows};
 }
 const a=await graph(join(root,'A')),b=await graph(join(root,'B')),registry=new Libraries170(a.core.root);const entry=await registry.add((await registry.preview(b.core.root)).token,'Second library',true);await registry.select('default');const graphs=new Map([['default',a],[entry.id,b]]),service=new Transfers174(registry,async(id,fn)=>{await registry.entry(id);return fn(graphs.get(id));});
 const source=await a.core.createInstance({name:'Source',game:'1.20.1',loader:'fabric',version:'0.16'}),target=await a.core.createInstance({name:'Target',game:'1.21.1',loader:'fabric',version:'0.16'});
 async function seed(g,item,ids=['aold']){const {dir}=await g.core.metadata(item.id),files=[];for(const id of ids){const v=versions.get(id),file=v.files[0];await writeFile(join(dir,'mods',file.filename),payloads.get(id));files.push({type:'mod',relative:'mods/'+file.filename,title:v.project_id,projectId:v.project_id,versionId:id,version:id,hash:file.hashes.sha1,enabled:true,dependencies:v.dependencies});}await atomicJson(join(dir,'content.json'),{schema:1,files});}
 await seed(a,source);const input={source:{libraryId:'default',instanceId:source.id},target:{id:target.id},requestKey:randomUUID()};return {root,a,b,entry,registry,service,source,target,input,versions,projects,payloads,running,seed,version,calls};
}
test('direct migration and exported JSON share compatibility, dependencies and source preservation',async t=>{
 const f=await fixture(t),dir=await f.a.core.instancePath(f.source.id);await writeFile(join(dir,'mods','unknown.jar'),'unknown');await f.seed(f.a,f.source,['aold','legacyold']);
 const before=await snapshot174(f.a.core,f.a.content,f.source.id),direct=await f.service.preview('default',f.input),manifest=validateManifest(JSON.parse(JSON.stringify(await f.a.workflows.export(f.source.id)))),file=await f.service.preview('default',{manifest,target:f.input.target,requestKey:randomUUID()});
 assert.deepEqual(direct.rows,file.rows);assert.deepEqual(direct.rows.map(r=>r.status).sort(),['matched','unavailable','unknown']);assert.equal(direct.rows.find(r=>r.projectId==='a').versionId,'anew');assert.equal(direct.rows.find(r=>r.projectId==='a').required.length,1);
 const report=await f.service.run('default',direct.token);assert.equal(report.results.filter(r=>r.state==='installed').length,1);assert.equal(report.results.filter(r=>r.state==='skipped').length,2);assert.equal((await f.a.content.list(f.target.id)).length,2);assert.equal((await snapshot174(f.a.core,f.a.content,f.source.id)).stamp,before.stamp);
});
test('registered-library identity is distinct from instance ID; aliases and physical self-targets are excluded',async t=>{
 const f=await fixture(t),other=await f.b.core.createInstance({name:'Other',game:'1.20.1',loader:'fabric'});await f.seed(f.b,other);
 const p=await f.service.preview('default',{...f.input,source:{libraryId:f.entry.id,instanceId:other.id}});assert.equal(p.rows[0].status,'matched');
 const rows=await f.service.sources('default','default',f.source.id);assert.equal(rows.find(r=>r.id===f.source.id).disabled,true);
 await assert.rejects(f.service.preview('default',{...f.input,target:{id:f.source.id}}),/同一游戏目录/);
 const original=f.b.core.metadata.bind(f.b.core);f.b.core.metadata=async id=>id===other.id?original(id).then(async r=>({...r,dir:await f.a.core.instancePath(f.target.id)})):original(id);
 await assert.rejects(f.service.preview('default',{...f.input,source:{libraryId:f.entry.id,instanceId:other.id}}),/同一游戏目录/);
 await f.registry.remove(f.entry.id);await assert.rejects(f.service.preview('default',{...f.input,source:{libraryId:f.entry.id,instanceId:other.id}}),/registered/);
});
test('source edits, target edits, loader changes, library selection and token replay invalidate previews',async t=>{
 const f=await fixture(t);let p=await f.service.preview('default',f.input);await writeFile(join(await f.a.core.instancePath(f.source.id),'mods','a.jar'),'changed');await assert.rejects(f.service.run('default',p.token),/重新预览/);await f.seed(f.a,f.source);
 p=await f.service.preview('default',f.input);await writeFile(join(await f.a.core.instancePath(f.target.id),'mods','local.jar'),'new');await assert.rejects(f.service.run('default',p.token),/重新预览/);
 p=await f.service.preview('default',f.input);const m=await f.a.core.metadata(f.target.id);await atomicJson(join(m.dir,'instance.json'),{...m.item,loader:'forge'});await assert.rejects(f.service.run('default',p.token),/重新预览/);await atomicJson(join(m.dir,'instance.json'),m.item);
 p=await f.service.preview('default',f.input);await f.registry.select(f.entry.id);await assert.rejects(f.service.run('default',p.token),/重新预览/);await f.registry.select('default');f.service.forget(p.token);await assert.rejects(f.service.run('default',p.token),/重新预览/);
 p=await f.service.preview('default',f.input);await f.service.run('default',p.token);await assert.rejects(f.service.run('default',p.token),/重新预览/);
});
test('running instances and linked content paths are blocked without writes',async t=>{
 const f=await fixture(t),src=await f.a.core.instancePath(f.source.id),dst=await f.a.core.instancePath(f.target.id);f.running.add(src);await assert.rejects(f.service.preview('default',f.input),/running fixture/);f.running.clear();f.running.add(dst);await assert.rejects(f.service.preview('default',f.input),/running fixture/);f.running.clear();
 const outside=join(f.root,'outside.jar');await writeFile(outside,'keep');const link=join(src,'mods','linked.jar');await symlink(outside,link,'file').catch(async()=>{await symlink(join(f.root,'B'),join(src,'mods','linked'),'junction');});await assert.rejects(f.service.preview('default',f.input),/链接|Linked|Invalid/);assert.equal(await readFile(outside,'utf8'),'keep');
});
test('unknowns, unmanaged filenames, required dependency failures and cross-root conflicts are previewed',async t=>{
 const f=await fixture(t);await writeFile(join(await f.a.core.instancePath(f.target.id),'mods','a.jar'),'manual');let p=await f.service.preview('default',f.input);assert.equal(p.rows[0].status,'conflict');await rm(join(await f.a.core.instancePath(f.target.id),'mods','a.jar'));
 f.versions.get('anew').dependencies=[{dependency_type:'required',project_id:'missing'}];p=await f.service.preview('default',f.input);assert.equal(p.rows[0].status,'conflict');assert.equal(p.rows[0].required[0].available,false);
 f.versions.get('anew').dependencies=[{dependency_type:'incompatible',project_id:'b'}];await f.seed(f.a,f.source,['aold','bnew']);p=await f.service.preview('default',f.input);assert.deepEqual(p.rows.map(r=>r.status),['conflict','conflict']);
});
test('cancelled previews publish no plan and no files',async t=>{
 const f=await fixture(t),original=f.a.content.api;let release,started;const gate=new Promise(r=>release=r),ready=new Promise(r=>started=r);f.a.content.api=async(...args)=>{started();await gate;return original(...args);};const pending=f.service.preview('default',f.input);await ready;f.service.cancel(f.input.requestKey);release();await assert.rejects(pending,/取消/);assert.equal(f.service.plans.size,0);assert.deepEqual(await f.a.content.list(f.target.id),[]);
});
test('partial failures and cancellation preserve completed work and report every input',async t=>{
 const f=await fixture(t);await f.seed(f.a,f.source,['aold','bnew']);let p=await f.service.preview('default',f.input);const install=f.a.content.install.bind(f.a.content);f.a.content.install=async(id,token)=>{if(f.a.content.plans.get(token).rootVersionId==='bnew')throw Error('Synthetic failed download');return install(id,token);};const report=await f.service.run('default',p.token);assert.deepEqual(report.results.map(r=>r.state),['installed','failed']);assert.equal((await f.a.workflows.report(f.target.id)).results[1].reason,'Synthetic failed download');
 const target2=await f.a.core.createInstance({name:'Cancel target',game:'1.21.1',loader:'fabric'});f.a.content.install=install;p=await f.service.preview('default',{...f.input,target:{id:target2.id}});const wait=f.a.workflows.wait.bind(f.a.workflows);f.a.workflows.wait=async r=>{const result=await wait(r);f.a.workflows.cancel(target2.id);return result;};const cancelled=await f.service.run('default',p.token);assert.equal(cancelled.cancelled,true);assert.deepEqual(cancelled.results.map(r=>r.state),['installed','cancelled']);
});
test('creation uses the same reviewed plan, invalidates changed targets and retains interrupted setup',async t=>{
 const f=await fixture(t),target={game:'1.21.1',loader:'fabric',version:'0.16'},input={...target,name:'Independent',threads:2,requestKey:randomUUID()};let p=await f.service.preview('default',{...f.input,target});await assert.rejects(f.service.create('default',p.token,{...input,game:'1.20.1'}),/重新预览/);
 p=await f.service.preview('default',{...f.input,target});const item=await f.service.create('default',p.token,input);assert.notEqual(item.id,f.source.id);assert.equal((await f.a.content.list(item.id)).length,2);assert.equal((await f.a.content.list(f.source.id))[0].versionId,'aold');
 p=await f.service.preview('default',{...f.input,target});const orig=f.a.core.prepareJava;f.a.core.prepareJava=async()=>{throw Error('Synthetic interruption');};await assert.rejects(f.service.create('default',p.token,{...input,requestKey:randomUUID()}),/保留/);const id=f.a.workflows.lastSetup,record=JSON.parse(await readFile(join(await f.a.core.instancePath(id),'setup-report.json'),'utf8'));assert.equal(record.state,'failed');assert.equal(record.migration174.rows[0].versionId,'anew');f.a.core.prepareJava=orig;await f.a.workflows.retry(id);assert.equal((await f.a.content.list(id)).length,2);
});
test('changed remote dependencies are never installed under an old confirmation',async t=>{const f=await fixture(t),p=await f.service.preview('default',f.input);f.versions.get('anew').dependencies=[];const r=await f.service.run('default',p.token);assert.equal(r.results[0].state,'failed');assert.match(r.results[0].reason,/重新预览/);assert.deepEqual(await f.a.content.list(f.target.id),[]);});
async function serverFixture(t){const f=await fixture(t),servers=new Servers(f.a.core),environment=new Environment140(f.a.core,servers,f.a.content,f.a.workflows),server=await servers.create({name:'Synthetic server',game:'1.21.1',type:'fabric',port:25565}),dir=await servers.dir(server.id);await mkdir(join(dir,'mods'),{recursive:true});await writeFile(join(dir,'mods','a.jar'),f.payloads.get('anew'));await writeFile(join(dir,'mods','unknown.jar'),'unknown');await atomicJson(join(dir,'content-manifest.json'),{schema:1,files:[]});
 // Use the existing server content-record format.
 const record={filename:'a.jar',projectId:'a',versionId:'anew',title:'a',algorithm:'sha1',hash:f.versions.get('anew').files[0].hashes.sha1};await atomicJson(join(dir,'content-manifest.json'),{schema:1,files:[record]});return {...f,servers,environment,server,dir};}
test('server direct selection and JSON imports create independent matching clients and omit private data',async t=>{
 const f=await serverFixture(t),r=await f.environment.serverPreview174(f.server.id);assert.equal(r.manifest.mods.length,1);assert.deepEqual(r.unknown,['unknown.jar']);let p=await f.environment.previewImport(r.manifest,r);const json=validateEnvironment140(JSON.parse(JSON.stringify({...r.manifest,account:'private',world:'private',address:'private',roomKey:'private'}))),file=await f.environment.previewImport(json);assert.deepEqual(p.rows,file.rows);assert.equal(file.account,undefined);assert.equal(p.canCreate,true);const before=await f.environment.snapshot174(f.server.id),item=await f.environment.create(p.token,'New client',id=>f.environment.snapshot174(id));assert.notEqual(item.id,f.server.id);assert.equal(item.game,'1.21.1');assert.equal((await f.a.content.list(item.id)).length,2);assert.equal(await f.environment.snapshot174(f.server.id),before);
});
test('server running state, changed source, missing client declaration and plugins remain explicit',async t=>{
 const f=await serverFixture(t);f.servers.runs.set(f.server.id,{state:'running'});await assert.rejects(f.environment.serverPreview174(f.server.id),/Stop this server/);f.servers.runs.clear();const r=await f.environment.serverPreview174(f.server.id),p=await f.environment.previewImport(r.manifest,r);await writeFile(join(f.dir,'mods','a.jar'),'edited');await assert.rejects(f.environment.create(p.token,'Client',id=>f.environment.snapshot174(id)),/重新预览/);
 f.projects.get('a').client_side='unknown';await writeFile(join(f.dir,'mods','a.jar'),f.payloads.get('anew'));const unknown=await f.environment.requirements(f.server.id);assert.equal(unknown.manifest.mods.length,0);assert.ok(unknown.unknown.includes('a'));
 const paper=await f.servers.create({name:'Plugins only',game:'1.21.1',type:'paper',port:25566}),plugins=await f.environment.serverPreview174(paper.id);assert.equal(plugins.plugins,true);assert.equal(plugins.manifest.loader,'vanilla');assert.deepEqual(plugins.manifest.mods,[]);
});


test('cancellation arriving before creation preflight prevents any new instance',async t=>{
 const f=await fixture(t),target={game:'1.21.1',loader:'fabric',version:'0.16'},input={...target,name:'Cancelled',threads:2,requestKey:randomUUID()},p=await f.service.preview('default',{...f.input,target}),before=(await f.a.core.listInstances()).length;
 f.service.cancel('new:'+input.requestKey);await assert.rejects(f.service.create('default',p.token,input),/取消/);assert.equal((await f.a.core.listInstances()).length,before);
 const sf=await serverFixture(t),r=await sf.environment.serverPreview174(sf.server.id),ep=await sf.environment.previewImport(r.manifest,r),key=randomUUID(),count=(await sf.a.core.listInstances()).length;
 sf.environment.cancel174('new:'+key);await assert.rejects(sf.environment.create(ep.token,'Cancelled',id=>sf.environment.snapshot174(id),key),/取消/);assert.equal((await sf.a.core.listInstances()).length,count);
});

test('environment files retain bounded diagnostics and discard unrelated fields',()=>{
 const v=validateEnvironment140({format:'amber-environment',schema:1,game:'1.21.1',loader:'vanilla',mods:[],notes174:{unknown:['missing QA mod'],optional:[{title:'optional QA mod',client:'optional',account:'private'}],plugins:true,roomKey:'private'}});
 assert.deepEqual(v.notes174,{unknown:['missing QA mod'],optional:[{title:'optional QA mod',client:'optional'}],plugins:true});assert.throws(()=>validateEnvironment140({...v,notes174:{unknown:new Array(501).fill('x'),optional:[]}}));
});


test('disabled sources remain disabled and cancellation reports unapplied disabled state',async t=>{
 const f=await fixture(t),dir=await f.a.core.instancePath(f.source.id);const {rename}=await import('node:fs/promises');await rename(join(dir,'mods/a.jar'),join(dir,'mods/a.jar.disabled'));
 let p=await f.service.preview('default',f.input);assert.equal(p.rows[0].enabled,false);await f.service.run('default',p.token);assert.equal((await f.a.content.list(f.target.id)).find(r=>r.projectId==='a').enabled,false);
 const item=await f.a.core.createInstance({name:'Cancel disabled root',game:'1.21.1',loader:'fabric',version:'0.16'});p=await f.service.preview('default',{...f.input,target:{id:item.id}});const wait=f.a.workflows.wait.bind(f.a.workflows);f.a.workflows.wait=async r=>{const result=await wait(r);f.a.workflows.cancel(item.id);return result;};const report=await f.service.run('default',p.token);assert.equal(report.cancelled,true);assert.match(report.results[0].note,/停用状态尚未应用/);
});


test('shared target directories require explicit acknowledgement before migration',async t=>{
 const f=await fixture(t),original=f.a.core.metadata.bind(f.a.core);f.a.core.metadata=async id=>{const m=await original(id);return id===f.target.id?{...m,profile:{isolation:'shared'}}:m;};const p=await f.service.preview('default',f.input);assert.equal(p.sharedTarget,true);await assert.rejects(f.service.run('default',p.token),/共享目标/);const report=await f.service.run('default',p.token,true);assert.equal(report.results[0].state,'installed');
});

// main.mjs's withLibrary adapter awaits registry.entry before invoking the
// callback. Arm this lookup only after take() finishes all preview rechecks.
function pauseFinalLibraryAcquisition(f,t){
 let armed=false,entered,release;
 const ready=new Promise(resolve=>entered=resolve),gate=new Promise(resolve=>release=resolve);
 const take=f.service.take.bind(f.service),entry=f.registry.entry.bind(f.registry);
 f.service.take=async(...args)=>{const result=await take(...args);armed=true;return result;};
 f.registry.entry=async id=>{const result=await entry(id);if(armed){armed=false;entered();await gate;}return result;};
 t.after(()=>release());return {ready,release};
}
async function instanceDataTree(dir){
 const files={};async function scan(path,relative=''){
  for(const entry of (await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
   const name=relative+entry.name;if(entry.isDirectory()){files[name+'/']='directory';await scan(join(path,entry.name),name+'/');}
   else{assert.ok(entry.isFile(),'Only ordinary synthetic files belong in the fixture');files[name]=hash(await readFile(join(path,entry.name)));}
  }
 }await scan(dir);return files;
}
async function checkFinalAcquisitionCancellation(t,kind,secondLibrary){
 const f=await fixture(t),libraryId=secondLibrary?f.entry.id:'default',g=secondLibrary?f.b:f.a;
 await f.registry.select(libraryId);
 const sourceDir=await f.a.core.instancePath(f.source.id);
 await mkdir(join(sourceDir,'config'));await writeFile(join(sourceDir,'config','keep.txt'),'synthetic source configuration');await writeFile(join(sourceDir,'saves','world.dat'),'synthetic source world');
 const target=kind==='run'?(secondLibrary?await g.core.createInstance({name:'Second-library target',game:'1.21.1',loader:'fabric',version:'0.16'}):f.target):{game:'1.21.1',loader:'fabric',version:'0.16'};
 const p=await f.service.preview(libraryId,{...f.input,target:kind==='run'?{id:target.id}:target}),input={...target,name:'Must not be created',threads:2,requestKey:randomUUID()},key=kind==='run'?target.id:'new:'+input.requestKey;
 const before=await Promise.all([f.a.core.listInstances(),f.b.core.listInstances()]),sourceBefore=await instanceDataTree(sourceDir),targetDir=kind==='run'?await g.core.instancePath(target.id):null,targetBefore=targetDir?await instanceDataTree(targetDir):null;
 let workflowCalls=0,createCalls=0,installCalls=0;
 const workflow=g.workflows[kind==='run'?'migrate':'create'].bind(g.workflows),create=g.core.createInstance.bind(g.core),install=g.content.install.bind(g.content);
 g.workflows[kind==='run'?'migrate':'create']=(...args)=>{workflowCalls++;return workflow(...args);};
 g.core.createInstance=(...args)=>{createCalls++;return create(...args);};g.content.install=(...args)=>{installCalls++;return install(...args);};
 const pause=pauseFinalLibraryAcquisition(f,t);
 const result=(kind==='run'?f.service.run(libraryId,p.token):f.service.create(libraryId,p.token,input)).then(value=>({value}),error=>({error}));
 await pause.ready;assert.equal(g.workflows.active,false,'The final library lookup must precede workflow scope creation');
 // Match the real setup-cancel IPC handler order while no workflow scope exists.
 g.workflows.cancel(key);f.service.cancel(key);assert.equal(f.service.requests.get(key).signal.aborted,true);
 pause.release();const outcome=await result,after=await Promise.all([f.a.core.listInstances(),f.b.core.listInstances()]),report=outcome.value?.migrationSummary174||outcome.value;
 t.diagnostic(JSON.stringify({path:kind,library:secondLibrary?'second-managed':'default',before:before.map(rows=>rows.length),after:after.map(rows=>rows.length),installed:report?.installed??report?.results?.filter(r=>r.state==='installed').length??0,cancelled:!!outcome.error||!!report?.cancelled}));
 assert.match(outcome.error?.message||'',/取消|aborted/i,'Cancellation during final library acquisition must reject the operation');
 assert.deepEqual(after,before,'Neither library may gain or change an instance');assert.equal(workflowCalls,0);assert.equal(createCalls,0);assert.equal(installCalls,0);assert.equal(g.core.jobs.length,0);
 assert.deepEqual(await instanceDataTree(sourceDir),sourceBefore,'Source mods, configuration and world must be byte-identical');
 if(targetDir){assert.deepEqual(await instanceDataTree(targetDir),targetBefore,'Existing target content and reports must remain untouched');assert.deepEqual(await g.content.list(target.id),[]);}
 assert.equal(g.workflows.active,false);assert.equal(f.service.requests.has(key),false);
}
test('migration cancelled during final library acquisition never enters a workflow or installs content',{timeout:30000},async t=>{
 for(const second of [false,true])await t.test(second?'second managed library':'default library',child=>checkFinalAcquisitionCancellation(child,'run',second));
});
test('creation cancelled during final library acquisition never creates an instance or installs content',{timeout:30000},async t=>{
 for(const second of [false,true])await t.test(second?'second managed library':'default library',child=>checkFinalAcquisitionCancellation(child,'create',second));
});
