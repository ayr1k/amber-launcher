// SPDX-License-Identifier: MPL-2.0
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,copyFile,unlink,lstat,constants} from 'node:fs/promises';
import {join} from 'node:path';
import {download,downloadPool,safePath,safeURL,ensureParents} from './download.mjs';
import {beginTransaction,finishTransaction,recoverInstance} from './recovery.mjs';
import {atomicJson} from './core.mjs';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
const allowed=new Set(['mods','config','resourcepacks','shaderpacks','saves','defaultconfigs','kubejs','scripts']);
function packPath(root,path){safePath(root,path);const reserved=new Set(['instance.json','loader-base.json','trash-record.json','version.json','loader.json','installation.json','content.json','modpack.json','setup-report.json','guided-plan.json','launch-preferences.json','content-task.json','migration-report.json','content-transaction.json','recovery-report.json','.amber-session.json']);const rootData=/^[^/]+\.(json|txt|dat|cfg|properties|png)$/i.test(path)&&!reserved.has(path.toLowerCase());if(!rootData&&(!allowed.has(path.split('/')[0])||path.split('/').length<2))throw Error('整合包包含暂不支持的安装路径：'+path);return path;}

export function parsePack(bytes,root){
 let total=0;const entries=unzipSync(bytes,{filter:f=>{safePath(root,f.name.replace(/\/$/,''));if(f.name.endsWith('/'))return false;if(f.name!=='modrinth.index.json'&&!f.name.startsWith('overrides/')&&!f.name.startsWith('client-overrides/'))return false;total+=f.originalSize;if(total>600_000_000||f.originalSize>100_000_000)throw Error('整合包展开大小超过限制。');return true;}});
 if(!entries['modrinth.index.json'])throw Error('缺少 modrinth.index.json。');const index=JSON.parse(Buffer.from(entries['modrinth.index.json']).toString('utf8'));
 if(index.formatVersion!==1||index.game!=='minecraft'||!index.dependencies?.minecraft||!Array.isArray(index.files)||index.files.length>10000)throw Error('不支持的 MRPACK 格式。');
 const files=new Map(),warnings=[];
 for(const f of index.files){if(f.env?.client==='unsupported')continue;if(f.env?.client==='optional'){warnings.push('已跳过可选客户端文件：'+f.path);continue;}const relative=packPath(root,f.path);if(!/^[a-f0-9]{40}$/.test(f.hashes?.sha1)||!Number.isSafeInteger(f.fileSize)||f.fileSize<1)throw Error('整合包文件缺少校验或大小信息。');const url=f.downloads?.find(u=>{try{safeURL(u);return true;}catch{return false;}});if(!url)throw Error('没有可用的受信任下载地址：'+relative);const key=relative.toLowerCase();if(files.has(key))throw Error('整合包包含重复路径。');files.set(key,{relative,hash:f.hashes.sha1,size:f.fileSize,url,title:relative});}
 for(const prefix of ['overrides/','client-overrides/'])for(const [name,data]of Object.entries(entries)){if(!name.startsWith(prefix))continue;const relative=packPath(root,name.slice(prefix.length));files.set(relative.toLowerCase(),{relative,hash:createHash('sha1').update(data).digest('hex'),size:data.length,bytes:data,title:relative});}
 return {index,files:[...files.values()],warnings};
}
export class Modpacks{
 constructor(core,store){this.core=core;this.store=store;this.plans=new Map();}
 async preview(id,version){
  const v=await this.store.api('version/'+encodeURIComponent(version)),p=await this.store.api('project/'+encodeURIComponent(v.project_id));if(p.project_type!=='modpack')throw Error('请选择 Modrinth 整合包。');
  const f=v.files.find(f=>f.primary)||v.files[0];if(!f?.filename.endsWith('.mrpack'))throw Error('此版本没有 MRPACK 文件。');
  const path=safePath(this.core.root,'content-cache/'+f.hashes.sha1);await download({path,url:f.url,hash:f.hashes.sha1,size:f.size},{root:this.core.root,fetcher:this.core.fetcher});
  const {dir,item}=id?await this.core.metadata(id):{dir:join(this.core.root,'pack-preview'),item:{}},parsed=parsePack(await readFile(path),dir),deps=parsed.index.dependencies;
  const keys=Object.keys(deps).filter(k=>k!=='minecraft');if(keys.length>1||keys.some(k=>!['fabric-loader','forge','neoforge'].includes(k)))throw Error('此整合包加载器组合暂不支持：'+JSON.stringify(deps));
  const type=keys[0]==='fabric-loader'?'fabric':keys[0]||'vanilla',required=keys[0]?deps[keys[0]]:null,actual=item.loader==='forge'?item.loaderVersion?.replace(item.game+'-',''):item.loaderVersion;
  const compatible=item.game===deps.minecraft&&item.loader===type&&(!required||actual===required);
  const plan={id:randomUUID(),instanceId:id,versionId:v.id,title:p.title,game:deps.minecraft,loader:type,loaderVersion:required,compatible,files:parsed.files,warnings:parsed.warnings,expiresAt:Date.now()+600000};for(const [key,p]of this.plans)if(p.expiresAt<Date.now())this.plans.delete(key);this.plans.set(plan.id,plan);
  return {...plan,files:plan.files.map(({bytes,...f})=>f),warnings:[...plan.warnings,`需要 Minecraft ${deps.minecraft} / ${type} ${required||''}。请在独立实例准备对应版本；安装不会覆盖已有文件。`]};
 }
 async install(id,planId){const plan=this.plans.get(planId);if(!plan||plan.instanceId!==id||plan.expiresAt<Date.now())throw Error('预览已过期，请重新读取整合包。');const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const actual=item.loader==='forge'?item.loaderVersion?.replace(item.game+'-',''):item.loaderVersion;if(item.game!==plan.game||item.loader!==plan.loader||(plan.loaderVersion&&actual!==plan.loaderVersion))throw Error('请先按整合包清单准备一致的游戏及加载器版本。');
  return this.core.startJob(id,'modpack',async(job,signal)=>{
   for(const f of plan.files){const target=safePath(dir,f.relative);await ensureParents(dir,target);try{await lstat(target);throw Error('目标实例已有文件，请使用空白实例：'+f.relative);}catch(e){if(e.code!=='ENOENT')throw e;}}
   const files=plan.files.map(f=>({...f,path:safePath(this.core.root,'content-cache/'+f.hash),label:f.title}));job.total=files.length;job.phase='下载整合包客户端文件';
   for(const f of files.filter(f=>f.bytes)){await ensureParents(this.core.root,f.path);await writeFile(f.path,f.bytes);job.completed++;}
   await downloadPool(files.filter(f=>!f.bytes),{root:this.core.root,fetcher:this.core.fetcher,signal,threads:this.core.downloadThreads||8,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});signal.throwIfAborted();
   const tx=await beginTransaction(dir,'modpack.json',files);
   const created=[];try{for(const f of files){const target=safePath(dir,f.relative);await ensureParents(dir,target);await copyFile(f.path,target,constants.COPYFILE_EXCL);created.push(target);}await atomicJson(join(dir,'modpack.json'),{schema:1,transactionId:tx.id,title:plan.title,versionId:plan.versionId,files:plan.files.map(({bytes,...f})=>f),warnings:plan.warnings});}catch(e){await recoverInstance(dir).catch(()=>{});throw e;}await finishTransaction(dir);this.plans.delete(planId);
  });
 }
}
