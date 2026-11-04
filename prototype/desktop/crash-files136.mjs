// SPDX-License-Identifier: MPL-2.0
import {readdir,lstat,open} from 'node:fs/promises';
import {join} from 'node:path';
import {ensureParents} from './download.mjs';
export async function collectCrashLogs(dir,run={}){
 const start=Date.parse(run.startedAt),end=Date.parse(run.finishedAt)||Date.now();
 let text=run.tail||'',sources=[];
 if(!Number.isFinite(start))return {text,sources};
 const candidates=['logs/latest.log'];
 if(/^amber-\d+\.log$/.test(run.logFile||''))candidates.push('logs/'+run.logFile);
 if(run.server)candidates.push('amber-console.log');
 try{await ensureParents(dir,join(dir,'crash-reports','.check'));
 for(const n of (await readdir(join(dir,'crash-reports')).catch(()=>[])).filter(n=>/^crash-[\w.-]+\.txt$/.test(n)).sort().reverse().slice(0,20))candidates.push('crash-reports/'+n);}catch{}
 for(const name of candidates){try{const path=join(dir,name);await ensureParents(dir,path);const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.mtimeMs<start-2000||s.mtimeMs>end+3000)continue;const f=await open(path,'r');try{const bytes=Buffer.alloc(Math.min(s.size,300000));await f.read(bytes,0,bytes.length,Math.max(0,s.size-bytes.length));text+='\n'+bytes.toString('utf8');sources.push(name);}finally{await f.close();}}catch{}if(sources.length>=5)break;}
 return {text:text.slice(-1800000),sources};
}
