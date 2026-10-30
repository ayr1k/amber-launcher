// SPDX-License-Identifier: MPL-2.0
import {lstat,readdir,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
// Read-only, bounded, no links followed. Results are estimates while files change.
export async function measureDirectory(path,{limit=200000}={}){
 let bytes=0,files=0,visited=0;
 try{
  const st=await lstat(path);if(st.isSymbolicLink()||resolve(await realpath(path)).toLowerCase()!==resolve(path).toLowerCase())throw Error('目录包含链接，未统计。');
  async function walk(p,depth=0){if(depth>64)throw Error('目录层级过深，统计未完成。');for(const e of await readdir(p,{withFileTypes:true})){if(++visited>limit)throw Error('文件数量超过统计限制。');const child=join(p,e.name),s=await lstat(child);if(s.isSymbolicLink())throw Error('目录包含链接，未统计。');if(s.isDirectory())await walk(child,depth+1);else if(s.isFile()){bytes+=s.size;files++;}}}
  await walk(path);return {bytes,files,complete:true};
 }catch(e){if(e.code==='ENOENT'&&visited===0)return {bytes:0,files:0,complete:true};return {bytes,files,complete:false,error:e.message};}
}
export async function storageUsage(library,userData){
 const groups=[['instances',join(library,'instances')],['backups',join(library,'backups')],['trash',join(library,'instance-trash')],['libraries',join(library,'libraries')],['assets',join(library,'assets')],['java',join(library,'runtimes')],['updates',join(userData,'updates')],['upgrade-backups',join(userData,'upgrade-backups')]];
 const rows=[];for(const [kind,path] of groups)rows.push({kind,...await measureDirectory(path)});return {checkedAt:new Date().toISOString(),rows};
}
