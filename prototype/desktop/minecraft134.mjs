// SPDX-License-Identifier: MPL-2.0
import {readFile,readdir,lstat,copyFile,statfs} from 'node:fs/promises';
import {resolve,join,relative,sep,parse} from 'node:path';
import {randomUUID} from 'node:crypto';
import {identifier,readImportJson,identifyProfile,directoryChoices,validateImportVersion} from './import-identify151.mjs';
import {constants} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {safePath,ensureParents,verified,digest} from './download.mjs';
import {atomicJson} from './core.mjs';
import {planFiles,assetFiles} from './vanilla.mjs';
export const importGroups=['saves','mods','config','defaultconfigs','resourcepacks','shaderpacks','screenshots','kubejs','scripts','options.txt','optionsof.txt','servers.dat'];
export async function noLinks(path){const full=resolve(path),root=parse(full).root;let p=root;for(const part of full.slice(root.length).split(sep).filter(Boolean)){p=join(p,part);const st=await lstat(p);if(st.isSymbolicLink())throw Error('目录包含链接，未读取 / Linked paths are not supported');}return full;}
const json=path=>readImportJson(path,noLinks);
export const resolveProfile=(root,id)=>identifyProfile(root,id,noLinks);
export async function scanMinecraft(path){
 const root=await noLinks(path);if(!(await lstat(root)).isDirectory())throw Error('Choose a .minecraft directory');
 await noLinks(join(root,'versions'));const entries=await readdir(join(root,'versions'),{withFileTypes:true});if(entries.length>10000)throw Error('Too many versions');let profiles={},profileHash=null;
 try{profiles=(await json(join(root,'launcher_profiles.json'))).profiles||{};profileHash=await digest(join(root,'launcher_profiles.json'),'sha256');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(typeof profiles!=='object'||Array.isArray(profiles))throw Error('版本元数据结构损坏。');
 const candidates=Object.entries(profiles).filter(([,p])=>p&&identifier(p.lastVersionId)).map(([key,p])=>({key,name:String(p.name||p.lastVersionId).slice(0,200),versionId:p.lastVersionId,explicitGameDir:p.gameDir}));
 for(const e of entries)if(e.isDirectory()&&!e.isSymbolicLink()&&identifier(e.name)&&!candidates.some(p=>p.versionId===e.name))candidates.push({key:'version:'+e.name,name:e.name,versionId:e.name});
 const rows=[];for(const p of candidates.slice(0,500)){try{if(p.explicitGameDir!==undefined&&(typeof p.explicitGameDir!=='string'||!p.explicitGameDir||p.explicitGameDir.includes('${')))throw Error('游戏数据目录配置无效。');const info={...p,...await resolveProfile(root,p.versionId)};rows.push({...info,...await directoryChoices(root,info,importGroups,noLinks),supported:true});}catch(e){rows.push({...p,supported:false,reason:e.message});}}
 return {root,rows,profileHash};
}
export async function collectImportFiles(root,groups,check=()=>{}){
 if(!Array.isArray(groups)||groups.some(g=>!importGroups.includes(g)))throw Error('Invalid import selection');const files=[];let bytes=0;
 async function walk(path,rel,depth=0){check();await noLinks(path);if(depth>40)throw Error('目录层级过深 / Directory nesting limit');const st=await lstat(path);if(st.isSymbolicLink())throw Error('内容包含链接 / Content contains a link: '+rel);if(st.isDirectory()){for(const e of (await readdir(path)).sort())await walk(safePath(root,rel+'/'+e),rel+'/'+e,depth+1);}else if(st.isFile()&&!rel.endsWith('/session.lock')){safePath(root,rel);bytes+=st.size;if(files.length>=200000||bytes>1000000000000)throw Error('导入内容过大 / Import exceeds limits');const hash=await digest(path,'sha256'),after=await lstat(path);if(st.size!==after.size||st.mtimeMs!==after.mtimeMs)throw Error('源文件已变化，请重新预览。');files.push({relative:rel,size:st.size,mtime:st.mtimeMs,hash});}}
 await noLinks(root);for(const group of [...new Set(groups)].sort()){const path=safePath(root,group);try{await lstat(path)}catch(e){if(e.code==='ENOENT')continue;throw e;}await walk(path,group);}return {files,bytes};
}
export class MinecraftImport {
 constructor(core){this.core=core;this.scans=new Map();this.busy=false;}
 cancel(){this.cancelled=true;for(const j of this.core.jobs.filter(j=>j.instanceId===this.instanceId&&j.state==='running'))this.core.controllers.get(j.id)?.abort(Error('导入已取消 / Import cancelled'));}
 status(){const job=this.core.jobs.filter(j=>j.instanceId===this.instanceId).at(-1);return {busy:this.busy,instanceId:this.instanceId,job:job?{phase:job.phase,completed:job.completed,total:job.total,transferred:job.transferred,state:job.state}:null};}
 check(){if(this.cancelled)throw Error('导入已取消，原目录保留 / Import cancelled; source retained');}
 async scan(path){const result=await scanMinecraft(path),id=randomUUID();if(this.busy)throw Error('正在导入，请等待 / Another import is running');this.previews?.clear();this.scans.clear();this.scans.set(id,{...result,expires:Date.now()+3600000});return {id,...result,groups:importGroups};}
 selection(token,key){const scan=this.scans.get(token),profile=scan?.rows.find(p=>p.key===key);if(!scan||scan.expires<Date.now()||!profile?.supported)throw Error('请重新选择原版目录 / Select the source directory again');return {scan,profile};}
 async chooseDirectory(token,key,path){if(this.busy)throw Error('正在导入，请等待 / Another import is running');const {profile}=this.selection(token,key);await noLinks(path);if(!(await lstat(path)).isDirectory())throw Error('游戏数据目录配置无效。');const full=resolve(path);if(!profile.directories.some(d=>d.path===full))profile.directories.push({path:full,kind:'selected'});this.previews?.clear();return {path:full,kind:'selected'};}
 async verifySource(scan,profile){
  for(const m of profile.metadata){await noLinks(m.path);if(await digest(m.path,'sha256')!==m.hash)throw Error('源版本配置已变化，请重新选择目录。');}
  const file=join(scan.root,'launcher_profiles.json');let hash=null;try{await noLinks(file);hash=await digest(file,'sha256');}catch(e){if(e.code!=='ENOENT')throw e;}if(hash!==scan.profileHash)throw Error('源版本配置已变化，请重新选择目录。');
 }
 async preview(token,key,groups,options={}){
  const {scan,profile}=this.selection(token,key);await this.verifySource(scan,profile);
  const gameDir=options.gameDir||profile.gameDir;
  const validation=await validateImportVersion(this.core,profile,options.game);
  if(!gameDir)return {validation,needsDirectory:true};
  if(!profile.directories.some(d=>d.path===gameDir))throw Error('请重新选择原版目录 / Select the source directory again');
  const data=await collectImportFiles(gameDir,groups),id=randomUUID();
  this.previews??=new Map();this.previews.set(id,{token,key,groups:[...groups],gameDir,data,validation,expires:Date.now()+3600000});
  while(this.previews.size>10)this.previews.delete(this.previews.keys().next().value);
  return {id,files:data.files.length,bytes:data.bytes,gameDir,validation,loader:profile.loader,loaderVersion:profile.version,versionId:profile.versionId,groups};
 }
 async availableSpace(path){return statfs(path);}
 async copyContent(source,dest){return copyFile(source,dest,constants.COPYFILE_EXCL);}
 async wait(job){while(true){const current=this.core.jobs.find(j=>j.id===job.id);if(current.state==='done')return;if(current.state!=='running')throw Error(current.error||'Import cancelled');await delay(100);}}
 async create(token,key,input){
 if(this.busy)throw Error('正在导入，请等待 / Another import is running');const {scan,profile}=this.selection(token,key);this.busy=true;this.cancelled=false;this.instanceId=null;let item;
 try{this.core.workflowGuard?.();const groups=input?.groups;if(typeof input?.name!=='string'||!input.name.trim()||input.name.length>60)throw Error('请输入实例名称 / Enter an instance name');
  await this.verifySource(scan,profile);this.check();
  const saved=input.previewId?this.previews?.get(input.previewId):null;
  if(!saved||saved.expires<Date.now()||saved.token!==token||saved.key!==key||saved.validation.state!=='ready'||JSON.stringify(saved.groups)!==JSON.stringify(groups))throw Error('预览已失效，请重新预览。');
  const gameDir=saved.gameDir;if(!gameDir)throw Error('请先确认游戏数据目录。');
  const data=await collectImportFiles(gameDir,groups,()=>this.check());
  if(JSON.stringify(data)!==JSON.stringify(saved.data))throw Error('源文件已变化，请重新预览。');
  if(!data.files.length&&!input.allowEmpty)throw Error('未找到所选内容，请确认仅创建运行环境。');
  const inside=(a,b)=>{const r=relative(resolve(a),resolve(b));return !r||(!r.startsWith('..'+sep)&&r!=='..'&&!parse(r).root)};
  if(inside(gameDir,this.core.root)||inside(this.core.root,gameDir)||inside(scan.root,this.core.root)||inside(this.core.root,scan.root))throw Error('源目录不能包含 AMBER 数据库 / Source must not contain the AMBER library');
  const validation=await validateImportVersion(this.core,profile,saved.validation.confirmed?saved.validation.game:undefined);this.check();
  if(validation.state!=='ready')throw Error(validation.reason);
  const selectedProfile={...profile,game:validation.game};
  item=await this.core.createInstance({name:input.name,game:selectedProfile.game,icon:'grass'});this.instanceId=item.id;this.check();const dir=await this.core.instancePath(item.id),space=await this.availableSpace(dir);if(space.bavail*space.bsize<data.bytes+2000000000)throw Error('可用空间不足，请保留至少 2 GB 余量 / Not enough free space (2 GB reserve required)');
  const provenance={schema:1,source:scan.root,gameDirectory:gameDir,game:selectedProfile.game,loader:profile.loader,loaderVersion:profile.version,profile:profile.versionId,mode:'copy',groups,createdAt:new Date().toISOString(),status:'copying'};await atomicJson(join(dir,'minecraft-import.json'),provenance);
  await this.wait(await this.core.startJob(item.id,'minecraft-copy',async(job,signal)=>{job.phase='复制原版实例 / Copying original game data';job.total=data.files.length;
   for(const f of data.files){this.check();signal.throwIfAborted();const source=safePath(gameDir,f.relative),dest=safePath(dir,f.relative);await noLinks(source);const before=await lstat(source);if(before.size!==f.size||before.mtimeMs!==f.mtime||await digest(source,'sha256')!==f.hash)throw Error('源文件已变化，请关闭游戏后重新导入 / Source changed; close the game and retry');await ensureParents(dir,dest);await this.copyContent(source,dest);if(await digest(source,'sha256')!==f.hash||await digest(dest,'sha256')!==f.hash)throw Error('复制校验失败 / Copy verification failed');const after=await lstat(source);if(after.mtimeMs!==before.mtimeMs||after.size!==before.size)throw Error('源文件已变化 / Source changed during copy');job.completed++;job.transferred+=f.size;}
  }));
  await this.verifySource(scan,profile);if(JSON.stringify(await collectImportFiles(gameDir,groups,()=>this.check()))!==JSON.stringify(data))throw Error('源文件已变化，请重新预览。');
  this.check();if(profile.loader!=='vanilla')await this.wait(await this.core.configureLoader(item.id,profile.loader,profile.version));this.check();
  await this.wait(await this.core.startJob(item.id,'minecraft-cache',async(job,signal)=>{job.phase='复用并校验本地资源 / Verifying reusable game files';const {meta}=await this.core.runtimeMetadata(item.id),plan=planFiles(meta,this.core.root);let reused=0;
   const reuse=async f=>{this.check();signal.throwIfAborted();const rel=relative(this.core.root,f.path).split(sep).join('/');if(!/^(assets|libraries|versions)\//.test(rel)||await verified(f))return;const source=safePath(scan.root,rel);try{await noLinks(source);if(!await verified({...f,path:source}))return;await ensureParents(this.core.root,f.path);await copyFile(source,f.path,constants.COPYFILE_EXCL);if(!await verified(f))throw Error('本地缓存校验失败 / Cache verification failed');reused++;}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}job.completed++;};
   await reuse(plan.index);const files=[...plan.files];if(await verified(plan.index))files.push(...assetFiles(JSON.parse(await readFile(plan.index.path,'utf8')),this.core.root));job.total=files.length;for(const f of files)await reuse(f);provenance.reusedFiles=reused;
  }));
  this.check();await this.wait(await this.core.install(item.id));provenance.status='complete';await atomicJson(join(dir,'minecraft-import.json'),provenance);return {instance:(await this.core.listInstances()).find(i=>i.id===item.id),reusedFiles:provenance.reusedFiles,copiedFiles:data.files.length};
 }catch(e){if(item)e.message+=' · '+item.name+'：已复制内容保留在新实例中，原目录未改动 / Copied content retained in the new instance; source unchanged';throw e;}finally{this.busy=false;}
 }
}
