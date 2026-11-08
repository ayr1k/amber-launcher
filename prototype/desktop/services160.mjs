// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
export function validateServices160(value={mysql:false,tunnels:[]}){
 if(!value||typeof value.mysql!=='boolean'||!Array.isArray(value.tunnels)||value.tunnels.length>32||value.tunnels.some(id=>typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))||new Set(value.tunnels).size!==value.tunnels.length)throw Error('Invalid service selection / 服务选择无效');
 return {mysql:value.mysql,tunnels:[...value.tunnels]};
}
export class Services160 {
 constructor(servers,mysql,sakura){Object.assign(this,{servers,mysql,sakura});this.pending=new Set();this.results=new Map();}
 async config(id){const dir=await this.servers.dir(id),file=join(dir,'services160.json');await ensureParents(dir,file);try{return validateServices160(JSON.parse(await readFile(file,'utf8')));}catch(e){if(e.code==='ENOENT')return validateServices160();throw e;}}
 async save(id,input){if(this.pending.has(id))throw Error('Wait for service startup / 请等待联动启动结束');return this.servers.locks.run(id,async()=>{await this.servers.stopped(id);const value=validateServices160(input),bindings=(await this.sakura.state()).tunnels;
  if(value.tunnels.some(key=>!bindings.some(b=>b.id===key&&b.serverId===id&&!b.invalid&&!b.remoteDeleted)))throw Error('Tunnel no longer belongs to this instance / 隧道关联已失效');
  if(value.mysql&&(await this.mysql.config(id))?.phase!=='ready')throw Error('Prepare the database first / 请先准备本地数据库');
  const dir=await this.servers.dir(id),file=join(dir,'services160.json');await ensureParents(dir,file);await atomicJson(file,value);return value;
 });}
 async state(id){const [config,mysql,sakura]=await Promise.all([this.config(id),this.mysql.state(id),this.sakura.state()]);return {config,busy:this.pending.has(id),last:this.results.get(id)||null,mysql:{phase:mysql.phase,error:mysql.error},tunnels:sakura.tunnels.filter(b=>b.serverId===id).map(b=>({id:b.id,name:b.name,state:b.run?.state||'stopped',connected:b.run?.connected===true,error:b.error||b.run?.error||'',active:b.active}))};}
 async start(id,eula){
  if(this.pending.has(id))throw Error('Service startup already active / 联动启动已在进行');
  this.pending.add(id);let databaseStarted=false,serverStarted=false;
  const result={at:new Date().toISOString(),phase:'starting',errors:[]};this.results.set(id,result);
  try{
   await this.servers.stopped(id);const config=await this.config(id);
   // Validate all selected bindings before starting anything. Never silently adopt another instance's tunnel.
   const bindings=(await this.sakura.state()).tunnels;
   if(config.tunnels.some(key=>!bindings.some(b=>b.id===key&&b.serverId===id&&!b.invalid&&!b.remoteDeleted)))throw Error('Selected tunnel is missing; update launch services / 所选隧道已失效，请更新联动设置');
   if(config.mysql){const state=await this.mysql.state(id);if(state.phase!=='running'){await this.mysql.start(id);databaseStarted=true;}}
   const run=await this.servers.start(id,eula);serverStarted=true;
   for(const key of config.tunnels){const binding=(await this.sakura.state()).tunnels.find(b=>b.id===key);if(binding?.active)continue;try{await this.sakura.start(key);}catch(e){result.errors.push({service:binding?.name||key,message:e.message});}}
   result.phase=result.errors.length?'partial':'requested';return run;
  }catch(e){result.phase='failed';result.errors.push({service:serverStarted?'services':'startup',message:e.message});if(databaseStarted&&!serverStarted)try{await this.mysql.stop(id);}catch(stopError){result.errors.push({service:'database cleanup',message:stopError.message});}throw e;
  }finally{this.pending.delete(id);}
 }
}
