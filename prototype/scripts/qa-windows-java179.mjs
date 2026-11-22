// SPDX-License-Identifier: MPL-2.0
// Run on a Windows client with exactly one compatible, administrator-installed JDK.
import assert from 'node:assert/strict';
import {ChildProcess,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {grantLaunch} from '../desktop/launch-authorization.mjs';

const [stage,root]=process.argv.slice(2);
const major=Number(process.env.AMBER_TEST_SYSTEM_JAVA),game='1.21.4';
const sha1=bytes=>createHash('sha1').update(bytes).digest('hex');
async function waitUntil(check){
 const until=Date.now()+90000;
 while(Date.now()<until){const result=await check();if(result)return result;await delay(50);}
 throw Error('Timed out waiting for launcher job or process');
}
async function finish(core,job){
 const row=await waitUntil(()=>core.jobs.find(j=>j.id===job.id&&j.state!=='running'));
 assert.equal(row.state,'done',row.error);
}
function offline(url){throw Error('Unexpected network request: '+url);}

async function prepare(){
 const core=new VanillaLauncher(root,{fetcher:offline});
 const matches=(await core.scanJava({major})).filter(j=>j.major===major);
 assert.equal(matches.length,1,'require a single trusted compatible JDK');
 const {path,version,architecture}=matches[0],bin=dirname(path);
 const cwd=join(root,'fixture');await mkdir(cwd);
 const source='class Fixture { public static void main(String[] args) throws Exception { System.out.println("fixture-home="+System.getProperty("java.home")); Thread.sleep(400); } }';
 await writeFile(join(cwd,'Fixture.java'),source);
 execFileSync(join(bin,'javac.exe'),['Fixture.java'],{cwd,windowsHide:true});
 execFileSync(join(bin,'jar.exe'),['--create','--file','fixture.jar','--main-class','Fixture','Fixture.class'],{cwd,windowsHide:true});
 const bytes=await readFile(join(cwd,'fixture.jar')),index=JSON.stringify({objects:{}});
 const jarUrl='https://piston-data.mojang.com/test.jar',metaUrl='https://piston-meta.mojang.com/test-meta',indexUrl='https://piston-meta.mojang.com/test-index';
 const jar={url:jarUrl,size:bytes.length,sha1:sha1(bytes)};
 const meta=JSON.stringify({id:game,mainClass:'Fixture',javaVersion:{majorVersion:major},libraries:[],downloads:{server:jar,client:jar},assetIndex:{id:'fixture',url:indexUrl,sha1:sha1(index),size:index.length},arguments:{game:[]}});
 const manifest={latest:{release:game},versions:[{id:game,type:'release',url:metaUrl,sha1:sha1(meta)}]};
 core.fetcher=async url=>{
  if(url.endsWith('version_manifest_v2.json'))return Response.json(manifest);
  if(url===jarUrl)return new Response(bytes);
  if(url===metaUrl)return new Response(meta);
  if(url===indexUrl)return new Response(index);
  return offline(url);
 };
 await core.versions();
 const client=await core.createInstance({name:'Java fixture',game});
 await finish(core,await core.prepareJava(client.id));
 await finish(core,await core.install(client.id));
 const service=await new Servers(core).init();
 const server=await service.create({name:'Java fixture',type:'vanilla',game,memory:1});
 await finish(core,await service.install(server.id));
 for(const item of [(await core.metadata(client.id)).item,(await service.read(server.id)).item]){
  assert.equal(item.javaAuto,'general');assert.equal(item.javaPath,path);
 }
 await writeFile(join(root,'qa.json'),JSON.stringify({client:client.id,server:server.id,path}));
 console.log('FIRST_DISCOVERY_AND_BOTH_AUTO_SAVES_OK',version,architecture);
}

async function restart(){
 let requests=0;
 const deny=url=>{requests++;return offline(url);};globalThis.fetch=deny;
 const core=new VanillaLauncher(root,{fetcher:deny}),service=await new Servers(core).init();
 const {client,server,path}=JSON.parse(await readFile(join(root,'qa.json')));
 // Observe the real launches, including probes, without substituting the verifier or JVM.
 const calls=[],spawn=ChildProcess.prototype.spawn;
 ChildProcess.prototype.spawn=function(options){calls.push({file:options.file,args:options.args});return spawn.call(this,options);};
 function checkVerification(){
  const verified=calls.findIndex(c=>basename(c.file)==='system-java-verifier.exe');
  const probe=calls.findIndex(c=>c.file===path&&c.args.includes('-XshowSettings:properties'));
  const launch=calls.findIndex(c=>c.file===path&&!c.args.includes('-XshowSettings:properties'));
  assert.ok(verified>=0&&verified<probe&&probe<launch,JSON.stringify(calls));calls.length=0;
 }
 try{
  const identity=grantLaunch({name:'Fixture',uuid:'1'.repeat(32),accessToken:'0'},()=>{});
  const run=await core.launch(client,{identity,memory:1});
  checkVerification();
  await waitUntil(()=>core.processes.get(run.id).state!=='running');
  assert.equal(core.processes.get(run.id).exitCode,0,await readFile(run.logPath,'utf8'));
  const marker='fixture-home='+dirname(dirname(path));
  assert.ok((await readFile(run.logPath,'utf8')).includes(marker));
  // Only the inert fixture JAR runs, in a disposable server directory.
  await service.start(server,true);checkVerification();
  const record=service.runs.get(server);await record.done;
  assert.equal(record.exitCode,0,record.tail);assert.ok(record.tail.includes(marker),record.tail);
  assert.equal(requests,0);
  console.log('COLD_OFFLINE_CLIENT_AND_SERVER_VERIFIED_SAME_JDK_OK');
 }finally{ChildProcess.prototype.spawn=spawn;}
}
assert.equal(process.platform,'win32');assert.ok(Number.isInteger(major)&&major>0,'set AMBER_TEST_SYSTEM_JAVA to the installed JDK major');
globalThis.fetch=offline;
if(!stage){
 const data=await mkdtemp(join(tmpdir(),'amber-java-client-'));
 try{
  const env={...process.env,APPDATA:join(data,'appdata')};
  for(const phase of ['prepare','restart'])execFileSync(process.execPath,[fileURLToPath(import.meta.url),phase,data],{env,stdio:'inherit',windowsHide:true});
 }finally{await rm(data,{recursive:true,force:true,maxRetries:3});}
}else if(stage==='prepare')await prepare();
else if(stage==='restart')await restart();
else throw Error('Unknown QA stage');
