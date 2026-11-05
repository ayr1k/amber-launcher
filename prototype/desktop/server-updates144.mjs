// SPDX-License-Identifier: MPL-2.0
import {readFile,lstat} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {safePath,ensureParents,verified,downloadPool} from './download.mjs';
import {requireSpace} from './safe-copy.mjs';
import {compareContentVersions} from './compatibility.mjs';
import {ServerTransactions144,recoverServerUpdate144,contentStamp,validateUpdateGraph} from './server-transactions144.mjs';
const api='https://api.modrinth.com/v2/';
const fail=message=>{throw Error(message);};
export class ServerUpdates144 extends ServerTransactions144 {
 constructor(servers){super();this.servers=servers;this.plans=new Map();this.scanning=new Set();this.core=Object.create(servers.core);this.core.metadata=id=>servers.read(id);this.core.requireStopped=dir=>servers.stopped(basename(dir));this.core.startJob=(id,kind,fn)=>servers.core.startJob(id,'server-content-update',fn);this.content={manifest:dir=>this.manifest(basename(dir))};}
 async manifest(id){const {dir,item}=await this.servers.read(id),m=await this.servers.contentManifest(id),folder=['fabric','quilt'].includes(item.type)?'mods':'plugins',files=[];
  for(const f of m.files){if(!/^[^/\\]+\.jar$/i.test(f.filename)||f.filename.includes('..'))fail('Invalid content filename / 内容文件名无效');const base=safePath(dir,folder+'/'+f.filename);await ensureParents(dir,base);const stat=async path=>lstat(path).catch(e=>{if(e.code==='ENOENT')return null;throw e;});const normal=await stat(base),disabled=await stat(base+'.disabled');if(!normal&&!disabled)continue;if(normal&&disabled)fail('Duplicate enabled/disabled files / 启用与停用文件同时存在：'+f.filename);const enabled=!!normal;files.push({...f,relative:folder+'/'+f.filename,enabled});}return {...m,files};
 }
 async checked(dir,f){const path=safePath(dir,f.relative+(f.enabled===false?'.disabled':''));await ensureParents(dir,path);if(!await verified({...f,path}))fail('File changed or missing / 文件已改变或缺失：'+f.filename);}
 async scan(id){if(this.scanning.has(id))fail('Check in progress / 正在检查更新');this.scanning.add(id);try{const {dir,item}=await this.servers.read(id),m=await this.manifest(id),rows=[];
  for(const f of m.files){const row={projectId:f.projectId,title:f.title||f.filename,current:f.version,locked:!!f.updateLocked,enabled:f.enabled,filename:f.filename};try{await this.checked(dir,f);const current=await this.servers.json(api+'version/'+f.versionId),versions=await this.servers.contentVersions(id,f.projectId),v=versions.filter(v=>v.id!==f.versionId&&v.version_type==='release'&&Date.parse(v.date_published)>Date.parse(current.date_published)).sort((a,b)=>compareContentVersions(a,b,item.type))[0];if(v)Object.assign(row,{versionId:v.id,version:v.version_number,changelog:String(v.changelog||'').slice(0,16000)});}catch(e){row.error=e.message;}rows.push(row);}
  for(const f of await this.servers.content(id))if(!f.projectId)rows.push({filename:f.name,title:f.title||f.name,error:'No source record; automatic updates unavailable / 无来源记录，无法自动检查更新'});
  return {rows,stamp:contentStamp(m)};
 }finally{this.scanning.delete(id);}}
 async lock(id,projectId,value){return this.servers.locks.run(id,async()=>{await this.servers.stopped(id);if(typeof value!=='boolean')fail('Invalid lock');const {dir}=await this.servers.read(id);await recoverServerUpdate144(dir);const m=await this.manifest(id),f=m.files.find(f=>f.projectId===projectId);if(!f)fail('Content missing');f.updateLocked=value;await atomicJson(join(dir,'content-manifest.json'),m);});}
 async preview(id,selections){if(!Array.isArray(selections)||!selections.length||selections.length>100||new Set(selections.map(s=>s.projectId)).size!==selections.length)fail('Select 1–100 different projects / 请选择 1–100 个不同项目');
  const {dir,item}=await this.servers.read(id),before=await this.manifest(id),selected=new Map(selections.map(s=>[s.projectId,s.versionId]));
  for(const s of selections){const old=before.files.find(f=>f.projectId===s.projectId);if(!old||old.updateLocked)fail('Content missing or locked / 内容缺失或已锁定');if(!(await this.servers.contentVersions(id,s.projectId)).some(v=>v.id===s.versionId))fail('Incompatible update / 更新不兼容当前实例');}
  // Keep installed dependency versions unless the user selects an update or an
  // exact dependency pin requires another version. Never silently replace locks.
  const virtual=Object.create(this.servers);virtual.plans=new Map();virtual.contentVersions=async(instance,project)=>{const versions=await this.servers.contentVersions(instance,project),preferred=selected.get(project)||before.files.find(f=>f.projectId===project)?.versionId;return [...versions.filter(v=>v.id===preferred),...versions.filter(v=>v.id!==preferred)];};
  const chosen=new Map(),blockers=[];
  for(const s of selections){const preview=await virtual.previewContent(id,s.versionId);for(const f of virtual.plans.get(preview.token).rows){const other=chosen.get(f.projectId);if(other&&other.versionId!==f.versionId)blockers.push('Conflicting dependency versions / 依赖版本冲突：'+f.title);chosen.set(f.projectId,f);}}
  for(const [project,version] of selected)if(chosen.get(project)?.versionId!==version)blockers.push('Dependency conflicts with selection / 依赖与选择冲突：'+project);
  const folder=['fabric','quilt'].includes(item.type)?'mods':'plugins',next=[...chosen.values()].map(f=>{const old=before.files.find(x=>x.projectId===f.projectId);return {...f,relative:folder+'/'+f.filename,enabled:old?.enabled!==false,updateLocked:!!old?.updateLocked};}),after={...before,files:[...before.files.filter(f=>!chosen.has(f.projectId)),...next]},changed=next.filter(f=>{const old=before.files.find(x=>x.projectId===f.projectId);return !old||old.versionId!==f.versionId||old.hash!==f.hash;});
  for(const f of changed){const old=before.files.find(x=>x.projectId===f.projectId);if(old?.updateLocked)blockers.push('Locked dependency / 依赖已锁定：'+f.title);}
  try{validateUpdateGraph(after.files);for(const f of before.files)await this.checked(dir,f);}catch(e){blockers.push(e.message);}
  if(changed.length>200)blockers.push('Update at most 200 files per batch / 每批最多更新 200 个文件');
  if(!changed.length)blockers.push('No changes / 没有需要更新的文件');
  const p={token:randomUUID(),instanceId:id,stamp:contentStamp(before),game:item.game,type:item.type,before,after,files:changed,blockers,expires:Date.now()+600000};
  for(const [key,v] of this.plans)if(v.expires<Date.now())this.plans.delete(key);this.plans.set(p.token,p);
  return {token:p.token,blockers,rows:changed.map(f=>({title:f.title,version:f.version,previous:before.files.find(x=>x.projectId===f.projectId)?.version||null,dependencies:f.dependencies,previousDependencies:before.files.find(x=>x.projectId===f.projectId)?.dependencies||[],projectId:f.projectId,enabled:f.enabled}))};
 }
 async install(id,token){return this.servers.locks.run(id,async()=>{await this.servers.stopped(id);const p=this.plans.get(token);if(!p||p.instanceId!==id||p.expires<Date.now()||p.blockers.length)fail('Preview expired or blocked / 请重新检查更新预览');const {dir,item}=await this.servers.read(id);await recoverServerUpdate144(dir);if(item.game!==p.game||item.type!==p.type||contentStamp(await this.manifest(id))!==p.stamp)fail('Content changed; preview again / 内容已改变，请重新预览');await this.servers.beforeProtectedAction?.(id,'updates');
  return this.core.startJob(id,'server-content-update',async(job,signal)=>{const old=p.before.files.filter(f=>p.files.some(n=>n.projectId===f.projectId));for(const f of old)await this.checked(dir,f);await requireSpace(dir,[...old,...p.files].reduce((n,f)=>n+f.size,0)*2);job.phase='Downloading updates / 下载更新';job.total=p.files.length;const cache=f=>safePath(this.servers.core.root,'server-content-cache/'+f.hash.slice(0,40));await downloadPool(p.files.map(f=>({...f,path:cache(f)})),{root:this.servers.core.root,fetcher:this.servers.core.fetcher,threads:this.servers.core.downloadThreads||8,signal,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});signal.throwIfAborted();if(contentStamp(await this.manifest(id))!==p.stamp)fail('Content changed / 内容已改变');if(job.network)job.network.phase='installing';await this.replace(dir,p.before,p.after,old,p.files,cache,signal,job);this.plans.delete(token);});
 });}
 async restore(id,token){return this.servers.locks.run(id,async()=>{await this.servers.stopped(id);await this.servers.beforeProtectedAction?.(id,'updates');return super.restore(id,token);});}
}
