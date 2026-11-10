// SPDX-License-Identifier: MPL-2.0
import {mkdir,rename,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {Backups} from './backups.mjs';
import {ordinary170,json170} from './library-paths170.mjs';
import {treeFiles,copyVerified,requireSpace} from './safe-copy.mjs';
import {atomicJson} from './core.mjs';
export function externalBackupFilter170(mode){const folders=new Set(mode==='saves'?['saves','config','defaultconfigs','kubejs','scripts']:['mods','config','defaultconfigs','kubejs','scripts','resourcepacks','shaderpacks',...(mode==='full'?['saves','screenshots']:[])]);return (name,isDir)=>folders.has(name.split('/')[0])||!isDir&&/^(?:options[^/]*\.txt|servers\.dat(?:_old)?)$/.test(name);}

// Restore creates a new isolated version. Shared worlds and the original profile
// never become overwrite targets, even when the backup came from a shared root.
export class ExternalBackups170 extends Backups {
 async create(id,mode='full',reason='manual'){return this.workflows.exclusive(async()=>{
  if(!['full','saves','configuration'].includes(mode))throw Error('Invalid backup mode');const {dir,item,profile}=await this.core.metadata(id);await this.core.requireStopped(dir);
  const files=await treeFiles(dir,externalBackupFilter170(mode));const bytes=files.reduce((n,f)=>n+f.size,0);await requireSpace(this.core.root,bytes);const backupId=randomUUID(),stage=join(this.root,'.partial-'+backupId);await ordinary170(stage,{missing:true});await mkdir(stage,{recursive:true});
  const entries=await copyVerified(dir,join(stage,'files'),files,()=>this.workflows.checkCancelled());await atomicJson(join(stage,'backup.json'),{schema:1,id:backupId,sourceId:id,name:item.name,mode,reason,pinned:false,createdAt:new Date().toISOString(),bytes,files:entries,external170:{libraryId:this.core.runner.libraryId,gameDir:dir,fingerprints:profile.fingerprints}});await rename(stage,join(this.root,backupId));return {id:backupId,bytes};
 });}
 async restore(backupId){await this.verify(backupId);return this.workflows.exclusive(async()=>{
  const record=await json170(join(this.root,backupId,'backup.json'),{max:16000000});if(record.external170?.libraryId!==this.core.runner.libraryId)throw Error('Backup belongs to another library');const {profile}=await this.core.metadata(record.sourceId);if(JSON.stringify(profile.fingerprints)!==JSON.stringify(record.external170.fingerprints))throw Error('Source launch profile changed; restore requires the original inheritance chain / 原启动配置已改变，恢复需要原始继承链');await this.core.requireStopped(profile.gameDir);
  const id='AMBER-restore-'+randomUUID(),root=this.core.runner.root,stage=join(root,'versions','.'+id),dest=join(root,'versions',id);await ordinary170(stage,{missing:true});await ordinary170(dest,{missing:true});if(await lstat(dest).catch(e=>{if(e.code==='ENOENT')return null;throw e;}))throw Error('Restore destination exists');await requireSpace(root,record.bytes);await mkdir(stage);
  await copyVerified(join(this.root,backupId,'files'),stage,record.files,()=>this.workflows.checkCancelled());await atomicJson(join(stage,id+'.json'),{id,inheritsFrom:record.sourceId});await rename(stage,dest);await this.core.runner.registry.registerRestoredDirectory(this.core.runner.libraryId,id);const state=await this.core.runner.instancePath(id);await atomicJson(join(state,'instance.json'),{name:record.name+' / restored',icon:'grass'});this.core.index.start(dest).catch(()=>{});return (await this.core.metadata(id)).item;
 });}
}
