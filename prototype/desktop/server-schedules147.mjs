// SPDX-License-Identifier: MPL-2.0
import {readBoundedFile} from './bounded-io.mjs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {redact} from './privacy.mjs';

const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
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
    this.rows=[];this.queue=Promise.resolve();this.paused=false;this.running=new Set();
  }
  serial(fn){const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;}
  async persist(){await atomicJson(this.path,{schema:1,tasks:this.rows});}
  async init(){
    try{
      const data=JSON.parse(await readBoundedFile(this.path,1000000));
      if(data.schema!==1||!Array.isArray(data.tasks)||data.tasks.length>200)throw Error('Invalid schedule store');
      const ids=new Set();this.rows=data.tasks.map(row=>{
        if(!uuid.test(row.id)||ids.has(row.id))throw Error('Invalid task ID');ids.add(row.id);
        const task={...validateSchedule(row),id:row.id,last:row.last};
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
  save(input){return this.serial(async()=>{
    if(this.error)throw Error(this.error);
    const task=validateSchedule(input),old=input.id?this.rows.find(t=>t.id===input.id):null;
    if(input.id&&!old)throw Error('Unknown task');
    if(old&&this.running.has(old.id))throw Error('Task is running / 任务正在执行');
    if(!old&&this.rows.length>=200)throw Error('Maximum 200 tasks');
    await this.servers.read(task.serverId);
    const nextRun=task.enabled?nextOccurrence(task,this.now()):null;
    if(task.enabled&&!nextRun)throw Error('Choose a future date / 请选择未来时间');
    const row={...task,id:old?.id||randomUUID(),nextRun,last:old?.last};
    const previous=this.rows;this.rows=old?this.rows.map(t=>t.id===old.id?row:t):[...this.rows,row];
    try{await this.persist();}catch(e){this.rows=previous;throw e;}return this.list();
  });}
  remove(id){return this.serial(async()=>{
    if(this.error)throw Error(this.error);
    if(this.running.has(id))throw Error('Task is running / 任务正在执行');
    const previous=this.rows;this.rows=this.rows.filter(t=>t.id!==id);
    try{await this.persist();}catch(e){this.rows=previous;throw e;}return this.list();
  });}
  tick(){return this.serial(async()=>{
    if(this.paused||this.error)return;
    for(const task of this.rows){
      if(this.paused||!task.enabled||!task.nextRun||Date.parse(task.nextRun)>this.now())continue;
      const due=Date.parse(task.nextRun),now=this.now();
      task.nextRun=nextOccurrence(task,now);if(task.kind==='once')task.enabled=false;
      task.last={at:new Date(now).toISOString(),state:'running'};
      // Persist the claim before sending a command: at-most-once, including crashes.
      await this.persist();this.running.add(task.id);
      try{
        if(now-due>60000){task.last.state='missed';continue;}
        if(this.blocked()){task.last.state='busy';continue;}
        if(this.servers.runs.get(task.serverId)?.state!=='running'){task.last.state='offline';continue;}
        if(task.action==='restart')await this.servers.restartScheduled(task.serverId,()=>this.paused);
        else await this.servers.locks.run(task.serverId,()=>{
          if(this.paused)throw Error('Task cancelled / 任务已取消');
          if(this.servers.runs.get(task.serverId)?.state!=='running')throw Error('Server not ready / 服务端尚未就绪');
          return this.servers.command(task.serverId,task.command);
        });
        task.last.state='done';
      }catch(e){task.last.state='failed';task.last.error=redact(String(e.message)).slice(0,1000);}
      finally{this.running.delete(task.id);await this.persist();}
    }
  });}
  start(){if(this.timer)return;this.paused=false;this.timer=setInterval(()=>{if(!this.ticking){this.ticking=true;this.tick().catch(e=>{this.error=redact(e.message);}).finally(()=>this.ticking=false);}},1000);this.timer.unref?.();}
  async pause(){this.paused=true;clearInterval(this.timer);this.timer=null;await this.queue;}
  resumeAfterSleep(){return this.serial(async()=>{
    if(this.error)return;
    for(const task of this.rows)if(task.enabled&&task.nextRun&&Date.parse(task.nextRun)<=this.now()){
      task.last={state:'missed',at:task.nextRun};task.nextRun=nextOccurrence(task,this.now());
      if(task.kind==='once')task.enabled=false;
    }
    await this.persist();this.start();
  });}
}
