// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {atomicJson} from './core.mjs';
import {offlineTemurin,legacyChecksums,verifyTemurinSignature,checksumOf,unpackTemurin,rememberTemurin} from './temurin-provenance.mjs';
import {systemJavaCandidates,SystemJavaUnavailable} from './system-java.mjs';
import {promisify} from 'node:util';
import {mkdir, mkdtemp, readFile, rename, rm} from 'node:fs/promises';
import {basename, dirname, join, isAbsolute} from 'node:path';
import {hostPlatform,javaArchitectureMatches} from './platform135.mjs';
import {mojangCandidates,treeFingerprint,verifiedMojangHome} from './java-provenance.mjs';
import {TaskQueue} from './task-queue132.mjs';
import {ordinary170,inside170} from './library-paths170.mjs';
import {officialFetch, download, safePath, ensureParents} from './download.mjs';

const exec=promisify(execFile);
const probes=new TaskQueue(2);

async function readJavaProperties(path,signal){
 const env=process.platform==='win32'?{SystemRoot:process.env.SystemRoot,PATH:dirname(path)}:{PATH:'/usr/bin:/bin',LC_ALL:'C'};
 const {stdout,stderr}=await exec(path,['-XshowSettings:properties','-version'],{signal,cwd:dirname(path),windowsHide:true,timeout:10000,maxBuffer:100000,env});
 const text=stdout+'\n'+stderr,version=/java\.version\s*=\s*(\S+)/.exec(text)?.[1],architecture=/os\.arch\s*=\s*(\S+)/.exec(text)?.[1];
 if(!version)throw Error('无法识别 Java 运行时。');
 if(!javaArchitectureMatches(architecture))throw Error('Java 架构需要与启动器一致 / Java architecture must match the launcher');
 const major=Number(version.startsWith('1.')?version.split('.')[1]:version.split(/[.+_-]/)[0]);
 return {path,version,major,architecture};
}
export function inspectJava(path,signal,probe=readJavaProperties){
 return probes.run(path,()=>probe(path,signal),{signal});
}

// Managed selections (including pre-1.7.9 records) must be authenticated again
// when the instance or server is used in a later session.
export async function inspectConfiguredJava(root,item,manualProbe=inspectJava){
 if(!item.javaAuto&&!inside170(join(root,'runtimes'),item.javaPath))return manualProbe(item.javaPath);
 const rows=await discoverJava(root,{selectedPath:item.javaPath,major:item.javaMajor,purpose:item.javaAuto==='general'?'general':'import'});
 const java=rows.find(row=>row.path===item.javaPath);
 if(!java)throw Error('Java verification failed; prepare Java again / Java 来源校验失败，请重新准备');
 return java;
}

// The renderer cannot supply candidates, trust records or a probe.
export async function discoverJava(root,{signal,major,purpose='general',preparing=false,selectedPath}={},{
 host=hostPlatform(),appData=process.env.APPDATA,probe=readJavaProperties,candidates=mojangCandidates,system=systemJavaCandidates,temurin
}={}){
 const found=new Map();
 async function inspect(path,expected){
  if(found.has(path)||(selectedPath&&selectedPath!==path))return;
  signal?.throwIfAborted();
  const info=await inspectJava(path,signal,probe);
  signal?.throwIfAborted();
  if((!expected||info.major===expected)&&(!major||info.major===major)&&javaArchitectureMatches(info.architecture,host.arch))found.set(path,{...info,path});
 }
 let unavailable;
 if(purpose==='general'){
  let paths;
  try{paths=await system(host.platform,signal);}catch(error){
   signal?.throwIfAborted();
   if(!(error instanceof SystemJavaUnavailable))throw error;
   unavailable=error;paths=error.paths;
  }
  for(const path of paths){
   try{await inspect(path,major);}catch{signal?.throwIfAborted();}
  }
 }
 for(const record of await offlineTemurin(root,host,major,signal,temurin)){
  try{
   await ordinary170(record.home);
   if(await treeFingerprint(record.home,{signal})===record.hash)await inspect(record.path,record.major);
  }catch{signal?.throwIfAborted();}
 }
 if(host.platform==='win32'&&appData&&isAbsolute(appData)){
  const runtimeRoot=join(appData,'.minecraft','runtime');
  const verified=new Set();
  for(const candidate of candidates(runtimeRoot,host.arch,major)){
   signal?.throwIfAborted();
   if(verified.has(candidate.hash))continue;
   try{
    const home=await verifiedMojangHome(root,candidate,signal);
    if(home){verified.add(candidate.hash);await inspect(join(home,'bin','java.exe'),candidate.major);}
   }catch{signal?.throwIfAborted();}
  }
 }
 signal?.throwIfAborted();
 if(unavailable&&!found.size&&!preparing)throw unavailable;
 return [...found.values()];
}

export async function installJava(root,major,job,signal,fetcher=fetch,probe=readJavaProperties,{pins=legacyChecksums(hostPlatform()),verify=verifyTemurinSignature}={}){
 if(![8,16,17,21,25].includes(major))throw new Error(`自动安装暂不支持 Java ${major}，请手动选择兼容的 Java。`);
 job.phase=`获取 Java ${major} 官方运行时`;
 const host=hostPlatform();if(!host.javaOS)throw Error('FreeBSD 请通过系统包管理器安装 OpenJDK，再选择 Java / Install OpenJDK using pkg, then select Java');
 const extension=host.platform==='win32'?'.zip':'.tar.gz';
 const url=`https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=${host.javaArch}&image_type=jre&os=${host.javaOS}&vendor=eclipse`;
 const response=await officialFetch(url,{fetcher,sameOrigin:true,signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
 const releases=await response.json(),pkg=releases[0]?.binary?.package;
 if(!pkg||!pkg.name.endsWith(extension)||!/^[a-f0-9]{64}$/.test(pkg.checksum))throw Error('Adoptium 未返回可校验的 Java 包。');
 const archive=safePath(root,'runtimes/downloads/'+pkg.checksum+extension);
 await ensureParents(root,archive);
 job.phase=`下载 Java ${major}`;
 await download({path:archive,url:pkg.link,hash:pkg.checksum,algorithm:'sha256',size:pkg.size,label:'Temurin Java'},{root,signal,fetcher,onBytes:n=>job.transferred+=n});
 const bytes=await readFile(archive,{signal});
 if(checksumOf(bytes)!==pkg.checksum)throw Error('Java archive checksum mismatch');
 let signature;
 if(pins[major]!==pkg.checksum){
  if(!pkg.signature_link)throw Error('Adoptium did not supply a runtime signature / 缺少 Java 来源签名');
  const response=await officialFetch(pkg.signature_link,{fetcher,signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
  const chunks=[];let size=0;
  for await(const chunk of response.body){
   size+=chunk.length;if(size>16384)throw Error('Invalid Temurin signature');chunks.push(chunk);
  }
  signature=Buffer.concat(chunks);
  await verify(bytes,signature);
 }
 signal.throwIfAborted();
 job.phase=`展开 Java ${major}`;
 const parent=join(root,'runtimes'),stage=await mkdtemp(join(parent,'temurin-verified-'));
 let keepStage=false;
 try{
  const exe=await unpackTemurin(bytes,stage,host);
  signal.throwIfAborted();
  const hash=await treeFingerprint(stage,{signal});
  const target=safePath(root,'runtimes/'+pkg.checksum);
  let home=stage;
  try{await rename(stage,target);home=target;}catch(error){
   if(!['EEXIST','ENOTEMPTY','EPERM','EACCES'].includes(error.code))throw error;
   try{
    await ordinary170(target);
    if(await treeFingerprint(target,{signal})===hash)home=target;
   }catch{signal.throwIfAborted();}
  }
  const path=join(home,exe);
  signal.throwIfAborted();
  const info=await inspectJava(path,signal,probe);
  signal.throwIfAborted();
  if(info.major!==major||!javaArchitectureMatches(info.architecture))throw Error('下载的 Java 与游戏版本要求不匹配。');
  await atomicJson(archive+'.proof.json',{folder:basename(home),signature:signature?.toString('base64')});
  rememberTemurin(archive,{major,hash,home,path});
  keepStage=home===stage;
  return {...info,path};
 }finally{if(!keepStage)await rm(stage,{recursive:true,force:true});}
}
