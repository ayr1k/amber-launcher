// SPDX-License-Identifier: MPL-2.0
import {contentState170} from './content-state170.mjs';
import {instanceLoaders} from './compatibility.mjs';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,open,lstat,readdir,rename,rm} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {ensureParents} from './download.mjs';
import {requireSpace} from './safe-copy.mjs';
import {PACK_LIMITS,packFileInfo,snapshotPack,verifyPackHash} from './pack-zip176.mjs';
import {readPackPlan} from './pack-plan176.mjs';
const problem=(en,zh)=>Error(en+' / '+zh);
const cfStamp=files=>createHash('sha256').update(JSON.stringify(files.map(f=>[f.relative,f.hash,f.size,!!f.optional,f.versionId]))).digest('hex');

export class LocalPacks{
 constructor(core,packs,workflows){
  Object.assign(this,{core,packs,workflows,plans:new Map()});
 }
 async preview(path,{signal}={}){
  const name=basename(path), stat=await packFileInfo(path);
  if(/\.json$/i.test(name)){
   if(stat.size>2_000_000)throw problem('Manifest too large','清单过大');
   const handle=await open(path,'r');
   let value;
   try{
    const bytes=Buffer.alloc(stat.size+1);
    const {bytesRead}=await handle.read(bytes,0,bytes.length,0);
    if(bytesRead!==stat.size)throw Error();
    value=JSON.parse(bytes.subarray(0,bytesRead).toString('utf8'));
   }catch{throw problem('Invalid JSON manifest','JSON 清单损坏');}
   finally{await handle.close();}
   if(value?.format==='amber-mod-list')return {kind:'mod-list',files:[],warnings:[]};
   throw problem('Not a supported mod list','不是支持的模组清单，请使用模组迁移入口');
  }
  if(this.previewController)throw problem('Pack preview is already running','请等待当前整合包预览完成');
  const controller=new AbortController();
  this.previewController=controller;
  signal=signal?AbortSignal.any([signal,controller.signal]):controller.signal;
  const id=randomUUID(), scratch=join(this.core.root,'pack-previews176'), archivePath=join(scratch,id+'.zip');
  let keep=false, copied=false;
  try{
   await ensureParents(this.core.root,archivePath);
   const now=Date.now();
   for(const entry of await readdir(scratch,{withFileTypes:true})){
    if(!entry.isFile()||!/^[-a-f0-9]{36}\.(zip|jar)$/.test(entry.name))continue;
    const old=join(scratch,entry.name);
    if((await lstat(old).catch(()=>({mtimeMs:now}))).mtimeMs<now-86_400_000)await rm(old,{force:true});
   }
   while(this.plans.size>=3){
    const oldest=[...this.plans].find(([,plan])=>!plan.inUse);
    if(!oldest)throw problem('Other imports are active','其他整合包导入正在运行');
    await this.forget(oldest[0]);
   }
   await requireSpace(scratch,stat.size);
   const {hash,size}=await snapshotPack(path,archivePath,{signal});
   copied=true;
   const parsed=await readPackPlan(archivePath,{filename:name,scratch,provider:this.packs.store.curseforge,signal});
   signal.throwIfAborted();
   if(parsed.kind==='backup')return parsed;
   keep=true;
   const expiresAt=Date.now()+1_800_000;
   const plan={...parsed,archivePath,previewId:id,archiveBytes:size,sourceHash:hash,expiresAt};
   this.plans.set(id,plan);
   plan.timer=setTimeout(()=>this.forget(id).catch(()=>{}),1_800_000).unref();
   return {...parsed,id,archiveBytes:size,files:parsed.files.map(({archiveName,url,urls,bytes,...f})=>({...f,download:!archiveName})),
    downloadBytes:parsed.files.filter(f=>!f.archiveName&&!f.optional).reduce((n,f)=>n+f.size,0)};
  }finally{
   this.previewController=null;
   if(copied&&!keep)await rm(archivePath,{force:true});
  }
 }
 async forget(id){
  if(id===undefined){this.previewController?.abort(problem('Pack preview cancelled','整合包预览已取消'));return;}
  const plan=this.plans.get(id);
  if(!plan)return;
  this.plans.delete(id);
  clearTimeout(plan.timer);
  if(plan.inUse){plan.discard=true;return;}
  await rm(plan.archivePath,{force:true});
 }
 async create(id,input){
  const plan=this.plans.get(id);if(!plan||plan.expiresAt<Date.now())throw problem('Import preview expired','导入预览已过期，请重新选择文件');
  if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>60||!Array.isArray(input.optional)||input.optional.length>PACK_LIMITS.entries||new Set(input.optional).size!==input.optional.length)throw problem('Invalid import settings','导入设置无效');
  const optionalPaths=new Set(plan.files.filter(f=>f.optional).map(f=>f.relative));
  const selectedPaths=new Set(input.optional);
  if(input.optional.some(p=>!optionalPaths.has(p)))throw problem('Invalid optional file selection','可选文件选择无效');
  const target=plan.kind!=='zip'?plan:input;
  if(typeof target.game!=='string'||typeof target.version!=='string'||!['vanilla','quilt','fabric','forge','neoforge'].includes(target.loader))throw problem('Choose game and loader versions','请选择游戏与加载器版本');
  if(target.loader==='vanilla'&&plan.files.some(f=>f.relative.startsWith('mods/')))throw problem('Mods require a loader','此包包含模组，请选择相应加载器');
  const selected=plan.files.filter(f=>!f.optional||selectedPaths.has(f.relative));
  const ids=new Set();for(const f of selected){const m=f.metadata;if(!m)continue;if(m.loaders.length&&!instanceLoaders(target).some(l=>m.loaders.includes(l)))throw problem('Mod loader mismatch: '+f.relative,'模组声明的加载器与选择不符：'+f.relative);if(m.games.length&&m.games.every(g=>/^\d+(\.\d+){1,2}$/.test(g))&&!m.games.includes(target.game))throw problem('Minecraft version mismatch: '+f.relative,'模组声明的游戏版本与选择不符：'+f.relative);for(const id of m.modIds){if(ids.has(id))throw problem('Duplicate mod ID: '+id,'包内存在重复模组标识：'+id);ids.add(id);}}
  plan.inUse=(plan.inUse||0)+1;
  try{
   await requireSpace(this.core.root,plan.archiveBytes+selected.reduce((n,f)=>n+f.size*2,0)+1073741824);
   return await this.workflows.create({requestKey:input.requestKey,name:input.name.trim(),game:target.game,loader:target.loader,version:target.version,threads:this.core.downloadThreads||8},null,null,null,null,{plan,selected:input.optional});
  }finally{
   plan.inUse--;
   if(plan.discard&&!plan.inUse)await rm(plan.archivePath,{force:true});
  }
 }
 describe({plan,selected}){
  return {schema:1,hash:plan.sourceHash,kind:plan.kind,selected:[...selected],title:plan.title,packVersion:plan.packVersion,previewId:plan.previewId,
   ...(plan.kind==='curseforge'?{fileStamp:cfStamp(plan.files)}:{})};
 }
 async retain(dir,{plan}){
  const path=join(dir,'.amber-setup','local-pack.zip'), partial=path+'.partial-'+randomUUID();
  plan.inUse=(plan.inUse||0)+1;
  try{
   await ensureParents(dir,path);
   await requireSpace(dir,plan.archiveBytes);
   // Finish the retention checkpoint before honoring a setup cancellation so
   // the instance can resume without the original picker file.
   await snapshotPack(plan.archivePath,partial,{expected:plan.sourceHash});
   await rename(partial,path);
  }finally{
   plan.inUse--;
   await rm(partial,{force:true});
   if(plan.discard&&!plan.inUse)await rm(plan.archivePath,{force:true});
  }
 }
 async install(id,record,signal){
  const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);if(record?.schema!==1||!/^[a-f0-9]{64}$/.test(record.hash)||!['zip','mrpack','curseforge'].includes(record.kind)||!Array.isArray(record.selected)||record.selected.length>PACK_LIMITS.entries)throw problem('Invalid saved import plan','保存的导入计划损坏，请检查实例');
  const path=join(dir,'.amber-setup','local-pack.zip');
  await ensureParents(dir,path);
  const exists=await lstat(path).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(!exists&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(record.previewId||'')){
   const archivePath=join(this.core.root,'pack-previews176',record.previewId+'.zip');
   await ensureParents(this.core.root,archivePath);
   const snapshot=await packFileInfo(archivePath).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
   if(snapshot){
    for(const entry of await readdir(join(dir,'.amber-setup'),{withFileTypes:true})){
     if(entry.isFile()&&/^local-pack\.zip\.partial-[a-f0-9-]{36}$/.test(entry.name))await rm(join(dir,'.amber-setup',entry.name),{force:true});
    }
    await this.retain(dir,{plan:{archivePath,archiveBytes:snapshot.size,sourceHash:record.hash}});
   }
  }
  if(!await packFileInfo(path).catch(()=>null)||!await verifyPackHash(path,record.hash,signal)){
   throw problem('Retained archive is missing or changed; select the original again','保留的整合包缺失或被修改，请重新选择原整合包');
  }
  const parsed=await readPackPlan(path,{provider:this.packs.store.curseforge,signal,inspectMods:false});
  if(parsed.kind!==record.kind)throw problem('Pack type changed','整合包类型不一致');
  if(record.kind==='curseforge'&&record.fileStamp!==cfStamp(parsed.files))throw problem('CurseForge file identities changed; preview this pack again','CurseForge 文件名称、大小或校验值已变化，请重新预览整合包');
  const optionalPaths=new Set(parsed.files.filter(f=>f.optional).map(f=>f.relative));
  const selectedPaths=new Set(record.selected);
  if(record.selected.some(p=>!optionalPaths.has(p)))throw problem('Saved optional selection is invalid','保存的可选文件选择无效');
  const files=parsed.files.filter(f=>!f.optional||selectedPaths.has(f.relative));
  if(parsed.kind!=='zip'&&(parsed.game!==item.game||parsed.loader!==item.loader||parsed.version!==(item.loaderVersion||'')))throw problem('Instance version changed','实例版本已改变，请恢复整合包要求的版本后继续');
  const skipped=[...parsed.warnings,...parsed.files.filter(f=>f.optional&&!selectedPaths.has(f.relative)).map(f=>'Optional file not selected / 未选择可选文件：'+f.relative)];
  const report={schema:1,source:'local',kind:record.kind,title:String(record.title).slice(0,100),packVersion:String(record.packVersion||'').slice(0,100),sourceHash:record.hash,importedAt:new Date().toISOString(),warnings:skipped,files:files.map(f=>({relative:f.relative,size:f.size}))};
  const key=randomUUID(),plan={id:key,instanceId:id,archivePath:path,title:report.title,game:item.game,loader:item.loader,loaderVersion:item.loader==='forge'?item.loaderVersion?.replace(item.game+'-',''):item.loaderVersion,versionId:'local-'+record.hash,files,warnings:skipped,expiresAt:Date.now()+3600000,localReport:report};
  // A crash after the transaction committed but before the workflow checkpoint is safe.
  try{const saved=JSON.parse(await readFile(join(dir,'modpack.json'),'utf8'));if(saved.versionId===plan.versionId)return;}catch(e){if(e.code!=='ENOENT')throw e;}
  this.packs.plans.set(key,plan);
  try{return await this.workflows.wait(await this.packs.install(id,key));}
  finally{this.packs.plans.delete(key);}
 }
 async report(id){const dir=await contentState170(this.core,await this.core.instancePath(id));try{const m=JSON.parse(await readFile(join(dir,'modpack.json'),'utf8'));return m.localReport||{source:'modrinth',title:m.title,packVersion:m.versionId,importedAt:null,warnings:m.warnings||[],files:[]};}catch(e){if(e.code==='ENOENT')return null;throw e;}}
}
