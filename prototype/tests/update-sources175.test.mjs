import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {AppUpdates,releaseCandidate,mirrorURL} from '../desktop/app-updates.mjs';
import {PRODUCT_NAME,REPOSITORY_URL} from '../desktop/edition.mjs';
import {updateAssetName} from '../desktop/platform135.mjs';
import {safeURL} from '../desktop/download.mjs';
const bytes=Buffer.from('synthetic installer fixture - never a published release');
const hash=createHash('sha256').update(bytes).digest('hex');
function release(product=PRODUCT_NAME,platform='win32',arch='x64',version='1.7.5'){
 const name=updateAssetName(product,version,platform,arch),repo=product==='AMBER'?'amber-launcher':'AmberE';
 return {tag_name:'v'+version,draft:false,prerelease:version.includes('-'),assets:[{name,size:bytes.length,state:'uploaded',digest:'sha256:'+hash,browser_download_url:`https://github.com/ayr1k/${repo}/releases/download/v${version}/${name}`}],body:'fixture'};
}
async function fixture(t,options={}){
 const root=await mkdtemp(join(tmpdir(),'amber175-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const env={release:release(),head:200,body:bytes,calls:[],now:100000};
 env.fetcher=async(url,opts={})=>{env.calls.push([url,opts]);if(url.includes('api.github.com'))return Response.json(url.endsWith('/latest')?env.release:[env.release]);if(opts.method==='HEAD')return new Response(null,{status:env.head,headers:{'content-length':String(bytes.length)}});return new Response(env.body);};
 const app=await new AppUpdates(root,'1.7.4',{platform:'win32',arch:'x64',fetcher:(...args)=>env.fetcher(...args),now:()=>env.now,...options}).init();return {root,app,env};
}
test('protocol binds both products, OS, architecture and stable-only mirror paths',()=>{
 for(const product of ['AMBER','AmberE'])for(const [p,a] of [['win32','x64'],['darwin','x64'],['darwin','arm64'],['linux','x64']]){
  const r=release(product,p,a),f=releaseCandidate([r],'1.7.4',product,'stable',p,a);assert.ok(f);assert.match(mirrorURL(f,product,p,a),new RegExp('/'+product.toLowerCase()+'/1.7.5/'));assert.equal(releaseCandidate([r],'1.7.4',product==='AMBER'?'AmberE':'AMBER','stable',p,a),null);
  const bad=structuredClone(r);bad.assets[0].browser_download_url+='?redirect=evil';assert.equal(releaseCandidate([bad],'1.7.4',product,'stable',p,a),null);
 }
 assert.throws(()=>mirrorURL({name:'../x',version:'1.7.5'}));assert.throws(()=>mirrorURL({name:'AMBER-1.7.5-Setup-arm64.exe',version:'1.7.5'},'AMBER','win32','arm64'));
 assert.throws(()=>safeURL('https://amber.ayuki-ayr1k.com/private'));assert.throws(()=>safeURL('https://amber.ayuki-ayr1k.com/mirror/v1/amber/1.7.5/file.exe?url=x'));
});
test('old preferences preserve channel and default GitHub; source persists independently',async t=>{
 const {root,app}=await fixture(t);await writeFile(app.channelFile,JSON.stringify({schema:1,channel:'preview'}));const old=await new AppUpdates(root,'1.7.4').init();assert.equal(old.source,'github');assert.equal(old.channel,'preview');await old.setSource('official-hk');assert.equal(old.channel,'preview');const next=await new AppUpdates(root,'1.7.4').init();assert.equal(next.source,'official-hk');assert.equal(next.channel,'preview');await next.setChannel('stable');assert.equal(next.source,'official-hk');
});
test('GitHub and mirror verify bytes, receipts, and installation; tampering is refused',async t=>{
 for(const source of ['github','official-hk']){const {root,app,env}=await fixture(t);await app.setSource(source);assert.equal((await app.check()).phase,'available');await app.download();const file=await app.installer();assert.deepEqual(await readFile(file),bytes);const receipt=JSON.parse(await readFile(file+'.receipt.json'));assert.equal(receipt.product,PRODUCT_NAME);assert.equal(receipt.authority,'github');assert.equal(receipt.source,source);assert.ok(!env.calls.some(([url])=>url.endsWith('index.json')));await writeFile(file,'replaced');await assert.rejects(app.installer(),/校验/);}
});
test('mirror preview, unsupported platforms, missing digest and lag are failures, never current or fallback',async t=>{
 const {app,env}=await fixture(t);await app.setSource('official-hk');await app.setChannel('preview');await assert.rejects(app.check(),/仅支持稳定版/);assert.equal(env.calls.length,0);await app.setChannel('stable');env.head=404;await assert.rejects(app.check(),/尚未同步/);assert.equal(app.source,'official-hk');assert.equal(app.state.phase,'failed');env.head=200;env.release.assets[0].digest=null;await assert.rejects(app.check(),/可信摘要/);assert.equal(app.candidate,null);
 const unsupported=await fixture(t,{platform:'freebsd'});await assert.rejects(unsupported.app.check(),/不支持/);assert.equal(unsupported.env.calls.length,0);
});
test('unreachable authority cannot be replaced by mirror data',async t=>{
 const {app,env}=await fixture(t);await app.setSource('official-hk');env.fetcher=async()=>new Response(null,{status:503});await assert.rejects(app.check(),/GitHub/);assert.equal(app.state.phase,'failed');assert.equal(app.candidate,null);
});
test('changed metadata and expired candidates prevent installation',async t=>{
 const {app,env}=await fixture(t);await app.check();env.release.assets[0].digest='sha256:'+'a'.repeat(64);await assert.rejects(app.download(),/已变化/);assert.equal(app.candidate,null);env.release=release();await app.check();await app.download();env.now+=900001;await assert.rejects(app.installer(),/过期/);env.now-=900001;env.release.assets[0].digest='sha256:'+'b'.repeat(64);await assert.rejects(app.installer(),/已变化/);
});
test('checking and preference persistence exclude concurrent changes',async t=>{
 const {app,env}=await fixture(t);const original=env.fetcher;let unblock;env.fetcher=async(...a)=>{await new Promise(r=>unblock=r);return original(...a);};const check=app.check();await assert.rejects(app.setSource('official-hk'),/等待/);await assert.rejects(app.setChannel('preview'),/等待/);env.fetcher=original;unblock();await check;
 const save=app.setSource('official-hk');await assert.rejects(app.check(),/稍候/);await save;assert.equal(app.candidate,null);
});
test('cancel during metadata refresh cannot finish ready or accept source change until settled',async t=>{
 const {app,env}=await fixture(t);await app.check();const original=env.fetcher;let unblock;env.fetcher=async(...a)=>{await new Promise(r=>unblock=r);return original(...a);};const download=app.download();app.cancel();await assert.rejects(app.setSource('official-hk'),/等待/);env.fetcher=original;unblock();await assert.rejects(download);assert.equal(app.state.phase,'cancelled');await app.setSource('official-hk');assert.equal(app.state.phase,'idle');assert.equal(app.candidate,null);
});
test('mirror redirects and corrupt bytes cannot become installable; retry is explicit',async t=>{
 const {app,env}=await fixture(t);await app.setSource('official-hk');await app.check();const original=env.fetcher;env.fetcher=async(url,opts)=>url.startsWith('https://amber.')&&opts.method!=='HEAD'?new Response(null,{status:302,headers:{location:REPOSITORY_URL+'/bad'}}):original(url,opts);await assert.rejects(app.download());assert.equal(app.state.phase,'failed');env.fetcher=original;env.body=Buffer.alloc(bytes.length,1);await assert.rejects(app.download());assert.equal(app.state.phase,'failed');env.body=bytes;await app.download();assert.equal(app.state.phase,'ready');
});
test('current is reported only after successful authoritative check',async t=>{const {app,env}=await fixture(t);env.release=release(PRODUCT_NAME,'win32','x64','1.7.4');assert.equal((await app.check()).phase,'current');});
test('GitHub preview accepts prereleases, stable does not, and no channel downgrades',async t=>{
 const {app,env}=await fixture(t);env.release=release(PRODUCT_NAME,'win32','x64','1.7.5-beta.1');assert.equal((await app.check()).phase,'current');await app.setChannel('preview');assert.equal((await app.check()).release.version,'1.7.5-beta.1');await app.setSource('official-hk');await assert.rejects(app.check(),/仅支持稳定版/);assert.equal(app.channel,'preview');await app.setSource('github');env.release=release(PRODUCT_NAME,'win32','x64','1.7.3');assert.equal((await app.check()).phase,'current');
});
test('a newer invalid release cannot silently select an older available one',async t=>{
 const {app,env}=await fixture(t);const newer=release(PRODUCT_NAME,'win32','x64','1.7.6');newer.assets[0].digest=null;env.fetcher=async url=>Response.json(url.endsWith('/latest')?newer:[newer,release()]);await assert.rejects(app.check(),/可信摘要/);assert.equal(app.state.phase,'failed');assert.equal(app.candidate,null);
});

// Real local HTTP sockets; no GitHub release or installer is created.
for(const gate of ['list','latest','head'])test(`cancel aborts actual ${gate} HTTP request and prevents later requests`,async t=>{
 const {createServer}=await import('node:http');
 const {app,env}=await fixture(t);await app.setSource('official-hk');await app.check();
 const seen=[];let started,closed;
 const entered=new Promise(r=>started=r),disconnected=new Promise(r=>closed=r);
 const server=createServer((req,res)=>{
  const stage=req.method==='HEAD'?'head':req.url.includes('/latest')?'latest':'list';seen.push(stage);
  if(stage===gate){res.on('close',closed);started();return;}
  const body=JSON.stringify(stage==='latest'?env.release:[env.release]);res.writeHead(200,{'content-type':'application/json','content-length':String(Buffer.byteLength(body))});res.end(body);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();server.close();});
 const origin=`http://127.0.0.1:${server.address().port}`;
 env.fetcher=(url,options)=>fetch(origin+new URL(url).pathname,{...options});
 let timer;const bounded=p=>Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('cancellation did not settle promptly')),2000);})]).finally(()=>clearTimeout(timer));
 const download=app.download();const rejection=assert.rejects(download,/取消/);await bounded(entered);app.cancel();await bounded(rejection);await bounded(disconnected);
 assert.deepEqual(seen,{list:['list'],latest:['list','latest'],head:['list','latest','head']}[gate]);assert.equal(app.state.phase,'cancelled');assert.equal(app.controller,null);
 await app.setSource('github');assert.equal(app.state.phase,'idle');assert.equal(app.candidate,null);
});

test('an abort-ignoring fetcher cannot issue the next metadata request after cancellation',async t=>{
 const {app,env}=await fixture(t);await app.setSource('official-hk');await app.check();let releaseResponse;const calls=[];
 env.fetcher=async(url,options)=>{calls.push(url);await new Promise(r=>releaseResponse=r);return Response.json([env.release]);};
 const pending=app.download();app.cancel();releaseResponse();await assert.rejects(pending,/取消/);assert.equal(calls.length,1);assert.equal(app.state.phase,'cancelled');
});
