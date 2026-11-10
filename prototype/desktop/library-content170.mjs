// SPDX-License-Identifier: MPL-2.0
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {Modrinth} from './modrinth.mjs';
import {ordinary170,json170} from './library-paths170.mjs';
import {directoryKey170} from './library-mod-index170.mjs';
import {withFileLock} from './task-queue132.mjs';
import {installJava} from './java.mjs';
import {requiredJava} from './vanilla.mjs';
import {atomicJson} from './core.mjs';
import {instanceLoaders} from './compatibility.mjs';

export function externalCore170(runner,stateRoot,index){
 const stateDirectory=async dir=>{await ordinary170(dir);const rows=(await runner.registry.scan(runner.libraryId)).rows;if(!rows.some(r=>r.gameDir===dir))throw Error('Game directory no longer confirmed / 游戏目录尚未确认或已经改变');const path=join(stateRoot,'directories',directoryKey170(dir));await ordinary170(path,{missing:true});await mkdir(path,{recursive:true});return path;};
 const facade=Object.create(runner);
 Object.assign(facade,{root:stateRoot,external:true,index,runner,contentStateDirectory:stateDirectory,statePath:id=>runner.instancePath(id),
  async metadata(id){const r=await runner.metadata(id);if(!r.profile.gameDir)throw Error('Confirm this version’s game directory before managing its files / 管理文件前请确认此版本的游戏目录');await ordinary170(r.profile.gameDir);return {...r,stateDir:r.dir,dir:r.profile.gameDir,item:{...r.item,external:true}};},
  async instancePath(id){return (await this.metadata(id)).dir;},
  async withGameDirectory170(id,fn){const {dir}=await this.metadata(id),state=await stateDirectory(dir);return withFileLock(join(state,'operation'),async()=>{await this.requireStopped(dir);return fn();});},
  async directoryIdentity170(dir){const rows=(await runner.registry.scan(runner.libraryId)).rows.filter(r=>r.gameDir===dir);return JSON.stringify(await Promise.all(rows.map(async r=>{const p=await runner.registry.profile(runner.libraryId,r.id);return [r.id,p.fingerprints];})));},
  async requireStopped(dir){this.workflowGuard?.();await stateDirectory(dir);const status=await runner.runtimeStatus();for(const p of status.processes.filter(p=>p.state==='running')){const profile=await runner.registry.profile(runner.libraryId,p.instanceId);if(profile.gameDir===dir)throw Error('Stop the game using this shared directory / 请先关闭正在使用此共享目录的游戏');}},
  async listInstances(){return runner.listInstances();},
  async runtimeStatus(){return runner.runtimeStatus();},
  async runtimeMetadata(id){const r=await runner.runtimeMetadata(id);return {...r,dir:(await this.metadata(id)).dir};},
  startJob(id,kind,fn){return runner.startJob(id,kind,async(job,signal)=>{const {dir}=await this.metadata(id),state=await stateDirectory(dir);return withFileLock(join(state,'operation'),async()=>{await this.requireStopped(dir);const result=await (this.workbench&&kind.startsWith('content')?this.workbench.record(id,kind,()=>fn(job,signal),signal):fn(job,signal));if(kind.startsWith('content'))await index.refreshLocal(dir);return result;},signal);});},
  async launch(id,options){const {dir}=await this.metadata(id),state=await stateDirectory(dir);return withFileLock(join(state,'operation'),async()=>{await this.requireStopped(dir);return runner.launch(id,options);});},
  async selectJava(id,path){const {dir}=await this.metadata(id);await this.requireStopped(dir);return runner.selectJava(id,path);},
  async prepareJava(id){const {dir,stateDir,item,meta}=await this.metadata(id);await this.requireStopped(dir);return this.startJob(id,'external-java',async(job,signal)=>{const major=requiredJava(meta),existing=(await this.scanJava()).find(j=>j.major===major),java=existing||await withFileLock('java-install-'+major,()=>installJava(this.root,major,job,signal,this.fetcher),signal);item.javaPath=java.path;item.javaMajor=major;this.javaCandidates.set(java.path,java);await atomicJson(join(stateDir,'instance.json'),item);job.phase='Java ready / Java 已准备';});},
  async createInstance(){throw Error('External version creation requires a launcher-specific profile; create a managed library or use the original launcher / 新外部版本需要对应启动器配置，请创建 AMBER 库或使用原启动器');},
  async configureLoader(){throw Error('Changing this external inheritance chain is not supported safely / 暂不能安全改写此外部版本的组件继承链');},
  async configureFabric(){return this.configureLoader();}
 });
 return facade;
}

export class ExternalContent170 extends Modrinth {
 async manifest(dir){const state=await this.core.contentStateDirectory(dir);const saved=await json170(join(state,'content.json'),{optional:true,max:16000000})||{schema:1,files:[]};if(saved.schema!==1||!Array.isArray(saved.files))throw Error('Invalid content state');const scanned=await this.core.index.read(dir),files=[...saved.files];
  for(const row of Date.parse(saved.scanAt)>=Date.parse(scanned.scannedAt)?[]:scanned.rows||[]){if(!row.hash||row.error)continue;const existing=files.findIndex(f=>f.relative===row.relative);if(existing>=0&&files[existing].hash===row.hash){files[existing]={...files[existing],enabled:row.enabled,...(row.match==='matched'?{projectId:row.remote.projectId,versionId:row.remote.versionId,dependencies:row.remote.dependencies||[]}:{})};continue;}const remote=row.remote,value={relative:row.relative,type:'mod',title:row.local?.title||row.title,version:row.local?.version||remote?.version||'',hash:row.hash,size:row.size,algorithm:'sha1',enabled:row.enabled,...(row.match==='matched'?{projectId:remote.projectId,versionId:remote.versionId,dependencies:remote.dependencies||[]}:{}),indexed:true};if(existing>=0)files[existing]=value;else files.push(value);}
  return {...saved,scanAt:scanned.scannedAt,files};
 }
 async list(id){const rows=await super.list(id),{dir,item}=await this.core.metadata(id),scan=await this.core.index.read(dir);for(const r of scan.rows||[])if(r.error&&!rows.some(row=>row.relative==='mods/'+r.filename))rows.push({relative:'mods/'+r.filename,title:r.title,type:'mod',enabled:r.enabled,missing:true});return rows.map(row=>{const found=scan.rows?.find(r=>'mods/'+r.filename===row.relative);return found?{...row,metadataState:found.metadataState,match:found.match,compatibility:found.match==='matched'?!!found.remote.games?.includes(item.game)&&instanceLoaders(item).some(loader=>found.remote.loaders?.includes(loader)):null,metadataError:found.metadataError||found.error,matchError:found.matchError,duplicateModIds:found.duplicateModIds,duplicateHashes:found.duplicateHashes}:row;});}
 async remove(id,path){const plan=await this.bulk.preview(id,[path],'remove');if(plan.blockers.length)throw Error(plan.blockers.join('\n'));return this.bulk.apply(id,plan.id);}
 async toggle(id,path){const row=(await this.list(id)).find(r=>r.relative===path);if(!row)throw Error('Content changed; refresh / 内容已改变，请刷新');const plan=await this.bulk.preview(id,[path],row.enabled?'disable':'enable');if(plan.blockers.length)throw Error(plan.blockers.join('\n'));return this.bulk.apply(id,plan.id);}
}
