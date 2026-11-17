// SPDX-License-Identifier: MPL-2.0
// Planning uses the content store's version/dependency resolver. The uncreated
// target facade is read-only: no temporary instance or old JAR is installed.
import {createHash} from 'node:crypto';
import {lstat,realpath,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {ordinary170} from './library-paths170.mjs';
import {digest,safePath} from './download.mjs';
import {Modrinth} from './modrinth.mjs';

export const stamp174=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const targetSpec174=item=>Object.fromEntries(['game','loader','loaderVersion','liteVersion','optifineVersion','loaderSha1'].map(k=>[k,item[k]||null]));
export async function directory174(dir){await ordinary170(dir);const path=await realpath(dir),st=await lstat(path);if(!st.isDirectory())throw Error('Invalid game directory');return {path:process.platform==='win32'?path.toLowerCase():path,dev:String(st.dev),ino:String(st.ino)};}
export const sameDirectory174=(a,b)=>a.path===b.path||a.dev===b.dev&&a.ino===b.ino&&a.ino!=='0';
export async function contentDirectories174(dir,folders=['mods','resourcepacks','shaderpacks']){
 for(const folder of folders){const path=join(dir,folder);await ordinary170(path,{missing:true});let entries;try{entries=await readdir(path,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')continue;throw e;}if(entries.some(e=>e.isSymbolicLink()))throw Error('Linked content is not supported / 不支持链接内容');}
}
export async function snapshot174(core,content,id,{signal}={}){
 const metadata=await core.metadata(id),{dir,item}=metadata;await core.requireStopped(dir);
 if(core.jobs?.some(j=>j.state==='running'&&j.instanceId===id))throw Error('请等待此实例的任务结束');
 const directory=await directory174(dir),files=[];await contentDirectories174(dir);
 for(const row of (await content.list(id)).sort((a,b)=>a.relative.localeCompare(b.relative))){
  signal?.throwIfAborted();
  const path=safePath(dir,row.relative);let hash=null;
  try{await ordinary170(path);const st=await lstat(path);if(!st.isFile())throw Error('Invalid content file');hash=await digest(path,'sha256');}catch(e){if(e.code!=='ENOENT')throw e;}
  files.push([row.relative,hash,row.enabled,row.projectId||null,row.versionId||null]);
 }
 const stamp=stamp174({directory,target:targetSpec174(item),profile:metadata.profile?.fingerprints||null,files,manifest:await content.manifest(dir)});
 return {directory,stamp,item,shared:metadata.profile?.isolation==='shared'};
}
export function migrationEngine174(content,target){
 const core=Object.create(content.core),engine=new Modrinth(core);
 engine.api=(...args)=>content.api(...args);
 core.metadata=async()=>({item:target,dir:join(content.core.root,'migration-preview174')});
 core.contentTargetIdentity170=undefined;engine.core=core;engine.plans=new Map();
 engine.manifest=async()=>({schema:1,files:[]});
 engine.install=async()=>{throw Error('Read-only migration preview');};return engine;
}
export const filesStamp174=files=>stamp174(files.map(f=>[f.projectId,f.versionId,f.relative,f.hash,f.ignoredRequired||[]]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
export async function planMigration174(content,id,manifest,{target,signal}={}){
 const engine=target?migrationEngine174(content,target):Object.create(content),rows=[];
 engine.api=(path,options={})=>content.api(path,{...options,...(signal?{signal}: {})});
 for(const mod of manifest.mods){
  signal?.throwIfAborted();const row={title:mod.title,projectId:mod.projectId,previousVersion:mod.version,enabled:mod.enabled,status:'unknown',reason:mod.reason||'无法识别 Modrinth 项目',files:[],required:[],optional:[],warnings:[]};rows.push(row);
  if(!mod.projectId)continue;
  try{
   const versions=await engine.versions(id,mod.projectId);signal?.throwIfAborted();
   const selected=versions.find(v=>v.id===mod.versionId)||(!manifest.strict?versions[0]:null);
   if(!selected){row.status='unavailable';row.reason='目标 Minecraft / 加载器没有兼容版本';continue;}
   row.versionId=selected.id;row.version=selected.version_number;
   const plan=await engine.preview(id,selected.id,[],[],true);signal?.throwIfAborted();
   row.files=plan.files;row.required=plan.required||[];row.optional=plan.optional||[];row.warnings=plan.warnings||[];
   row.status=plan.compatible===false?'conflict':'matched';row.reason=(plan.blockers||[]).join('；');
   if(!target&&row.status==='matched'){
    const {dir}=await content.core.metadata(id),installed=await content.manifest(dir);
    for(const file of plan.files){const old=installed.files.find(f=>f.projectId===file.projectId),path=safePath(dir,old?old.relative+(old.enabled===false?'.disabled':''):file.relative);
     try{await ordinary170(path);const st=await lstat(path);if(!st.isFile()||!old||await digest(path)!==file.hash){row.status='conflict';row.reason='目标文件冲突或已被修改，请先整理实例。';}}catch(e){if(e.code!=='ENOENT')throw e;if(old){row.status='conflict';row.reason='目标文件缺失，请先整理实例。';}}
    }
   }
  }catch(error){signal?.throwIfAborted();row.status='conflict';row.reason=error.message;}
 }
 // Each root uses the existing recursive resolver. Cross-root checks prevent a
 // sequential install from silently choosing incompatible dependency versions.
 const candidates=rows.filter(r=>r.status==='matched');
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  const a=candidates[i],b=candidates[j];let conflict=false;
  for(const f of a.files)for(const g of b.files){
   if(f.projectId===g.projectId&&(f.versionId!==g.versionId||f.hash!==g.hash)||f.relative.toLowerCase()===g.relative.toLowerCase()&&f.projectId!==g.projectId)conflict=true;
   for(const [x,y]of [[f,g],[g,f]])if((x.dependencies||[]).some(d=>d.dependency_type==='incompatible'&&(d.version_id?d.version_id===y.versionId:d.project_id===y.projectId)))conflict=true;
  }
  if(conflict)for(const r of [a,b]){r.status='conflict';r.reason='所选模组之间存在版本、文件名或声明依赖冲突。';}
 }
 signal?.throwIfAborted();return {target:targetSpec174(target||(await content.core.metadata(id)).item),rows};
}
