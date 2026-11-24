// SPDX-License-Identifier: MPL-2.0
// node run.mjs <local win-unpacked> <installed QA library A> <installed QA library B> <result.json>
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {availableParallelism,cpus,tmpdir,release} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {mkdtemp,cp,mkdir,readFile,readdir,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const [pack,libraryA,libraryB,out]=process.argv.slice(2,6).map(p=>resolve(p));
const links=process.argv[6]==='--links';
const tools=dirname(fileURLToPath(import.meta.url)), temp=await mkdtemp(join(tmpdir(),'amber1710-perf-'));
const unpacked=join(temp,'app'),library=join(temp,'library');
const appDir=join(unpacked,'resources/app'),desktop=join(appDir,'desktop');
const product=JSON.parse(await readFile(join(pack,'resources/app/desktop/build-provenance.json')));
assert.equal(product.channel,'local');assert.ok(['AMBER','AmberE'].includes(product.product));
const payload=Buffer.alloc(24*1024*1024,97),index=Buffer.from('{"objects":{}}'),id='a0000000-0000-4000-8000-000000000007';
const sha=b=>createHash('sha1').update(b).digest('hex');
const descriptor=(name,b)=>({size:b.length,sha1:sha(b),url:'https://piston-data.mojang.com/amber-qa/'+name});
const game='qa-1710',meta={id:game,mainClass:'net.minecraft.client.main.Main',libraries:[],arguments:{game:[]},javaVersion:{majorVersion:21},assetIndex:{id:game,...descriptor('index',index)},downloads:{client:descriptor('client',payload)}};
const server=createServer((req,res)=>{
 const data=req.url==='/amber-qa/index'?index:req.url==='/amber-qa/client'?payload:null;
 if(!data){res.writeHead(404);res.end();return;}
 // Intentionally a single-stream origin. Range requests receive a valid full response.
 res.writeHead(200,{'Content-Length':data.length,ETag:'"amber1710"'});
 if(req.method==='HEAD'){res.end();return;}
 let offset=0;
 const timer=setInterval(()=>{const end=Math.min(offset+32768,data.length);res.write(data.subarray(offset,end));offset=end;if(end===data.length){clearInterval(timer);res.end();}},32);
 res.once('close',()=>clearInterval(timer));
});
function patch(text,where,replacement){assert.equal(text.split(where).length,2,where);return text.replace(where,()=>replacement);}
async function copyIfPresent(source,dest){
 try{await cp(source,dest,{recursive:true});}catch(e){if(e.code!=='ENOENT')throw e;}
}
async function fixture(){
 await mkdir(join(library,'instances'),{recursive:true});
 const inputs=[];
 for(const [i,source] of [libraryA,libraryB].entries()){
  const entries=await readdir(join(source,'instances'));assert.equal(entries.length,1);
  const original=join(source,'instances',entries[0]);
  const item=JSON.parse(await readFile(join(original,'instance.json')));
  assert.equal(item.status,'installed');assert.ok(['forge','fabric'].includes(item.loader));
  inputs.push({game:item.game,loader:item.loader,loaderVersion:item.loaderVersion,metadataSha1:item.metadataSha1});
  for(const name of ['libraries','assets','versions'])await copyIfPresent(join(source,name),join(library,name));
  for(let n=0;n<3;n++){
   const serial=i*3+n+1,clone='a0000000-0000-4000-8000-00000000000'+serial,dest=join(library,'instances',clone);
   await mkdir(dest);
   for(const name of ['version.json','loader.json','installation.json','mods','natives','config','resourcepacks','shaderpacks'])await copyIfPresent(join(original,name),join(dest,name));
   const record={...item,id:clone,name:item.loader+' QA '+serial};delete record.javaPath;
   await writeFile(join(dest,'instance.json'),JSON.stringify(record));
  }
 }
 const dest=join(library,'instances',id);
 await mkdir(dest);await writeFile(join(dest,'version.json'),JSON.stringify(meta));
 await writeFile(join(dest,'instance.json'),JSON.stringify({schema:1,id,icon:'grass',name:'Controlled download',game,loader:'vanilla',status:'metadata-ready',createdAt:'2025-01-01T00:00:00Z',metadataSha1:sha(JSON.stringify(meta))}));
 return inputs;
}
function started(command,args,options){
 const child=spawn(command,args,{windowsHide:true,stdio:'inherit',...options});
 return {child,done:new Promise((ok,fail)=>{child.once('error',fail);child.once('exit',ok);})};
}
function summarize(sample,tree){
 const points=tree.filter(row=>row.t>=sample.start&&row.t<=sample.end);
 assert.ok(points.length>=10,'missing process tree samples');
 let cpu=0;
 for(let i=1;i<points.length;i++){
  for(const p of points[i].procs){const previous=points[i-1].procs.find(v=>v.pid===p.pid);if(previous)cpu+=p.cpu-previous.cpu;}
 }
 const avg=key=>points.reduce((a,row)=>a+row.procs.reduce((v,p)=>v+p[key],0),0)/points.length/1048576;
 const sec=(sample.end-sample.start)/1000;
 return {...sample,treeSamples:points.length,processes:[...new Set(points.map(r=>r.procs.length))],cpuOneCorePct:100000*cpu/(points.at(-1).t-points[0].t),privateMiB:avg('private'),workingSetMiB:avg('ws'),ipcPerSec:Object.entries(sample.calls).filter(([k])=>k.startsWith('amber:')).reduce((sum,[,v])=>sum+v,0)/sec,domBatchesPerSec:sample.dom/sec};
}
try{
 await cp(pack,unpacked,{recursive:true});
 const inputs=await fixture();
 const {Settings}=await import(pathToFileURL(join(desktop,'workflows.mjs')).href);
 const settings=new Settings(library),defaults=await settings.get();
 await settings.save({...defaults,network:{...defaults.network,mode:'official',fallback:false}});
 let main=await readFile(join(desktop,'main.mjs'),'utf8');
 const handle='ipcMain.handle(channel, async (event, ...args) => {';
 main=patch(main,handle,handle+'\n      counts[channel]=(counts[channel]||0)+1;');
 const create='await createWindow();schedules.start();';
 main=patch(main,create,create+"\n  import('./qa-observe.mjs').then(m=>m."+(links?'links':'observe')+"({app,window,core,counts,network,rooms,sakura}));");
 main="const counts=globalThis.benchCounts={};\n"+main;
 await writeFile(join(desktop,'main.mjs'),main);
 const coreFile=join(desktop,'core.mjs'),list='async listInstances() {';
 await writeFile(coreFile,patch(await readFile(coreFile,'utf8'),list,list+"\n    globalThis.benchCounts.listScans=(globalThis.benchCounts.listScans||0)+1;"));
 await cp(join(tools,links?'links.mjs':'observe.mjs'),join(desktop,'qa-observe.mjs'));
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const result={product:product.product,commit:product.commit,dirty:product.dirty,version:product.version,windows:release(),cpu:cpus()[0].model,logical:availableParallelism(),inputs,sha1:sha(payload),trials:[]};
 for(let n=1;n<=(links?1:3);n++){
  const profile=join(temp,'user'+n),resultPath=join(profile,'observed.json'),trace=join(profile,'tree.jsonl');
  await mkdir(profile);await writeFile(join(profile,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
  // Reset only artifacts created by this benchmark's previous download.
  for(const file of [join(library,'versions',game),join(library,'assets/indexes',game+'.json'),join(library,'instances',id,'download-task.json'),join(library,'instances',id,'installation.json')])await rm(file,{recursive:true,force:true});
  const recordPath=join(library,'instances',id,'instance.json'),record=JSON.parse(await readFile(recordPath));record.status='metadata-ready';await writeFile(recordPath,JSON.stringify(record));
  const env={...process.env,AMBER_SMOKE_ROOT:profile,AMBER_BENCH_REPORT:resultPath,AMBER_BENCH_STARTED:String(Date.now()),AMBER_BENCH_BYTES:String(payload.length),AMBER_BENCH_ID:id,AMBER_BENCH_ORIGIN:'http://127.0.0.1:'+server.address().port};delete env.ELECTRON_RUN_AS_NODE;
  const app=started(join(unpacked,product.product+'.exe'),['--qa-ui'],{env});
  const tree=started('powershell.exe',['-NoProfile','-File',join(tools,'tree.ps1'),'-RootId',String(app.child.pid),'-OutputFile',trace]);
  const timeout=setTimeout(()=>app.child.kill(),140000);
  let code;try{code=await app.done;}finally{clearTimeout(timeout);}
  const sampler=await tree.done;
  const report=JSON.parse(await readFile(resultPath,'utf8'));
  assert.equal(code,0,report.error);assert.equal(sampler,0);
  if(links){await writeFile(out,JSON.stringify(report,null,2)+'\n');break;}
  const rows=(await readFile(trace,'utf8')).trim().split(/\r?\n/).map(JSON.parse);
  report.samples=report.samples.map(s=>summarize(s,rows));result.trials.push(report);
  await writeFile(out,JSON.stringify(result,null,2)+'\n');
  console.log('trial',n,report.samples.map(s=>[s.scene,s.cpuOneCorePct.toFixed(1),s.calls.listScans]),report.downloadMs);
 }
}finally{server.closeAllConnections();server.close();await rm(temp,{recursive:true,force:true,maxRetries:5,retryDelay:300});}
