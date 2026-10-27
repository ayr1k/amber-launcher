// SPDX-License-Identifier: MPL-2.0
import {instanceLoaders} from './compatibility.mjs';
import { readFile, readdir, copyFile, rename, unlink, constants, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID,createHash } from 'node:crypto';
import { beginTransaction,finishTransaction,recoverInstance } from './recovery.mjs';
import { atomicJson } from './core.mjs';
import { officialFetch, safeURL, safePath, ensureParents, downloadPool, verified } from './download.mjs';
const manifestStamp=m=>createHash('sha256').update(JSON.stringify(m.files)).digest('hex');
const depKey=(file,index)=>(file.versionId||file.id)+':'+index;
const ignored=(file,d,index)=>d.dependency_type==='required'&&(file.ignoredRequired||[]).includes(depKey(file,index));
const folders={mod:'mods',resourcepack:'resourcepacks',shader:'shaderpacks'};
const id=v=>{if(typeof v!=='string'||!/^[-\w]{1,100}$/.test(v))throw Error('无效项目或版本 ID。');return v;};
export class Modrinth {
 constructor(core){this.core=core;this.plans=new Map();}
 async api(path,{signal}={}){const r=await officialFetch('https://api.modrinth.com/v2/'+path,{fetcher:this.core.fetcher,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});const text=await r.text();if(text.length>12_000_000)throw Error('Modrinth 响应过大。');return JSON.parse(text);}
 async categories(){if(!this.categoryCache){const rows=await this.api('tag/category');if(!Array.isArray(rows))throw Error('分类目录暂时不可用，请重试。');this.categoryCache=rows.filter(c=>typeof c.name==='string'&&/^[a-z0-9-]+$/.test(c.name)&&['mod','modpack','resourcepack','shader'].includes(c.project_type)).map(({name,project_type,header})=>({name,project_type,header}));}return this.categoryCache;}
 async search(instanceId,{query='',type='mod',offset=0,category='',sort='relevance'}={}){
  if(!['relevance','downloads','follows','newest','updated'].includes(sort))throw Error('不支持的排序方式。');
  if(category&&!(await this.categories()).some(c=>c.name===category&&c.project_type===type))throw Error('此分类不适用于当前内容类型，请重新选择。');
  if(type!=='modpack'&&!Object.hasOwn(folders,type))throw Error('不支持的内容类型。');
  const {item}=await this.core.metadata(instanceId);const facets=[[`versions:${item.game}`],[`project_type:${type}`]];
  if(category)facets.push([`categories:${category}`]);
  if(type==='mod')facets.push(instanceLoaders(item).map(t=>`categories:${t}`));
  const params=new URLSearchParams({query:String(query).slice(0,200),facets:JSON.stringify(facets),limit:'20',offset:String(Math.max(0,Math.min(Number(offset)||0,10000))),index:sort});
  const data=await this.api('search?'+params);return {hits:data.hits.map(p=>({id:p.project_id,icon:validIcon(p.icon_url),type:p.project_type,title:p.title,description:p.description,author:p.author,downloads:p.downloads})),total:data.total_hits};
 }
 compatible(v,item,type){return v.game_versions?.includes(item.game)&&(type!=='mod'||instanceLoaders(item).some(t=>v.loaders?.includes(t)))&&v.environment!=='dedicated_server_only'&&v.environment!=='server_only';}
 async versions(instanceId,project){const {item}=await this.core.metadata(instanceId);const p=await this.api('project/'+id(project));if(p.project_type!=='modpack'&&!Object.hasOwn(folders,p.project_type))throw Error('此内容类型暂不支持直接安装。');const query=new URLSearchParams({game_versions:JSON.stringify([item.game]),include_changelog:'false',...(p.project_type==='mod'?{loaders:JSON.stringify(instanceLoaders(item))}:{})});return (await this.api(`project/${id(project)}/version?${query}`)).filter(v=>this.compatible(v,item,p.project_type)).sort((a,b)=>(a.version_type==='release'?0:1)-(b.version_type==='release'?0:1)||Date.parse(b.date_published)-Date.parse(a.date_published));}
 async manifest(dir){try{return JSON.parse(await readFile(join(dir,'content.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return {schema:1,files:[]};throw e;}}
 async preview(instanceId,versionId,selectedOptional=[],excludedRequired=[],interactive=false){
  if(!Array.isArray(selectedOptional)||selectedOptional.length>100||selectedOptional.some(k=>typeof k!=='string'||k.length>220))throw Error('可选依赖选择无效');if(!Array.isArray(excludedRequired)||excludedRequired.length>100||excludedRequired.some(k=>typeof k!=='string'||k.length>220))throw Error('必需依赖选择无效');const selected=new Set(selectedOptional),excluded=new Set(excludedRequired),optional=[],required=[],blockers=[];
  const {item,dir}=await this.core.metadata(instanceId),installed=await this.manifest(dir),chosen=new Map(),warnings=[],incompatible=[];
  const visit=async(version,expected)=>{
   const v=await this.api('version/'+id(version));if(expected&&v.project_id!==expected)throw Error('依赖项目与版本不匹配。');
   if(chosen.has(v.project_id)){if(chosen.get(v.project_id).versionId!==v.id)throw Error('依赖要求冲突：同一项目需要两个不同版本。');return;}
   if(chosen.size>=100)throw Error('依赖超过 100 项，请分批安装。');
   const p=await this.api('project/'+id(v.project_id));const type=p.project_type;
   if(!Object.hasOwn(folders,type)||!this.compatible(v,item,type))throw Error(`${p.title} 没有适配 ${item.game} / ${item.loader} 的客户端版本。`);
   const f=v.files?.find(f=>f.primary)||v.files?.[0];if(!f||! /^[a-f0-9]{40}$/.test(f.hashes?.sha1)||!Number.isSafeInteger(f.size)||f.size<=0)throw Error('内容缺少有效的文件校验信息。');
   if(f.filename.includes('/')||f.filename.includes('\\')||!(type==='mod'?/\.(jar|litemod)$/i:/\.zip$/i).test(f.filename))throw Error('不支持的内容文件名。');
   const relative=folders[type]+'/'+f.filename;safePath(dir,relative);safeURL(f.url);
   const old=installed.files.find(x=>x.projectId===v.project_id);
   if(old&&(old.versionId!==v.id||old.hash!==f.hashes.sha1))throw Error(`${p.title} 已安装其他版本；请在“已安装内容”中将旧版本移至回收目录，再安装新版本。`);
   chosen.set(v.project_id,{projectId:v.project_id,versionId:v.id,title:p.title,version:v.version_number,type,relative,hash:f.hashes.sha1,size:f.size,url:f.url,dependencies:v.dependencies||[],ignoredRequired:(v.dependencies||[]).flatMap((d,i)=>d.dependency_type==='required'&&excluded.has(depKey(v,i))?[depKey(v,i)]:[])});
   for(const d of v.dependencies||[]){
    if(d.dependency_type==='incompatible'){incompatible.push({...d,owner:p.title});continue;}
    if(d.dependency_type==='optional'){
     if(optional.length>=100)throw Error('可选依赖过多，请分批安装。');
     const key=v.id+':'+(v.dependencies||[]).indexOf(d);let dep=null,title=d.file_name||d.project_id||d.version_id||'外部依赖',reason='';
     try{dep=d.version_id;if(!dep&&d.project_id)dep=installed.files.find(f=>f.projectId===d.project_id)?.versionId||(await this.versions(instanceId,d.project_id))[0]?.id;if(!dep)throw Error('没有兼容发行版或需要手动获取');const dv=await this.api('version/'+id(dep)),dp=await this.api('project/'+id(dv.project_id));title=dp.title;if(d.project_id&&dv.project_id!==d.project_id||!Object.hasOwn(folders,dp.project_type)||!this.compatible(dv,item,dp.project_type))throw Error('没有兼容当前实例的版本');}catch(e){reason=e.message;}
     optional.push({key,title,owner:p.title,available:!reason,reason,selected:selected.has(key)});
     if(selected.has(key)){if(reason)throw Error('可选依赖 '+title+'：'+reason);await visit(dep,d.project_id);}continue;
    }
    if(d.dependency_type!=='required')continue;
    if(required.length>=100)throw Error('依赖选项超过 100 项');
    const key=depKey(v,v.dependencies.indexOf(d)),row={key,title:d.file_name||d.project_id||d.version_id||'外部依赖',owner:p.title,selected:!excluded.has(key),available:true,reason:''};required.push(row);
    if(excluded.has(key)){warnings.push(`已跳过「${p.title}」声明的必需依赖：${row.title}。游戏可能无法启动；已安装的文件不会因此删除。`);continue;}
    try{let dep=d.version_id;if(!dep&&d.project_id)dep=installed.files.find(f=>f.projectId===d.project_id)?.versionId||(await this.versions(instanceId,d.project_id))[0]?.id;
     if(!dep)throw Error(`${p.title} 的必需依赖找不到兼容版本：${row.title}`);
     const dv=await this.api('version/'+id(dep)),dp=await this.api('project/'+id(dv.project_id));row.title=dp.title;
     await visit(dep,d.project_id);
    }catch(e){row.available=false;row.reason=e.message;if(!interactive)throw e;blockers.push(e.message);}

   }
  };
  const roots=Array.isArray(versionId)?versionId:[versionId];
  if(roots.length>32)throw Error('最多选择 32 个内容项目。');
  for(const root of roots)try{await visit(root);}catch(e){if(!interactive)throw e;blockers.push(e.message);}
  const files=[...chosen.values()];
  for(const old of installed.files.filter(f=>f.enabled!==false))for(const d of old.dependencies||[])if(d.dependency_type==='incompatible')incompatible.push({...d,owner:old.title});
  for(const d of incompatible){const conflict=[...files,...installed.files.filter(f=>f.enabled!==false)].find(f=>d.version_id?f.versionId===d.version_id:f.projectId===d.project_id);if(conflict){const message=`「${d.owner}」与「${conflict.title}」声明不兼容。请到已安装内容停用其中一个，再重新检查依赖。`;if(!interactive)throw Error(message);blockers.push(message);}}
  const paths=new Set();for(const f of files){const key=f.relative.toLowerCase();if(paths.has(key))throw Error('依赖文件名冲突。');paths.add(key);}
  warnings.push('兼容性来自作者声明；无法保证所有模组组合均可运行。光影需要 Iris 或 OptiFine 等对应支持。');
  const plan={id:randomUUID(),rootVersionId:versionId,selectedOptional:[...selected],excludedRequired:[...excluded],required,blockers,compatible:!blockers.length,instanceId,manifestStamp:manifestStamp(installed),game:item.game,loader:item.loader,loaderVersion:item.loaderVersion,loaderSha1:item.loaderSha1,files,warnings,optional,expiresAt:Date.now()+600000};this.plans.set(plan.id,plan);for(const [key,v]of this.plans)if(v.expiresAt<Date.now())this.plans.delete(key);return plan;
 }
 async install(instanceId,planId){
  const plan=this.plans.get(planId);if(!plan||plan.instanceId!==instanceId||plan.expiresAt<Date.now())throw Error('安装预览已过期，请重新预览。');
  if(plan.compatible===false)throw Error('依赖检查尚未通过，请调整勾选项目：'+plan.blockers.join('；'));
  const {item,dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);
  if(item.game!==plan.game||item.loader!==plan.loader||item.loaderVersion!==plan.loaderVersion||item.loaderSha1!==plan.loaderSha1)throw Error('实例加载器已更改，请重新预览。');
  return this.core.startJob(instanceId,'content',async(job,signal)=>{
   const manifest=await this.manifest(dir),before=structuredClone(manifest),pending=[],reactivate=[];
   if(manifestStamp(manifest)!==plan.manifestStamp)throw Error('已安装内容发生变化，请重新检查依赖后安装。');
   for(const f of plan.files){const path=safePath(dir,f.relative);await ensureParents(dir,path);const old=manifest.files.find(x=>x.projectId===f.projectId);if(old){const current=safePath(dir,old.relative+(old.enabled===false?'.disabled':''));if(old.versionId===f.versionId&&await verified({...old,path:current})){old.ignoredRequired=f.ignoredRequired||[];if(old.enabled===false){reactivate.push({old,current,target:path});}continue;}throw Error(`${f.title} 的现有文件已更改或缺失，请先整理实例。`);}try{await lstat(path);throw Error(`已有同名文件：${f.relative}，请先在实例目录处理。`);}catch(e){if(e.code!=='ENOENT')throw e;}pending.push(f);}
   job.total=pending.length;job.phase='下载 Modrinth 内容及所选依赖';
   const downloads=pending.map(f=>({...f,path:safePath(this.core.root,'content-cache/'+f.hash),label:f.title}));
   await downloadPool(downloads,{root:this.core.root,fetcher:this.core.fetcher,signal,threads:this.core.downloadThreads||8,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});signal.throwIfAborted();
   if(this.updates){for(const r of reactivate){const cached=safePath(this.core.root,'content-cache/'+r.old.hash);await ensureParents(this.core.root,cached);await copyFile(r.current,cached);}const next=[...pending.map(f=>({...f,enabled:true})),...reactivate.map(r=>({...r.old,enabled:true}))],after={...manifest,files:[...manifest.files.map(f=>({...f,enabled:reactivate.some(r=>r.old===f)?true:f.enabled})),...pending.map(f=>({...f,enabled:true}))]};job.operation='install';await this.updates.replace(dir,before,after,reactivate.map(r=>({...r.old,enabled:false})),next,f=>safePath(this.core.root,'content-cache/'+f.hash),signal,job);this.plans.delete(planId);return;}
   const tx=await beginTransaction(dir,'content.json',[...pending,...reactivate.map(r=>r.old)],reactivate.map(r=>({...r.old,relative:r.old.relative+'.disabled'})));
   const created=[];try{for(const r of reactivate){await copyFile(r.current,r.target,constants.COPYFILE_EXCL);created.push(r.target);r.old.enabled=true;}for(const f of downloads){const target=safePath(dir,f.relative);await ensureParents(dir,target);await copyFile(f.path,target,constants.COPYFILE_EXCL);created.push(target);}await atomicJson(join(dir,'content.json'),{schema:1,transactionId:tx.id,files:[...manifest.files,...pending.map(f=>({...f,enabled:true}))]});}catch(e){await recoverInstance(dir).catch(()=>{});throw e;}
   for(const r of reactivate)await unlink(r.current).catch(()=>{});
   await finishTransaction(dir);this.plans.delete(planId);
  });
 }
 async validateLaunch(instanceId){const {dir}=await this.core.metadata(instanceId),manifest=await this.manifest(dir);for(const file of manifest.files.filter(f=>f.type==='mod'&&f.enabled!==false)){await this.checkToggle(dir,manifest,file,true);try{const info=await lstat(safePath(dir,file.relative));if(!info.isFile()||info.isSymbolicLink())throw Error();}catch{throw Error(`模组「${file.title}」的文件缺失，请在模组管理中移除记录并重新安装。`);}}}
 async list(instanceId){const {dir}=await this.core.metadata(instanceId),manifest=await this.manifest(dir),rows=[];for(const [type,folder]of Object.entries(folders)){for(const entry of await readdir(join(dir,folder),{withFileTypes:true})){if(!entry.isFile()||! /\.(jar|litemod|zip)(\.disabled)?$/i.test(entry.name))continue;const relative=folder+'/'+entry.name,enabled=!entry.name.endsWith('.disabled'),base=enabled?relative:relative.slice(0,-9),saved=manifest.files.find(f=>f.relative===base);rows.push({relative,title:saved?.title||entry.name,version:saved?.version,type,enabled,managed:!!saved,ignoredRequired:saved?.ignoredRequired||[],dependencies:saved?.dependencies||[],projectId:saved?.projectId,versionId:saved?.versionId});}}for(const f of manifest.files){if(!rows.some(r=>r.relative===f.relative||r.relative===f.relative+'.disabled'))rows.push({...f,relative:f.relative+(f.enabled===false?'.disabled':''),managed:true,missing:true});}return rows;}
 async remove(instanceId,relative){const {dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);const row=(await this.list(instanceId)).find(r=>r.relative===relative);if(!row)throw Error('内容记录不存在。');return this.core.startJob(instanceId,'content-remove',async()=>{const manifest=await this.manifest(dir),base=row.enabled===false?relative.slice(0,-9):relative;const saved=manifest.files.find(f=>f.relative===base);if(saved)await this.checkToggle(dir,manifest,saved,false);const file=safePath(dir,relative);await ensureParents(dir,file);const backup=safePath(dir,'content-trash/'+randomUUID()+'/'+relative);let moved=false;try{if(!row.missing){await ensureParents(dir,backup);await rename(file,backup);moved=true;}await atomicJson(join(dir,'content.json'),{...manifest,files:manifest.files.filter(f=>f.relative!==base)});}catch(e){if(moved)await rename(backup,file);throw e;}});}
 async checkToggle(dir,manifest,target,enabling){
  const matches=(d,f)=>d.dependency_type==='required'&&(d.version_id?d.version_id===f.versionId:d.project_id===f.projectId);
  if(!enabling){const dependents=manifest.files.filter(f=>f!==target&&f.enabled!==false&&(f.dependencies||[]).some((d,i)=>!ignored(f,d,i)&&matches(d,target)));if(dependents.length)throw Error(`「${target.title}」被 ${dependents.map(f=>f.title).join('、')} 必需依赖；请先停用或移除这些模组。`);return;}
  const enabled=manifest.files.filter(f=>f.enabled!==false&&f!==target);
  for(const source of [target,...enabled])for(const d of source.dependencies||[])if(d.dependency_type==='incompatible'){const candidates=source===target?enabled:[target];const conflict=candidates.find(f=>d.version_id?d.version_id===f.versionId:d.project_id===f.projectId);if(conflict)throw Error(`「${source.title}」与「${conflict.title}」不兼容，请先停用冲突模组。`);}
  for(const [index,d] of (target.dependencies||[]).entries()){if(d.dependency_type!=='required'||ignored(target,d,index))continue;const dep=manifest.files.find(f=>matches(d,f));if(!dep||dep.enabled===false)throw Error(`启用「${target.title}」前，请先安装并启用必需依赖：${dep?.title||d.project_id||d.version_id||d.file_name||'未知依赖'}。`);try{const st=await lstat(safePath(dir,dep.relative));if(!st.isFile()||st.isSymbolicLink())throw Error();}catch{throw Error(`必需依赖「${dep.title}」的文件缺失，请重新安装。`);}}
 }
 async toggle(instanceId,relative){const {dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);if(this.core.jobs.some(j=>j.state==='running'))throw Error('请先等待安装任务完成。');const row=(await this.list(instanceId)).find(r=>r.relative===relative);if(!row)throw Error('内容文件不存在。');const from=safePath(dir,relative),to=safePath(dir,row.enabled?relative+'.disabled':relative.slice(0,-9));await ensureParents(dir,from);await ensureParents(dir,to);const manifest=await this.manifest(dir),base=row.enabled?relative:relative.slice(0,-9),saved=manifest.files.find(f=>f.relative===base);if(saved){await this.checkToggle(dir,manifest,saved,!row.enabled);saved.enabled=!row.enabled;}
  // Exclusive copy prevents Windows rename from silently overwriting another file.
  await copyFile(from,to,constants.COPYFILE_EXCL);try{await unlink(from);try{await atomicJson(join(dir,'content.json'),manifest);}catch(e){await rename(to,from);throw e;}}catch(e){await unlink(to).catch(()=>{});throw e;}return this.list(instanceId);
 }
}

export function validIcon(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='cdn.modrinth.com'&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}}
