// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
const exec=promisify(execFile);
// Fixed native helper; no shell interpolation of renderer input and no enumeration of other applications.
export async function trimWorkingSets160(pids){
 if(!pids.length||pids.some(pid=>!Number.isSafeInteger(pid)||pid<=0))throw Error('Invalid process list');
 const script=`$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System; using System.Runtime.InteropServices;
public static class AmberMemory160 {
 [DllImport("kernel32.dll", SetLastError=true)] public static extern IntPtr OpenProcess(uint access, bool inherit, uint pid);
 [DllImport("psapi.dll", SetLastError=true)] public static extern bool EmptyWorkingSet(IntPtr process);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr process);
}
'@
$rows=@(foreach($targetPid in @(${pids.join(',')})) {
 $handle=[AmberMemory160]::OpenProcess(0x1100,$false,[uint32]$targetPid)
 if($handle -eq [IntPtr]::Zero) { @{pid=$targetPid;ok=$false;error=[Runtime.InteropServices.Marshal]::GetLastWin32Error()}; continue }
 try { $ok=[AmberMemory160]::EmptyWorkingSet($handle); $code=0; if(!$ok){$code=[Runtime.InteropServices.Marshal]::GetLastWin32Error()}; @{pid=$targetPid;ok=$ok;error=$code} } finally { [void][AmberMemory160]::CloseHandle($handle) }
})
ConvertTo-Json -InputObject $rows -Compress`;
 const {stdout}=await exec(join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:30000,maxBuffer:128000});
 const rows=JSON.parse(stdout.trim());
 if(!Array.isArray(rows)||rows.length!==pids.length||rows.some(r=>!pids.includes(r.pid)||typeof r.ok!=='boolean'))throw Error('Invalid native memory result');
 return rows;
}
export class Memory160 {
 constructor({platform=process.platform,pid=process.pid,metrics=()=>[],trim=trimWorkingSets160,confirm=async()=>false,now=Date.now}={}){Object.assign(this,{platform,pid,metrics,trim,confirm,now});this.mode='off';this.busy=false;this.last=null;this.lastRun=null;}
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
   const pids=[...new Set([this.pid,...(this.mode==='aggressive'?this.metrics().map(m=>m.pid):[])])].filter(p=>Number.isSafeInteger(p)&&p>0);
   this.lastRun=this.now();
   this.last={mode:this.mode,at:new Date(this.now()).toISOString(),rows:await this.trim(pids)};
   return this.state();
  }finally{this.busy=false;}
 }
}
