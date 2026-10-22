// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Workflows,validateSettings} from '../desktop/workflows.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {download} from '../desktop/download.mjs';
import {explainProblem} from '../desktop/problems.mjs';
import {validateBackground,importBackground} from '../desktop/backgrounds.mjs';
async function temp(t){const root=await mkdtemp(join(tmpdir(),'amber-alpha8-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
test('search category and sorting preserve mandatory game/loader facets and reject invalid filters',async()=>{
 const urls=[],core={metadata:async()=>({item:{game:'1.21.4',loader:'fabric'}}),fetcher:async raw=>{const u=new URL(raw);urls.push(u);return Response.json(u.pathname.endsWith('/tag/category')?[{name:'technology',project_type:'mod',header:'categories'},{name:'potato',project_type:'resourcepack'}]:{hits:[],total_hits:0});}},store=new Modrinth(core);
 for(const sort of ['downloads','newest','updated','follows','relevance']){await store.search('test',{query:'pipe',type:'mod',category:'technology',sort,offset:20});const p=urls.at(-1).searchParams;assert.equal(p.get('index'),sort);assert.equal(p.get('offset'),'20');assert.deepEqual(JSON.parse(p.get('facets')),[['versions:1.21.4'],['project_type:mod'],['categories:technology'],['categories:fabric']]);}
 assert.equal(urls.filter(u=>u.pathname.endsWith('/tag/category')).length,1);
 await assert.rejects(store.search('test',{category:'technology',type:'shader'}),/分类/);await assert.rejects(store.search('test',{sort:'evil'}),/排序/);
});
test('cancelling between setup stages stops subsequent stages and retries the same instance',async t=>{
 const dir=await temp(t),order=[],item={id:'one',name:'Test',game:'1.21.4'},core={jobs:[],catalog:[],createInstance:async()=>{order.push('create');return item;},instancePath:async()=>dir,metadata:async()=>({item,dir}),requireStopped:async()=>{},prepareJava:async()=>{order.push('java');},configureLoader:async()=>{order.push('loader');work.cancel();},install:async()=>{order.push('game');}};
 const work=new Workflows(core,{});work.choices=async()=>[{version:'v1'}];
 await assert.rejects(work.create({name:'Test',game:'1.21.4',loader:'fabric',version:'v1',threads:8}),/取消/);
 assert.deepEqual(order,['create','java','loader']);assert.equal(JSON.parse(await readFile(join(dir,'setup-report.json'),'utf8')).state,'cancelled');
 core.configureLoader=async()=>order.push('loader');await work.retry('one');assert.deepEqual(order,['create','java','loader','loader','game']);assert.equal(JSON.parse(await readFile(join(dir,'setup-report.json'),'utf8')).state,'done');assert.equal((await work.retry('one')).id,'one');
});
test('cancel aborts the active job and workflow guard rejects subsequent writes',async()=>{
 let cancelled;const core={jobs:[{id:'j',state:'running'}],cancel:id=>cancelled=id},work=new Workflows(core,{});work.active=true;work.cancel();assert.equal(cancelled,'j');assert.throws(()=>work.context.run(true,()=>core.workflowGuard()),/取消/);
});
test('download retries a temporary outage but never retries 404, and reuses verified data',async t=>{
 const root=await temp(t),bytes=Buffer.from('verified bytes'),file={path:join(root,'ok.jar'),url:'https://cdn.modrinth.com/test.jar',hash:createHash('sha1').update(bytes).digest('hex'),size:bytes.length};let calls=0;
 await download(file,{root,fetcher:async()=>++calls===1?new Response('',{status:503}):new Response(bytes)});assert.equal(calls,2);
 await download(file,{root,fetcher:async()=>assert.fail('cached file fetched again')});
 let missing=0;await assert.rejects(download({...file,path:join(root,'missing.jar')},{root,fetcher:async()=>{missing++;return new Response('',{status:404});}}),/404/);assert.equal(missing,1);assert.ok(!(await readdir(root)).some(p=>p.endsWith('.part')));
});
test('cancellation during streaming removes temporary file and retry completes cleanly',async t=>{
 const root=await temp(t),bytes=Buffer.from('complete'),controller=new AbortController(),file={path:join(root,'mod.jar'),url:'https://cdn.modrinth.com/test.jar',hash:createHash('sha1').update(bytes).digest('hex'),size:bytes.length};
 await assert.rejects(download(file,{root,signal:controller.signal,fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,2));controller.abort(Error('取消'));c.close();}}))}));assert.deepEqual(await readdir(root),[]);
 await download(file,{root,fetcher:async()=>new Response(bytes)});assert.deepEqual(await readFile(file.path),bytes);
});
test('conflicting enabled mods are named in both dependency directions; disabled mods do not block',async t=>{
 const dir=await temp(t);await mkdir(join(dir,'mods'));const store=new Modrinth({}),a={projectId:'a',versionId:'av',title:'Alpha',relative:'mods/a.jar',enabled:false,dependencies:[]},b={projectId:'b',versionId:'bv',title:'Beta',relative:'mods/b.jar',enabled:true,dependencies:[{dependency_type:'incompatible',project_id:'a'}]};
 await assert.rejects(store.checkToggle(dir,{files:[a,b]},a,true),/Beta.*Alpha.*不兼容/);
 b.enabled=false;await store.checkToggle(dir,{files:[a,b]},a,true);
 b.enabled=true;b.dependencies=[];a.dependencies=[{dependency_type:'incompatible',version_id:'bv'}];await assert.rejects(store.checkToggle(dir,{files:[a,b]},a,true),/Alpha.*Beta/);
});
test('crash hints distinguish memory, Java, dependency, damaged jar and graphics from unknown crashes',()=>{
 for(const [message,action] of [['java.lang.OutOfMemoryError','memory'],['UnsupportedClassVersionError','manage'],['Incompatible mods found!','mods'],['java.util.zip.ZipException: zip END header not found','mods'],['GLFW error 65542','mods']])assert.equal(explainProblem(message,{crash:true}).action,action);
 const unknown=explainProblem('Exit code -1',{crash:true});assert.equal(unknown.action,'logs');assert.match(unknown.hint,/无法确定/);assert.equal(explainProblem('fetch failed').action,'retry');assert.equal(explainProblem('ENOSPC').action,'folder');
});
test('background settings accept only builtins or content-addressed local images and upgrade older preferences',()=>{
 assert.equal(validateSettings({}).background,'forest');assert.equal(validateBackground('none'),'none');assert.equal(validateBackground('a'.repeat(64)+'.png'),'a'.repeat(64)+'.png');for(const v of ['../../a.png','https://evil.test/x.png','file:///secret.png','x.svg',null])assert.throws(()=>validateBackground(v));
});
test('custom background copies normalized image under app storage and leaves the source unchanged',async t=>{
 const root=await temp(t),path=join(root,'source.webp');await writeFile(path,'source');const normalized=Buffer.from('normalized fixture png');let width;
 const name=await importBackground(root,path,()=>({isEmpty:()=>false,getSize:()=>({width:4000,height:2000}),resize:v=>{width=v.width;return {toPNG:()=>normalized};}}));assert.equal(width,2560);assert.deepEqual(await readFile(join(root,'backgrounds',name)),normalized);assert.equal(await readFile(path,'utf8'),'source');
 await assert.rejects(importBackground(root,path,()=>({isEmpty:()=>true})),/无法读取/);await assert.rejects(importBackground(root,path,()=>({isEmpty:()=>false,getSize:()=>({width:10000,height:10000})})),/分辨率/);
});
