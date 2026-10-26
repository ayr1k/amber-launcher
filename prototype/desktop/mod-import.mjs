// SPDX-License-Identifier: MPL-2.0
import {readFile,lstat,readdir,mkdir,copyFile,unlink} from 'node:fs/promises';
import {basename,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {digest,safePath,ensureParents} from './download.mjs';
import {instanceLoaders} from './compatibility.mjs';
import {contentStamp,validateUpdateGraph,recoverModUpdate} from './mod-updates.mjs';
import {requireSpace} from './safe-copy.mjs';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
const metadataNames=new Set(['fabric.mod.json','quilt.mod.json','META-INF/mods.toml','META-INF/neoforge.mods.toml','mcmod.info','litemod.json']);
const text=v=>typeof v==='string'?v.slice(0,200):'';
export function readModMetadata(bytes){
 let size=0;const entries=unzipSync(bytes,{filter:f=>{if(!metadataNames.has(f.name))return false;size+=f.originalSize;if(f.originalSize>1_000_000||size>3_000_000)throw Error('模组元数据过大，未导入。');return true;}}),found=[];
 for(const [name,raw] of Object.entries(entries)){const value=Buffer.from(raw).toString('utf8');
  if(name.endsWith('.toml')){const field=k=>value.match(new RegExp('^\\s*'+k+'\\s*=\\s*["\u0027]([^"\u0027]*)["\u0027]','m'))?.[1]||'';found.push({title:field('displayName'),version:field('version'),modId:field('modId'),loader:name.includes('neoforge')?'neoforge':'forge'});}
  else{let v;try{v=JSON.parse(value);}catch{throw Error('模组元数据损坏，未导入。');}if(name==='quilt.mod.json'){v=v.quilt_loader||{};found.push({title:text(v.metadata?.name),version:text(v.version),modId:text(v.id),loader:'quilt'});}else{if(Array.isArray(v))v=v[0]||{};found.push({title:text(v.name),version:text(v.version),modId:text(v.id||v.modid||v.name),loader:name==='fabric.mod.json'?'fabric':name==='litemod.json'?'liteloader':'forge',game:typeof v.depends?.minecraft==='string'?v.depends.minecraft:text(v.mcversion)});}}
 }
 return {title:found.find(f=>f.title)?.title||'',version:found.find(f=>f.version&&!f.version.includes('${'))?.version||'',modIds:[...new Set(found.map(f=>f.modId).filter(Boolean))],loaders:[...new Set(found.flatMap(f=>f.loader==='forge'&&entries['META-INF/mods.toml']?['forge','neoforge']:[f.loader]))],games:found.map(f=>f.game).filter(Boolean)};
}
const fingerprint=item=>JSON.stringify([item.game,item.loader,item.loaderVersion,item.loaderSha1,item.liteVersion,item.liteBaseSha1]);
export class ModImport {
 constructor(core,content,updates){Object.assign(this,{core,content,updates});this.plans=new Map();}
 async inventory(id){const {dir}=await this.core.metadata(id),manifest=await this.content.manifest(dir),files=[];for(const e of await readdir(join(dir,'mods'),{withFileTypes:true})){if(!/\.(jar|litemod)(\.disabled)?$/i.test(e.name))continue;const path=safePath(dir,'mods/'+e.name);await ensureParents(dir,path);if(!e.isFile())throw Error('模组目录含链接或非普通文件，请先检查。');const stat=await lstat(path);if(stat.size>150_000_000)throw Error('现有模组过大，无法安全预检。');const bytes=await readFile(path);if(bytes.length>150_000_000)throw Error('现有模组过大，无法安全预检。');let meta={modIds:[]};try{meta=readModMetadata(bytes);}catch{}files.push({name:e.name,hash:createHash('sha1').update(bytes).digest('hex'),modIds:meta.modIds});}return {dir,manifest,files,stamp:contentStamp(manifest)+JSON.stringify(files)};}
 async preview(id,paths,lookup=true){
  if(!Array.isArray(paths)||!paths.length||paths.length>50)throw Error('每次请选择 1–50 个 JAR 或 LiteMod 文件。');
  const {item,dir}=await this.core.metadata(id);await this.core.requireStopped(dir);const inv=await this.inventory(id),rows=[];let total=0;
  for(const path of paths){const row={key:randomUUID(),filename:basename(path),warnings:[],blockers:[],source:path};rows.push(row);try{
   const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>150_000_000||!s.size||! /\.(jar|litemod)$/i.test(row.filename))throw Error('请选择 150 MB 以内的普通 JAR 或 LiteMod 文件。');total+=s.size;if(total>500_000_000)throw Error('本批文件总大小超过 500 MB，请分批导入。');safePath(dir,'mods/'+row.filename);
   const bytes=await readFile(path),meta=readModMetadata(bytes);Object.assign(row,{...meta,title:meta.title||row.filename,hash:createHash('sha1').update(bytes).digest('hex'),size:bytes.length,relative:'mods/'+row.filename,type:'mod',algorithm:'sha1'});
   if(item.loader==='vanilla'||meta.loaders.length&&!meta.loaders.some(l=>instanceLoaders(item).includes(l)))row.blockers.push('文件声明的加载器与此实例不兼容。');
   if(inv.files.some(f=>f.hash===row.hash))row.blockers.push('此实例已有相同内容的文件（可能已停用）。');
   if(inv.files.some(f=>f.name.replace(/\.disabled$/,'').toLowerCase()===row.filename.toLowerCase())||inv.manifest.files.some(f=>f.relative.toLowerCase()===row.relative.toLowerCase()))row.blockers.push('已有同名文件或记录，不会覆盖。');
   if(meta.modIds.some(m=>inv.files.some(f=>f.modIds.includes(m))))row.blockers.push('已存在相同模组标识，请先停用并移出旧文件，或使用更新管理。');
   if(meta.games.length&&meta.games.every(g=>/^\d+(\.\d+){1,2}$/.test(g))&&!meta.games.includes(item.game))row.blockers.push('文件声明的 Minecraft 版本与实例不同。');
   if(lookup){try{const v=await this.content.api('version_file/'+row.hash+'?algorithm=sha1');if(!v.files?.some(f=>f.hashes?.sha1===row.hash)||!/^[-\w]{1,100}$/.test(v.id)||!/^[-\w]{1,100}$/.test(v.project_id))throw Error('来源返回的文件校验不一致。');const p=await this.content.api('project/'+v.project_id);if(p.project_type!=='mod'||!this.content.compatible(v,item,'mod'))row.blockers.push('Modrinth 声明此文件不适配当前游戏或加载器。');Object.assign(row,{projectId:v.project_id,versionId:v.id,title:p.title,version:v.version_number,dependencies:v.dependencies||[],identified:true});if(inv.manifest.files.some(f=>f.projectId===v.project_id))row.blockers.push('同一项目已有安装记录，请使用更新管理。');}catch(e){row.warnings.push(e.status===404?'Modrinth 未识别此文件，将按手动模组管理。':'来源识别暂不可用，将按手动模组管理。');}}
   if(!row.identified)row.warnings.push('仅从文件读取基本信息，无法确认完整版本范围、依赖和冲突；不会猜测更新来源。');
  }catch(e){row.blockers.push(e.message);}}
  const key=randomUUID();for(const [k,p] of this.plans)if(p.expires<Date.now())this.plans.delete(k);if(this.plans.size>=20)this.plans.delete(this.plans.keys().next().value);this.plans.set(key,{instanceId:id,rows,stamp:inv.stamp,fingerprint:fingerprint(item),expires:Date.now()+600000});return {id:key,rows:rows.map(({source,...r})=>r)};
 }
 async selected(id,key,keys,enabled){const p=this.plans.get(key);if(!p||p.instanceId!==id||p.expires<Date.now())throw Error('导入预览已过期，请重新选择文件。');if(typeof enabled!=='boolean'||!Array.isArray(keys)||!keys.length||new Set(keys).size!==keys.length)throw Error('请选择需要导入的文件。');const rows=keys.map(k=>p.rows.find(r=>r.key===k));if(rows.some(r=>!r||r.blockers.length))throw Error('所选文件存在阻止导入的问题。');const {item}=await this.core.metadata(id),inv=await this.inventory(id);if(inv.stamp!==p.stamp||fingerprint(item)!==p.fingerprint)throw Error('实例或模组文件已变化，请重新导入预览。');const seen=new Set();for(const row of rows){for(const k of ['file:'+row.filename.toLowerCase(),'hash:'+row.hash,...(row.modIds||[]).map(x=>'mod:'+x),...(row.projectId?['project:'+row.projectId]:[])]){if(seen.has(k))throw Error('所选文件中存在重复模组或文件，请只保留一个版本。');seen.add(k);}}
  const next=rows.map(({source,key,blockers,warnings,identified,...f})=>({...f,enabled})),after={...inv.manifest,files:[...inv.manifest.files,...next]};validateUpdateGraph(after.files);return {p,rows,next,after,...inv};}
 async validate(id,key,keys,enabled){try{const s=await this.selected(id,key,keys,enabled);return {blockers:[],count:s.rows.length};}catch(e){return {blockers:[e.message]};}}
 async apply(id,key,keys,enabled){const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);return this.core.startJob(id,'content-import',async(job,signal)=>{
  await recoverModUpdate(dir);const s=await this.selected(id,key,keys,enabled);await requireSpace(dir,s.rows.reduce((n,r)=>n+r.size,0)*3);const cache=safePath(dir,'content-import-cache/'+randomUUID());await ensureParents(dir,cache);await mkdir(cache,{recursive:true});const staged=[];job.total=s.rows.length;job.phase='校验并导入本地模组';job.operation='import';job.results=s.rows.map(r=>({relative:r.relative,title:r.title,state:'pending'}));try{for(const row of s.rows){signal.throwIfAborted();const stat=await lstat(row.source);if(!stat.isFile()||stat.isSymbolicLink()||await digest(row.source)!==row.hash)throw Error('选中的源文件已变化，请重新选择。');const out=safePath(cache,row.filename);await copyFile(row.source,out);staged.push(out);}await this.updates.replace(dir,s.manifest,s.after,[],s.next,f=>safePath(cache,f.filename),signal,job);job.completed=job.total;job.results.forEach(r=>r.state='done');this.plans.delete(key);}catch(e){job.results.forEach(r=>{r.state='failed';r.error=e.message;});throw e;}finally{for(const p of staged)await unlink(p).catch(()=>{});}
 });}
}
