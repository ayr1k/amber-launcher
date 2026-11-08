// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
import {TUNNEL_LIMIT150} from './sakura150.mjs';
const bindingId160=/^(?:legacy-)?[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validateServices160(value={mysql:false,tunnels:[]}){
 if(!value||typeof value.mysql!=='boolean'||!Array.isArray(value.tunnels))throw Error('Invalid service selection structure / 服务选择格式无效');
 if(value.tunnels.length>TUNNEL_LIMIT150)throw Error('Select at most '+TUNNEL_LIMIT150+' tunnels / 最多选择 '+TUNNEL_LIMIT150+' 条隧道');
 if(value.tunnels.some(id=>typeof id!=='string'||!bindingId160.test(id)))throw Error('Invalid tunnel binding ID / 隧道绑定标识无效');
 if(new Set(value.tunnels).size!==value.tunnels.length)throw Error('Duplicate tunnel selection / 不可重复选择同一隧道');
 return {mysql:value.mysql,tunnels:[...value.tunnels]};
}
export function selectedBinding160(bindings,key,id){
 const matches=bindings.filter(b=>b.id===key),binding=matches[0];
 if(!binding)throw Error('Selected tunnel is missing or removed / 所选隧道绑定不存在或已移除');
 if(matches.length!==1||binding.invalid)throw Error('Selected tunnel binding is invalid / 所选隧道绑定记录无效');
 if(binding.serverId!==id||(key.startsWith('legacy-')&&key!=='legacy-'+id))throw Error('Tunnel belongs to another instance / 所选隧道不属于当前实例');
 if(binding.remoteDeleted)throw Error('Selected tunnel was deleted remotely / 所选隧道已从远端删除');
 if(binding.error)throw Error('Selected tunnel association is unavailable / 所选隧道关联已失效: '+binding.error);
 return binding;
}
export class Services160 {
 constructor(servers,mysql,sakura){Object.assign(this,{servers,mysql,sakura});this.pending=new Set();this.results=new Map();}
 async config(id){const dir=await this.servers.dir(id),file=join(dir,'services160.json');await ensureParents(dir,file);try{return validateServices160(JSON.parse(await readFile(file,'utf8')));}catch(e){if(e.code==='ENOENT')return validateServices160();throw e;}}
 async save(id,input){if(this.pending.has(id))throw Error('Wait for service startup / 请等待联动启动结束');return this.servers.locks.run(id,async()=>{await this.servers.stopped(id);const value=validateServices160(input),bindings=(await this.sakura.state()).tunnels;
  for(const key of value.tunnels)selectedBinding160(bindings,key,id);
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
   for(const key of config.tunnels)selectedBinding160(bindings,key,id);
   if(config.mysql){const state=await this.mysql.state(id);if(state.phase!=='running'){await this.mysql.start(id);databaseStarted=true;}}
   const run=await this.servers.start(id,eula);serverStarted=true;
   for(const key of config.tunnels){let binding;try{binding=selectedBinding160((await this.sakura.state()).tunnels,key,id);if(binding.active)continue;await this.sakura.start(key);}catch(e){result.errors.push({service:binding?.name||key,message:e.message});}}
   result.phase=result.errors.length?'partial':'requested';return run;
  }catch(e){result.phase='failed';result.errors.push({service:serverStarted?'services':'startup',message:e.message});if(databaseStarted&&!serverStarted)try{await this.mysql.stop(id);}catch(stopError){result.errors.push({service:'database cleanup',message:stopError.message});}throw e;
  }finally{this.pending.delete(id);}
 }
}
