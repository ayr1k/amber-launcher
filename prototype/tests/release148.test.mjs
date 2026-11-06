// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {download,downloadPool,verified} from '../desktop/download.mjs';
import {segmentRanges,segmentPaths,SEGMENT_THRESHOLD} from '../desktop/download-segments148.mjs';
import {configureTransferBudget,transferStatus144} from '../desktop/task-queue132.mjs';
import {DownloadNetwork} from '../desktop/network.mjs';
import {startupStyle} from '../desktop/startup-style148.mjs';
import {contrast} from '../desktop/theme-schema.mjs';
const bytes=Buffer.alloc(SEGMENT_THRESHOLD);for(let i=0;i<bytes.length;i++)bytes[i]=i%251;
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'amber148-'));t.after(()=>rm(root,{recursive:true,force:true}));configureTransferBudget(8);t.after(()=>configureTransferBudget(8));const file={path:join(root,'file.bin'),url:'https://libraries.minecraft.net/fixture.bin',size:bytes.length,hash:createHash('sha256').update(bytes).digest('hex'),algorithm:'sha256'};return {root,file,part:file.path+'.amber-'+file.hash+'.part'};}
function server({ignore=false,wrong=false,corrupt=false,etag='"fixture"',slow=false,onRequest=()=>{}}={}){
  const requests=[];let active=0,peak=0;
  const fetcher=async(_url,{headers,signal})=>{
    const range=headers.Range,match=range&&/^bytes=(\d+)-(\d*)$/.exec(range);requests.push(range||'full');onRequest(headers);
    const ranged=match&&!ignore,start=ranged?+match[1]:0,end=ranged?(match[2]?+match[2]:bytes.length-1):bytes.length-1;
    if(start>end)return new Response(null,{status:416});
    const responseHeaders={'Content-Length':String(end-start+1),ETag:etag};
    if(ranged)responseHeaders['Content-Range']=`bytes ${wrong&&start>0?start+1:start}-${end}/${bytes.length}`;
    let position=start,closed=false;active++;peak=Math.max(peak,active);
    const close=()=>{if(!closed){closed=true;active--;}};
    const stream=new ReadableStream({async pull(controller){try{
      signal?.throwIfAborted();if(slow)await delay(2,undefined,{signal});
      if(position>end){close();controller.close();return;}
      const next=Math.min(end+1,position+256*1024);controller.enqueue(corrupt?Buffer.alloc(next-position,255):bytes.subarray(position,next));position=next;
    }catch(error){close();controller.error(error);}},cancel:close});
    return new Response(stream,{status:ranged?206:200,headers:responseHeaders});
  };return {fetcher,requests,get peak(){return peak;}};
}
test('large files use four bounded ranges and publish only verified output',async t=>{
 const {root,file,part}=await fixture(t),source=server({slow:true});let credited=0;
 const result=await download(file,{root,fetcher:source.fetcher,onBytes:n=>credited+=n});
 assert.equal(result.segmented,true);assert.equal(source.requests.length,5);assert.ok(source.peak>1&&source.peak<=4);assert.equal(credited,file.size);assert.ok(await verified(file));
 for(const path of segmentPaths(part))await assert.rejects(stat(path),{code:'ENOENT'});
});
test('unknown/small sizes and explicit single-connection budgets stay serial',async t=>{
 assert.deepEqual(segmentRanges(undefined),[]);assert.deepEqual(segmentRanges(SEGMENT_THRESHOLD-1),[]);
 const {root,file}=await fixture(t),source=server();configureTransferBudget(1);
 await download(file,{root,fetcher:source.fetcher});assert.deepEqual(source.requests,['full']);
});
test('servers ignoring Range fall back immediately without installing duplicate bytes',async t=>{
 const {root,file}=await fixture(t),source=server({ignore:true});await download(file,{root,fetcher:source.fetcher});
 assert.deepEqual(source.requests,['bytes=0-0','full']);assert.ok(await verified(file));
});
test('wrong Content-Range aborts peers and falls back to the contiguous prefix',async t=>{
 const {root,file}=await fixture(t),source=server({wrong:true});await download(file,{root,fetcher:source.fetcher});assert.ok(await verified(file));assert.ok(source.requests.some(r=>r==='full'||/^bytes=\d+-$/.test(r)));
});
test('legacy partial remains a single-stream resume',async t=>{
 const {root,file,part}=await fixture(t),source=server();await writeFile(part,bytes.subarray(0,1024));await download(file,{root,fetcher:source.fetcher});assert.deepEqual(source.requests,['bytes=1024-']);assert.ok(await verified(file));
});
test('persistent segment files resume at exact offsets and send strong If-Range',async t=>{
 const {root,file,part}=await fixture(t);await writeFile(segmentPaths(part)[0],bytes.subarray(0,1024));
 let validators=0;const source=server({onRequest:h=>{if(h['If-Range']){assert.equal(h['If-Range'],'"fixture"');validators++;}}});
 const result=await download(file,{root,fetcher:source.fetcher});assert.equal(result.resumed,true);assert.ok(source.requests.includes('bytes=1024-8388607'));assert.equal(validators,4);assert.ok(await verified(file));
});
test('cancellation drains all range workers and leaves resumable shards',async t=>{
 const {root,file,part}=await fixture(t),source=server({slow:true}),abort=new AbortController();
 let received=0;await assert.rejects(download(file,{root,fetcher:source.fetcher,signal:abort.signal,onBytes:n=>{received+=n;if(received>2*1024*1024)abort.abort(Error('fixture cancel'));}}));
 assert.equal(transferStatus144().active,0);assert.equal(transferStatus144().queued,0);assert.equal(await verified(file),false);
 const sizes=await Promise.all(segmentPaths(part).map(p=>stat(p).then(s=>s.size).catch(()=>0)));assert.ok(sizes.some(n=>n>0));
 await download(file,{root,fetcher:server().fetcher});assert.ok(await verified(file));
});
test('pause/resume preserves the task and shares bandwidth accounting across shards',async t=>{
 const {root,file}=await fixture(t),source=server({slow:true}),network=new DownloadNetwork(root,{fetcher:source.fetcher});network.configure({mode:'official',fallback:false});
 const job={id:'pause148',kind:'install'};let paused=false,charged=0;
 network.bandwidth.take=async n=>{charged+=n;};
 await network.run(job,async()=>{const task=download(file,{root,fetcher:network.request,onBytes:n=>{if(n>0&&!paused){paused=true;network.pause(job.id,true);}}});
   for(let i=0;i<100&&!paused;i++)await delay(5);assert.ok(paused);await delay(30);const count=source.requests.length;await delay(30);assert.equal(source.requests.length,count);network.pause(job.id,false);await task;
 });assert.ok(charged>=file.size);assert.ok(await verified(file));assert.equal(transferStatus144().active,0);
});
test('several large files share the global budget without nested admission deadlock',async t=>{
 const {root,file}=await fixture(t),source=server({slow:true});configureTransferBudget(2);
 await downloadPool([file,{...file,path:join(root,'other.bin')}],{root,threads:2,fetcher:source.fetcher});assert.ok(source.peak<=2);assert.ok(await verified(file));assert.equal(transferStatus144().active,0);
});
test('changed ETag and encoded range responses cannot be concatenated',async t=>{
 const {root,file}=await fixture(t),source=server();let calls=0;
 await download(file,{root,fetcher:async(u,o)=>{const r=await source.fetcher(u,o);if(++calls>1&&/\d+-\d+$/.test(o.headers.Range||'')){r.headers.set('etag','"changed"');r.headers.set('content-encoding','gzip');}return r;}});assert.ok(await verified(file));
});
test('segmented checksum failure falls back to the other source and never publishes bad data',async t=>{
 const {root,file}=await fixture(t),official=server(),mirror=server({corrupt:true}),network=new DownloadNetwork(root,{fetcher:official.fetcher,mirrorFetch:mirror.fetcher});network.configure({mode:'mainland'});
 await network.run({id:'hash148',kind:'install'},()=>download(file,{root,fetcher:network.request}));assert.ok(await verified(file));assert.ok(official.requests.length>0);
});
test('startup honors colors, radius and motion while protecting text contrast',()=>{
 for(const theme of ['light','dark','system'])for(const dark of [true,false]){const s=startupStyle({theme,uiStyle:'rounded',motion:false},dark);assert.equal(s.radius,12);assert.equal(s.motion,false);assert.ok(contrast(s.text,s.background)>=4.5);assert.ok(contrast(s.muted,s.background)>=4.5);}
 const s=startupStyle({appearance:{enabled:true,mode:'custom',background:'#ffffff',text:'#ffffff',muted:'#ffffff',radius:20}});assert.equal(s.radius,20);assert.ok(contrast(s.text,s.background)>=4.5);
 assert.doesNotThrow(()=>startupStyle({appearance:{enabled:true,background:'url(evil)'}}));
});
