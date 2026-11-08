// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {TaskQueue,withFileLock,withTransferBudget,configureTransferBudget} from '../desktop/task-queue132.mjs';
import {parseProperties,updateProperties} from '../desktop/server-properties132.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Workflows} from '../desktop/workflows.mjs';
import {validateInvite,Rooms} from '../desktop/rooms132.mjs';
import {randomBytes} from 'node:crypto';
import {createHash} from 'node:crypto';
import {download} from '../desktop/download.mjs';
import {InstanceEditor} from '../desktop/editor130.mjs';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('SHA512 downloads retain full verification with bounded Windows partial names',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber-sha512-')),bytes=Buffer.from('verified plugin fixture'),hash=createHash('sha512').update(bytes).digest('hex'),path=join(root,'server-content-cache',hash.slice(0,40));
 await download({url:'https://cdn.modrinth.com/fixture.jar',path,hash,algorithm:'sha512',size:bytes.length},{root,fetcher:async()=>new Response(bytes)});
 assert.deepEqual(await readFile(path),bytes);
});
test('queue: two different instances run, identical key waits, queued cancel is isolated',async()=>{
 const q=new TaskQueue(2),log=[];let release;const barrier=new Promise(r=>release=r);const a=q.run('a',async()=>{log.push('a');await barrier;});const b=q.run('b',async()=>{log.push('b');await barrier;});const c=new AbortController();const cancelled=q.run('c',()=>log.push('c'),{signal:c.signal});const rejected=assert.rejects(cancelled,/cancel c/);const same=q.run('a',()=>log.push('a2'));await wait(5);assert.deepEqual(log,['a','b']);c.abort(Error('cancel c'));await rejected;release();await Promise.all([a,b,same]);assert.deepEqual(log,['a','b','a2']);
});
test('workflow instance scope and cancellation do not leak to another instance',async()=>{
 const core={jobs:[],cancel:id=>{core.jobs.find(j=>j.id===id).cancelled=true;}},w=new Workflows(core,{});let release;const barrier=new Promise(r=>release=r);
 const run=id=>w.exclusive(async()=>{w.lastSetup=id;core.jobs.push({id,instanceId:id,state:'running'});await barrier;return {id:w.lastSetup,cancelled:w.cancelled};},id);
 const a=run('a'),b=run('b');assert.throws(()=>core.workflowGuard('a'));assert.doesNotThrow(()=>core.workflowGuard('c'));w.cancel('a');release();assert.deepEqual(await a,{id:'a',cancelled:true});assert.deepEqual(await b,{id:'b',cancelled:false});assert.equal(core.jobs[1].cancelled,undefined);assert.equal(w.active,false);
});
test('creation request states and pre-instance cancellation remain isolated',async()=>{
 const w=new Workflows({jobs:[]},{});let release;const gate=new Promise(r=>release=r);
 const a=w.exclusive(async()=>{await gate;return w.cancelled;},'new:a'),b=w.exclusive(async()=>{w.lastSetup='second';await gate;return w.cancelled;},'new:b');
 await assert.rejects(w.exclusive(async()=>{},'new:a'),/already active/);w.cancel('new:a');assert.equal(w.state('new:a').cancelled,true);assert.equal(w.state('new:b').instanceId,'second');release();assert.equal(await a,true);assert.equal(await b,false);
});
test('shared file locks and a one-transfer budget complete without nested deadlock',async()=>{
 configureTransferBudget(1);let active=0,max=0;const task=key=>withFileLock(key,()=>withTransferBudget(async()=>{active++;max=Math.max(max,active);await wait(5);active--;}));
 try{await Promise.all([task('java'),task('java'),task('asset')]);assert.equal(max,1);}finally{configureTransferBudget(8);}
});
test('Java properties: escapes, continuation, comments, duplicates and unknown entries survive',()=>{
 const source='# comment\ncustom:key=value\nmotd=Hello\\u4e16\\u754c\nview-distance=10\nmulti=one\\\n  two\nmotd=old\n';const p=parseProperties(source);assert.equal(p.values.multi,'onetwo');assert.equal(p.values.custom,'key=value');const changed=updateProperties(source,{motd:'中文 := test', 'view-distance':'12'});assert.equal(parseProperties(changed).values.motd,'中文 := test');assert.equal(parseProperties(changed).values.custom,'key=value');assert.ok(changed.startsWith('# comment'));assert.throws(()=>updateProperties(source,{'view-distance':'999'}));assert.throws(()=>updateProperties(source,{'level-name':'../world'}));assert.throws(()=>updateProperties(source,{'online-mode':'false\nenable-rcon=true'}));
});
test('server settings use optimistic conflict checks, retain unknown keys, restore backups and reject traversal',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber-server132-')),core=await new VanillaLauncher(root).init();
 const manager=await new Servers(new VanillaLauncher(root)).init(),s=await manager.create({name:'Synthetic server',game:'1.21.1',type:'vanilla'});const first=await manager.properties(s.id);await writeFile(join(await manager.dir(s.id),'server.properties'),first.text+'custom.setting=yes\n');await assert.rejects(manager.saveProperties(s.id,{hash:first.hash,changes:{motd:'bad'}}),/externally/);const current=await manager.properties(s.id),saved=await manager.saveProperties(s.id,{hash:current.hash,changes:{motd:'测试服务器'}});assert.equal(saved.values['custom.setting'],'yes');assert.equal(saved.values.motd,'测试服务器');const history=await manager.backups(s.id);assert.equal(history.length,1);const restored=await manager.restoreConfig(s.id,history[0],saved.hash);assert.equal(restored.values.motd,'AMBER server');await assert.rejects(manager.dir('../bad'));await assert.rejects(manager.restoreConfig(s.id,'../bad',restored.hash));
});
test('independent server copies preserve worlds and leave source properties unchanged',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber-copy132-')),m=await new Servers(new VanillaLauncher(root)).init(),s=await m.create({name:'Source',game:'1.21.1',type:'paper',port:25565}),dir=await m.dir(s.id);await mkdir(join(dir,'world'));await writeFile(join(dir,'world','fixture'),'world bytes');const c=await m.copy(s.id,'Copy','1.21.4');assert.notEqual(c.id,s.id);assert.equal(c.status,'new');assert.equal(await readFile(join(await m.dir(c.id),'world','fixture'),'utf8'),'world bytes');assert.equal((await m.properties(s.id)).values['server-port'],'25565');assert.equal((await m.properties(c.id)).values['server-port'],'25566');
});
test('invitations enforce bounded validity, structured peers and no injected arguments',()=>{
 const value={v:1,name:'amber-'+randomBytes(12).toString('hex'),secret:randomBytes(32).toString('base64url'),port:25565,expires:Date.now()+10000,peer:'tcp://example.com:11010'};const code=v=>'amber-room:'+Buffer.from(JSON.stringify(v)).toString('base64url');assert.equal(validateInvite(code(value)).port,25565);assert.throws(()=>validateInvite(code({...value,expires:0})));assert.throws(()=>validateInvite(code({...value,peer:'file:///bad'})));assert.throws(()=>validateInvite(code({...value,peer:'tcp://user:password@example.com:11010'})));assert.throws(()=>validateInvite(code({...value,port:'25565 --bad'})));
});
test('network component can be queued again after cancellation before execution',async()=>{
 const core={root:tmpdir(),jobs:[],startJob(instanceId,kind){const j={instanceId,kind,state:'running'};this.jobs.push(j);return j;}},rooms=new Rooms(core,{});
 rooms.versions160.choices=async()=>[{version:'2.6.4'}];await rooms.install();await assert.rejects(rooms.install(),/already queued/);core.jobs[0].state='cancelled';await rooms.install();assert.equal(core.jobs.length,2);
});
test('server catalog shares filters, pagination, trusted icons and stable-first versions',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber-catalog-')),m=await new Servers(new VanillaLauncher(root)).init(),s=await m.create({name:'Catalog',type:'paper',game:'1.21.1'});let search;
 m.json=async url=>{const u=new URL(url);if(u.pathname.endsWith('/tag/category'))return [{name:'utility',project_type:'mod'}];if(u.pathname.endsWith('/search')){search=u;return {total_hits:42,hits:[{project_id:'p',title:'Plugin',icon_url:'https://cdn.modrinth.com/p.png'},{project_id:'bad',title:'Bad icon',icon_url:'file:///private'}]};}return [{id:'beta',version_type:'beta',date_published:'2026-01-01'},{id:'stable',version_type:'release',date_published:'2025-01-01'}];};
 const result=await m.search(s.id,{query:'test',category:'utility',sort:'downloads',offset:20});assert.equal(result.total,42);assert.equal(result.hits[0].id,'p');assert.ok(result.hits[0].icon.startsWith('https:'));assert.equal(result.hits[1].icon,null);assert.equal(search.searchParams.get('offset'),'20');assert.equal(search.searchParams.get('index'),'downloads');assert.ok(search.searchParams.get('facets').includes('categories:paper'));assert.ok(search.searchParams.get('facets').includes('versions:1.21.1'));await assert.rejects(m.search(s.id,{sort:'unsafe'}));assert.equal((await m.contentVersions(s.id,'p'))[0].id,'stable');
});
test('server preview resolves required dependencies once and rejects client-only content',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber-deps-')),m=await new Servers(new VanillaLauncher(root)).init(),s=await m.create({name:'Dependencies',type:'fabric',game:'1.21.1'});
 const versions={main:{id:'main',project_id:'main',version_number:'1',files:[{filename:'main.jar',primary:true,url:'https://cdn.modrinth.com/main.jar',size:1,hashes:{sha1:'a'.repeat(40)}}],dependencies:[{dependency_type:'required',version_id:'dep'},{dependency_type:'required',version_id:'dep'}]},dep:{id:'dep',project_id:'dep',version_number:'1',files:[{filename:'dep.jar',url:'https://cdn.modrinth.com/dep.jar',size:1,hashes:{sha1:'b'.repeat(40)}}],dependencies:[]}};
 let clientOnly=false;m.contentVersions=async(id,p)=>[versions[p]];m.json=async url=>{const u=new URL(url),id=u.pathname.split('/').at(-1);return u.pathname.includes('/version/')?versions[id]:{title:id,server_side:clientOnly?'unsupported':'required',icon_url:'https://cdn.modrinth.com/icon.png'};};
 const plan=await m.previewContent(s.id,'main');assert.deepEqual(plan.rows.map(r=>r.projectId),['dep','main']);assert.ok(plan.rows.every(r=>r.icon));clientOnly=true;await assert.rejects(m.previewContent(s.id,'main'),/Client-only/);
});
test('shared text editor restricts server files to server roots and preserves conflicts/backups',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber-server-editor-'));await mkdir(join(root,'plugins','demo'),{recursive:true});await writeFile(join(root,'plugins','demo','config.yml'),'enabled: true\n');await writeFile(join(root,'server.properties'),'motd=Before\n');await writeFile(join(root,'accounts.json'),'{}');const editor=new InstanceEditor({instancePath:async()=>root},{directories:['plugins','config'],files:['server.properties']});
 assert.deepEqual(await editor.list('server'),['plugins/demo/config.yml','server.properties']);await assert.rejects(editor.read('server','accounts.json'),/Unsupported/);await assert.rejects(editor.read('server','plugins/../../accounts.json'));const original=await editor.read('server','server.properties');await editor.save('server',{...original,text:'motd=After\n'});assert.equal((await editor.history('server','server.properties')).length,1);await assert.rejects(editor.save('server',{...original,text:'stale'}),/externally/);
});
