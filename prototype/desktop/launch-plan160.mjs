// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
import {Services160,validateServices160,selectedBinding160} from './services160.mjs';
export function validatePlan160(input){
 if(input?.schema!==1||!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>128)throw Error('Use 1–128 steps / 请配置 1–128 个步骤');
 return {schema:1,steps:input.steps.map(s=>{
  if(!s||!['tunnel','mysql','server','wait','command','backup'].includes(s.type))throw Error('Unknown launch module / 未知启动模块');
  if(s.type==='tunnel'){validateServices160({mysql:false,tunnels:[s.binding]});return {type:s.type,binding:s.binding};}
  if(s.type==='wait'){if(!Number.isInteger(s.seconds)||s.seconds<0||s.seconds>3600)throw Error('Wait: 0–3600 seconds / 等待时间应为 0–3600 秒');return {type:s.type,seconds:s.seconds};}
  if(s.type==='command'){if(typeof s.command!=='string'||!s.command.trim().replace(/^\//,'').trim()||s.command.length>2000||/[\r\n\0]/.test(s.command))throw Error('Enter one server command / 请输入单行服务端指令');return {type:s.type,command:s.command.trim()};}
  return {type:s.type};
 })};
}
export class LaunchPlan160 extends Services160 {
 constructor(servers,mysql,sakura,{timeout=120000,poll=200}={}){super(servers,mysql,sakura);this.timeout=timeout;this.poll=poll;this.controllers=new Map();}
 async plan(id){const dir=await this.servers.dir(id),file=join(dir,'launch-plan160.json');await ensureParents(dir,file);try{return validatePlan160(JSON.parse(await readFile(file,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
  const old=await super.config(id);return {schema:1,steps:[...(old.mysql?[{type:'mysql'}]:[]),{type:'server'},...old.tunnels.map(binding=>({type:'tunnel',binding}))]};
 }
 async savePlan(id,input){if(this.pending.has(id))throw Error('Launch plan is running / 启动规划正在执行');return this.servers.locks.tryRun(id,async()=>{await this.servers.dir(id);const plan=validatePlan160(input),bindings=(await this.sakura.state()).tunnels;for(const s of plan.steps)if(s.type==='tunnel')selectedBinding160(bindings,s.binding,id);if(plan.steps.some(s=>s.type==='mysql')&&(await this.mysql.config(id))?.phase!=='ready')throw Error('Prepare MySQL first / 请先准备 MySQL');const dir=await this.servers.dir(id),file=join(dir,'launch-plan160.json');await ensureParents(dir,file);await atomicJson(file,plan);return plan;});}
 async state(id){const sakura=await this.sakura.state();return {plan:await this.plan(id),busy:this.pending.has(id),last:this.results.get(id)||null,tunnels:sakura.tunnels.filter(b=>b.serverId===id).map(b=>({id:b.id,name:b.name,state:b.run?.state||'stopped',connected:b.run?.connected===true,error:b.error||b.run?.error||'',active:b.active}))};}
 cancel(id){const c=this.controllers.get(id);if(c){c.abort(Error('Launch plan cancelled / 启动规划已取消'));const r=this.results.get(id);r.phase='cancelling';}return !!c;}
 async until(check,signal,label){const end=Date.now()+this.timeout;for(;;){signal.throwIfAborted();if(await check())return;if(Date.now()>=end)throw Error(label+' timeout / 等待超时');await pause(this.poll,undefined,{signal});}}
 async ready(id,signal){await this.until(()=>{const r=this.servers.runs.get(id);if(!r||['failed','stopped','stopping','detached'].includes(r.state))throw Error(r?.error||'Server stopped before readiness / 服务端未就绪便已停止');return r.state==='running';},signal,'Server readiness');}
 async start(id,eula){if(this.pending.has(id))throw Error('Launch plan already active / 启动规划已在执行');this.pending.add(id);const controller=new AbortController(),signal=controller.signal;this.controllers.set(id,controller);const result={at:new Date().toISOString(),phase:'running',steps:[],errors:[]};this.results.set(id,result);
  try{return await this.servers.locks.scoped(id,async()=>{await this.servers.stopped(id);const plan=await this.plan(id);result.steps=plan.steps.map(s=>({...s,status:'pending'}));const bindings=(await this.sakura.state()).tunnels;for(const s of plan.steps)if(s.type==='tunnel')selectedBinding160(bindings,s.binding,id);
   for(const row of result.steps){signal.throwIfAborted();row.status='running';try{
    if(row.type==='server'){if(this.servers.runs.get(id)?.state!=='running')await this.servers.start(id,eula);await this.ready(id,signal);row.detail='Server reported ready / 服务端已报告就绪';}
    if(row.type==='mysql'){if((await this.mysql.state(id)).phase!=='running')await this.mysql.start(id);row.detail='Database ready / 数据库已就绪';}
    if(row.type==='tunnel'){const b=selectedBinding160((await this.sakura.state()).tunnels,row.binding,id);if(!b.active)await this.sakura.start(row.binding);await this.until(async()=>{const current=selectedBinding160((await this.sakura.state()).tunnels,row.binding,id);if(['failed','stopped'].includes(current.run?.state))throw Error(current.run?.error||'Tunnel stopped / 隧道已停止');return current.run?.connected===true;},signal,'Tunnel connection');row.detail='Provider connected; game reachability unverified / 已连接服务商，游戏可达性未验证';}
    if(row.type==='wait')await pause(row.seconds*1000,undefined,{signal});
    if(row.type==='command'){await this.ready(id,signal);this.servers.command(id,row.command);row.detail='Command sent; effect unverified / 指令已发送，生效情况未验证';}
    if(row.type==='backup'){const r=this.servers.runs.get(id);if(r&&['starting','running','stopping'].includes(r.state)){row.detail='Stopping normally; no forced termination / 正常停服中，不会强杀';await this.servers.stop(id);await this.until(()=>!['starting','running','stopping'].includes(r.state)&&!r.finalizing,signal,'Server stop');if(r.exitCode!==0||r.forced)throw Error('Clean shutdown not confirmed; backup skipped / 未确认正常退出，已跳过备份');}await this.servers.stopped(id);signal.throwIfAborted();row.detail='Copying and verifying; cancellation waits for safe completion / 复制并校验中，取消会等待安全完成';row.backup=await this.backup(id);row.detail='Verified backup created; server stays stopped / 已生成校验备份，服务端保持停止';}
    row.status='done';signal.throwIfAborted();
   }catch(e){if(row.status!=='done')row.status=signal.aborted?'cancelled':'failed';row.error=e.message;throw e;}}
   result.phase='done';return {state:'done'};
  });}catch(e){result.phase=signal.aborted?'cancelled':'failed';result.errors.push({service:'Launch plan',message:e.message});for(const row of result.steps)if(row.status==='pending')row.status='skipped';if(!signal.aborted)throw e;return {state:'cancelled'};}finally{result.finishedAt=new Date().toISOString();this.pending.delete(id);this.controllers.delete(id);}
 }
}
