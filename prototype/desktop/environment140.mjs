import {instanceLoaders} from './compatibility.mjs';
import {planMigration174,stamp174,directory174,contentDirectories174} from './migration-plan174.mjs';
// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {digest,safePath} from './download.mjs';
export function validateEnvironment140(v){
 if(v?.format!=='amber-environment'||v.schema!==1||typeof v.game!=='string'||!/^[-\w.]{1,60}$/.test(v.game)||!['vanilla','quilt','fabric','forge','neoforge'].includes(v.loader)||!Array.isArray(v.mods)||v.mods.length>500)throw Error('Invalid environment / 环境清单无效');
 const result={format:v.format,schema:1,name:String(v.name||'Shared environment').slice(0,60),game:v.game,loader:v.loader,mods:v.mods.map(m=>{if(!/^[\w-]{1,100}$/.test(m.projectId||'')||! /^[\w-]{1,100}$/.test(m.versionId||''))throw Error('Invalid project/version');return {projectId:m.projectId,versionId:m.versionId,title:String(m.title||m.projectId).slice(0,100)};})};
 if(v.notes174){const n=v.notes174;if(!Array.isArray(n.unknown)||n.unknown.length>500||!Array.isArray(n.optional)||n.optional.length>500)throw Error('Invalid environment notes');result.notes174={unknown:n.unknown.map(x=>String(x).slice(0,200)),optional:n.optional.map(x=>({title:String(x.title||'').slice(0,200),client:['optional','unsupported'].includes(x.client)?x.client:'unknown'})),plugins:n.plugins===true};}
 return result;
}
export class Environment140{
 constructor(core,servers,content,workflows){Object.assign(this,{core,servers,content,workflows});this.plans=new Map();this.installPlans=new Map();this.requests174=new Map();this.cancelled174=new Set();}
 async links(id,localId){await this.servers.read(id);const path=join(await this.servers.dir(id),'client-link.json');if(localId!==undefined){if(localId)await this.core.metadata(localId);await atomicJson(path,{localId:localId||null});}try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return {localId:null};throw e;}}
 async requirements(id){
  const {dir,item}=await this.servers.read(id),mods=[],unknown=[],optional=[];
  if(['quilt','fabric'].includes(item.type)){
   const records=await this.servers.contentManifest(id);
   const rows=await this.servers.content(id);
   for(const f of records.files)if(!rows.some(r=>r.name===f.filename||r.name===f.filename+'.disabled'))unknown.push(f.title||f.filename);
   for(const row of rows.filter(r=>r.enabled)){
    try{const f=records.files.find(f=>f.filename===row.name);if(!f||await digest(safePath(dir,'mods/'+row.name),f.algorithm)!==f.hash)throw Error('Unknown file');
     const p=await this.content.api('project/'+encodeURIComponent(f.projectId));
     if(p.project_type&&p.project_type!=='mod'||!['required','optional','unsupported'].includes(p.client_side))throw Error('Unknown client declaration');
     if(p.client_side==='required')mods.push({projectId:f.projectId,versionId:f.versionId,title:f.title});else optional.push({title:f.title,client:p.client_side});
    }catch{unknown.push(row.title);}
   }
  }
  const plugins=['paper','spigot','craftbukkit'].includes(item.type),notes174={unknown,optional,plugins};return {manifest:validateEnvironment140({format:'amber-environment',schema:1,name:item.name,game:item.game,loader:['quilt','fabric'].includes(item.type)?item.type:'vanilla',mods,notes174}),...notes174};
 }
 async snapshot174(id){
  await this.servers.stopped(id);const {dir,item}=await this.servers.read(id),directory=await directory174(dir),files=[];
  await contentDirectories174(dir,['mods','plugins']);
  for(const row of await this.servers.content(id))files.push([row.name,row.enabled,await digest(safePath(dir,(['quilt','fabric'].includes(item.type)?'mods/':'plugins/')+row.name),'sha256')]);
  return stamp174({directory,game:item.game,type:item.type,files,records:await this.servers.contentManifest(id)});
 }
 async serverPreview174(id){return this.servers.locks.run(id,async()=>{const before=await this.snapshot174(id),requirements=await this.requirements(id);if(await this.snapshot174(id)!==before)throw Error('来源、目标或内容已变化，请重新预览。');return {...requirements,source:{id,stamp:before}};});}
 async compare(id,localId){const requirement=await this.requirements(id),{dir,item}=await this.core.metadata(localId),manifest=await this.content.manifest(dir),rows=[];for(const m of requirement.manifest.mods){const local=manifest.files.find(f=>f.projectId===m.projectId&&f.enabled!==false);let state=!local?'missing':local.versionId!==m.versionId?'different':'matched';if(local){try{if(await digest(safePath(dir,local.relative))!==local.hash)state='unknown';}catch{state='missing';}}rows.push({...m,state});}const extras=[];for(const f of manifest.files.filter(f=>f.enabled!==false&&!requirement.manifest.mods.some(m=>m.projectId===f.projectId))){let state='unknown';if(f.projectId){try{const p=await this.content.api('project/'+encodeURIComponent(f.projectId));state=p.server_side==='unsupported'?'client-only':'additional';}catch{}}extras.push({title:f.title||f.relative,state});}return {...requirement,rows,extras,client:item.name,gameMatches:item.game===requirement.manifest.game,loaderMatches:requirement.manifest.loader==='vanilla'||item.loader===requirement.manifest.loader};}
 async previewInstall(serverId,localId,versionId){const result=await this.compare(serverId,localId);if(!result.gameMatches||!result.loaderMatches||!result.rows.some(r=>r.versionId===versionId&&r.state==='missing'))throw Error('Choose a missing requirement in a compatible client / 请选择兼容客户端缺失的内容');const plan=await this.content.preview(localId,versionId);this.installPlans.set(plan.id,{localId,expires:Date.now()+600000});return plan;}
 async install(planId){const p=this.installPlans.get(planId);if(!p||p.expires<Date.now())throw Error('Preview expired');this.installPlans.delete(planId);return this.workflows.startContent(p.localId,this.content.plans.get(planId));}
 async previewImport(input,diagnostics={}){
  const v=validateEnvironment140(input);diagnostics={...(v.notes174||{}),...diagnostics};if(this.core.external)throw Error('请切换到 AMBER 管理的游戏库创建独立实例。');
  const versions=v.loader==='vanilla'?[]:await this.workflows.choices(v.game,v.loader),version=versions[0]?.version||'';
  if(v.loader!=='vanilla'&&!version)throw Error('No compatible loader / 没有兼容加载器');
  for(const m of v.mods){const r=await this.content.api('version/'+encodeURIComponent(m.versionId));if(r.project_id!==m.projectId||!r.game_versions.includes(v.game)||!instanceLoaders(v).some(l=>r.loaders.includes(l)))throw Error('Incompatible shared content: '+m.title);}
  const manifest={format:'amber-mod-list',schema:1,strict:true,source:v.name,mods:v.mods.map(m=>({...m,provider:'modrinth',enabled:true}))};
  const migration174=await planMigration174(this.content,'preview174',manifest,{target:{game:v.game,loader:v.loader,loaderVersion:version||null}}),token=randomUUID();
  for(const [id,p]of this.plans)if(p.expires<Date.now())this.plans.delete(id);
  if(this.plans.size>=100)throw Error('预览过多，请关闭旧操作后重试。');
  const p={...v,version,migration174,manifest,diagnostics,expires:Date.now()+600000};this.plans.set(token,p);
  return {...v,version,token,rows:migration174.rows,unknown:diagnostics.unknown||[],optional:diagnostics.optional||[],plugins:!!diagnostics.plugins,canCreate:migration174.rows.every(r=>r.status==='matched')};
 }
 forget174(token){this.plans.delete(token);}
 cancel174(key){const active=this.requests174.get(key);if(active)active.abort(Error('操作已取消。'));else if(typeof key==='string'){this.cancelled174.add(key);if(this.cancelled174.size>200)this.cancelled174.delete(this.cancelled174.values().next().value);}}
 async create(token,name,recheck,requestKey){
  requestKey||=randomUUID();if(!/^[a-f0-9-]{36}$/.test(requestKey))throw Error('Invalid request identity');const key='new:'+requestKey;if(this.cancelled174.delete(key))throw Error('操作已取消。');if(this.requests174.has(key))throw Error('请等待此操作结束');const controller=new AbortController();this.requests174.set(key,controller);
  try{
  const p=this.plans.get(token);this.plans.delete(token);if(!p||p.expires<Date.now())throw Error('Preview expired');
  if(typeof name!=='string'||!name.trim()||name.length>60)throw Error('Invalid name');
  if(p.migration174.rows.some(r=>r.status!=='matched'))throw Error('依赖检查尚未通过，请重新预览。');
  if(p.diagnostics.source){if(!recheck||await recheck(p.diagnostics.source.id)!==p.diagnostics.source.stamp)throw Error('来源、目标或内容已变化，请重新预览。');}
  const choices=p.loader==='vanilla'?[]:await this.workflows.choices(p.game,p.loader);if(p.loader!=='vanilla'&&!choices.some(c=>c.version===p.version))throw Error('来源、目标或内容已变化，请重新预览。');
  const fresh=await planMigration174(this.content,'preview174',p.manifest,{target:{game:p.game,loader:p.loader,loaderVersion:p.version||null}});
  if(stamp174(fresh)!==stamp174(p.migration174))throw Error('依赖或版本信息已变化，请重新预览。');
  controller.signal.throwIfAborted();return await this.workflows.create({requestKey,name:name.trim(),game:p.game,loader:p.loader,version:p.version,threads:8},null,p.manifest,null,null,null,null,p.migration174);
  }finally{if(this.requests174.get(key)===controller)this.requests174.delete(key);}
 }
}
