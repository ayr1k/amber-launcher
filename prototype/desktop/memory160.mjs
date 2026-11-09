// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
const exec=promisify(execFile);
// Only trusted Electron metrics enter this function; renderer input never supplies targets.
const validCreation=time=>typeof time==='number'&&Number.isFinite(time)&&time>0;
export function memoryTargets160(mode,pid,creationTime,metrics=[]){
 const byPid=new Map([[pid,{pid,creationTime}]]);
 if(mode==='aggressive')for(const row of metrics){if(!Number.isSafeInteger(row.pid)||row.pid<=0||row.pid===pid)continue;const previous=byPid.get(row.pid);byPid.set(row.pid,{pid:row.pid,creationTime:previous&&previous.creationTime!==row.creationTime?null:row.creationTime});}
 return [...byPid.values()];
}
export async function trimWorkingSets160(targets,{execute=exec,signal,timeout=30000}={}){
 if(!Array.isArray(targets)||!targets.length||targets.length>256||targets.some(t=>!Number.isSafeInteger(t.pid)||t.pid<=0)||new Set(targets.map(t=>t.pid)).size!==targets.length)throw Error('Invalid process list');
 const verified=targets.filter(t=>validCreation(t.creationTime));
 if(!verified.length)return targets.map(t=>({pid:t.pid,ok:false,error:0,status:'identity-unavailable'}));
 const source=await readFile(new URL('./memory-native160.cs',import.meta.url),'utf8');
 const calls=verified.map(t=>`[AmberMemory160]::Trim(${t.pid},[double]::Parse('${t.creationTime}',[Globalization.CultureInfo]::InvariantCulture))`).join('\n');
 const script=`$ErrorActionPreference='Stop'\nAdd-Type -TypeDefinition @'\n${source}\n'@\n$rows=@(\n${calls}\n)\nConvertTo-Json -InputObject $rows -Compress`;
 const {stdout}=await execute(join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,signal,timeout,maxBuffer:128000});
 const rows=JSON.parse(stdout.trim()),statuses=['trimmed','identity-unavailable','identity-mismatch','exited','access-denied','open-failed','trim-failed'];
 if(!Array.isArray(rows)||rows.length!==verified.length||new Set(rows.map(r=>r.pid)).size!==rows.length||rows.some(r=>!verified.some(t=>t.pid===r.pid)||typeof r.ok!=='boolean'||!Number.isInteger(r.error)||!statuses.includes(r.status)||r.ok!==(r.status==='trimmed')))throw Error('Invalid native memory result');
 return targets.map(t=>rows.find(r=>r.pid===t.pid)||{pid:t.pid,ok:false,error:0,status:'identity-unavailable'});
}
export class Memory160 {
 constructor({platform=process.platform,pid=process.pid,creationTime=process.getCreationTime?.()??null,metrics=()=>[],trim=trimWorkingSets160,confirm=async()=>false,now=Date.now}={}){Object.assign(this,{platform,pid,creationTime,metrics,trim,confirm,now});this.mode='off';this.busy=false;this.last=null;this.lastRun=null;}
 state(){return {supported:this.platform==='win32',mode:this.mode,busy:this.busy,last:this.last};}
 async action(action,value){
  if(action==='state')return this.state();
  if(this.platform!=='win32')throw Error('Windows only / 仅支持 Windows');
  if(this.busy)throw Error('Memory operation in progress / 请等待内存整理结束');
  this.busy=true;
  try{
   if(action==='mode'){
    if(!['off','conservative','aggressive'].includes(value))throw Error('Invalid memory mode');
    if(value==='aggressive'&&!await this.confirm('enable'))return this.state();
    this.mode=value;return this.state();
   }
   if(action!=='run'||this.mode==='off')throw Error('Select a memory mode first / 请先选择整理档位');
   if(this.lastRun!==null&&this.now()-this.lastRun<30000)throw Error('Wait 30 seconds before retrying / 请间隔 30 秒再试');
   if(this.mode==='aggressive'&&!await this.confirm('run'))return this.state();
   const targets=memoryTargets160(this.mode,this.pid,this.creationTime,this.mode==='aggressive'?this.metrics():[]);
   this.lastRun=this.now();
   this.last={mode:this.mode,at:new Date(this.now()).toISOString(),rows:await this.trim(targets)};
   return this.state();
  }finally{this.busy=false;}
 }
}
