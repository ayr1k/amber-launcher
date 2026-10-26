// SPDX-License-Identifier: MPL-2.0
import {readFile,writeFile,mkdir,copyFile,unlink,readdir,lstat,constants} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {safePath,ensureParents,verified,downloadPool} from './download.mjs';
import {requireSpace} from './safe-copy.mjs';
export const contentStamp=m=>createHash('sha256').update(JSON.stringify(m.files)).digest('hex');
const actual=f=>f.relative+(f.enabled===false?'.disabled':'');
const matches=(d,f)=>d.version_id?d.version_id===f.versionId:!!d.project_id&&d.project_id===f.projectId;
export function validateUpdateGraph(files){
  const enabled=files.filter(f=>f.enabled!==false);
  for(const f of enabled)for(const [i,d] of (f.dependencies||[]).entries()){
    if(d.dependency_type==='required'&&!(f.ignoredRequired||[]).includes(f.versionId+':'+i)&&!enabled.some(x=>matches(d,x)))throw Error(`「${f.title}」需要指定依赖版本，请同时选择对应依赖更新，或调整依赖勾选。`);
    if(d.dependency_type==='incompatible'&&enabled.some(x=>x.projectId!==f.projectId&&matches(d,x)))throw Error(`「${f.title}」与更新后的其他内容声明不兼容。`);
  }
  const paths=new Set();for(const f of files){const key=actual(f).toLowerCase();if(paths.has(key))throw Error('更新后的内容文件名冲突。');paths.add(key);}
}
function validFile(f){if(!f||!/^sha1$/.test(f.algorithm||'sha1')||!/^([a-f0-9]{40})$/.test(f.hash)||!Number.isSafeInteger(f.size)||f.size<1||! /^(mods|resourcepacks|shaderpacks)\/[^/\\]+\.(jar|litemod|zip)$/i.test(f.relative))throw Error('模组恢复记录格式无效。');}
async function exists(path){try{await lstat(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function checked(dir,f){const path=safePath(dir,actual(f));await ensureParents(dir,path);if(!await verified({...f,path}))throw Error(`「${f.title}」的文件已被修改或缺失，请先修复内容，未覆盖现有文件。`);return path;}
// Journal precedes replacement. Backups survive successful updates and process crashes.
export async function recoverModUpdate(dir){
  const path=join(dir,'content-update.json');if(!await exists(path))return null;
  if((await lstat(path)).isSymbolicLink())throw Error('模组更新日志不可使用链接。');
  const tx=JSON.parse(await readFile(path,'utf8'));
  if(tx.schema!==1||! /^[a-f0-9-]{36}$/.test(tx.id)||!Array.isArray(tx.old)||!Array.isArray(tx.next)||tx.old.length>200||tx.next.length>200)throw Error('模组更新恢复记录无效。');
  for(const f of [...tx.old,...tx.next]){validFile(f);safePath(dir,actual(f));}
  const manifest=JSON.parse(await readFile(join(dir,'content.json'),'utf8'));
  const committed=manifest.updateId===tx.id;
  if(!committed){
    // Verify all backup sources before touching any current file.
    for(const f of tx.old)await checked(join(dir,'content-updates',tx.id,'files'),f);
    for(const f of tx.next){const p=safePath(dir,actual(f));await ensureParents(dir,p);if(await exists(p)){
      const old=tx.old.find(x=>actual(x).toLowerCase()===actual(f).toLowerCase());
      if(old&&await verified({...old,path:p}))continue;
      if(!await verified({...f,path:p}))throw Error('更新恢复发现外部修改，请保留文件并打开实例目录检查：'+actual(f));
      await unlink(p);
    }}
    for(const f of tx.old){const target=safePath(dir,actual(f));await ensureParents(dir,target);if(await exists(target)){if(!await verified({...f,path:target}))throw Error('无法覆盖更新期间被修改的文件：'+actual(f));}else await copyFile(safePath(join(dir,'content-updates',tx.id,'files'),actual(f)),target,constants.COPYFILE_EXCL);}
  }
  await ensureParents(dir,join(dir,'content-updates',tx.id,'record.json'));
  await atomicJson(join(dir,'content-updates',tx.id,'record.json'),{...tx,state:committed?'done':'recovered'});
  await unlink(path);return {id:tx.id,committed};
}
export class ModUpdates{
  constructor(core,content){this.core=core;this.content=content;this.plans=new Map();}
  async scan(instanceId,prerelease=false){
    const {dir}=await this.core.metadata(instanceId),manifest=await this.content.manifest(dir),rows=[];
    for(const f of manifest.files.filter(f=>f.type==='mod'&&f.projectId&&f.versionId)){
      const row={projectId:f.projectId,title:f.title,current:f.version,locked:!!f.updateLocked,enabled:f.enabled!==false};
      try{await checked(dir,f);const current=await this.content.api('version/'+f.versionId);const versions=await this.content.versions(instanceId,f.projectId);
        const candidate=versions.filter(v=>v.id!==f.versionId&&(prerelease||v.version_type==='release')&&Date.parse(v.date_published)>Date.parse(current.date_published)).sort((a,b)=>Date.parse(b.date_published)-Date.parse(a.date_published))[0];
        if(candidate)Object.assign(row,{versionId:candidate.id,version:candidate.version_number,channel:candidate.version_type});
      }catch(e){row.error=e.message;}rows.push(row);
    }return {rows,stamp:contentStamp(manifest)};
  }
  async lock(instanceId,projectId,value){
    if(typeof value!=='boolean')throw Error('锁定选项无效。');const {dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);
    return this.core.startJob(instanceId,'content-update',async()=>{await recoverModUpdate(dir);const m=await this.content.manifest(dir),f=m.files.find(f=>f.projectId===projectId);if(!f)throw Error('模组记录不存在。');f.updateLocked=value;await atomicJson(join(dir,'content.json'),m);});
  }
  async preview(instanceId,selections,optional=[],excluded=[]){
    if(!Array.isArray(selections)||!selections.length||selections.length>100||new Set(selections.map(s=>s?.projectId)).size!==selections.length)throw Error('请选择 1–100 个不同模组。');
    if(selections.some(s=>!s||! /^[a-zA-Z0-9_-]{1,100}$/.test(s.projectId)||! /^[a-zA-Z0-9_-]{1,100}$/.test(s.versionId)))throw Error('所选模组标识无效，请刷新列表。');
    const {dir,item}=await this.core.metadata(instanceId),before=await this.content.manifest(dir);
    const selected=new Map(selections.map(s=>[s.projectId,s.versionId]));
    for(const s of selections){const f=before.files.find(f=>f.projectId===s.projectId);if(!f||f.type!=='mod'||f.updateLocked)throw Error('所选模组不存在或已锁定，请刷新列表。');const v=await this.content.api('version/'+s.versionId);if(v.project_id!==s.projectId||!this.content.compatible(v,item,'mod'))throw Error('所选更新不兼容当前实例。');}
    const virtual=Object.create(this.content);virtual.plans=new Map();virtual.manifest=async()=>({...before,files:before.files.filter(f=>!selected.has(f.projectId))});
    virtual.versions=async(id,project)=>selected.has(project)?[await this.content.api('version/'+selected.get(project))]:this.content.versions(id,project);
    const chosen=new Map(),required=new Map(),optionals=new Map(),warnings=new Set(),blockers=[];
    for(const s of selections){const p=await virtual.preview(instanceId,s.versionId,optional,excluded,true);for(const f of p.files){if(chosen.has(f.projectId)&&chosen.get(f.projectId).versionId!==f.versionId)blockers.push('所选更新要求不同的依赖版本：'+f.title);chosen.set(f.projectId,f);}for(const r of p.required)required.set(r.key,r);for(const r of p.optional)optionals.set(r.key,r);p.warnings.forEach(w=>warnings.add(w));blockers.push(...p.blockers);}
    for(const [project,version]of selected)if(chosen.get(project)?.versionId!==version)blockers.push('依赖解析与所选更新不一致，请调整选择。');
    const next=[...chosen.values()].map(f=>{const old=before.files.find(x=>x.projectId===f.projectId);return {...f,enabled:old?.enabled!==false,updateLocked:old?.updateLocked||false,...(old?.versionId===f.versionId?{ignoredRequired:old.ignoredRequired||[]}:{} )};});
    const after={...before,files:[...before.files.filter(f=>!chosen.has(f.projectId)),...next]};
    try{validateUpdateGraph(after.files);}catch(e){blockers.push(e.message);}
    const touched=next.filter(f=>{const old=before.files.find(x=>x.projectId===f.projectId);return !old||old.versionId!==f.versionId||old.hash!==f.hash;});
    if(!touched.length)blockers.push('没有需要替换的文件，请重新检查更新。');
    const plan={id:randomUUID(),instanceId,stamp:contentStamp(before),game:item.game,loader:item.loader,loaderVersion:item.loaderVersion,liteVersion:item.liteVersion,loaderSha1:item.loaderSha1,liteBaseSha1:item.liteBaseSha1,before,after,files:touched,required:[...required.values()],optional:[...optionals.values()],warnings:[...warnings],blockers:[...new Set(blockers)],expiresAt:Date.now()+600000};
    this.plans.set(plan.id,plan);for(const [id,p]of this.plans)if(p.expiresAt<Date.now())this.plans.delete(id);
    return {...plan,files:plan.files.map(f=>({...f,previous:before.files.find(x=>x.projectId===f.projectId)?.version||null})),before:undefined,after:undefined};
  }
  async install(instanceId,planId){
    const p=this.plans.get(planId);if(!p||p.instanceId!==instanceId||p.expiresAt<Date.now())throw Error('更新预览过期，请重新检查。');if(p.blockers.length)throw Error('请先解决更新依赖冲突。');
    const {dir,item}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);
    for(const k of ['game','loader','loaderVersion','liteVersion','loaderSha1','liteBaseSha1'])if(item[k]!==p[k])throw Error('实例配置已改变，请重新检查更新。');
    return this.core.startJob(instanceId,'content-update',async(job,signal)=>{
      await recoverModUpdate(dir);const before=await this.content.manifest(dir);if(contentStamp(before)!==p.stamp)throw Error('模组列表已改变，请重新检查更新。');
      const old=before.files.filter(f=>p.files.some(n=>n.projectId===f.projectId));
      for(const f of old){if(f.updateLocked)throw Error('模组已锁定。');await checked(dir,f);}
      await requireSpace(dir,[...old,...p.files].reduce((n,f)=>n+f.size,0)*2);
      job.phase='下载并校验所选模组更新';job.total=p.files.length;
      const downloads=p.files.map(f=>({...f,path:safePath(this.core.root,'content-cache/'+f.hash)}));
      await downloadPool(downloads,{root:this.core.root,fetcher:this.core.fetcher,signal,threads:this.core.downloadThreads||8,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});signal.throwIfAborted();
      await this.replace(dir,before,p.after,old,p.files,f=>safePath(this.core.root,'content-cache/'+f.hash),signal,job);
      this.plans.delete(planId);
    });
  }
  async replace(dir,before,after,old,next,source,signal,job){
    if(!await exists(join(dir,'content.json')))await atomicJson(join(dir,'content.json'),before);
    for(const f of [...old,...next])validFile(f);
    for(const f of old)await checked(dir,f);
    for(const f of next){const path=safePath(dir,actual(f));await ensureParents(dir,path);if(await exists(path)&&!old.some(x=>actual(x).toLowerCase()===actual(f).toLowerCase()))throw Error('已有同名文件，未覆盖：'+actual(f));if(!await verified({...f,path:source(f)}))throw Error('更新来源文件校验失败。');}
    const tx={schema:1,id:randomUUID(),createdAt:new Date().toISOString(),operation:job.operation||'update',before,after,old,next};
    const backup=join(dir,'content-updates',tx.id,'files');await ensureParents(dir,backup);await mkdir(backup,{recursive:true});
    for(const f of old){const from=await checked(dir,f),to=safePath(backup,actual(f));await ensureParents(backup,to);await copyFile(from,to,constants.COPYFILE_EXCL);await checked(backup,f);}
    signal?.throwIfAborted();await writeFile(join(dir,'content-update.json'),JSON.stringify(tx),{flag:'wx'});
    try{job.phase='替换文件并保留可恢复副本';for(const f of old){signal?.throwIfAborted();await unlink(await checked(dir,f));}for(const f of next){signal?.throwIfAborted();const to=safePath(dir,actual(f));await ensureParents(dir,to);await copyFile(source(f),to,constants.COPYFILE_EXCL);await checked(dir,f);}
      signal?.throwIfAborted();await atomicJson(join(dir,'content.json'),{...after,updateId:tx.id});
    }catch(e){await recoverModUpdate(dir);throw e;}
    await recoverModUpdate(dir);
  }
  async history(instanceId){const {dir}=await this.core.metadata(instanceId);let names;try{names=await readdir(join(dir,'content-updates'));}catch(e){if(e.code==='ENOENT')return [];throw e;}const list=[];
    for(const name of names.filter(n=>/^[a-f0-9-]{36}$/.test(n))){try{const record=join(dir,'content-updates',name,'record.json');await ensureParents(dir,record);const r=JSON.parse(await readFile(record,'utf8'));if(['done','recovered'].includes(r.state))list.push({id:name,operation:r.operation||'update',state:r.state,createdAt:r.createdAt,titles:(r.next.length?r.next:r.old.length?r.old:r.before.files.filter(f=>!r.after.files.some(n=>n.relative===f.relative))).map(f=>f.title),changes:r.next.map(f=>({title:f.title,from:r.old.find(o=>o.relative===f.relative||o.projectId&&o.projectId===f.projectId)?.version||'',to:f.version||'',enabled:f.enabled!==false})),restorable:r.state==='done'&&contentStamp(await this.content.manifest(dir))===contentStamp(r.after)});}catch{}}
    return list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  async restore(instanceId,id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('无效更新记录。');const {dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);
    return this.core.startJob(instanceId,'content-update',async(job,signal)=>{await recoverModUpdate(dir);const recordPath=join(dir,'content-updates',id,'record.json');await ensureParents(dir,recordPath);const r=JSON.parse(await readFile(recordPath,'utf8')),current=await this.content.manifest(dir);
      if(r.id!==id||r.state!=='done'||contentStamp(current)!==contentStamp(r.after))throw Error('更新后内容已改变，不能直接恢复。请先备份实例并手动处理。');validateUpdateGraph(r.before.files);
      job.operation='restore';await this.replace(dir,current,r.before,r.next,r.old,f=>safePath(join(dir,'content-updates',id,'files'),actual(f)),signal,job);
    });
  }
}
