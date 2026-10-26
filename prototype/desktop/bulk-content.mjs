// SPDX-License-Identifier: MPL-2.0
import {mkdir,copyFile,lstat,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {safePath,ensureParents,digest} from './download.mjs';
import {contentStamp,validateUpdateGraph,recoverModUpdate} from './mod-updates.mjs';
import {requireSpace} from './safe-copy.mjs';
const actual=f=>f.relative+(f.enabled===false?'.disabled':'');
export class BulkContent{
 constructor(core,content,updates){Object.assign(this,{core,content,updates});this.plans=new Map();}
 async snapshot(id,paths,action){
  if(!['enable','disable','remove'].includes(action)||!Array.isArray(paths)||!paths.length||paths.length>200||paths.some(p=>typeof p!=='string')||new Set(paths).size!==paths.length)throw Error('请选择 1–200 个不同的内容文件。');
  const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);
  const before=await this.content.manifest(dir),rows=await this.content.list(id),selected=[],old=[],next=[];
  for(const path of paths){const row=rows.find(r=>r.relative===path);if(!row||row.missing&&action!=='remove')throw Error('所选文件已变化或缺失，请刷新列表后重试。');
   const relative=row.enabled===false?path.slice(0,-9):path;if(row.missing){const f=before.files.find(f=>f.relative===relative);if(!f)throw Error('缺失文件记录已变化。');selected.push({...f,relative,missing:true,unchanged:false});continue;}const file=safePath(dir,path);await ensureParents(dir,file);const stat=await lstat(file);if(!stat.isFile()||stat.isSymbolicLink())throw Error('不能批量修改链接或非普通文件。');
   const saved=before.files.find(f=>f.relative===relative),hash=await digest(file);
   if(saved?.hash&&saved.hash!==hash)throw Error(`「${row.title}」的文件被外部修改，请先检查，未覆盖原文件。`);
   const f={...saved,relative,title:row.title,type:row.type,enabled:row.enabled,hash,size:stat.size,algorithm:'sha1'};
   const unchanged=action!=='remove'&&row.enabled===(action==='enable');selected.push({...f,unchanged});if(unchanged)continue;old.push(f);if(action!=='remove')next.push({...f,enabled:action==='enable'});
  }
  const after={...before,files:[...before.files.filter(f=>!old.some(o=>o.relative===f.relative)&&!selected.some(o=>o.missing&&o.relative===f.relative)),...next]};
  const blockers=[],enabled=after.files.filter(f=>f.enabled!==false),matches=(d,f)=>d.version_id?d.version_id===f.versionId:!!d.project_id&&d.project_id===f.projectId;
  for(const f of enabled)for(const [i,d]of (f.dependencies||[]).entries()){
   const label=[...before.files,...after.files].find(x=>matches(d,x))?.title||d.project_id||d.version_id||'指定依赖';
   if(d.dependency_type==='required'&&!(f.ignoredRequired||[]).includes(f.versionId+':'+i)&&!enabled.some(x=>matches(d,x)))blockers.push(`操作后，「${f.title}」将缺少依赖「${label}」。请保留并启用该依赖，或把使用它的模组一起停用 / 移除。`);
   if(d.dependency_type==='incompatible'&&enabled.some(x=>x.projectId!==f.projectId&&matches(d,x)))blockers.push(`「${f.title}」声明与「${label}」不兼容，请不要同时启用。`);
  }
  try{validateUpdateGraph(after.files);}catch(e){if(!blockers.length)blockers.push(e.message.replaceAll('更新后的','操作后的'));}

  // Unchanged enabled dependencies must really exist, not only appear in the manifest.
  for(const f of after.files.filter(f=>f.enabled!==false&&!next.includes(f))){const path=safePath(dir,actual(f));await ensureParents(dir,path);try{const stat=await lstat(path);if(!stat.isFile()||stat.isSymbolicLink())throw Error();}catch{blockers.push(`「${f.title}」的文件缺失或不可用，请先修复或一起停用。`);}}
  return {dir,before,after,old,next,selected,blockers,stamp:contentStamp(before)+contentStamp({files:selected})};
 }
 async preview(id,paths,action){const s=await this.snapshot(id,paths,action),key=randomUUID();for(const [k,p]of this.plans)if(p.expires<Date.now())this.plans.delete(k);if(this.plans.size>=40)this.plans.delete(this.plans.keys().next().value);this.plans.set(key,{instanceId:id,paths,action,stamp:s.stamp,expires:Date.now()+600000});return {id:key,action,rows:s.selected.map(f=>({relative:f.relative,title:f.title,unchanged:f.unchanged})),blockers:s.blockers,warnings:s.selected.some(f=>!f.projectId)?['手动导入的内容缺少依赖信息，AMBER 无法检查其全部兼容性。']:[]};}
 async apply(id,key){const p=this.plans.get(key);if(!p||p.instanceId!==id||p.expires<Date.now())throw Error('批量操作预览已过期，请重新选择。');const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);
  return this.core.startJob(id,'content-bulk',async(job,signal)=>{let staged=[];try{
   await recoverModUpdate(dir);const s=await this.snapshot(id,p.paths,p.action);if(s.stamp!==p.stamp)throw Error('内容已变化，请重新预览后再操作。');if(s.blockers.length)throw Error(s.blockers.join('\n'));
   job.operation=p.action;job.total=s.selected.length;job.phase='校验并备份所选内容';job.results=s.selected.map(f=>({relative:actual(f),title:f.title,state:f.unchanged?'skipped':'pending'}));
   if(s.old.length||s.selected.some(f=>f.missing)){await requireSpace(dir,s.old.reduce((n,f)=>n+f.size,0)*3);const cache=join(dir,'content-bulk-cache',randomUUID());await ensureParents(dir,cache);await mkdir(cache,{recursive:true});
    for(const f of s.next){signal.throwIfAborted();const original=s.old.find(o=>o.relative===f.relative),to=safePath(cache,f.relative);await ensureParents(cache,to);await copyFile(safePath(dir,actual(original)),to);staged.push(to);}
    await this.updates.replace(dir,s.before,s.after,s.old,s.next,f=>safePath(cache,f.relative),signal,job);
   }
   job.completed=job.total;job.results=job.results.map(r=>({...r,state:r.state==='skipped'?'skipped':'done'}));this.plans.delete(key);
  }catch(e){job.results=(job.results||p.paths.map(title=>({title}))).map(r=>({...r,state:r.state==='skipped'?'skipped':'failed',error:e.message}));throw e;}finally{for(const path of staged)await unlink(path).catch(()=>{});}});
 }
}
