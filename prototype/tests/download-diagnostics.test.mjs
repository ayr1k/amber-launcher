// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {DownloadDiagnostics} from '../desktop/download-diagnostics.mjs';
import {DownloadNetwork} from '../desktop/network.mjs';
import {download, verified} from '../desktop/download.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';

test('one-second byte buckets exclude unknown values and freeze at task end', () => {
  let now = 0;
  const d = new DownloadDiagnostics(()=>now);
  d.configure({});
  assert.equal(d.speed(),null);
  now=1100; d.bytes(50); d.bytes(-200); d.bytes(NaN);
  now=2000; assert.equal(d.speed(),50);
  d.pause(true); d.bytes(900); assert.equal(d.speed(),0);
  now=5100; d.pause(false); assert.equal(d.speed(),null);
  now=6600; d.bytes(20); now=7000; assert.equal(d.speed(),20);
  for(let i=0;i<150;i++){now+=1000;d.bytes(5);}
  d.finish(); const snapshot=d.snapshot();
  assert.equal(snapshot.history.length,60); assert.equal(snapshot.speed,0);
  assert.equal(snapshot.history.reduce((a,b)=>a+b),300);
  now+=90000; assert.deepEqual(d.snapshot(),snapshot);
});

test('parallel jobs keep response sources, reused bytes, retries and histories isolated',async t=>{
  const root=await mkdtemp(join(tmpdir(),'amber-transfer-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const bytes=Buffer.alloc(7000,65), hash=createHash('sha1').update(bytes).digest('hex');
  const hostA='cdn.modrinth.com',hostB='repo.maven.apache.org';
  const file=(host,id)=>({path:join(root,id),size:bytes.length,hash,url:'https://'+host+'/private?sig=secret',label:'private-account'});
  const a=file(hostA,'one'), b=file(hostB,'two');
  await writeFile(a.path+'.amber-'+hash+'.part',bytes.subarray(0,6000));
  let failed=false;
  const network=new DownloadNetwork(root,{fetcher:async url=>{
    if(new URL(url).hostname===hostA)return new Response(bytes.subarray(6000),{status:206,headers:{'content-range':'bytes 6000-6999/7000'}});
    if(!failed){failed=true;return new Response(null,{status:503});}
    return new Response(bytes);
  }});
  network.configure({fallback:false,mode:'official',bandwidthKib:1000});
  const runner=new VanillaLauncher(root);runner.network=network;
  const jobs=[{id:'a'},{id:'b'}];runner.jobs=jobs;
  await Promise.all([a,b].map((f,i)=>network.run(jobs[i],()=>download(f,{root,fetcher:network.request}))));
  for(const [i,f] of [a,b].entries()){
    assert.ok(await verified(f));
    const rows=runner.status(jobs[i].id).jobs;
    const d=rows[i].downloadDiagnostics;
    assert.equal(rows[1-i].downloadDiagnostics,undefined);
    assert.equal(d.history.reduce((a,b)=>a+b),i===0?1000:7000);
    assert.deepEqual(d.sources,[i===0?hostA:hostB]);
    assert.equal(d.config.bandwidthKib,1000);assert.equal(d.appliedKib,1000);assert.equal(d.resumed,i===0);
    assert.equal(d.retries,i);assert.equal(d.files,0);assert.equal(d.peakFiles,1);
    assert.doesNotMatch(JSON.stringify(d),/private|secret|sig=|amber-transfer-/);
  }
  assert.equal(runner.status().jobs[0].downloadDiagnostics,undefined);
});
