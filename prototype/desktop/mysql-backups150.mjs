// SPDX-License-Identifier: MPL-2.0
import {readBoundedFile} from './bounded-io.mjs';
import {join,resolve,relative,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile,readdir,mkdir,rename,lstat,rm,rmdir} from 'node:fs/promises';
import {atomicJson} from './core.mjs';
import {ensureParents,digest,safePath} from './download.mjs';
import {copyVerified,requireSpace,treeFiles} from './safe-copy.mjs';
import {initialProperties} from './server-properties132.mjs';
import {probePort150} from './ports150.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
async function existingDirectory(root,path){const rel=relative(resolve(root),resolve(path));if(rel.startsWith('..')||rel.includes(':'))throw Error('文件路径越界。');let current=resolve(root);for(const part of [''].concat(rel.split(sep))){if(part)current=join(current,part);const stat=await lstat(current);if(stat.isSymbolicLink()||!stat.isDirectory())throw Error('安装目录不可使用链接。');}}
export function validateDatabaseBackup150(m,id,version){if(m.schema!==1||!Number.isFinite(Date.parse(m.createdAt))||m.serverId!==id||m.version!==version||m.config?.schema!==1||m.config?.serverId!==id||m.config?.version!==version||m.config?.phase!=='ready'||typeof m.config?.secret!=='string'||!Number.isInteger(m.config?.port)||m.config.port<1024||m.config.port>65535||!Array.isArray(m.files)||!m.files.length||m.files.length>200000||m.files.some(f=>typeof f.relative!=='string'||!Number.isSafeInteger(f.size)||f.size<0||! /^[a-f0-9]{64}$/.test(f.hash)))throw Error('数据库备份记录无效，原文件已保留。');return m;}
export class DatabaseBackups150 {
 constructor(database,version){this.db=database;this.version=version;this.root=join(database.core.root,'database-backups150');this.migrations=new Map();this.copyFiles=copyVerified;}
 directory(id){if(!uuid.test(id||''))throw Error('Invalid server ID');return join(this.root,id);}
 async owner(id,dir){try{const item=JSON.parse(await readFile(join(dir,'server.json'),'utf8'));if(item.id===id&&typeof item.name==='string'&&/^[-\w.]{1,60}$/.test(item.game))return {id,name:item.name.slice(0,60),game:item.game};}catch{}return {id,name:id,game:'1.21.1'};}
 async load(id,key){if(!uuid.test(key||''))throw Error('Unknown backup');const file=join(this.directory(id),key,'manifest.json');await ensureParents(this.db.core.root,file);return validateDatabaseBackup150(JSON.parse(await readBoundedFile(file,64_000_000)),id,this.version);}
 migrate(id,dir){return this.db.operations.run(id,()=>this.db.withInstance(id,()=>this.migrateRegistered(id,dir)));}
 async migrateRegistered(id,dir){const prior=this.migrations.get(id)||Promise.resolve();const task=prior.catch(()=>{}).then(async()=>{const legacy=join(dir,'mysql150','backups');let entries;try{await existingDirectory(this.db.core.root,legacy);entries=await readdir(legacy,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}const owner=await this.owner(id,dir);for(const entry of entries){if(!uuid.test(entry.name)||!entry.isDirectory()||entry.isSymbolicLink())throw Error('数据库备份记录无效，原文件已保留。');const source=join(legacy,entry.name);await ensureParents(this.db.core.root,join(source,'manifest.json'));const m=validateDatabaseBackup150(JSON.parse(await readBoundedFile(join(source,'manifest.json'),64_000_000)),id,this.version),target=join(this.directory(id),entry.name);await ensureParents(this.db.core.root,target);let exists=true;try{await lstat(target);}catch(e){if(e.code==='ENOENT')exists=false;else throw e;}if(exists){const existing=await this.load(id,entry.name);if(JSON.stringify(existing.files)!==JSON.stringify(m.files)||JSON.stringify(existing.config)!==JSON.stringify(m.config))throw Error('数据库备份迁移目标冲突，原文件已保留。');for(const f of m.files){const file=safePath(join(target,'data'),f.relative);await ensureParents(this.root,file);if(await digest(file,'sha256')!==f.hash)throw Error('数据库备份迁移校验失败，原文件已保留。');}}else{const stage=join(this.directory(id),'migrate-'+entry.name);await ensureParents(this.db.core.root,stage);await this.clearStage(id,entry.name,stage);await ensureParents(this.db.core.root,join(stage,'migration.json'));await atomicJson(join(stage,'migration.json'),{schema:1,ownerId:id,backupId:entry.name});try{await requireSpace(this.root,m.files.reduce((n,f)=>n+f.size,0));await this.copyFiles(join(source,'data'),join(stage,'data'),m.files);await atomicJson(join(stage,'manifest.json'),{...m,owner});await rename(stage,target);}catch(error){try{await this.clearStage(id,entry.name,stage);}catch{throw Error('Database migration staging cleanup failed; original backup retained / 数据库迁移暂存清理失败，原备份已保留');}throw error;}}await rename(source,join(dir,'mysql150','migrated-backup-'+entry.name));}}).finally(()=>{if(this.migrations.get(id)===task)this.migrations.delete(id);});this.migrations.set(id,task);return task;}
 async clearStage(id,key,stage){await ensureParents(this.db.core.root,stage);let entries;try{entries=await readdir(stage);}catch(e){if(e.code==='ENOENT')return;throw e;}if(!entries.length){await rmdir(stage);return;}const unknown=()=>Error('Unrecognized migration staging directory; original backup retained / 无法识别迁移暂存目录，原备份已保留');const final=join(stage,'migration.json');let marker,temporary;
  try{marker=JSON.parse(await readBoundedFile(final,4096));}catch(error){
   if(error.code!=='ENOENT')throw unknown();
   // atomicJson writes this complete, bounded marker before its final rename.
   // No payload may exist before marker commit: reject extra or ambiguous files.
   if(entries.length!==1||!/^migration\.json\.[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.tmp$/.test(entries[0]))throw unknown();
   temporary=join(stage,entries[0]);await ensureParents(this.db.core.root,temporary);
   try{marker=JSON.parse(await readBoundedFile(temporary,4096));}catch{throw unknown();}
  }
  if(marker?.schema!==1||marker.ownerId!==id||marker.backupId!==key||Object.keys(marker).length!==3)throw unknown();
  await treeFiles(stage);if(temporary)await rename(temporary,final);await rm(stage,{recursive:true,force:true});}
 async list(id){const dir=this.directory(id);await ensureParents(this.db.core.root,join(dir,'check'));const rows=[];for(const key of await readdir(dir))if(uuid.test(key)){try{const m=await this.load(id,key);rows.push({id:key,createdAt:m.createdAt});}catch{}}return rows;}
 library(){return this.db.operations.run(null,()=>this.readLibrary());}
 async readLibrary(){
  const issues=[];
  for(const parent of [this.db.servers.root,join(this.db.core.root,'server-trash')]){
   await ensureParents(this.db.core.root,join(parent,'check'));
   for(const e of await readdir(parent,{withFileTypes:true}))if(e.isDirectory()&&!e.isSymbolicLink()&&uuid.test(e.name)){
    try{await this.db.withInstance(e.name,()=>this.db.withAllocation(()=>this.migrate(e.name,join(parent,e.name))));}catch(error){issues.push({ownerId:e.name,error:error.message});}
   }
  }
  const active=new Set((await this.db.servers.list()).map(s=>s.id)),recycled=new Set((await readdir(join(this.db.core.root,'server-trash'),{withFileTypes:true})).filter(e=>e.isDirectory()&&!e.isSymbolicLink()).map(e=>e.name));
  await ensureParents(this.db.core.root,join(this.root,'check'));const backups=[];
  for(const owner of await readdir(this.root))if(uuid.test(owner)){
   await ensureParents(this.db.core.root,join(this.directory(owner),'check'));
   for(const key of await readdir(this.directory(owner)))if(uuid.test(key)){
    try{const m=await this.load(owner,key);backups.push({id:key,ownerId:owner,name:typeof m.owner?.name==='string'?m.owner.name.slice(0,60):owner,createdAt:m.createdAt,status:active.has(owner)?'active':recycled.has(owner)?'recycled':'orphan'});}catch(error){issues.push({ownerId:owner,error:error.message});}
   }else if(key.startsWith('migrate-'))issues.push({ownerId:owner,error:'Unfinished migration staging retained; original backup is preserved / 未完成迁移暂存已保留，原备份仍在'});
  }
  return {backups,issues};
 }
 recover(id,key){this.directory(id);if(!uuid.test(key||''))throw Error('Unknown backup');return this.db.exclusive(id,()=>this.db.withAllocation(async()=>{const target=join(this.db.servers.root,id);for(const path of [target,join(this.db.core.root,'server-trash',id)]){try{await lstat(path);throw Error('原实例仍存在，请在原实例中恢复数据库备份。');}catch(e){if(e.code!=='ENOENT')throw e;}}const m=await this.load(id,key);await this.db.credentials(m.config);const reserved=await this.db.reservedPorts();const choose=async(preferred,start,end)=>{for(const port of [...new Set([preferred,...Array.from({length:end-start},(_,i)=>start+i)])]){if(reserved.has(port))continue;try{await probePort150(port,'tcp');reserved.add(port);return port;}catch{}}throw Error('No free database port / 没有可用的数据库端口');};const port=await choose(m.config.port,33070,33170),gamePort=await choose(25565,25565,25665),stage=join(this.db.core.root,'database-recovery150',randomUUID());await ensureParents(this.db.core.root,join(stage,'check'));await requireSpace(stage,m.files.reduce((n,f)=>n+f.size,0));await copyVerified(join(this.directory(id),key,'data'),join(stage,'mysql150','data'),m.files);const owner=m.owner||{name:id,game:'1.21.1'};const item={schema:1,id,name:('DB · '+String(owner.name)).slice(0,60),type:'vanilla',game:/^[-\w.]{1,60}$/.test(owner.game)?owner.game:'1.21.1',memory:2,status:'new',createdAt:new Date().toISOString(),databaseRecovery:true};await atomicJson(join(stage,'server.json'),item);await writeFile(join(stage,'server.properties'),initialProperties(gamePort));await writeFile(join(stage,'eula.txt'),'eula=false\n');await atomicJson(join(stage,'mysql150','settings.json'),{...m.config,port,...(port!==m.config.port?{portChangedFrom:m.config.port}:{})});await ensureParents(this.db.core.root,target);await rename(stage,target);return item;}));}
}
