// SPDX-License-Identifier: MPL-2.0
import {randomUUID} from 'node:crypto';
import {copyFile,link,lstat,mkdtemp,readdir,rm,constants} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {join,toNamespacedPath} from 'node:path';
import {download,downloadPool,safePath,ensureParents,verified} from './download.mjs';
import {beginTransaction,finishTransaction,recoverInstance} from './recovery.mjs';
import {atomicJson} from './core.mjs';
import {extractPackEntries,readPackPlan} from './pack-plan176.mjs';
import {requireSpace} from './safe-copy.mjs';
import {carryCurseForgeApproval} from './curseforge-delivery176.mjs';
const allowed=new Set(['mods','config','resourcepacks','shaderpacks','saves','defaultconfigs','kubejs','scripts']);
export function packPath(root,path){safePath(root,path);const reserved=new Set(['accounts.json','preferences.json','storage.json','last-run.json','backup-policy.json','upgrade-result.json','instance.json','loader-base.json','trash-record.json','version.json','loader.json','installation.json','content.json','modpack.json','setup-report.json','download-task.json','guided-plan.json','guided-addon.json','launch-preferences.json','content-task.json','migration-report.json','content-transaction.json','recovery-report.json','.amber-session.json']);const rootData=/^[^/]+\.(json|txt|dat|cfg|properties|png)$/i.test(path)&&!reserved.has(path.toLowerCase());if(!rootData&&(!allowed.has(path.split('/')[0])||path.split('/').length<2))throw Error('整合包包含暂不支持的安装路径：'+path);return path;}

export class Modpacks{
 constructor(core,store){this.core=core;this.store=store;this.plans=new Map();}
 async preview(id,version){
  const v=await this.store.api('version/'+encodeURIComponent(version)),p=await this.store.api('project/'+encodeURIComponent(v.project_id));if(p.project_type!=='modpack')throw Error('请选择整合包 / Select a modpack');
  const f=v.files.find(f=>f.primary)||v.files[0];if(!f?.url||p.distribution===false)throw Error('未提供第三方下载，请打开项目页面 / Third-party download unavailable');if(!f?.filename.endsWith('.mrpack')&&!String(version).startsWith('cf-'))throw Error('此版本没有 MRPACK 文件。');
  const path=safePath(this.core.root,'content-cache/'+f.hashes.sha1);await download({...carryCurseForgeApproval(f,p),path,url:f.url,hash:f.hashes.sha1,size:f.size,versionId:v.id},{root:this.core.root,fetcher:this.core.fetcher});
  const {item}=id?await this.core.metadata(id):{item:{}};
  const parsed=await readPackPlan(path,{includeOptional:false,provider:this.store.curseforge,inspectMods:false});
  if(!['mrpack','curseforge'].includes(parsed.kind))throw Error('请选择整合包 / Select a modpack');
  const type=parsed.loader,required=parsed.loaderVersion,actual=item.loader==='forge'?item.loaderVersion?.replace(item.game+'-',''):item.loaderVersion;
  const compatible=item.game===parsed.game&&item.loader===type&&(!required||actual===required);
  const plan={id:randomUUID(),instanceId:id,archivePath:path,versionId:v.id,title:p.title,game:parsed.game,loader:type,loaderVersion:required,compatible,files:parsed.files,warnings:parsed.warnings,expiresAt:Date.now()+600000};for(const [key,p]of this.plans)if(p.expiresAt<Date.now())this.plans.delete(key);this.plans.set(plan.id,plan);
  return {...plan,archivePath:undefined,files:plan.files.map(({archiveName,...f})=>f),warnings:[...plan.warnings,`需要 Minecraft ${parsed.game} / ${type} ${required||''}。请在独立实例准备对应版本；安装不会覆盖已有文件。`]};
 }
 async install(id,planId){const plan=this.plans.get(planId);if(!plan||plan.instanceId!==id||plan.expiresAt<Date.now())throw Error('预览已过期，请重新读取整合包。');const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const actual=item.loader==='forge'?item.loaderVersion?.replace(item.game+'-',''):item.loaderVersion;if(item.game!==plan.game||item.loader!==plan.loader||(plan.loaderVersion&&actual!==plan.loaderVersion))throw Error('请先按整合包清单准备一致的游戏及加载器版本。');
  return this.core.startJob(id,'modpack',async(job,signal)=>{
   for(const f of plan.files){const target=safePath(dir,f.relative);await ensureParents(dir,target);try{await lstat(target);throw Error('目标实例已有文件，请使用空白实例：'+f.relative);}catch(e){if(e.code!=='ENOENT')throw e;}}
   const local=plan.files.filter(f=>f.archiveName), remote=plan.files.filter(f=>!f.archiveName);
   const localBytes=local.reduce((n,f)=>n+f.size,0), remoteBytes=remote.reduce((n,f)=>n+f.size,0);
   const base=join(dir,'.amber-setup','pack-extraction176');
   await ensureParents(dir,join(base,'placeholder'));
   // Each instance serializes pack jobs. Only remove our generated staging
   // layout left behind by an interrupted job.
   for(const entry of await readdir(base,{withFileTypes:true})){
    if(!entry.isDirectory()||!/^pack-[A-Za-z0-9]{6}$/.test(entry.name))continue;
    const old=join(base,entry.name), contents=await readdir(old,{withFileTypes:true});
    if(contents.every(file=>file.isFile()&&/^\d+$/.test(file.name)))await rm(old,{recursive:true,force:true});
   }
   await requireSpace(this.core.root,remoteBytes);
   await requireSpace(dir,localBytes+remoteBytes);
   // Cached downloads and staging can share the managed library volume.
   if(!this.core.external)await requireSpace(dir,localBytes+2*remoteBytes);
   const stage=await mkdtemp(toNamespacedPath(join(base,'pack-')));
   try{
    const embedded=local.map((f,i)=>({...f,path:join(stage,String(i))}));
    const downloads=remote.map(f=>({...f,path:safePath(this.core.root,'content-cache/'+f.hash),label:f.title}));
    job.total=plan.files.length;
    job.phase='校验并展开整合包文件';
    await extractPackEntries(plan.archivePath,embedded,signal);
    job.completed=embedded.length;
    job.phase='下载整合包客户端文件';
    await downloadPool(downloads,{root:this.core.root,fetcher:this.core.fetcher,signal,threads:this.core.downloadThreads||8,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});
    signal.throwIfAborted();
    const files=[...embedded];
    for(const [i,file] of downloads.entries()){
     const path=join(stage,String(embedded.length+i));
     await pipeline(createReadStream(file.path),createWriteStream(path,{flags:'wx'}),{signal});
     const staged={...file,path};
     if(!await verified(staged))throw Error('Pack staging checksum failed / 整合包暂存文件校验失败');
     files.push(staged);
    }
    for(const f of files){
     const target=safePath(dir,f.relative);
     await ensureParents(dir,target);
     try{await lstat(target);throw Error('目标实例已有文件，请使用空白实例：'+f.relative);}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    let hardLinks=files.length>0;
    if(hardLinks){
     const probe=join(stage,String(files.length));
     try{await link(files[0].path,probe);}
     catch(error){
      if(!['ENOTSUP','EOPNOTSUPP','ENOSYS','EPERM'].includes(error.code))throw error;
      hardLinks=false;
     }finally{await rm(probe,{force:true});}
    }
    for(const f of files){
     if(hardLinks){
      const stat=await lstat(f.path,{bigint:true});
      f.owner={dev:String(stat.dev),ino:String(stat.ino)};
     }else f.pendingCopy=true;
    }
    const tx=await beginTransaction(dir,'modpack.json',files);
    try{
     for(const [i,f] of files.entries()){
      signal.throwIfAborted();
      const target=safePath(dir,f.relative);
      if(hardLinks)await link(f.path,target);
      else{
       await requireSpace(dir,f.size);
       await copyFile(f.path,target,constants.COPYFILE_EXCL);
       const stat=await lstat(target,{bigint:true});
       tx.files[i].owner={dev:String(stat.dev),ino:String(stat.ino)};
       delete tx.files[i].pendingCopy;
      }
     }
     signal.throwIfAborted();
     await atomicJson(join(dir,'modpack.json'),{schema:1,transactionId:tx.id,title:plan.title,versionId:plan.versionId,files:plan.files.map(({archiveName,...f})=>f),warnings:plan.warnings,...(plan.localReport?{localReport:plan.localReport}:{})});
     job.publicationCommitted=true;
    }catch(e){
     if(!hardLinks)await atomicJson(join(dir,'content-transaction.json'),tx);
     await recoverInstance(dir).catch(()=>{});
     throw e;
    }
    await finishTransaction(dir);
    this.plans.delete(planId);
   }finally{await rm(stage,{recursive:true,force:true});}

  });
 }
}
