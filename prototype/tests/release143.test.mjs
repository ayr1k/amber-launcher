// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,lstat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {TransferQueue,configureTransferBudget} from '../desktop/task-queue132.mjs';
import {downloadPool,verified} from '../desktop/download.mjs';
import {DownloadNetwork} from '../desktop/network.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {ServerTrash143} from '../desktop/server-trash143.mjs';
import {DOWNLOAD_OPTIONS,validDownloadLimit} from '../desktop/download-limits143.mjs';

test('simultaneous rate-limit failures release slots and retries obey adaptive admission',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber143-retry-')),bytes=Buffer.from('retry budget'),hash=createHash('sha1').update(bytes).digest('hex');
 const calls=new Map();let release,entered=0,active=0,peak=0,successful=0;const barrier=new Promise(r=>release=r);
 const network=new DownloadNetwork(root,{fetcher:async url=>{const count=(calls.get(url)||0)+1;calls.set(url,count);if(count===1){if(++entered===64)release();await barrier;return new Response('',{status:429,headers:{'Retry-After':'0'}});}active++;if(successful<8)peak=Math.max(peak,active);await delay(15);active--;successful++;return new Response(bytes);}});
 network.configure({mode:'official',fallback:false});const files=Array.from({length:64},(_,i)=>({path:join(root,'f'+i),url:'https://cdn.modrinth.com/retry-'+i,hash,size:bytes.length}));
 configureTransferBudget(128);try{await network.run({id:'retry-budget',kind:'server-content'},()=>downloadPool(files,{root,fetcher:network.request,threads:128}));assert.equal(entered,64);assert.ok(peak<=2,`retry concurrency before recovery: ${peak}`);assert.ok((await Promise.all(files.map(verified))).every(Boolean));}finally{configureTransferBudget(8);}
});
test('128 real file transfers obey shared budget, retain hashes, and use >16 slots',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber143-download-'));const bytes=Buffer.alloc(2048,31),hash=createHash('sha256').update(bytes).digest('hex');let active=0,peak=0;const fetcher=async()=>{active++;peak=Math.max(peak,active);await delay(15);active--;return new Response(bytes);};const files=Array.from({length:180},(_,i)=>({path:join(root,'file-'+i),url:'https://cdn.modrinth.com/'+i,hash,algorithm:'sha256',size:bytes.length}));configureTransferBudget(64);try{await Promise.all([downloadPool(files.slice(0,90),{root,fetcher,threads:128}),downloadPool(files.slice(90),{root,fetcher,threads:128})]);assert.ok(peak>16);assert.ok(peak<=64);assert.ok((await Promise.all(files.map(verified))).every(Boolean));}finally{configureTransferBudget(8);}
});
test('fair admission gives new tasks slots; queued cancellation does not leak or block',async()=>{
 const q=new TransferQueue(2),starts=[];let finish;const barrier=new Promise(r=>finish=r);const a=[0,1,2,3].map(i=>q.run('a',async()=>{starts.push('a'+i);if(i<2)await barrier;}));const abort=new AbortController();const rejected=assert.rejects(q.run('cancel',()=>assert.fail('cancelled ticket ran'),{signal:abort.signal}),/cancel/);abort.abort(Error('cancel'));const b=q.run('b',()=>starts.push('b'));finish();await Promise.all([...a,b,rejected]);assert.ok(starts.indexOf('b')<starts.indexOf('a2'));assert.equal(q.active.size,0);assert.equal(q.waiting.length,0);
});
test('cancelling a 128-file pool retains partial data and retries verified ranges',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber143-cancel-')),bytes=Buffer.alloc(8192,43),hash=createHash('sha256').update(bytes).digest('hex'),controller=new AbortController();let opened=0,resumed=0;
 const files=Array.from({length:128},(_,i)=>({path:join(root,'f'+i),url:'https://cdn.modrinth.com/'+i,hash,algorithm:'sha256',size:bytes.length}));configureTransferBudget(128);
 try{await assert.rejects(downloadPool(files,{root,threads:128,signal:controller.signal,fetcher:async()=>{if(++opened===32)setTimeout(()=>controller.abort(Error('cancel transfer')),25);return new Response(new ReadableStream({start(c){c.enqueue(bytes.subarray(0,4096));}}));}}),/cancel|abort/i);
 await downloadPool(files,{root,threads:128,fetcher:async(_url,options)=>{const offset=Number(options.headers.Range?.match(/bytes=(\d+)-/)?.[1]||0);if(offset)resumed++;return new Response(bytes.subarray(offset),{status:offset?206:200,headers:offset?{'Content-Range':`bytes ${offset}-${bytes.length-1}/${bytes.length}`}:{}});}});assert.ok(resumed>0);assert.ok((await Promise.all(files.map(verified))).every(Boolean));}finally{configureTransferBudget(8);}
});
test('adaptive transfers recover and all queued files finish after rate limiting',async()=>{
 const root=await mkdtemp(join(tmpdir(),'amber143-adaptive-'));const n=new DownloadNetwork(root);await n.run({id:'test',kind:'server-content'},async()=>{n.event({path:'x'},{error:'rate-limited'});assert.equal(n.concurrency(128),2);for(let i=0;i<48;i++)n.event({path:'x'},{phase:'complete'});assert.equal(n.concurrency(128),128);});
 const bytes=Buffer.from('resume me'),hash=createHash('sha1').update(bytes).digest('hex');let first=true;const network=new DownloadNetwork(root,{fetcher:async()=>{if(first){first=false;return new Response('',{status:429,headers:{'Retry-After':'0'}});}return new Response(bytes);}});network.configure({mode:'official',fallback:false});const files=Array.from({length:80},(_,i)=>({path:join(root,'f'+i),url:'https://cdn.modrinth.com/'+i,hash,size:bytes.length}));configureTransferBudget(128);try{await network.run({id:'full',kind:'server-content'},()=>downloadPool(files,{root,fetcher:network.request,threads:128}));assert.ok((await Promise.all(files.map(verified))).every(Boolean));}finally{configureTransferBudget(8);}
 assert.equal(validDownloadLimit(128),true);for(const n of [0,129,1.5,NaN])assert.equal(validDownloadLimit(n),false);assert.ok(DOWNLOAD_OPTIONS.includes(96));
});
async function fixture(){const root=await mkdtemp(join(tmpdir(),'amber143-trash-'));const core={root,jobs:[]},servers=await new Servers(core).init();const item=await servers.create({name:'Test server',type:'paper',game:'1.21.1',port:25565});const dir=await servers.dir(item.id);await mkdir(join(dir,'world'));await writeFile(join(dir,'world','level.dat'),'world-data');await mkdir(join(root,'server-backups'));await writeFile(join(root,'server-backups','keep'),'backup-data');return {root,core,servers,item,dir,trash:new ServerTrash143(servers)};}
test('server recycle, conflict-aware restore, name confirmation, purge preserve shared data',async()=>{
 const {root,servers,item,dir,trash}=await fixture();await trash.remove(item.id);assert.equal((await servers.list()).length,0);assert.equal((await trash.list())[0].name,item.name);await assert.rejects(servers.read(item.id));await assert.rejects(lstat(dir));assert.equal((await trash.details(item.id)).files>=3,true);const other=await servers.create({name:'Other',type:'vanilla',game:'1.21.1',port:25565});await assert.rejects(trash.restore(item.id),/端口/);await assert.rejects(lstat(dir));await trash.restore(item.id,25566);assert.equal(await readFile(join(dir,'world','level.dat'),'utf8'),'world-data');assert.equal((await servers.properties(item.id)).values['server-port'],'25566');assert.equal(servers.runs.has(item.id),false);await trash.remove(item.id);await assert.rejects(trash.purge(item.id,'wrong'),/名称/);await trash.purge(item.id,item.name);assert.equal((await trash.list()).length,0);assert.equal(await readFile(join(root,'server-backups','keep'),'utf8'),'backup-data');assert.equal((await servers.read(other.id)).item.name,'Other');
});
test('running servers, jobs, tunnels and backups block removal; links and traversal block purge',async()=>{
 const {root,core,servers,item,dir,trash}=await fixture();servers.runs.set(item.id,{state:'running'});await assert.rejects(trash.remove(item.id),/停止/);servers.runs.clear();core.jobs.push({instanceId:item.id,state:'running'});await assert.rejects(trash.remove(item.id),/任务/);core.jobs=[];trash.connected=()=>true;await assert.rejects(trash.remove(item.id),/隧道/);trash.connected=()=>false;let release;const running=servers.locks.run(item.id,()=>new Promise(r=>release=r));await delay(0);await assert.rejects(trash.remove(item.id),/备份/);release();await running;await assert.rejects(trash.purge('../escape','Test'),/标识/);await trash.remove(item.id);const outside=join(root,'outside');await mkdir(outside);await writeFile(join(outside,'safe'),'safe');await symlink(outside,join(root,'server-trash',item.id,'linked'),process.platform==='win32'?'junction':'dir');await assert.rejects(trash.purge(item.id,item.name),/链接/);await assert.rejects(trash.restore(item.id,25568),/链接/);assert.equal(await readFile(join(outside,'safe'),'utf8'),'safe');assert.equal(await readFile(join(root,'server-trash',item.id,'world','level.dat'),'utf8'),'world-data');
});
