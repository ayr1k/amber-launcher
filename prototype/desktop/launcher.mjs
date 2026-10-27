// SPDX-License-Identifier: MPL-2.0
import {requireLaunchGrant} from './launch-authorization.mjs';
import {rendererFromLog} from './graphics.mjs';
import {explainProblem} from './problems.mjs';
import {sessionAlive} from './process-session.mjs';
import { mkdir, readFile, writeFile, copyFile, statfs, rm, open } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { LauncherCore, atomicJson } from './core.mjs';
import { download, downloadPool, verified, digest, safePath, ensureParents } from './download.mjs';
import { planFiles, assetFiles, extractZip, requiredJava, launchArguments } from './vanilla.mjs';
import { fabricVersions, fabricProfile, withFabric } from './fabric.mjs';
import { liteVersions, liteProfile } from './liteloader.mjs';
import { loaderVersions, installLoader, withLoader } from './loaders.mjs';
import { discoverJava, inspectJava, installJava } from './java.mjs';

async function readSession(dir){try{const session=JSON.parse(await readFile(join(dir,'.amber-session.json'),'utf8'));return await sessionAlive(session)?session:null;}catch{return null;}}
async function logTail(path){try{const file=await open(path,'r');try{const stat=await file.stat();const buffer=Buffer.alloc(Math.min(stat.size,24000));await file.read(buffer,0,buffer.length,Math.max(0,stat.size-buffer.length));return buffer.toString().replaceAll('<![CDATA[','').replaceAll(']]>','').replace(/<\/?log4j:[^>]*>/g,'').replace(/^\s*\n/gm,'');}finally{await file.close();}}catch{return '';}}

export class VanillaLauncher extends LauncherCore {
 constructor(root,options){super(root,options);this.jobs=[];this.controllers=new Map();this.processes=new Map();this.javaCandidates=new Map();}
 status(){return {jobs:this.jobs.map(({controller,...j})=>({...j})),processes:[...this.processes.values()].map(({child,...p})=>p)};}
 async runtimeStatus(){const status=this.status();for(const instance of await this.listInstances()){if(status.processes.some(p=>p.instanceId===instance.id&&p.state==='running'))continue;const dir=await this.instancePath(instance.id),session=await readSession(dir);if(session?.game&&typeof session.logFile==='string'){const logPath=safePath(dir,'logs/'+session.logFile);status.processes.push({id:session.id,instanceId:instance.id,pid:session.pid,state:'running',startedAt:session.startedAt,javaPath:session.javaPath,javaVersion:session.javaVersion,memory:session.memory,graphics:session.graphics,logPath,tail:await logTail(logPath),renderer:rendererFromLog(await logTail(logPath))});}else if(!status.processes.some(p=>p.instanceId===instance.id)){try{const last=JSON.parse(await readFile(join(dir,'last-run.json'),'utf8'));if(['failed','exited'].includes(last.state)&&/^amber-[0-9]+\.log$/.test(last.logFile)){const logPath=safePath(dir,'logs/'+last.logFile);status.processes.push({...last,instanceId:instance.id,logPath,tail:await logTail(logPath)});}}catch{}}}return status;}
 async requireStopped(dir){this.workflowGuard?.();if(await readSession(dir))throw new Error('此实例已有运行中的游戏或启动任务，请先退出游戏。');}
 async scanJava(){const list=await discoverJava(this.root);for(const java of list)this.javaCandidates.set(java.path,java);return list;}
 async addJava(path){const java=await inspectJava(path);this.javaCandidates.set(java.path,java);return java;}
 cancel(id){const control=this.controllers.get(id);if(!control)throw new Error('任务已经结束。');const job=this.jobs.find(j=>j.id===id);if(job){job.cancellationRequested=true;job.phase='正在取消并整理文件，请稍候';}control.abort(new Error('用户取消了下载。'));}
 startJob(instanceId,kind,fn){
  this.workflowGuard?.();
  if(this.jobs.some(j=>j.state==='running'))throw new Error('请先完成或取消当前安装任务。');
  if([...this.processes.values()].some(p=>p.instanceId===instanceId&&p.state==='running'))throw new Error('请先退出此实例的游戏。');
  const controller=new AbortController();const job={id:randomUUID(),instanceId,kind,state:'running',phase:'排队准备中',completed:0,total:0,transferred:0,startedAt:new Date().toISOString()};this.jobs.push(job);this.controllers.set(job.id,controller);
  Promise.resolve().then(()=>{controller.signal.throwIfAborted();job.phase='准备中';return this.workbench && (kind.startsWith('content')||kind==='modpack') ? this.workbench.record(instanceId,kind,()=>fn(job,controller.signal),controller.signal) : fn(job,controller.signal);}).then(()=>{job.state='done';job.phase='已完成';}).catch(e=>{job.state=controller.signal.aborted?'cancelled':'failed';job.error=e.message;job.phase=job.state==='cancelled'?'已取消':'失败';}).finally(()=>{job.finishedAt=new Date().toISOString();this.controllers.delete(job.id);});return {...job};
 }
 async metadata(id){const dir=await this.instancePath(id);const item=JSON.parse(await readFile(join(dir,'instance.json'),'utf8'));const meta=JSON.parse(await readFile(join(dir,'version.json'),'utf8'));if(item.metadataSha1&&await digest(join(dir,'version.json'))!==item.metadataSha1)throw new Error('版本元数据被更改，请重新创建实例。');if(meta.id!==item.game)throw new Error('实例版本元数据不匹配。');return {dir,item,meta};}
 async loaderVersions(id,type){const {meta}=await this.metadata(id);return type==='fabric'?fabricVersions(meta.id,this.fetcher):type==='liteloader'?liteVersions(meta.id,this.fetcher):loaderVersions(meta.id,type,this.fetcher);}
 async configureLoader(id,type,version){if(type==='liteloader'){const {dir,item,meta}=await this.metadata(id);await this.requireStopped(dir);return this.startJob(id,'loader',async(job,signal)=>{job.phase='读取 LiteLoader 官方配置';const profile=await liteProfile(meta.id,version,this.fetcher,signal,this.root);await atomicJson(join(dir,'loader.json'),profile);delete item.liteVersion;delete item.liteBaseSha1;item.loader=type;item.loaderVersion=version;item.loaderSha1=await digest(join(dir,'loader.json'));item.status='metadata-ready';await atomicJson(join(dir,'instance.json'),item);});}return type==='fabric'||type==='vanilla'?this.configureFabric(id,type==='vanilla'?null:version):installLoader(this,id,type,version);}
 async fabricVersions(id){const {meta}=await this.metadata(id);return fabricVersions(meta.id,this.fetcher);}
 async configureFabric(id,version){
  const {dir,item,meta}=await this.metadata(id);await this.requireStopped(dir);
  return this.startJob(id,'loader',async(job,signal)=>{
   job.phase='读取 Fabric 配置与依赖校验值';
   const profile=version?await fabricProfile(meta.id,version,this.fetcher,signal):null;
   await atomicJson(join(dir,'loader.json'),profile);
   delete item.liteVersion;delete item.liteBaseSha1;item.loader=version?'fabric':'vanilla';item.loaderVersion=version||null;item.loaderSha1=await digest(join(dir,'loader.json'));item.status='metadata-ready';
   await atomicJson(join(dir,'instance.json'),item);
  });
 }
 async runtimeMetadata(id){const result=await this.metadata(id);if(result.item.loaderSha1){if(await digest(join(result.dir,'loader.json'))!==result.item.loaderSha1)throw Error('加载器配置校验失败。');const profile=JSON.parse(await readFile(join(result.dir,'loader.json'),'utf8'));result.meta=profile?.amberFormat?withLoader(result.meta,profile):withFabric(result.meta,profile);}return result;}
 async install(id,{threads=8}={}){
  if(process.platform!=='win32'||process.arch!=='x64')throw new Error('此开发版安装器目前支持 Windows x64。');
  if(!Number.isInteger(threads)||threads<1||threads>16)throw new Error('并发数应为 1–16。');
  const {dir,item,meta}=await this.runtimeMetadata(id);await this.requireStopped(dir);const plan=planFiles(meta,this.root);
  return this.startJob(id,'install',async(job,signal)=>{
   item.status='installing';await atomicJson(join(dir,'instance.json'),item);
   try{
    const space=await statfs(dir);if(space.bavail*space.bsize<2_000_000_000)throw new Error('可用磁盘空间不足 2 GB。');
    job.phase='下载资源索引';await download(plan.index,{root:this.root,signal,fetcher:this.fetcher,onBytes:n=>job.transferred+=n});
    const index=JSON.parse(await readFile(plan.index.path,'utf8'));const resources=assetFiles(index,this.root);const files=[...new Map([...plan.files,...resources].map(f=>[f.path,f])).values()];job.total=files.length;
    job.phase=`下载并校验游戏文件 · ${threads} 并发`;
    const poolController=new AbortController();signal.addEventListener('abort',()=>poolController.abort(signal.reason),{once:true});
    try{await downloadPool(files,{root:this.root,signal:poolController.signal,threads,fetcher:this.fetcher,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});}catch(e){poolController.abort(e);throw e;}
    signal.throwIfAborted();job.phase='准备本地库';const natives=join(dir,'natives');await mkdir(natives,{recursive:true});
    for(const archive of plan.natives)await extractZip(archive.path,natives,{exclude:archive.exclude,onlyNative:true});
    // Legacy virtual/resource layouts are materialized inside controlled directories.
    if(index.virtual||index.map_to_resources){job.phase='准备旧版资源目录';for(const [name,obj] of Object.entries(index.objects)){signal.throwIfAborted();const source=safePath(this.root,`assets/objects/${obj.hash.slice(0,2)}/${obj.hash}`);for(const targetRoot of [...(index.virtual?[join(this.root,'assets/virtual',meta.assetIndex.id)]:[]),...(index.map_to_resources?[join(dir,'resources')]:[])]){const target=safePath(targetRoot,name);await ensureParents(targetRoot,target);await copyFile(source,target);}}}
    await atomicJson(join(dir,'installation.json'),{schema:1,game:meta.id,loaderSha1:item.loaderSha1||null,metadataSha1:await digest(join(dir,'version.json')),installedAt:new Date().toISOString(),files:files.map(({path,...f})=>({...f,relative:path.slice(this.root.length+1).replaceAll('\\','/')}))});
    item.status='installed';item.javaMajor=requiredJava(meta);await atomicJson(join(dir,'instance.json'),item);
   }catch(e){item.status='incomplete';await atomicJson(join(dir,'instance.json'),item);throw e;}
  });
 }
 async prepareJava(id){const {dir,item,meta}=await this.metadata(id);await this.requireStopped(dir);return this.startJob(id,'java',async(job,signal)=>{const major=requiredJava(meta);const existing=(await this.scanJava()).find(j=>j.major===major);const java=existing||await installJava(this.root,major,job,signal);item.javaPath=java.path;item.javaMajor=major;this.javaCandidates.set(java.path,java);await atomicJson(join(dir,'instance.json'),item);job.phase=`Java ${java.version} 已就绪`;});}
 async selectJava(id,path){if(!this.javaCandidates.has(path))throw new Error('请先检测 Java 或通过文件选择器添加。');const {dir,item,meta}=await this.metadata(id);await this.requireStopped(dir);const java=await inspectJava(path);if(java.major!==requiredJava(meta))throw new Error(`此版本需要 Java ${requiredJava(meta)}。`);item.javaPath=java.path;await atomicJson(join(dir,'instance.json'),item);return java;}
 async resolveGameJava(id){const {item,meta}=await this.runtimeMetadata(id);const java=item.javaPath?await inspectJava(item.javaPath):(await this.scanJava()).find(j=>j.major===requiredJava(meta));if(!java||java.major!==requiredJava(meta))throw new Error(`请先准备 Java ${requiredJava(meta)}。`);return java;}
 async launch(id,{username='Player',memory=4,identity=null,extraJvm=[]}={}){
  requireLaunchGrant(identity);
  if(this.jobs.some(j=>j.state==='running'))throw new Error('请等待安装任务完成。');
  if([...this.processes.values()].some(p=>p.instanceId===id&&p.state==='running'))throw new Error('此实例已经在运行。');
  const {dir,item,meta}=await this.runtimeMetadata(id);await this.requireStopped(dir);await this.workbench?.recover(dir);if(item.status!=='installed')throw new Error('请先完成游戏安装。');
  const receipt=JSON.parse(await readFile(join(dir,'installation.json'),'utf8'));if((receipt.loaderSha1||null)!==(item.loaderSha1||null))throw Error('加载器配置已变更，请重新安装。');if(receipt.metadataSha1!==await digest(join(dir,'version.json')))throw new Error('版本元数据校验失败。');
  for(const f of receipt.files)if(!await verified({...f,path:safePath(this.root,f.relative)}))throw new Error('游戏文件缺失或损坏，请点击“校验 / 修复”：'+f.label);
  const java=await this.resolveGameJava(id);
  const plan=planFiles(meta,this.root);for(const archive of plan.natives)await extractZip(archive.path,join(dir,'natives'),{exclude:archive.exclude,onlyNative:true});const args=launchArguments(meta,plan,{dir,root:this.root,natives:join(dir,'natives'),username,memory,identity,extraJvm});
  await mkdir(join(dir,'logs'),{recursive:true});const logPath=join(dir,'logs',`amber-${Date.now()}.log`);
  // Keep arguments as an array: names and filesystem paths never enter a shell.
  requireLaunchGrant(identity,true);
  const lockPath=join(dir,'.amber-session.json'),sessionId=randomUUID();
  try{await writeFile(lockPath,JSON.stringify({id:sessionId,pid:process.pid,game:false}),{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;await this.requireStopped(dir);await rm(lockPath,{force:true});await writeFile(lockPath,JSON.stringify({id:sessionId,pid:process.pid,game:false}),{flag:'wx'});}
  let graphics={state:'system',mode:'system'};try{graphics=await this.beforeJavaLaunch?.(java.path)||graphics;}catch{graphics={state:'failed',mode:'unknown'};}
  const logFile=await open(logPath,'wx');
  const child=spawn(java.path,args,{cwd:dir,shell:false,windowsHide:true,detached:true,stdio:['ignore',logFile.fd,logFile.fd],env:{...process.env,JAVA_TOOL_OPTIONS:'',_JAVA_OPTIONS:'',JDK_JAVA_OPTIONS:''}});
  const record={id:randomUUID(),instanceId:id,child,pid:child.pid,state:'running',startedAt:new Date().toISOString(),logPath,tail:'',username,javaPath:java.path,javaVersion:java.version,memory,graphics,renderer:null};this.processes.set(record.id,record);
  const logTimer=setInterval(async()=>{record.tail=await logTail(logPath);record.renderer=rendererFromLog(record.tail)||record.renderer;},1200);logTimer.unref();
  child.on('error',error=>{record.state='failed';record.error=error.message;});
  const releaseLock=async()=>{try{const current=JSON.parse(await readFile(lockPath,'utf8'));if(current.id===sessionId)await rm(lockPath,{force:true});}catch{}};
  child.on('close',async(code,signal)=>{clearInterval(logTimer);record.state=code===0?'exited':'failed';record.exitCode=code;record.signal=signal;record.finishedAt=new Date().toISOString();record.tail=await logTail(logPath);record.renderer=rendererFromLog(record.tail)||record.renderer;if(record.state==='failed')record.problem=explainProblem(record.tail||record.error||`退出码 ${code}`,{crash:true});await atomicJson(join(dir,'last-run.json'),{id:record.id,state:record.state,exitCode:code,finishedAt:record.finishedAt,logFile:logPath.split(/[\\/]/).at(-1),javaPath:record.javaPath,javaVersion:record.javaVersion,memory,graphics,renderer:record.renderer}).catch(()=>{});releaseLock();});
  try{await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});await atomicJson(lockPath,{id:sessionId,pid:child.pid,game:true,startedAt:record.startedAt,javaPath:record.javaPath,javaVersion:record.javaVersion,memory,graphics,logFile:logPath.split(/[\\/]/).at(-1)});}catch(e){await releaseLock();throw e;}finally{await logFile.close();}child.unref();
  item.lastPlayed=new Date().toISOString();await atomicJson(join(dir,'instance.json'),item);return {id:record.id,pid:record.pid,logPath};
 }
}
