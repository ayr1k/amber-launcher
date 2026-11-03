// SPDX-License-Identifier: MPL-2.0
import {readFile,readdir,lstat,realpath,copyFile,statfs} from 'node:fs/promises';
import {resolve,join,relative,sep,parse} from 'node:path';
import {randomUUID} from 'node:crypto';
import {constants} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {safePath,ensureParents,verified,digest} from './download.mjs';
import {atomicJson} from './core.mjs';
import {planFiles,assetFiles} from './vanilla.mjs';
export const importGroups=['saves','mods','config','defaultconfigs','resourcepacks','shaderpacks','screenshots','kubejs','scripts','options.txt','optionsof.txt','servers.dat'];
const identifier=s=>typeof s==='string'&&/^[-\w.+]{1,150}$/.test(s);
export async function noLinks(path){const full=resolve(path),root=parse(full).root;let p=root;for(const part of full.slice(root.length).split(sep).filter(Boolean)){p=join(p,part);const st=await lstat(p);if(st.isSymbolicLink())throw Error('目录包含链接，未读取 / Linked paths are not supported');}return full;}
async function json(path){await noLinks(path);const st=await lstat(path);if(!st.isFile()||st.size>16000000)throw Error('Invalid JSON file size');return JSON.parse(await readFile(path,'utf8'));}
export async function resolveProfile(root,id){
 const chain=[],seen=new Set();let next=id;
 while(next){if(!identifier(next)||seen.has(next)||chain.length>=16)throw Error('版本继承无效 / Invalid version inheritance');seen.add(next);const m=await json(safePath(root,`versions/${next}/${next}.json`));if(m.id!==next)throw Error('版本标识不匹配 / Version ID mismatch');chain.push(m);next=m.inheritsFrom;}
 const base=chain.at(-1),libraries=chain.flatMap(m=>m.libraries||[]).map(l=>l.name||'');let loader='vanilla',version='';
 for(const [prefix,type] of [['net.fabricmc:fabric-loader:','fabric'],['net.minecraftforge:forge:','forge'],['net.neoforged:neoforge:','neoforge']]){const entry=libraries.find(n=>n.startsWith(prefix));if(entry){if(loader!=='vanilla')throw Error('多加载器配置暂不支持 / Multiple loader profiles are unsupported');loader=type;version=entry.slice(prefix.length).split(':')[0];}}
 if(chain.length>1&&loader==='vanilla'||chain.some(m=>m.mainClass&&!['net.minecraft.client.main.Main','net.minecraft.launchwrapper.Launch'].includes(m.mainClass))&&loader==='vanilla')throw Error('无法识别此自定义客户端，请保留原启动器 / Unrecognized custom client; use its original launcher');
 if(!identifier(base.id)||!base.downloads?.client)throw Error('缺少原版版本信息 / Missing vanilla version metadata');
 return {game:base.id,loader,version,chain:chain.map(m=>m.id)};
}
export async function scanMinecraft(path){
 const root=await noLinks(path);if(!(await lstat(root)).isDirectory())throw Error('Choose a .minecraft directory');
 const entries=await readdir(join(root,'versions'),{withFileTypes:true});if(entries.length>10000)throw Error('Too many versions');let profiles={};try{profiles=(await json(join(root,'launcher_profiles.json'))).profiles||{};}catch(e){if(e.code!=='ENOENT')throw e;}
 const candidates=Object.entries(profiles).filter(([,p])=>p&&identifier(p.lastVersionId)).map(([key,p])=>({key,name:String(p.name||p.lastVersionId).slice(0,60),versionId:p.lastVersionId,gameDir:typeof p.gameDir==='string'?resolve(root,p.gameDir):root}));
 for(const e of entries)if(e.isDirectory()&&!e.isSymbolicLink()&&identifier(e.name)&&!candidates.some(p=>p.versionId===e.name))candidates.push({key:'version:'+e.name,name:e.name.slice(0,60),versionId:e.name,gameDir:root});
 const rows=[];for(const p of candidates.slice(0,500)){try{await noLinks(p.gameDir);rows.push({...p,...await resolveProfile(root,p.versionId),supported:true});}catch(e){rows.push({...p,supported:false,reason:e.message});}}
 return {root,rows};
}
export async function collectImportFiles(root,groups){
 if(!Array.isArray(groups)||groups.some(g=>!importGroups.includes(g)))throw Error('Invalid import selection');const files=[];let bytes=0;
 async function walk(path,rel,depth=0){if(depth>40)throw Error('目录层级过深 / Directory nesting limit');const st=await lstat(path);if(st.isSymbolicLink())throw Error('内容包含链接 / Content contains a link: '+rel);if(st.isDirectory()){for(const e of await readdir(path))await walk(safePath(root,rel+'/'+e),rel+'/'+e,depth+1);}else if(st.isFile()&&!rel.endsWith('/session.lock')){safePath(root,rel);bytes+=st.size;if(files.length>=200000||bytes>1000000000000)throw Error('导入内容过大 / Import exceeds limits');files.push({relative:rel,size:st.size,mtime:st.mtimeMs});}}
 await noLinks(root);for(const group of [...new Set(groups)])try{await walk(safePath(root,group),group)}catch(e){if(e.code!=='ENOENT')throw e;}return {files,bytes};
}
export class MinecraftImport {
 constructor(core){this.core=core;this.scans=new Map();this.busy=false;}
 cancel(){this.cancelled=true;for(const j of this.core.jobs.filter(j=>j.instanceId===this.instanceId&&j.state==='running'))this.core.controllers.get(j.id)?.abort(Error('导入已取消 / Import cancelled'));}
 status(){const job=this.core.jobs.filter(j=>j.instanceId===this.instanceId).at(-1);return {busy:this.busy,instanceId:this.instanceId,job:job?{phase:job.phase,completed:job.completed,total:job.total,transferred:job.transferred,state:job.state}:null};}
 check(){if(this.cancelled)throw Error('导入已取消，原目录保留 / Import cancelled; source retained');}
 async scan(path){const result=await scanMinecraft(path),id=randomUUID();this.scans.clear();this.scans.set(id,{...result,expires:Date.now()+3600000});return {id,...result,groups:importGroups};}
 selection(token,key){const scan=this.scans.get(token),profile=scan?.rows.find(p=>p.key===key);if(!scan||scan.expires<Date.now()||!profile?.supported)throw Error('请重新选择原版目录 / Select the source directory again');return {scan,profile};}
 async preview(token,key,groups){const {profile}=this.selection(token,key),data=await collectImportFiles(profile.gameDir,groups);return {files:data.files.length,bytes:data.bytes,gameDir:profile.gameDir};}
 async wait(job){while(true){const current=this.core.jobs.find(j=>j.id===job.id);if(current.state==='done')return;if(current.state!=='running')throw Error(current.error||'Import cancelled');await delay(100);}}
 async create(token,key,input){
 if(this.busy)throw Error('正在导入，请等待 / Another import is running');const {scan,profile}=this.selection(token,key);this.busy=true;this.cancelled=false;this.instanceId=null;let item;
 try{this.core.workflowGuard?.();const groups=input?.groups;if(typeof input?.name!=='string'||!input.name.trim()||input.name.length>60)throw Error('请输入实例名称 / Enter an instance name');const data=await collectImportFiles(profile.gameDir,groups);
  if(resolve(profile.gameDir).toLowerCase()===resolve(this.core.root).toLowerCase()||relative(profile.gameDir,this.core.root).startsWith('..')===false)throw Error('源目录不能包含 AMBER 数据库 / Source must not contain the AMBER library');
  await this.core.versions();this.check();if(!this.core.catalog.some(v=>v.id===profile.game))throw Error('此基础版本不在官方目录 / Base version unavailable in official catalog');
  item=await this.core.createInstance({name:input.name,game:profile.game,icon:'grass'});this.instanceId=item.id;this.check();const dir=await this.core.instancePath(item.id),space=await statfs(dir);if(space.bavail*space.bsize<data.bytes+2000000000)throw Error('可用空间不足，请保留至少 2 GB 余量 / Not enough free space (2 GB reserve required)');
  const provenance={schema:1,source:scan.root,gameDirectory:profile.gameDir,profile:profile.versionId,mode:'copy',groups,createdAt:new Date().toISOString(),status:'copying'};await atomicJson(join(dir,'minecraft-import.json'),provenance);
  await this.wait(await this.core.startJob(item.id,'minecraft-copy',async(job,signal)=>{job.phase='复制原版实例 / Copying original game data';job.total=data.files.length;
   for(const f of data.files){this.check();signal.throwIfAborted();const source=safePath(profile.gameDir,f.relative),dest=safePath(dir,f.relative);await noLinks(source);const before=await lstat(source);if(before.size!==f.size||before.mtimeMs!==f.mtime)throw Error('源文件已变化，请关闭游戏后重新导入 / Source changed; close the game and retry');await ensureParents(dir,dest);await copyFile(source,dest,constants.COPYFILE_EXCL);if(await digest(source,'sha256')!==await digest(dest,'sha256'))throw Error('复制校验失败 / Copy verification failed');const after=await lstat(source);if(after.mtimeMs!==before.mtimeMs||after.size!==before.size)throw Error('源文件已变化 / Source changed during copy');job.completed++;job.transferred+=f.size;}
  }));
  this.check();if(profile.loader!=='vanilla')await this.wait(await this.core.configureLoader(item.id,profile.loader,profile.version));this.check();
  await this.wait(await this.core.startJob(item.id,'minecraft-cache',async(job,signal)=>{job.phase='复用并校验本地资源 / Verifying reusable game files';const {meta}=await this.core.runtimeMetadata(item.id),plan=planFiles(meta,this.core.root);let reused=0;
   const reuse=async f=>{this.check();signal.throwIfAborted();const rel=relative(this.core.root,f.path).split(sep).join('/');if(!/^(assets|libraries|versions)\//.test(rel)||await verified(f))return;const source=safePath(scan.root,rel);try{await noLinks(source);if(!await verified({...f,path:source}))return;await ensureParents(this.core.root,f.path);await copyFile(source,f.path,constants.COPYFILE_EXCL);if(!await verified(f))throw Error('本地缓存校验失败 / Cache verification failed');reused++;}catch(e){if(!['ENOENT','EEXIST'].includes(e.code))throw e;}job.completed++;};
   await reuse(plan.index);const files=[...plan.files];if(await verified(plan.index))files.push(...assetFiles(JSON.parse(await readFile(plan.index.path,'utf8')),this.core.root));job.total=files.length;for(const f of files)await reuse(f);provenance.reusedFiles=reused;
  }));
  this.check();await this.wait(await this.core.install(item.id));provenance.status='complete';await atomicJson(join(dir,'minecraft-import.json'),provenance);return {instance:(await this.core.listInstances()).find(i=>i.id===item.id),reusedFiles:provenance.reusedFiles,copiedFiles:data.files.length};
 }catch(e){if(item)e.message+=' · '+item.name+'：已复制内容保留在新实例中，原目录未改动 / Copied content retained in the new instance; source unchanged';throw e;}finally{this.busy=false;}
 }
}
