// SPDX-License-Identifier: MPL-2.0
import {readFile,mkdir,writeFile,copyFile,stat} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {safePath,ensureParents,download} from './download.mjs';
import {requiredJava} from './vanilla.mjs';
import {inspectJava} from './java.mjs';
import {runInstaller,adoptInstalledProfile} from './loaders.mjs';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
export async function installOptifine(core,id,path){
 const {dir,item,meta}=await core.metadata(id);await core.requireStopped(dir);
 if((await stat(path)).size>100_000_000)throw Error('OptiFine JAR 超过大小限制。');
 let valid=false;unzipSync(await readFile(path),{filter:f=>{if(f.name==='optifine/Installer.class')valid=true;return false;}});if(!valid)throw Error('请选择从 OptiFine 官网下载的安装器 JAR。');
 const java=item.javaPath?await inspectJava(item.javaPath):(await core.scanJava()).find(j=>j.major===requiredJava(meta));if(!java)throw Error('请先准备 Java。');
 return core.startJob(id,'loader',async(job,signal)=>{
  job.phase='准备 OptiFine 独立安装';const work=safePath(core.root,'loader-work/'+randomUUID());await mkdir(work,{recursive:true});const installer=join(work,'optifine-installer.jar');await copyFile(path,installer);
  const baseDir=safePath(work,'versions/'+meta.id);await mkdir(baseDir,{recursive:true});const client=meta.downloads.client;
  await download({path:join(baseDir,meta.id+'.jar'),hash:client.sha1,size:client.size,url:client.url},{root:work,fetcher:core.fetcher,signal,onBytes:n=>job.transferred+=n});
  await writeFile(join(baseDir,meta.id+'.json'),JSON.stringify(meta));await writeFile(join(work,'launcher_profiles.json'),JSON.stringify({profiles:{}}));
  const helper=join(dirname(fileURLToPath(import.meta.url)),'java');
  await runInstaller(java.path,['-Djava.awt.headless=true','-cp',helper,'AmberOptifine',installer,work,meta.id],work,signal);signal.throwIfAborted();
  await adoptInstalledProfile(core,dir,item,meta,work,'optifine','本地官方 JAR');
 });
}
