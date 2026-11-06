// SPDX-License-Identifier: MPL-2.0
import {readBoundedFile} from './bounded-io.mjs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {redact} from './privacy.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
// 200 tasks, each with up to 2,000 UTF-16 command units and bounded result text.
// Even JSON-escaped control characters fit; read and write use the same limit.
export const SCHEDULE_STORE_LIMIT=8_000_000;
// DST changes the offset within one zone, not the already calculated deadline.
const zoneKey=()=>Intl.DateTimeFormat().resolvedOptions().timeZone;
export function validateSchedule(input){
  if(!input||!uuid.test(input.serverId)||typeof input.name!=='string'||!input.name.trim()||input.name.length>80||typeof input.enabled!=='boolean'||!['restart','command'].includes(input.action)||!['once','daily','interval'].includes(input.kind))throw Error('Invalid scheduled task / 定时任务无效');
  const value={serverId:input.serverId,name:input.name.trim(),enabled:input.enabled,action:input.action,kind:input.kind};
  if(input.action==='command'){
    if(typeof input.command!=='string'||!input.command.trim()||input.command.length>2000||/[\r\n\0]/.test(input.command))throw Error('Enter one command / 请输入单行指令');
    value.command=input.command.trim().replace(/^\//,'');
    if(!value.command.trim())throw Error('Enter one command / 请输入单行指令');
  }
  if(input.kind==='daily'){
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw Error('Invalid daily time / 每日时间无效');
    value.time=input.time;
  }else if(input.kind==='interval'){
    if(!Number.isInteger(input.minutes)||input.minutes<1||input.minutes>525600)throw Error('Interval: 1–525600 minutes / 间隔应为 1–525600 分钟');
    value.minutes=input.minutes;
  }else{
    if(typeof input.at!=='string'||!Number.isFinite(Date.parse(input.at)))throw Error('Invalid date / 日期无效');
    value.at=new Date(input.at).toISOString();
  }
  return value;
}
export function nextOccurrence(task,now){
  if(task.kind==='once')return Date.parse(task.at)>now?task.at:null;
  if(task.kind==='interval')return new Date(now+task.minutes*60000).toISOString();
  const date=new Date(now),[hours,minutes]=task.time.split(':').map(Number);
  date.setHours(hours,minutes,0,0);
  if(date.getTime()<=now){date.setDate(date.getDate()+1);date.setHours(hours,minutes,0,0);}
  return date.toISOString();
}
export class ServerSchedules {
  constructor(root,servers,{now=Date.now,blocked=()=>false}={}){
    this.path=join(root,'server-schedules.json');this.servers=servers;this.now=now;this.blocked=blocked;
    this.rows=[];this.queue=Promise.resolve();this.paused=false;this.running=new Map();this.zone=zoneKey();this.pauseRequests=new Map();this.pauseHolds=0;this.sleeping=false;
  }
  serial(fn){const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;}
  async persist(){const data={schema:1,tasks:this.rows};if(Buffer.byteLength(JSON.stringify(data,null,2))>SCHEDULE_STORE_LIMIT)throw Error('Schedule store is too large / 定时任务存储超过上限');await atomicJson(this.path,data);}
  async init(){
    try{
      const data=JSON.parse(await readBoundedFile(this.path,SCHEDULE_STORE_LIMIT));
      if(data.schema!==1||!Array.isArray(data.tasks)||data.tasks.length>200)throw Error('Invalid schedule store');
      const ids=new Set();this.rows=data.tasks.map(row=>{
        if(!uuid.test(row.id)||ids.has(row.id))throw Error('Invalid task ID');ids.add(row.id);
        const last=row.last?{state:String(row.last.state).slice(0,30),at:String(row.last.at).slice(0,40),...(row.last.error?{error:String(row.last.error).slice(0,1000)}:{})}:undefined;
        const task={...validateSchedule(row),id:row.id,last};
        // Never replay commands after a crash, restart or missed deadline.
        task.nextRun=task.enabled?nextOccurrence(task,this.now()):null;
        if(row.last?.state==='running')task.last={state:'interrupted',at:row.last.at};
        if(task.kind==='once'&&task.enabled&&!task.nextRun){task.enabled=false;task.last={state:'missed',at:task.at};}
        return task;
      });
      await this.persist();
    }catch(e){if(e.code!=='ENOENT'){this.error='Scheduled tasks could not be loaded; original file preserved / 无法读取定时任务，原文件已保留';this.rows=[];}}
    return this;
  }
  list(){return {tasks:structuredClone(this.rows),error:this.error||'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};}
  save(input){
    // Cancellation is synchronous and independent of persistence or other servers.
    let task;try{task=validateSchedule(input);}catch(e){return Promise.reject(e);}
    const pauseId=input.id&&!task.enabled?input.id:null;
    if(pauseId){this.pauseRequests.set(pauseId,(this.pauseRequests.get(pauseId)||0)+1);this.running.get(pauseId)?.controller.abort(Error('Task cancelled / 任务已取消'));}
    return this.serial(async()=>{
    if(this.error)throw Error(this.error);
    const old=input.id?this.rows.find(t=>t.id===input.id):null;
    if(input.id&&!old)throw Error('Unknown task');
    if(old&&this.running.has(old.id)){
      if(task.enabled)throw Error('Task is running / 任务正在执行');
      old.enabled=false;old.nextRun=null;await this.persist();return this.list();
    }
    if(!old&&this.rows.length>=200)throw Error('Maximum 200 tasks');
    await this.servers.read(task.serverId);
    const nextRun=task.enabled?nextOccurrence(task,this.now()):null;
    if(task.enabled&&!nextRun)throw Error('Choose a future date / 请选择未来时间');
    const row={...task,id:old?.id||randomUUID(),nextRun,last:old?.last};
    const previous=this.rows;this.rows=old?this.rows.map(t=>t.id===old.id?row:t):[...this.rows,row];
    try{await this.persist();}catch(e){this.rows=previous;throw e;}return this.list();
  }).finally(()=>{if(pauseId){const count=this.pauseRequests.get(pauseId)-1;if(count)this.pauseRequests.set(pauseId,count);else this.pauseRequests.delete(pauseId);}});}
  remove(id){return this.serial(async()=>{
    if(this.error)throw Error(this.error);
    if(this.running.has(id))throw Error('Task is running / 任务正在执行');
    const previous=this.rows;this.rows=this.rows.filter(t=>t.id!==id);
    try{await this.persist();}catch(e){this.rows=previous;throw e;}return this.list();
  });}
  refreshZone(){const current=zoneKey();if(current===this.zone)return false;this.zone=current;
    for(const task of this.rows)if(task.enabled&&task.kind==='daily')task.nextRun=nextOccurrence(task,this.now());
    return true;
  }
  dispatch(){return this.serial(async()=>{
    if(this.paused||this.error)return [];
    const changedZone=this.refreshZone(),pending=[];let changed=changedZone;
    for(const task of this.rows){
      if(this.paused||this.pauseRequests.has(task.id)||!task.enabled||!task.nextRun||Date.parse(task.nextRun)>this.now())continue;
      const due=Date.parse(task.nextRun),now=this.now();
      task.nextRun=nextOccurrence(task,now);if(task.kind==='once')task.enabled=false;changed=true;
      if(this.running.has(task.id))continue;
      const busyServer=[...this.running.values()].some(r=>r.task.serverId===task.serverId);
      if(now-due>60000||busyServer||this.blocked(task.serverId)){
        task.last={at:new Date(now).toISOString(),state:now-due>60000?'missed':'busy'};continue;
      }
      task.last={at:new Date(now).toISOString(),state:'running'};
      const run={task,due,controller:new AbortController(),promise:null};this.running.set(task.id,run);pending.push(run);
    }
    // Persist all claims before executing, but never hold the persistence queue
    // across stop/backup/start: unrelated servers and pause must remain responsive.
    try{if(changed)await this.persist();}catch(e){for(const r of pending)this.running.delete(r.task.id);throw e;}
    for(const run of pending)run.promise=this.execute(run).catch(e=>{this.error=redact(e.message);});
    return pending.map(r=>r.promise);
  });}
  async execute(run){const {task,due,controller}=run;let state='done',error;
    const cancelled=()=>this.paused||controller.signal.aborted;
    const expired=()=>this.now()-due>60000;
    try{
      if(cancelled())throw Error('Task cancelled / 任务已取消');
      if(expired()){state='missed';return;}
      if(this.blocked(task.serverId)){state='busy';return;}
      if(this.servers.runs.get(task.serverId)?.state!=='running'){state='offline';return;}
      if(task.action==='restart')await this.servers.restartScheduled(task.serverId,cancelled,120000,{signal:controller.signal,expired});
      else await this.servers.locks.tryRun(task.serverId,()=>{
        if(cancelled())throw Error('Task cancelled / 任务已取消');
        if(expired()){state='missed';return;}
        if(this.blocked(task.serverId)){state='busy';return;}
        if(this.servers.runs.get(task.serverId)?.state!=='running'){state='offline';return;}
        return this.servers.command(task.serverId,task.command);
      });
    }catch(e){state=cancelled()?'cancelled':e.code==='TASK_QUEUE_BUSY'?'busy':e.code==='SCHEDULE_MISSED'?'missed':'failed';if(state==='failed')error=redact(String(e.message)).slice(0,1000);}
    finally{await this.serial(async()=>{
      this.running.delete(task.id);
      if(this.rows.includes(task)){task.last={...task.last,state,...(error?{error}:{})};await this.persist();}
    });}
  }
  async tick(){await Promise.all(await this.dispatch());}
  start(){if(this.timer||this.pauseHolds||this.sleeping)return;this.paused=false;this.timer=setInterval(()=>{this.dispatch().catch(e=>{this.error=redact(e.message);});},1000);this.timer.unref?.();}
  async pause(){this.paused=true;clearInterval(this.timer);this.timer=null;for(const r of this.running.values())r.controller.abort(Error('Task cancelled / 任务已取消'));await this.queue;await Promise.all([...this.running.values()].map(r=>r.promise));}
  suspend(){this.sleeping=true;return this.pause();}
  async withPaused(fn){if(!this.pauseHolds)this.resumeAfterHold=!!this.timer;this.pauseHolds++;try{await this.pause();return await fn();}finally{this.pauseHolds--;if(!this.pauseHolds){const restart=this.resumeAfterHold;this.resumeAfterHold=false;if(this.deferredResume&&!this.sleeping)await this.resumeAfterSleep();else if(restart)this.start();}}}
  resumeAfterSleep(){return this.serial(async()=>{
    this.sleeping=false;if(this.error)return;if(this.pauseHolds){this.deferredResume=true;return;}this.deferredResume=false;
    for(const task of this.rows)if(task.enabled&&task.nextRun&&Date.parse(task.nextRun)<=this.now()){
      task.last={state:'missed',at:task.nextRun};task.nextRun=nextOccurrence(task,this.now());
      if(task.kind==='once')task.enabled=false;
    }
    await this.persist();this.start();
  });}
}
