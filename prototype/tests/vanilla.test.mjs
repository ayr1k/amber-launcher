// SPDX-License-Identifier: MPL-2.0
import {grantLaunch} from '../desktop/launch-authorization.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { download, downloadPool, safeURL, safePath, verified } from '../desktop/download.mjs';
import { rulesAllow, requiredJava, planFiles, assetFiles, extractZip, offlineUUID, launchArguments } from '../desktop/vanilla.mjs';
import { VanillaLauncher } from '../desktop/launcher.mjs';
import { MANIFEST_URL } from '../desktop/core.mjs';
const {zipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
async function temporary(t){const base=resolve(tmpdir()),root=await mkdtemp(join(base,'amber-vanilla-'));t.after(()=>{if(!root.startsWith(base+sep))throw Error('unsafe cleanup');return rm(root,{recursive:true,force:true});});return root;}
const hash=bytes=>createHash('sha1').update(bytes).digest('hex');
const url='https://libraries.minecraft.net/test.jar';

test('Windows rules use ordered actions and gate optional features',()=>{
 assert.equal(rulesAllow([{action:'allow',os:{name:'osx'}}]),false);
 assert.equal(rulesAllow([{action:'allow'},{action:'disallow',os:{name:'windows'}}]),false);
 assert.equal(rulesAllow([{action:'allow',features:{is_demo_user:true}}]),false);
 assert.equal(rulesAllow([{action:'allow',os:{name:'windows',arch:'x86_64'}}]),true);
});
test('path and URL restrictions reject traversal, ADS, device names and untrusted redirects',()=>{
 for(const p of ['../evil','foo/../../evil','C:/evil','foo:ads','con.txt','/absolute','folder\\evil','folder./file'])assert.throws(()=>safePath('C:/data',p));
 for(const u of ['http://libraries.minecraft.net/a','https://example.com/a','https://user@libraries.minecraft.net/a'])assert.throws(()=>safeURL(u));
});
test('downloader verifies cached files and repairs corruption using atomic replacement',async t=>{
 const root=await temporary(t),bytes=Buffer.from('verified data'),file={path:join(root,'test.jar'),url,hash:hash(bytes),size:bytes.length};let calls=0;
 const options={root,fetcher:async()=>{calls++;return new Response(bytes);}};
 await download(file,options);assert.equal(await verified(file),true);
 await download(file,options);assert.equal(calls,1);
 await writeFile(file.path,'bad');await download(file,options);assert.equal(calls,2);assert.equal(await readFile(file.path,'utf8'),'verified data');
});
test('invalid downloads retry without publishing partial or corrupt files',async t=>{
 const root=await temporary(t);let calls=0;
 await assert.rejects(download({path:join(root,'bad.jar'),url,hash:hash('good'),size:4},{root,fetcher:async()=>{calls++;return new Response('oops');}}),/校验/);
 assert.equal(calls,3);assert.deepEqual(await readdir(root),[]);
});
test('cancelled downloads cannot be reported as complete',async t=>{
 const root=await temporary(t),controller=new AbortController();controller.abort();
 await assert.rejects(download({path:join(root,'a'),url,hash:hash('a')},{root,signal:controller.signal}));assert.deepEqual(await readdir(root),[]);
});
test('pool honors concurrency and completes every distinct file once',async t=>{
 const root=await temporary(t);let active=0,max=0,completed=0;
 const files=Array.from({length:9},(_,n)=>({path:join(root,n+'.jar'),url,hash:hash('x'),size:1}));
 await downloadPool([...files,files[0]],{root,threads:3,onFile:()=>completed++,fetcher:async()=>{active++;max=Math.max(active,max);await new Promise(r=>setTimeout(r,15));active--;return new Response('x');}});
 assert.equal(max,3);assert.equal(completed,9);
});
test('ZIP extraction rejects traversal before writing outside the destination',async t=>{
 const root=await temporary(t),archive=join(root,'bad.zip');await writeFile(archive,zipSync({'../outside.dll':new Uint8Array([1])}));
 await assert.rejects(extractZip(archive,join(root,'out')),/不安全/);
});
test('legacy native extraction honors exclusions',async t=>{
 const root=await temporary(t),archive=join(root,'native.zip');await writeFile(archive,zipSync({'native.dll':new Uint8Array([1]),'META-INF/x.dll':new Uint8Array([2]),'README':new Uint8Array([3])}));
 await extractZip(archive,join(root,'out'),{exclude:['META-INF/'],onlyNative:true});assert.deepEqual(await readdir(join(root,'out')),['native.dll']);
});
test('launch arguments keep spaced paths as a single argument and omit unsupported optional features',()=>{
 const meta={id:'1.21.1',javaVersion:{majorVersion:21},assetIndex:{id:'17'},mainClass:'net.minecraft.client.main.Main',arguments:{jvm:['-cp','${classpath}'],game:['--username','${auth_player_name}','--gameDir','${game_directory}',{rules:[{action:'allow',features:{is_demo_user:true}}],value:'--demo'}]}};
 const args=launchArguments(meta,{classpath:['C:/with space/a.jar'],logging:null},{dir:'C:/with space/instance',root:'C:/root',natives:'C:/native',username:'Player',memory:3});
 assert.ok(args.includes('C:/with space/instance'));assert.ok(args.includes('C:/with space/a.jar'));assert.ok(!args.includes('--demo'));assert.ok(args.includes('-Xmx3G'));assert.equal(requiredJava(meta),21);
 assert.throws(()=>launchArguments(meta,{classpath:[]},{username:'bad;name'}),/名称/);
 assert.equal(offlineUUID('Notch'),'b50ad385829d3141a2167e7d7539ba7f');
});
test('resource planning requires trusted hashes and legacy Java is inferred conservatively',()=>{
 assert.throws(()=>assetFiles({objects:{a:{hash:'bad',size:1}}},'C:/root'));
 assert.throws(()=>planFiles({inheritsFrom:'1.21'},'C:/root'));
 assert.equal(requiredJava({id:'1.12.2'}),8);assert.equal(requiredJava({id:'1.17.1'}),16);
});

test('installer commits complete receipts, rejects corrupt launch files, and protects running instances',async t=>{
 const root=await temporary(t),client='client fixture',asset='asset fixture';
 const index=JSON.stringify({objects:{'sound/test':{hash:hash(asset),size:asset.length}}});
 const meta=JSON.stringify({id:'1.21.1',mainClass:'example.Main',javaVersion:{majorVersion:21},libraries:[],downloads:{client:{url,sha1:hash(client),size:client.length}},assetIndex:{id:'test',url:'https://piston-meta.mojang.com/test-index',sha1:hash(index),size:index.length},arguments:{jvm:[],game:[]}});
 const manifest=JSON.stringify({latest:{release:'1.21.1'},versions:[{id:'1.21.1',type:'release',url:'https://piston-meta.mojang.com/test-meta',sha1:hash(meta)}]});
 const fetcher=async path=>new Response(path===MANIFEST_URL?manifest:path.endsWith('test-meta')?meta:path.endsWith('test-index')?index:path===url?client:asset);
 const core=new VanillaLauncher(root,{fetcher});await core.versions();const instance=await core.createInstance({name:'Fixture',game:'1.21.1'});
 const job=await core.install(instance.id,{threads:2});
 for(let n=0;n<200&&core.status().jobs[0].state==='running';n++)await new Promise(r=>setTimeout(r,10));
 assert.equal(core.status().jobs[0].state,'done',core.status().jobs[0].error);
 assert.equal((await core.listInstances())[0].status,'installed');
 const dir=await core.instancePath(instance.id),receipt=JSON.parse(await readFile(join(dir,'installation.json'),'utf8'));assert.equal(receipt.files.length,3);
 await writeFile(safePath(root,receipt.files[0].relative),'corrupt');await assert.rejects(core.launch(instance.id,{identity:grantLaunch({name:'Fixture',uuid:'1'.repeat(32),accessToken:'0'},()=>{})}),/缺失或损坏/);
 await writeFile(join(dir,'.amber-session.json'),JSON.stringify({pid:process.pid,game:true}));await assert.rejects(core.install(instance.id),/运行中/);
});
