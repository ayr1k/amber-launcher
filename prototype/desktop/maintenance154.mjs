// SPDX-License-Identifier: MPL-2.0
// Only complete, receipted updater downloads at or below the installed version.
import {lstat,realpath,readdir,readFile,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {compareVersions} from './app-updates.mjs';
async function ordinary(path,directory=false){const s=await lstat(path);if(s.isSymbolicLink()||(directory?!s.isDirectory():!s.isFile()||s.nlink!==1)||resolve(await realpath(path)).toLowerCase()!==resolve(path).toLowerCase())throw Error('Unsafe link or file / 链接或文件状态不安全');return s;}
export async function previewUpdateCleanup(userData,current,product,{signal}={}){
 const root=join(userData,'updates'),rows=[],unknown=[];await ordinary(userData,true);
 try{await ordinary(root,true);}catch(e){if(e.code==='ENOENT')return {rows,unknown};throw e;}
 const names=await readdir(root);if(names.length>10000)throw Error('Too many files; cleanup unavailable / 文件过多，无法安全清理');
 for(const name of names){signal?.throwIfAborted();if(!name.endsWith('.receipt.json'))continue;
  try{const path=join(root,name);const st=await ordinary(path);if(st.size>4096)throw Error('Invalid receipt');const receipt=await readFile(path,'utf8'),r=JSON.parse(receipt);
   if(r.schema!==1||r.product!==product||!/^\d+\.\d+\.\d+$/.test(r.version)||r.name!==`${product}-${r.version}-Setup-x64.exe`||name!==r.name+'.receipt.json'||!Number.isSafeInteger(r.size)||r.size<1||! /^[a-f0-9]{64}$/.test(r.hash)||compareVersions(r.version,current)>0)continue;
   const file=join(root,r.name),s=await ordinary(file);if(s.size!==r.size)continue;
   // Streaming verification avoids loading large installers into memory.
   const {createReadStream}=await import('node:fs');const hash=createHash('sha256');let bytes=0;for await(const b of createReadStream(file)){signal?.throwIfAborted();bytes+=b.length;if(bytes>r.size)throw Error('File changed');hash.update(b);}if(hash.digest('hex')!==r.hash)continue;
   rows.push({...r,receipt,identity:[s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs]});
  }catch(e){if(signal?.aborted)throw e;unknown.push({name,error:e.message});}
 }
 return {rows,unknown};
}
export async function executeUpdateCleanup(userData,plan,current,product,{signal,check=()=>{},onProgress=()=>{}}={}){
 const result={state:'done',removedBytes:0,results:[]};
 for(const row of plan.rows){if(signal?.aborted){result.state='cancelled';break;}
  try{await check();const fresh=await previewUpdateCleanup(userData,current,product,{signal});const match=fresh.rows.find(r=>r.name===row.name&&r.receipt===row.receipt&&JSON.stringify(r.identity)===JSON.stringify(row.identity));if(!match)throw Error('File changed; rescan / 文件已变化，请重新扫描');
   await check();signal?.throwIfAborted();const root=join(userData,'updates');await ordinary(root,true);const s=await ordinary(join(root,row.name));if(JSON.stringify([s.dev,s.ino,s.size,s.mtimeMs,s.ctimeMs])!==JSON.stringify(row.identity))throw Error('File changed');
   await unlink(join(root,row.name));result.removedBytes+=row.size;result.results.push({name:row.name,state:'done',bytes:row.size});
   // Retain the small receipt as provenance; never recursively delete a directory.
  }catch(e){result.results.push({name:row.name,state:signal?.aborted?'cancelled':'failed',error:e.message});result.state=signal?.aborted?'cancelled':'partial';}onProgress(result);
 }
 return result;
}
