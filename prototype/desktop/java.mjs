// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {mkdir, mkdtemp, readFile, readdir, rename, rm} from 'node:fs/promises';
import {dirname, join, isAbsolute} from 'node:path';
import {hostPlatform,javaArchitectureMatches} from './platform135.mjs';
import {mojangCandidates,treeFingerprint,verifiedMojangHome} from './java-provenance.mjs';
import {TaskQueue} from './task-queue132.mjs';
import {ordinary170} from './library-paths170.mjs';
import {extractRuntimeTar} from './runtime-archive135.mjs';
import {officialFetch, download, safePath, ensureParents} from './download.mjs';
import {extractZip} from './vanilla.mjs';

const exec=promisify(execFile);
const probes=new TaskQueue(2);
const prepared=new Map();

async function readJavaProperties(path,signal){
 const {stdout,stderr}=await exec(path,['-XshowSettings:properties','-version'],{signal,cwd:dirname(path),windowsHide:true,timeout:10000,maxBuffer:100000,env:{...process.env,JAVA_TOOL_OPTIONS:'',_JAVA_OPTIONS:'',JDK_JAVA_OPTIONS:''}});
 const text=stdout+'\n'+stderr,version=/java\.version\s*=\s*(\S+)/.exec(text)?.[1],architecture=/os\.arch\s*=\s*(\S+)/.exec(text)?.[1];
 if(!version)throw Error('无法识别 Java 运行时。');
 if(!javaArchitectureMatches(architecture))throw Error('Java 架构需要与启动器一致 / Java architecture must match the launcher');
 const major=Number(version.startsWith('1.')?version.split('.')[1]:version.split(/[.+_-]/)[0]);
 return {path,version,major,architecture};
}
export function inspectJava(path,signal,probe=readJavaProperties){
 return probes.run(path,()=>probe(path,signal),{signal});
}

// The renderer cannot supply candidates, trust records or a probe.
export async function discoverJava(root,{signal,major}={},{
 host=hostPlatform(),appData=process.env.APPDATA,probe=readJavaProperties,candidates=mojangCandidates
}={}){
 const found=new Map();
 async function inspect(path,expected){
  if(found.has(path))return;
  signal?.throwIfAborted();
  const info=await inspectJava(path,signal,probe);
  signal?.throwIfAborted();
  if(info.major===expected&&javaArchitectureMatches(info.architecture,host.arch))found.set(path,{...info,path});
 }
 const known=prepared.get(root);
 for(const record of known?.values()||[]){
  if(major&&record.major!==major)continue;
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
 return [...found.values()];
}

async function archiveJavaPath(dir,signal){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  signal.throwIfAborted();
  const path=join(dir,entry.name);
  if(entry.isFile()&&entry.name===hostPlatform().javaName)return path;
  if(entry.isDirectory()){const child=await archiveJavaPath(path,signal);if(child)return child;}
 }
}

export async function installJava(root,major,job,signal,fetcher=fetch,probe=readJavaProperties){
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
 if(createHash('sha256').update(bytes).digest('hex')!==pkg.checksum)throw Error('Java archive checksum mismatch');
 job.phase=`展开 Java ${major}`;
 const parent=join(root,'runtimes'),stage=await mkdtemp(join(parent,'temurin-verified-'));
 let keepStage=false;
 try{
  if(extension==='.zip')await extractZip(bytes,stage);else await extractRuntimeTar(bytes,stage);
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
  const path=await archiveJavaPath(home,signal);
  if(!path)throw Error('下载的运行时缺少 Java。');
  signal.throwIfAborted();
  const info=await inspectJava(path,signal,probe);
  signal.throwIfAborted();
  if(info.major!==major||!javaArchitectureMatches(info.architecture))throw Error('下载的 Java 与游戏版本要求不匹配。');
  if(!prepared.has(root))prepared.set(root,new Map());
  prepared.get(root).set(major,{major,hash,home,path});
  keepStage=home===stage;
  return {...info,path};
 }finally{if(!keepStage)await rm(stage,{recursive:true,force:true});}
}
