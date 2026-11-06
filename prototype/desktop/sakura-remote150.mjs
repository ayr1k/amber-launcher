// SPDX-License-Identifier: MPL-2.0
// Contract: natfrp/api OpenAPI at fab03fc7470b95ce0064d3067570eb01d1298258.
import {reserveTunnel150,appendTunnel150} from './sakura150.mjs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
import {responseText} from './bounded-io.mjs';
const endpoint='https://api.natfrp.com/v4/';
import {nodeRestriction150} from './sakura-rules150.mjs';
export class SakuraRemote150 {
 constructor(manager){this.manager=manager;this.pending=null;}
 async configChange(fn){return this.manager.change(async()=>{const c=await this.manager.config();await fn(c);await atomicJson(join(this.manager.base.root,'settings.json'),c);return c;});}
 async token(){const c=await this.manager.config();if(!c.secret)throw Error('请先保存 Sakura 访问密钥。');return this.manager.codec.decryptString(Buffer.from(c.secret,'base64'));}
 async request(path,{method='GET',body,expected=200}={}){
  const token=await this.token();let response;
  try{response=await this.manager.core.fetcher(endpoint+path,{method,redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}catch{throw Object.assign(Error('远端结果未确认，请核对远端列表，勿重复提交。'),{uncertain:true});}
  if(response.status!==expected){const uncertain=response.status>=500;await responseText(response,2000000).catch(()=>{});throw Object.assign(Error('Sakura 操作失败（HTTP {0}）；请检查权限、额度和服务商限制。'.replace('{0}',response.status)),{uncertain});}
  try{return JSON.parse(await responseText(response,2000000));}catch{throw Object.assign(Error('远端结果未确认，请核对远端列表，勿重复提交。'),{uncertain:true});}
 }
 async catalog(){
  const [nodes,user,tunnels]=await Promise.all([this.request('nodes'),this.request('user/info'),this.request('tunnels')]);
  if(!nodes||typeof nodes!=='object'||!Array.isArray(tunnels)||!Number.isInteger(user.tunnels)||!Number.isInteger(user.group?.level)||user.ban)throw Error('无法确认 Sakura 账号权限或额度。');
  // Never forward the user/info token, config exports or unknown provider fields.
  return {limit:user.tunnels,used:tunnels.length,level:user.group.level,nodes:Object.entries(nodes).filter(([id])=>/^\d+$/.test(id)).map(([id,n])=>({id:Number(id),name:String(n.name||id).slice(0,120),host:String(n.host||'').slice(0,250),flag:n.flag,vip:n.vip})),tunnels:tunnels.map(t=>({id:t.id,name:t.name,node:t.node,type:t.type,local_ip:t.local_ip,local_port:t.local_port,remote:t.remote,status:t.status,locked:!!t.locks?.delete,note:t.note}))};
 }
 run(fn){if(this.pending)throw Error('远端操作进行中，请等待结果。');this.pending=Promise.resolve().then(fn).finally(()=>this.pending=null);return this.pending;}
 create(serverId,input){return this.run(()=>this.manager.servers.locks.run(serverId,async()=>{
  if(typeof input?.name!=='string'||!input.name.trim()||input.name.length>80||typeof input.publicGame!=='boolean'||!Number.isInteger(input.node)||input.remote!==''&&(!Number.isInteger(input.remote)||input.remote<1||input.remote>65535))throw Error('远端隧道参数无效。');
  const port=await this.manager.ports.resolve(serverId,input.portId);const catalog=await this.catalog(),node=catalog.nodes.find(n=>n.id===input.node),reason=nodeRestriction150(node,port.protocol,input.publicGame,catalog.level);if(reason)throw Error(reason);if(catalog.used>=catalog.limit)throw Error('Sakura 隧道额度已用完。');
  const operation={id:randomUUID(),kind:'create',serverId,portId:port.id,name:input.name.trim(),node:input.node,phase:'pending',createdAt:new Date().toISOString()};
  await this.configChange(c=>{if(c.remoteOperation)throw Error('仍有待确认的远端操作，请先核对。');reserveTunnel150(c);c.remoteOperation=operation;});
  try{
   const result=await this.request('tunnels',{method:'POST',expected:201,body:{name:operation.name,type:port.protocol,node:input.node,local_ip:'127.0.0.1',local_port:port.port,note:'AMBER operation '+operation.id,...(input.remote!==''?{remote:String(input.remote)}:{})}});
   if(!Number.isSafeInteger(result.id)||result.id<=0)throw Object.assign(Error('远端结果未确认，请核对远端列表，勿重复提交。'),{uncertain:true});
   await this.configChange(c=>{appendTunnel150(c,{id:randomUUID(),serverId,portId:port.id,name:operation.name,tunnel:String(result.id)});delete c.remoteOperation;});
   return {feedback:'远端隧道已创建并关联；尚未启动，不代表公网已连通。'};
  }catch(e){if(e.uncertain===false)await this.configChange(c=>{delete c.remoteOperation;});throw e;}
 }));}
 delete(id){return this.run(async()=>{
  const c=await this.manager.config(),binding=c.tunnels.find(t=>t?.id===id);if(!binding)throw Error('找不到隧道关联。');if(this.manager.workers.get(id)?.active||this.manager.pendingStarts.has(id))throw Error('请先停止此隧道。');
  const remote=(await this.catalog()).tunnels.find(t=>String(t.id)===binding.tunnel);if(!remote)throw Error('远端隧道已不存在，请仅移除本机关联。');if(remote.locked)throw Error('服务商已锁定此隧道的删除操作。');
  await this.configChange(c=>{if(this.manager.workers.get(id)?.active||this.manager.pendingStarts.has(id))throw Error('请先停止此隧道。');if(c.remoteOperation)throw Error('仍有待确认的远端操作，请先核对。');c.remoteOperation={id:randomUUID(),kind:'delete',bindingId:id,tunnel:binding.tunnel,name:binding.name,phase:'pending',createdAt:new Date().toISOString()};});
  try{const result=await this.request('tunnel/delete',{method:'POST',body:{ids:binding.tunnel}});if(!Array.isArray(result.deleted)||!Array.isArray(result.failed)||!result.deleted.some(x=>String(x)===binding.tunnel))throw Object.assign(Error('远端结果未确认，请核对远端列表，勿重复提交。'),{uncertain:true});
   const disconnectFailed=result.failed.some(x=>String(x)===binding.tunnel);await this.configChange(c=>{const b=c.tunnels.find(t=>t?.id===id);if(b)b.remoteDeleted=true;delete c.remoteOperation;});return {feedback:disconnectFailed?'远端记录已删除，但服务商未能踢下线；请在控制台核对。本机关联仍保留。':'远端隧道已删除，本机关联仍保留，可单独移除。'};
  }catch(e){if(e.uncertain===false)await this.configChange(c=>{delete c.remoteOperation;});throw e;}
 });}
 reconcile(){return this.run(async()=>{const c=await this.manager.config(),op=c.remoteOperation;if(!op)return {feedback:'没有待确认的远端操作。'};const rows=(await this.catalog()).tunnels;if(op.kind==='create'){const matches=rows.filter(t=>t.note==='AMBER operation '+op.id);if(matches.length!==1)throw Error('未能唯一确认远端结果，请在 Sakura 控制台核对后再解除待确认状态。');await this.configChange(c=>{if(!c.tunnels.some(t=>t?.tunnel===String(matches[0].id)))appendTunnel150(c,{id:randomUUID(),serverId:op.serverId,portId:op.portId,name:op.name,tunnel:String(matches[0].id)});delete c.remoteOperation;});}else{if(rows.some(t=>String(t.id)===op.tunnel))throw Error('远端记录仍存在，请在 Sakura 控制台核对后再解除待确认状态。');await this.configChange(c=>{const b=c.tunnels.find(t=>t?.id===op.bindingId);if(b)b.remoteDeleted=true;delete c.remoteOperation;});}return {feedback:'已核对远端结果，本地记录已更新。'};});}
 clearUncertain(){return this.run(()=>this.configChange(c=>{delete c.remoteOperation;}));}
}
