import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Workflows} from '../desktop/workflows.mjs';
import {atomicJson} from '../desktop/core.mjs';
// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {RoomSync152,requireRoomSyncReady152,syncPath,validateSnapshot,snapshotDiff,snapshotEnvelope153} from '../desktop/room-sync152.mjs';
import {validateInvite} from '../desktop/rooms132.mjs';
import {ROOM_SYNC_MAX_FILE153,ROOM_SYNC_MAX_TOTAL153,ROOM_SYNC_MAX_MANIFEST153} from '../desktop/room-sync-limits152.mjs';
import {inspect153,receiveFile153} from '../desktop/room-sync-io153.mjs';
import {link,symlink,truncate} from 'node:fs/promises';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'amber-sync152-'));const dir=join(root,'source');await mkdir(join(dir,'mods'),{recursive:true});await mkdir(join(dir,'config'));await writeFile(join(dir,'config','display.json'),'{"distance":8}');await writeFile(join(dir,'config','account.json'),'{"secret":"never export"}');await writeFile(join(dir,'saves.dat'),'preserved');
 const item={id:'source',name:'Client',game:'1.21.1',loader:'fabric',loaderVersion:'0.16.0'},core={root,metadata:async()=>({dir,item}),requireStopped:async()=>{},instancePath:async id=>join(root,id),jobs:[]};
 const rooms={servers:{list:async()=>[{id:'server',game:item.game,type:'fabric'}]}};const content={manifest:async()=>({files:[]}),api:async()=>{throw Object.assign(Error('not found'),{status:404});}};
 const host=new RoomSync152(core,rooms,{},content);const invite={v:1,name:'amber-'+'a'.repeat(24),secret:'s'.repeat(43),port:25565,peer:'tcp://localhost:11010',expires:Date.now()+60000};await host.prepareHost(invite);rooms.current={role:'host',state:'running',serverId:'server',invite};
 const guestRooms={current:{role:'guest',state:'running',invite,syncLocalPort:invite.sync.port,localPort:25567}};
 const workflows={cancel(){},async create(input,a,b,after,c,d,onCreated){const id=randomUUID();await mkdir(join(root,id));const result={id};await onCreated(result);await after(result);return result;}};
 const guest=new RoomSync152(core,guestRooms,workflows,content);
 t.after(async()=>{await host.close();await guest.close();await rm(root,{recursive:true,force:true});});
 return {root,dir,host,guest,rooms,guestRooms,invite,core,content,workflows};
}
async function publish(f,overrides={}){const c=await f.host.candidates('source');return f.host.publish({...selection,token:c.token,...overrides});}
const selection={id:'source',paths:['config/display.json'],reviewed:true,redistribution:true};

test('1.5.3 nested configuration and resource/shader archives preserve source files',async t=>{
 const f=await fixture(t);await mkdir(join(f.dir,'config','one','two'),{recursive:true});await mkdir(join(f.dir,'resourcepacks'));await mkdir(join(f.dir,'shaderpacks'));
 const paths=['config/one/two/display.yaml','resourcepacks/Example.zip','shaderpacks/Example.zip'];
 for(const path of paths)await writeFile(join(f.dir,path),path.endsWith('yaml')?'distance: 12':'PK synthetic archive '+path);
 const c=await f.host.candidates('source');for(const path of paths)assert.ok(c.files.some(x=>x.path===path));await f.host.publish({...selection,token:c.token,paths});const plan=await f.guest.preview(),result=await f.guest.install(plan.token);
 for(const path of paths)assert.deepEqual(await readFile(join(f.root,result.instanceId,path)),await readFile(join(f.dir,path)));
 for(const path of ['config/a/b/c/d/e/f/g/x.json','resourcepacks/../a.zip','shaderpacks/a.zip:stream','config/a/private/x.cfg','resourcepacks/a.jar'])assert.throws(()=>syncPath(path));
 assert.equal(syncPath('config/a/b/c/d/e/f/x.ini'),'config/a/b/c/d/e/f/x.ini');
});
test('1.5.3 count, file, configuration and aggregate limits remain bounded',async t=>{
 const f=await fixture(t);await publish(f);const m=f.host.shared.manifest,file={...m.files[0],path:'resourcepacks/a.zip',size:ROOM_SYNC_MAX_FILE153};
 assert.doesNotThrow(()=>validateSnapshot({...m,files:[file]}));assert.throws(()=>validateSnapshot({...m,files:[{...file,size:ROOM_SYNC_MAX_FILE153+1}]}));
 const files=Array.from({length:16},(_,i)=>({...file,path:'resourcepacks/'+i+'.zip'}));assert.equal(files.reduce((n,f)=>n+f.size,0),ROOM_SYNC_MAX_TOTAL153);assert.doesNotThrow(()=>validateSnapshot({...m,files}));assert.throws(()=>validateSnapshot({...m,files:[...files,{...file,path:'resourcepacks/extra.zip',size:1}]}));
 await mkdir(join(f.dir,'resourcepacks'));await writeFile(join(f.dir,'resourcepacks','large.zip'),'x');await truncate(join(f.dir,'resourcepacks','large.zip'),ROOM_SYNC_MAX_FILE153+1);await assert.rejects(inspect153(f.dir,'resourcepacks/large.zip'));
 await writeFile(join(f.dir,'config','oversized.json'),Buffer.alloc(1024*1024+1,32));await assert.rejects(inspect153(f.dir,'config/oversized.json'));
 await link(join(f.dir,'config','display.json'),join(f.dir,'config','linked.json'));await assert.rejects(inspect153(f.dir,'config/linked.json'));
});
for(const kind of ['resourcepack','shader'])test('1.5.3 '+kind+' original platform route and restrictions',async t=>{
 const f=await fixture(t),folder=kind==='shader'?'shaderpacks':'resourcepacks',bytes=Buffer.from('PK platform fixture'),sha1=createHash('sha1').update(bytes).digest('hex');await mkdir(join(f.dir,folder));await writeFile(join(f.dir,folder,'p.zip'),bytes);
 let category=kind;f.content.api=async path=>path.startsWith('project/')?{project_type:category,client_side:'required'}:{id:'Version1',project_id:'Project1',game_versions:['1.21.1'],loaders:[],files:[{hashes:{sha1},size:bytes.length,url:'https://cdn.modrinth.com/p.zip'}]};f.core.fetcher=async()=>new Response(bytes);
 await publish(f,{paths:[folder+'/p.zip'],redistribution:false});const p=await f.guest.preview();assert.equal(p.manifest.files[0].source,'modrinth');await f.guest.install(p.token);category='mod';await assert.rejects(f.guest.install(p.token),/category/);
});
for(const step of ['java','loader','game'])test('1.5.3 actual workflow resumes '+step+' failure after restart into the same target',async t=>{
 const f=await fixture(t);await publish(f);const root=join(f.root,'resume-library');let failing=step;
 const metadata=JSON.stringify({id:'1.21.1',javaVersion:{majorVersion:21}}),sha1=createHash('sha1').update(metadata).digest('hex');
 function runtime(){const core=new VanillaLauncher(root,{fetcher:async()=>new Response(metadata)});core.catalog=[{id:'1.21.1',url:'https://piston-meta.mojang.com/test.json',sha1}];core.prepareJava=async()=>{if(failing==='java')throw Error('injected failure');};core.configureLoader=async(id,loader,loaderVersion)=>{if(failing==='loader')throw Error('injected failure');const {dir,item}=await core.metadata(id);await atomicJson(join(dir,'instance.json'),{...item,loader,loaderVersion});};core.install=async()=>{if(failing==='game')throw Error('injected failure');};const flows=new Workflows(core,f.content);flows.choices=async()=>[{version:'0.16.0'}];return {core,flows,guest:new RoomSync152(core,f.guestRooms,flows,f.content)};}
 let r=runtime(),p=await r.guest.preview();await assert.rejects(r.guest.install(p.token),/injected/);const id=r.guest.state.instanceId;await assert.rejects(r.flows.retry(id));await r.guest.close();failing=null;r=runtime();p=await r.guest.preview();assert.equal(p.recovery.instanceId,id);assert.equal(p.recovery.canResume,true);assert.equal(p.diff.added.length,0);
 const ready=await r.guest.install(p.token);assert.equal(ready.instanceId,id);await requireRoomSyncReady152(r.core,id);assert.equal((await r.core.listInstances()).length,1);
 // Changed revision is independent and preserves old user modifications.
 const dir=await r.core.instancePath(id);await writeFile(join(dir,'config','display.json'),'personal');await writeFile(join(f.dir,'config','display.json'),'{"distance":16}');await publish(f);await r.guest.close();r=runtime();p=await r.guest.preview();assert.deepEqual(p.diff.changed,['config/display.json']);assert.equal(p.recovery,null);failing='game';await assert.rejects(r.guest.install(p.token),/injected/);const pending=r.guest.state.instanceId;await r.guest.close();failing=null;r=runtime();p=await r.guest.preview();assert.deepEqual(p.diff.changed,['config/display.json']);assert.equal(p.recovery.instanceId,pending);const next=await r.guest.install(p.token);assert.equal(next.instanceId,pending);assert.notEqual(next.instanceId,id);assert.equal(await readFile(join(dir,'config','display.json'),'utf8'),'personal');await r.guest.close();
});
test('1.5.3 local edits block resume and explicit new choice preserves the unfinished target',async t=>{
 const f=await fixture(t);await publish(f);const root=join(f.root,'conflict-library'),metadata=JSON.stringify({id:'1.21.1'}),sha1=createHash('sha1').update(metadata).digest('hex');let failing=true;
 const core=new VanillaLauncher(root,{fetcher:async()=>new Response(metadata)});core.catalog=[{id:'1.21.1',url:'https://piston-meta.mojang.com/test.json',sha1}];core.prepareJava=async()=>{if(failing)throw Error('injected failure');};core.configureLoader=async()=>{};core.install=async()=>{};const flows=new Workflows(core,f.content);flows.choices=async()=>[{version:'0.16.0'}];const guest=new RoomSync152(core,f.guestRooms,flows,f.content);
 let p=await guest.preview();await assert.rejects(guest.install(p.token));const old=guest.state.instanceId,dir=await core.instancePath(old);await writeFile(join(dir,'config','display.json'),'personal');failing=false;p=await guest.preview();assert.equal(p.recovery.canResume,false);assert.deepEqual(p.recovery.conflicts,['config/display.json']);await assert.rejects(guest.install(p.token),/conflict/);const result=await guest.install(p.token,'new');assert.notEqual(result.instanceId,old);assert.equal(await readFile(join(dir,'config','display.json'),'utf8'),'personal');await guest.close();
});
test('1.5.3 partial host bytes resume only after full checksum verification',async t=>{
 const f=await fixture(t),bytes=Buffer.alloc(3*1024*1024,42),sha256=createHash('sha256').update(bytes).digest('hex'),file={path:'resourcepacks/large.zip',size:bytes.length,sha256},path=join(f.root,'download');
 await writeFile(path+'.part',bytes.subarray(0,1024*1024));let offset;
 await receiveFile153(f.root,path,file,async n=>{offset=n;return new Response(bytes.subarray(n),{status:206,headers:{'Content-Range':`bytes ${n}-${bytes.length-1}/${bytes.length}`,'Content-Length':String(bytes.length-n)}});},new AbortController().signal);
 assert.equal(offset,1024*1024);assert.deepEqual(await readFile(path),bytes);
 await writeFile(path+'.part',Buffer.alloc(1024*1024,1));await assert.rejects(receiveFile153(f.root,path,file,async n=>new Response(bytes.subarray(n),{status:206,headers:{'Content-Range':`bytes ${n}-${bytes.length-1}/${bytes.length}`}}),new AbortController().signal),/integrity/);assert.deepEqual(await readFile(path),bytes);
 await writeFile(path+'.part','');await receiveFile153(f.root,path,file,async n=>{assert.equal(n,0);return new Response(bytes);},new AbortController().signal);assert.deepEqual(await readFile(path),bytes);
});
test('1.5.3 real HTTP streams a 65 MiB archive, supports range resume and revokes access',async t=>{
 const f=await fixture(t);await mkdir(join(f.dir,'resourcepacks'));const path='resourcepacks/large.zip';await writeFile(join(f.dir,path),'PK');await truncate(join(f.dir,path),65*1024*1024);await publish(f,{paths:[path]});const p=await f.guest.preview(),file=p.manifest.files[0];assert.equal(file.size,65*1024*1024);
 const base=`http://127.0.0.1:${f.invite.sync.port}/file/${p.manifest.revision}/${file.sha256}`,headers={Authorization:'Bearer '+f.invite.sync.token};
 const response=await fetch(base,{headers:{...headers,Range:'bytes=1048576-'}});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 1048576-${file.size-1}/${file.size}`);let total=0;for await(const bytes of response.body)total+=bytes.length;assert.equal(total,file.size-1048576);
 const invalid=await fetch(base,{headers:{...headers,Range:`bytes=${file.size}-`}});assert.equal(invalid.status,416);await invalid.arrayBuffer();
 const result=await f.guest.install(p.token);assert.equal((await inspect153(join(f.root,result.instanceId),path)).sha256,file.sha256);
 f.host.disable();await assert.rejects(f.guest.remote());
});
test('1.5.3 publication and signed preview at 2000 long Unicode paths with platform metadata',async t=>{
 const f=await fixture(t),prefix='资'.repeat(165),paths=Array.from({length:2000},(_,i)=>'resourcepacks/'+prefix+String(i).padStart(4,'0')+'.zip');await mkdir(join(f.dir,'resourcepacks'));await Promise.all(paths.map(path=>writeFile(join(f.dir,path),'PK platform content')));
 const bytes=Buffer.from('PK platform content'),sha1=createHash('sha1').update(bytes).digest('hex'),versionId='V'.repeat(64),projectId='P'.repeat(64);
 f.content.api=async path=>path.startsWith('project/')?{id:projectId,project_type:'resourcepack',client_side:'required'}:{id:versionId,project_id:projectId,game_versions:['1.21.1'],loaders:[],files:[{hashes:{sha1},size:bytes.length,url:'https://cdn.modrinth.com/fixture.zip'}]};
 const candidate=await f.host.candidates('source');await f.host.publish({...selection,token:candidate.token,paths,redistribution:false});
 const wire=f.host.shared.envelope;assert.ok(wire.length>500000);assert.ok(wire.length<ROOM_SYNC_MAX_MANIFEST153);const preview=await f.guest.preview();assert.equal(preview.manifest.files.length,2000);assert.equal(preview.manifest.files[1999].path,paths[1999]);assert.equal(preview.manifest.files[0].versionId,versionId);assert.equal(preview.size,bytes.length*2000);
});
test('1.5.3 actual signed-envelope byte boundary agrees between serialization and HTTP reception',async t=>{
 const f=await fixture(t);await publish(f);const base=f.host.shared.manifest;
 let low=0,high=ROOM_SYNC_MAX_MANIFEST153;while(low<high){const n=Math.ceil((low+high)/2);try{snapshotEnvelope153({...base,padding:'x'.repeat(n)},f.host.privateKey);low=n;}catch{high=n-1;}}
 const manifest={...base,padding:'x'.repeat(low)},envelope=snapshotEnvelope153(manifest,f.host.privateKey);assert.ok(ROOM_SYNC_MAX_MANIFEST153-envelope.length<4);assert.throws(()=>snapshotEnvelope153({...base,padding:'x'.repeat(low+1)},f.host.privateKey),/limit/);
 f.host.shared={...f.host.shared,manifest,envelope};assert.equal((await f.guest.remote()).padding.length,low);
 f.host.shared.envelope=Buffer.alloc(ROOM_SYNC_MAX_MANIFEST153+1,32);await assert.rejects(f.guest.remote());
});
test('1.5.3 interrupted streamed download retains bytes for reauthorized restart and rejects lying sizes',async t=>{
 const f=await fixture(t),bytes=Buffer.alloc(2*1024*1024,7),file={path:'resourcepacks/cancel.zip',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')},path=join(f.root,'interrupted'),controller=new AbortController();
 const stream=new ReadableStream({start(c){c.enqueue(bytes.subarray(0,1024*1024));setTimeout(()=>controller.abort(Error('cancel fixture')),50);}});
 await assert.rejects(receiveFile153(f.root,path,file,async()=>new Response(stream),controller.signal));assert.equal((await readFile(path+'.part')).length,1024*1024);
 await receiveFile153(f.root,path,file,async n=>new Response(bytes.subarray(n),{status:206,headers:{'Content-Range':`bytes ${n}-${bytes.length-1}/${bytes.length}`}}),new AbortController().signal);assert.deepEqual(await readFile(path),bytes);
 await assert.rejects(receiveFile153(f.root,join(f.root,'lying'),{...file,size:1},async()=>new Response(bytes),new AbortController().signal),/size/);
 await assert.rejects(receiveFile153(f.root,join(f.root,'bad-range'),file,async()=>new Response(bytes,{status:206,headers:{'Content-Range':'bytes 1-2/3'}}),new AbortController().signal),/resume/);
});

test('2000-file publication/reception boundary includes configuration and rejects 2001 without replacing snapshot',async t=>{
 const f=await fixture(t),paths=Array.from({length:2001},(_,i)=>'mods/m'+i+'.jar');await Promise.all(paths.map(path=>writeFile(join(f.dir,path),'synthetic '+path)));
 const c=await f.host.candidates('source'),input={...selection,token:c.token,paths:paths.slice(0,2000)};
 await f.host.publish(input);assert.equal((await f.guest.remote()).files.length,2000);let current=f.host.shared;
 for(const chosen of [paths,[...paths.slice(0,2000),'config/display.json']]){await assert.rejects(f.host.publish({...input,paths:chosen}),/2000/);assert.equal(f.host.shared,current);}
 await f.host.publish({...input,paths:[...paths.slice(0,1999),'config/display.json']});const accepted=await f.guest.remote();assert.equal(accepted.files.length,2000);assert.ok(accepted.files.some(x=>x.path==='config/display.json'));current=f.host.shared;
 assert.throws(()=>validateSnapshot({...accepted,files:[...accepted.files,{...accepted.files[0],path:'mods/extra.jar'}]}));assert.equal(f.host.shared,current);
});
test('strict allowlist rejects private files and platform path tricks',()=>{
 for(const path of ['../x','mods/../config/a.json','mods/a.jar:stream','mods/CON.jar','mods/a.jar/','config//x.json','config/./x.json','config/token.json','config/auth.json','saves/x','logs/x','config/a.json\0','mods/a\\b.jar','config/../a.json'])assert.throws(()=>syncPath(path),path);
 assert.equal(syncPath('mods/example.jar'),'mods/example.jar');
});
test('sharing defaults off; invitation binds host key; originals remain untouched',async t=>{const f=await fixture(t);assert.equal(f.host.shared,null);assert.deepEqual(validateInvite('amber-room:'+Buffer.from(JSON.stringify(f.invite)).toString('base64url')),f.invite);await assert.rejects(f.guest.preview());const candidates=await f.host.candidates('source');assert.deepEqual(candidates.files.map(f=>f.path),['config/display.json']);assert.equal(await readFile(join(f.dir,'saves.dat'),'utf8'),'preserved');});
test('selection, privacy and redistribution consent are required',async t=>{const f=await fixture(t);await assert.rejects(publish(f,{reviewed:false}));await assert.rejects(publish(f,{redistribution:false}));await assert.rejects(publish(f,{paths:['config/account.json']}));await writeFile(join(f.dir,'config','display.json'),'{"endpoint":"https://private.example"}');await assert.rejects(publish(f));});
test('authenticated signed preview; explicit consent; isolated instance; verified cache reuse',async t=>{const f=await fixture(t);await publish(f);const unauthorized=await fetch(`http://127.0.0.1:${f.invite.sync.port}/manifest`);assert.equal(unauthorized.status,403);await assert.rejects(f.guest.install('unreviewed'));const plan=await f.guest.preview();assert.equal(plan.size,14);assert.equal(plan.manifest.files[0].source,'host');const result=await f.guest.install(plan.token);assert.equal(result.phase,'ready');assert.equal(await readFile(join(f.root,result.instanceId,'config/display.json'),'utf8'),'{"distance":8}');assert.equal(await f.guest.launchAddress(result.instanceId),'127.0.0.1:25567');assert.notEqual(result.instanceId,'source');const first=result.instanceId;await f.guest.install(plan.token);assert.notEqual(f.guest.state.instanceId,first);assert.equal(await readFile(join(f.dir,'config/display.json'),'utf8'),'{"distance":8}');});
test('changes after preview require another confirmation; diff shows changed and removed',async t=>{const f=await fixture(t);await publish(f);const plan=await f.guest.preview();await writeFile(join(f.dir,'config/display.json'),'{"distance":12}');await publish(f);await assert.rejects(f.guest.install(plan.token),/updated|更新/);const next=await f.guest.preview();assert.deepEqual(next.diff.changed,['config/display.json']);assert.equal(snapshotDiff(next.manifest,{files:[]}).removed.length,1);});
test('disable revokes endpoint while retaining room/game state; enable again and retry',async t=>{const f=await fixture(t);await publish(f);const plan=await f.guest.preview();f.host.disable();assert.equal(f.rooms.current.state,'running');await assert.rejects(f.guest.install(plan.token));await assert.rejects(f.guest.request('/file/'+plan.manifest.revision+'/'+plan.manifest.files[0].sha256,1000));await publish(f);const next=await f.guest.preview();assert.equal((await f.guest.install(next.token)).phase,'ready');});
test('corrupt snapshot bytes and incorrect pinned host key fail closed',async t=>{const f=await fixture(t);await publish(f);const plan=await f.guest.preview();await writeFile(join(f.host.shared.dir,plan.manifest.files[0].sha256),'corrupt');await assert.rejects(f.guest.install(plan.token));const other=await fixture(t);f.guestRooms.current.invite={...f.invite,sync:{...f.invite.sync,key:other.invite.sync.key}};await assert.rejects(f.guest.preview(),/identity|身份/);});
test('oversized, duplicate, case-colliding and traversing manifests are rejected',async t=>{const f=await fixture(t);await publish(f);const base=f.host.shared.manifest;for(const files of [[{...base.files[0],size:2**40}],[base.files[0],base.files[0]],[base.files[0],{...base.files[0],path:'config/Display.json'}],[{...base.files[0],path:'../credentials'}]])assert.throws(()=>validateSnapshot({...base,files}));});
test('server mismatch, host departure and arbitrary reads are rejected',async t=>{const f=await fixture(t);f.rooms.servers.list=async()=>[{id:'server',game:'1.12.2',type:'forge'}];await assert.rejects(publish(f),/mismatch|匹配/);f.rooms.servers.list=async()=>[{id:'server',game:'1.21.1',type:'fabric'}];await publish(f);await assert.rejects(f.guest.request('/../../source/saves.dat',1024));f.rooms.current.state='stopped';await assert.rejects(f.guest.preview());});

test('cancel during preparation never marks an instance ready; retry uses a new instance',async t=>{const f=await fixture(t);await publish(f);const p=await f.guest.preview();const original=f.workflows.create;f.workflows.create=async()=>{f.guest.cancel();throw Error('cancelled fixture');};await assert.rejects(f.guest.install(p.token));assert.equal(f.guest.state.phase,'cancelled');await assert.rejects(f.guest.launchAddress('source'));f.workflows.create=original;assert.equal((await f.guest.install(p.token)).phase,'ready');});
test('host edits after candidate inspection require a new review',async t=>{const f=await fixture(t);const c=await f.host.candidates('source');await writeFile(join(f.dir,'config/display.json'),'changed');await assert.rejects(f.host.publish({...selection,token:c.token}),/changed|变化/);const next=await f.host.candidates('source');(await f.core.metadata()).item.loaderVersion='0.17.0';await assert.rejects(f.host.publish({...selection,token:next.token}),/Review|检查/);});
test('official metadata rejects server-only content and known CurseForge is never retransmitted',async t=>{const f=await fixture(t);await writeFile(join(f.dir,'mods/example.jar'),'synthetic jar');f.content.api=async path=>path.startsWith('version_file/')?{project_id:'project',id:'version',game_versions:['1.21.1'],loaders:['fabric']}:{client_side:'unsupported'};await assert.rejects(publish(f,{paths:['mods/example.jar']}),/Server-only|服务端专用/);f.content.manifest=async()=>({files:[{relative:'mods/example.jar',projectId:'cf-123'}]});await assert.rejects(publish(f,{paths:['mods/example.jar']}),/CurseForge/);});

test('candidate display excludes private paths from requests and blocked mods cannot be published',async t=>{
 const f=await fixture(t),bytes='synthetic server mod';await writeFile(join(f.dir,'mods/server.jar'),bytes);const calls=[];
 f.content.manifest=async()=>({files:[{relative:'mods/server.jar',projectId:'Project1',hash:createHash('sha1').update(bytes).digest('hex')}]});f.content.api=async path=>{calls.push(path);return {id:'Project1',title:'Server mod',client_side:'unsupported',icon_url:'https://cdn.modrinth.com/icon.png'};};
 const c=await f.host.candidates('source');assert.deepEqual(calls,['project/Project1']);assert.equal(c.files.find(x=>x.path==='mods/server.jar').blocked,'server-only');assert.equal(c.files.some(x=>x.path.includes('account')),false);
 await assert.rejects(f.host.publish({...selection,token:c.token,paths:['mods/server.jar']}),/unavailable|不可/);assert.equal(f.host.shared,null);
});

for(const failedStep of ['java','loader','game'])test('real Workflows: '+failedStep+' failure, restart, guarded retry and reconfirmation',async t=>{
 const f=await fixture(t);await publish(f);const root=join(f.root,'real-library');let failing=failedStep;
 const metadata=JSON.stringify({id:'1.21.1',javaVersion:{majorVersion:21}}),sha1=createHash('sha1').update(metadata).digest('hex');
 const makeCore=()=>{const core=new VanillaLauncher(root,{fetcher:async()=>new Response(metadata)});core.catalog=[{id:'1.21.1',url:'https://piston-meta.mojang.com/fixture.json',sha1}];
 core.prepareJava=async id=>{const {dir,item}=await core.metadata(id);assert.equal(item.roomSyncRequired,true);assert.equal(JSON.parse(await readFile(join(dir,'room-sync152.json'),'utf8')).state,'pending');if(failing==='java')throw Error('injected Java failure');};
 core.configureLoader=async(id,loader,version)=>{if(failing==='loader')throw Error('injected loader failure');const {dir,item}=await core.metadata(id);await atomicJson(join(dir,'instance.json'),{...item,loader,loaderVersion:version});};
 core.install=async()=>{if(failing==='game')throw Error('injected game failure');};return core;};
 const makeFlows=core=>{const flows=new Workflows(core,f.content);flows.choices=async()=>[{version:'0.16.0'}];return flows;};
 let core=makeCore(),flows=makeFlows(core),guest=new RoomSync152(core,f.guestRooms,flows,f.content);const plan=await guest.preview();await assert.rejects(guest.install(plan.token),/injected/);const id=guest.state.instanceId;assert.ok(id);await requireRoomSyncReady152(core,id).then(()=>assert.fail('incomplete instance launchable'),()=>{});const dir=await core.instancePath(id);assert.equal(JSON.parse(await readFile(join(dir,'setup-report.json'),'utf8')).state,'failed');
 // New objects have no in-memory resume/afterSetup callback, as after application restart.
 core=makeCore();flows=makeFlows(core);assert.equal(flows.resumes.size,0);failing=null;await assert.rejects(flows.retry(id),/room|房间/);await assert.rejects(requireRoomSyncReady152(core,id),/incomplete|未完成/);
 await rm(join(dir,'room-sync152.json'));await assert.rejects(requireRoomSyncReady152(core,id),/incomplete|未完成/);await rm(join(dir,'setup-report.json'));await assert.rejects(requireRoomSyncReady152(core,id),/incomplete|未完成/);
 guest=new RoomSync152(core,f.guestRooms,flows,f.content);const next=await guest.preview();assert.equal(next.recovery.canResume,false);const result=await guest.install(next.token,'new');assert.notEqual(result.instanceId,id);await requireRoomSyncReady152(core,result.instanceId);assert.equal(await readFile(join(await core.instancePath(result.instanceId),'config/display.json'),'utf8'),'{"distance":8}');
});
for(const provider of ['modrinth','curseforge'])test(provider+' official source: Quilt accepts Fabric on publish and receive; restricted files never become host transfers',async t=>{
 const f=await fixture(t),bytes=Buffer.from('synthetic platform mod'),sha1=createHash('sha1').update(bytes).digest('hex');await writeFile(join(f.dir,'mods/example.jar'),bytes);(await f.core.metadata()).item.loader='quilt';f.rooms.servers.list=async()=>[{id:'server',game:'1.21.1',type:'quilt'}];
 const versionId=provider==='curseforge'?'cf-123-456':'Version1',projectId=provider==='curseforge'?'cf-123':'Project1';let restricted=false,downloaded=0;
 const version=()=>({id:versionId,project_id:projectId,game_versions:['1.21.1'],loaders:['fabric'],files:[{hashes:{sha1},size:bytes.length,url:restricted?null:'https://cdn.modrinth.com/fixture.jar'}]});
 f.content.manifest=async()=>({files:provider==='curseforge'?[{relative:'mods/example.jar',projectId,versionId,hash:sha1}]:[]});f.content.api=async path=>path.startsWith('project/')?{client_side:'required',distribution:!restricted}:version();f.core.fetcher=async()=>{downloaded++;return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}});};
 await publish(f,{paths:['mods/example.jar'],redistribution:false});const p=await f.guest.preview();assert.equal(p.manifest.files[0].source,provider);await f.guest.install(p.token);assert.ok(downloaded>0);restricted=true;await assert.rejects(publish(f,{paths:['mods/example.jar']}),/restricted|限制/);await assert.rejects(f.guest.install(p.token),/restricted|限制/);assert.equal(f.host.shared.manifest.files[0].source,provider);
});

test('real Workflows: completed room instances recover later content and download tasks, but invalid receipts stay blocked',async t=>{
 const f=await fixture(t);(await f.core.metadata()).item.loader='vanilla';f.rooms.servers.list=async()=>[{id:'server',game:'1.21.1',type:'vanilla'}];await publish(f);
 const root=join(f.root,'completed-library'),metadata=JSON.stringify({id:'1.21.1'}),sha1=createHash('sha1').update(metadata).digest('hex');
 const makeCore=()=>{const c=new VanillaLauncher(root,{fetcher:async()=>new Response(metadata)});c.catalog=[{id:'1.21.1',url:'https://piston-meta.mojang.com/fixture.json',sha1}];c.prepareJava=async()=>{};c.install=async()=>{};return c;};
 let core=makeCore(),flows=new Workflows(core,f.content);const guest=new RoomSync152(core,f.guestRooms,flows,f.content),preview=await guest.preview(),result=await guest.install(preview.token),id=result.instanceId,dir=await core.instancePath(id);
 const setup=JSON.parse(await readFile(join(dir,'setup-report.json'),'utf8')),receipt=JSON.parse(await readFile(join(dir,'room-sync152.json'),'utf8'));assert.equal(setup.roomSync,true);assert.equal(setup.state,'done');assert.equal(receipt.state,'ready');
 let behavior='success',installed=0;
 const content={preview:async()=>({id:'preview'}),install:async()=>{if(behavior==='failed')throw Error('injected ordinary content failure');if(behavior==='cancelled'){flows.cancel(id);return;}installed++;await writeFile(join(dir,'mods','later.jar'),'ordinary content fixture');}};
 for(const state of ['failed','cancelled']){
  core=makeCore();flows=new Workflows(core,content);behavior=state;await assert.rejects(flows.startContent(id,{rootVersionId:'laterVersion'}));assert.equal(JSON.parse(await readFile(join(dir,'content-task.json'),'utf8')).state,state);
  core=makeCore();flows=new Workflows(core,content);behavior='success';await flows.retry(id);assert.equal(JSON.parse(await readFile(join(dir,'content-task.json'),'utf8')).state,'done');await requireRoomSyncReady152(core,id);
 }
 assert.equal(installed,2);
 for(const kind of ['install','java'])for(const state of ['failed','cancelled']){
  core=makeCore();flows=new Workflows(core,content);const operation=async()=>core.startJob(id,kind,async(job)=>{if(state==='cancelled')core.cancel(job.id);throw Error('injected ordinary download failure');});
  await assert.rejects(flows.wait(await operation()));assert.equal(JSON.parse(await readFile(join(dir,'download-task.json'),'utf8')).state,state);
  core=makeCore();flows=new Workflows(core,content);const resume=async()=>core.startJob(id,kind,async()=>{});if(kind==='java')core.prepareJava=resume;else core.install=resume;
  await flows.retry(id);assert.equal(JSON.parse(await readFile(join(dir,'download-task.json'),'utf8')).state,'done');
 }
 // A done setup record alone must not grant permission to recover or launch.
 await atomicJson(join(dir,'content-task.json'),{schema:1,kind:'content',state:'failed',game:'1.21.1',loader:'vanilla',versionId:'laterVersion'});
 for(const invalid of [null,'{broken',JSON.stringify({...receipt,state:'pending'}),JSON.stringify({state:'ready'})]){
  if(invalid===null)await rm(join(dir,'room-sync152.json'));else await writeFile(join(dir,'room-sync152.json'),invalid);
  core=makeCore();flows=new Workflows(core,content);await assert.rejects(flows.retry(id));await assert.rejects(requireRoomSyncReady152(core,id));assert.equal(installed,2);
 }
 await atomicJson(join(dir,'room-sync152.json'),receipt);await atomicJson(join(dir,'setup-report.json'),{...setup,state:'failed'});await assert.rejects(flows.retry(id),/room|房间/);
 await atomicJson(join(dir,'setup-report.json'),setup);await flows.retry(id);assert.equal(installed,3);assert.equal(await readFile(join(dir,'config/display.json'),'utf8'),'{"distance":8}');
});
