// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {generateKey,createMessage,readPrivateKey,sign} from 'openpgp';
import {createHash} from 'node:crypto';
import {Servers} from '../desktop/servers132.mjs';
import {discoverJava,installJava,inspectConfiguredJava} from '../desktop/java.mjs';
import {trustedSystemJava,SystemJavaUnavailable} from '../desktop/system-java.mjs';
import {hostPlatform} from '../desktop/platform135.mjs';
import {checksumOf,verifyTemurinSignature} from '../desktop/temurin-provenance.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';

const rootFor=async t=>{const root=await mkdtemp(join(tmpdir(),'amber-java-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;};

test('general discovery uses the OS verifier; import never consults it',async t=>{
 const root=await rootFor(t),calls=[],host=hostPlatform('linux','x64');
 const system=async()=>{calls.push('verify');return ['/usr/lib/jvm/system/bin/java'];};
 const probe=async path=>{calls.push(path);return {major:21,architecture:'amd64'};};
 const deps={host,system,probe};
 assert.equal((await discoverJava(root,{major:21},deps)).length,1);
 assert.deepEqual(calls,['verify','/usr/lib/jvm/system/bin/java']);
 calls.length=0;
 assert.deepEqual(await discoverJava(root,{purpose:'import',major:21},deps),[]);
 assert.deepEqual(calls,[]);
});

test('ordinary scan distinguishes missing Java, incomplete verification, preparation and cancellation',async t=>{
 const root=await rootFor(t),host=hostPlatform('win32','x64'),calls=[];
 const path=join(root,'trusted','bin','java.exe');
 const deps={host,appData:null,probe:async p=>{calls.push(p);return {major:21,architecture:'amd64'};}};
 const scan=(options,system)=>discoverJava(root,options,{...deps,system});
 const unavailable=async()=>{throw new SystemJavaUnavailable();};
 assert.deepEqual(await scan({},async()=>[]),[]);
 await assert.rejects(scan({},unavailable),{code:'SYSTEM_JAVA_UNAVAILABLE'});
 assert.deepEqual(await scan({preparing:true},unavailable),[]);
 const partial=async()=>{throw new SystemJavaUnavailable([path]);};
 await assert.rejects(scan({selectedPath:path+'-other'},partial),{code:'SYSTEM_JAVA_UNAVAILABLE'});
 assert.deepEqual(calls,[]);
 assert.equal((await scan({selectedPath:path},partial))[0].path,path);
 assert.deepEqual(calls,[path]);
 const controller=new AbortController();
 await assert.rejects(scan({preparing:true,signal:controller.signal},async()=>{
  controller.abort(Error('cancel scan'));return unavailable();
 }),/cancel scan/);
});

test('system trust covers JVM files, symlinks and writable ancestors',async()=>{
 const home='/usr/lib/jvm/jdk',types=new Map([
  ['/','dir'],['/usr','dir'],['/usr/lib','dir'],['/usr/lib/jvm','dir'],[home,'dir'],
  [home+'/bin','dir'],[home+'/bin/java','file'],[home+'/lib','dir'],[home+'/lib/jvm.so','link'],
  ['/etc','dir'],['/etc/jvm.so','file']
 ]);
 let writable='',userOwned='';
 const fs={
  async lstat(path){
   const type=types.get(path);if(!type)throw Object.assign(Error('missing'),{code:'ENOENT'});
   return {uid:path===userOwned?1000:0,mode:path===writable?0o775:0o755,isDirectory:()=>type==='dir',isFile:()=>type==='file',isSymbolicLink:()=>type==='link'};
  },
  async readlink(){return '/etc/jvm.so';},
  async readdir(path){return [...types.keys()].filter(p=>p!==path&&p.slice(0,p.lastIndexOf('/'))===path).map(p=>p.split('/').pop());}
 };
 assert.equal(await trustedSystemJava(home,undefined,fs),home+'/bin/java');
 for(writable of ['/usr/lib',home+'/bin',home+'/bin/java','/etc','/etc/jvm.so'])
  await assert.rejects(trustedSystemJava(home,undefined,fs),/Writable/);
 writable='';userOwned=home+'/lib';await assert.rejects(trustedSystemJava(home,undefined,fs),/unowned/);
});

test('installed system OpenJDK serves ordinary discovery, unconfigured instances and server install',
 {skip:!process.env.AMBER_TEST_SYSTEM_JAVA},async t=>{
 const root=await rootFor(t),major=Number(process.env.AMBER_TEST_SYSTEM_JAVA);
 const rows=await discoverJava(root);
 const java=rows.find(row=>row.major===major&&(process.platform==='win32'?row.path.startsWith(process.env.ProgramFiles):row.path.startsWith('/usr/lib/jvm/')));
 if(!java&&process.platform==='linux'){
  const home='/usr/lib/jvm/java-'+major+'-openjdk-'+(process.arch==='x64'?'amd64':'arm64');
  t.diagnostic('Expected distribution executable: '+await trustedSystemJava(home));
 }
 assert.ok(java,'expected an administrator-installed distribution JRE');
 t.diagnostic('System OpenJDK '+java.version+' '+java.architecture);
 const core=new VanillaLauncher(root);
 core.runtimeMetadata=async()=>({item:{},meta:{javaVersion:{majorVersion:major}}});
 assert.equal((await core.resolveGameJava('test')).major,major);
 assert.deepEqual(await discoverJava(root,{purpose:'import',major},{appData:null}),[]);
 const service=new Servers(core),game='1.21.4',bytes=Buffer.from('test server: never launched');
 const jarURL='https://piston-data.mojang.com/test-server.jar',metaURL='https://piston-meta.mojang.com/test-server.json';
 core.fetcher=async url=>{
  if(url.endsWith('version_manifest_v2.json'))return Response.json({versions:[{id:game,url:metaURL}]});
  if(url===metaURL)return Response.json({id:game,javaVersion:{majorVersion:major},downloads:{server:{url:jarURL,size:bytes.length,sha1:createHash('sha1').update(bytes).digest('hex')}}});
  assert.equal(url,jarURL);return new Response(bytes);
 };
 core.startJob=(_id,_kind,run)=>run({transferred:0},new AbortController().signal);
 const server=await service.create({name:'Distribution JRE',type:'vanilla',game});
 await service.install(server.id);
 const stored=(await service.read(server.id)).item;
 assert.equal(stored.status,'ready');assert.equal(stored.javaPath,java.path);
});

test('stored paths in managed runtimes cannot bypass authentication',async t=>{
 const root=await rootFor(t),path=join(root,'runtimes','unknown','bin','java');
 await mkdir(dirname(path),{recursive:true});await writeFile(path,'fixture');
 let probes=0;await assert.rejects(inspectConfiguredJava(root,{javaPath:path},async()=>{probes++;}),/verification failed/i);
 assert.equal(probes,0);
});

test('a separate offline process authenticates archive and installed tree before probing',async t=>{
 const root=await rootFor(t),downloads=join(root,'runtimes/downloads');await mkdir(downloads,{recursive:true});
 const {zipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
 const bytes=Buffer.from(zipSync({'jre/bin/java.exe':Buffer.from('test java'),'jre/bin/jvm.dll':Buffer.from('test DLL')}));
 const hash=checksumOf(bytes),archive=join(downloads,hash+'.zip'),home=join(root,'runtimes',hash);
 const keys=await generateKey({type:'ecc',curve:'curve25519Legacy',userIDs:[{name:'Fixture publisher'}]});
 const signature=Buffer.from(await sign({message:await createMessage({binary:bytes}),signingKeys:await readPrivateKey({armoredKey:keys.privateKey}),detached:true,format:'binary'}));
 await writeFile(archive,bytes);await writeFile(join(root,'test-public.asc'),keys.publicKey);
 const proof={folder:hash,signature:signature.toString('base64')};
 const proofFile=archive+'.proof.json';
 if(process.platform==='win32'){
  const pkg={name:'sample.zip',size:bytes.length,checksum:hash,link:'https://github.com/test.zip',signature_link:'https://github.com/test.sig'};
  const fetcher=async url=>url===pkg.signature_link?new Response(signature):Response.json([{binary:{package:pkg}}]);
  const row=await installJava(root,17,{transferred:0},new AbortController().signal,fetcher,
   async()=>({major:17,architecture:process.arch==='arm64'?'aarch64':'amd64'}),{pins:{},verify:(b,s)=>verifyTemurinSignature(b,s,keys.publicKey)});
  assert.equal(row.path,join(home,'jre/bin/java.exe'));
  assert.deepEqual(JSON.parse(await readFile(proofFile,'utf8')),proof);
 }else{
  await mkdir(join(home,'jre/bin'),{recursive:true});await writeFile(join(home,'jre/bin/java.exe'),'test java');
  await writeFile(join(home,'jre/bin/jvm.dll'),'test DLL');await writeFile(proofFile,JSON.stringify(proof));
 }
 const cwd=dirname(fileURLToPath(import.meta.url));
 async function coldScan(){
  const code=`
   import {readFile} from 'node:fs/promises';import {join} from 'node:path';
   import {discoverJava} from '../desktop/java.mjs';import {hostPlatform} from '../desktop/platform135.mjs';
   import {verifyTemurinSignature} from '../desktop/temurin-provenance.mjs';
   globalThis.fetch=()=>{throw Error('offline')};
   const root=process.argv[1],publicKey=await readFile(join(root,'test-public.asc'),'utf8');let probes=0;
   const rows=await discoverJava(root,{purpose:'import',major:17},{host:hostPlatform('win32','x64'),appData:null,
    temurin:{pins:{},verify:(b,s)=>verifyTemurinSignature(b,s,publicKey)},
    probe:async()=>{probes++;return {major:17,architecture:'amd64'};}});
   console.log(JSON.stringify([rows.length,probes]));
  `;
  const {stdout}=await promisify(execFile)(process.execPath,['--input-type=module','-e',code,root],{cwd,windowsHide:true});
  return JSON.parse(stdout);
 }
 assert.deepEqual(await coldScan(),[1,1]);
 await writeFile(join(home,'jre/bin/jvm.dll'),'changed DLL');assert.deepEqual(await coldScan(),[0,0]);
 await writeFile(join(home,'jre/bin/jvm.dll'),'test DLL');
 await writeFile(proofFile,JSON.stringify({...proof,signature:'AAAA'}));assert.deepEqual(await coldScan(),[0,0]);
 await writeFile(proofFile,JSON.stringify({...proof,folder:'../outside'}));assert.deepEqual(await coldScan(),[0,0]);
 await writeFile(proofFile,JSON.stringify(proof));await writeFile(archive,'damaged archive');assert.deepEqual(await coldScan(),[0,0]);
});
