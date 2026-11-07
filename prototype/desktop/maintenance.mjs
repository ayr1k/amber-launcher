// SPDX-License-Identifier: MPL-2.0
import {lstat,readdir,realpath,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {ensureParents} from './download.mjs';
import {atomicJson} from './core.mjs';
// Read-only, bounded, no links followed. Results are estimates while files change.
export async function measureDirectory(path,{limit=200000,signal,onProgress,seen=new Set()}={}){
 let bytes=0,files=0,visited=0;
 try{
  const st=await lstat(path);if(st.isSymbolicLink()||resolve(await realpath(path)).toLowerCase()!==resolve(path).toLowerCase())throw Error('目录包含链接，未统计。');
  async function walk(p,depth=0){if(depth>64)throw Error('目录层级过深，统计未完成。');for(const e of await readdir(p,{withFileTypes:true})){signal?.throwIfAborted();if(++visited>limit)throw Error('文件数量超过统计限制。');const child=join(p,e.name),s=await lstat(child);if(s.isSymbolicLink())throw Error('目录包含链接，未统计。');if(s.isDirectory())await walk(child,depth+1);else if(s.isFile()){const key=s.ino?`${s.dev}:${s.ino}`:resolve(child);if(!seen.has(key)){seen.add(key);bytes+=s.size;files++;}}if(visited%100===0){onProgress?.({bytes,files});await new Promise(r=>setImmediate(r));}}}
  await walk(path);return {bytes,files,complete:true};
 }catch(e){if(e.code==='ENOENT'&&visited===0)return {bytes:0,files:0,complete:true};return {bytes,files,complete:false,error:e.message};}
}
export class StorageSurvey{
 constructor(core,userData){this.core=core;this.userData=userData;this.result={state:'idle',rows:[],instances:[],checkedAt:null};}
 async init(){const path=join(this.core.root,'storage-survey.json');await ensureParents(this.core.root,path);try{const d=JSON.parse(await readFile(path,'utf8'));if(Array.isArray(d.rows)&&Array.isArray(d.instances)&&d.state==='done')this.result=d;}catch{}return this;}
 get(){return this.result;}
 cancel(){this.controller?.abort();return this.result;}
 start(){if(this.result.state==='running')return this.result;this.controller=new AbortController();this.result={state:'running',rows:[],instances:[],checkedAt:null,progress:{files:0,bytes:0}};this.done=this.run(this.controller.signal);return this.result;}
 async run(signal){const d=this.result;try{const seen=new Set();const groups=[['room-sync',join(this.core.root,'room-sync152')],['servers',join(this.core.root,'servers')],['server-trash',join(this.core.root,'server-trash')],['instances',join(this.core.root,'instances')],['backups',join(this.core.root,'backups')],['trash',join(this.core.root,'instance-trash')],['libraries',join(this.core.root,'libraries')],['assets',join(this.core.root,'assets')],['java',join(this.core.root,'runtimes')],['content-cache',join(this.core.root,'content-cache')],['loader-cache',join(this.core.root,'loader-cache')],['updates',join(this.userData,'updates')],['upgrade-backups',join(this.userData,'upgrade-backups')]];
  for(const [kind,path]of groups){signal.throwIfAborted();d.current=kind;d.rows.push({kind,...await measureDirectory(path,{signal,seen,onProgress:p=>d.progress=p})});}
  for(const item of await this.core.listInstances()){signal.throwIfAborted();const dir=await this.core.instancePath(item.id);const total=await measureDirectory(dir,{signal});const parts=[];for(const kind of ['saves','mods','resourcepacks','shaderpacks','screenshots','logs']){signal.throwIfAborted();parts.push({kind,...await measureDirectory(join(dir,kind),{signal})});}d.instances.push({id:item.id,name:item.name,...total,parts});}
  d.instances.sort((a,b)=>b.bytes-a.bytes);d.state='done';
 }catch(e){d.state=signal.aborted?'cancelled':'failed';d.error=e.message;}d.checkedAt=new Date().toISOString();if(d.state==='done'){try{const path=join(this.core.root,'storage-survey.json');await ensureParents(this.core.root,path);await atomicJson(path,d);}catch(e){d.error=e.message;}}return d;}
}
export async function storageUsage(library,userData){
 const groups=[['instances',join(library,'instances')],['backups',join(library,'backups')],['trash',join(library,'instance-trash')],['libraries',join(library,'libraries')],['assets',join(library,'assets')],['java',join(library,'runtimes')],['updates',join(userData,'updates')],['upgrade-backups',join(userData,'upgrade-backups')]];
 const rows=[];for(const [kind,path] of groups)rows.push({kind,...await measureDirectory(path)});return {checkedAt:new Date().toISOString(),rows};
}
