// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
const run=promisify(execFile),cache=new Map();
export function sameProcessStart(record,actual){return !Number.isFinite(Date.parse(record))||!Number.isFinite(Date.parse(actual))||Math.abs(Date.parse(record)-Date.parse(actual))<30000;}
export async function sessionAlive(session){
 if(!Number.isInteger(session.pid)||session.pid<=0)return false;
 try{process.kill(session.pid,0);}catch(e){return e.code==='EPERM';}
 if(process.platform!=='win32'||!session.game||!Number.isFinite(Date.parse(session.startedAt)))return true;
 const old=cache.get(session.pid);if(old&&Date.now()-old.time<5000)return sameProcessStart(session.startedAt,old.start);
 try{const {stdout}=await run(join(process.env.SystemRoot||'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',`$p=Get-Process -Id ${session.pid} -ErrorAction Stop; $p.StartTime.ToUniversalTime().ToString('o')`],{windowsHide:true,timeout:5000});const start=stdout.trim();if(cache.size>100)cache.clear();cache.set(session.pid,{time:Date.now(),start});return sameProcessStart(session.startedAt,start);}catch{return true;}
}
