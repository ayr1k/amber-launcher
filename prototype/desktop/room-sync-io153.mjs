// SPDX-License-Identifier: MPL-2.0
import {createReadStream,createWriteStream} from 'node:fs';
import {lstat,readFile,readdir,rename,rm,statfs} from 'node:fs/promises';
import {pipeline} from 'node:stream/promises';
import {Readable,Transform} from 'node:stream';
import {join} from 'node:path';
import {safePath,ensureParents,digest,verified} from './download.mjs';
import {ROOM_SYNC_MAX_FILE153,ROOM_SYNC_CONFIG_DEPTH153} from './room-sync-limits152.mjs';

export function syncPath153(value){
 if(typeof value!=='string'||value.length>200||! /^(mods\/[^/]+\.jar|(?:resourcepacks|shaderpacks)\/[^/]+\.zip|config\/[a-zA-Z0-9_./-]+\.(json|toml|properties|cfg|ini|yaml|yml))$/.test(value)||value.split('/').some(x=>!x||x==='.')||value.split('/').length>ROOM_SYNC_CONFIG_DEPTH153+2||/[\x00-\x1f\x7f]/.test(value)||/(account|token|secret|password|credential|session|auth|database|\.env|private|launcher)/i.test(value))throw Error('Invalid shared path / 分享路径无效');
 safePath(process.cwd(),value);return value;
}
export function safeConfig153(bytes){if(bytes.length>1024*1024||bytes.includes(0)||/(password|token|secret|credential|authorization|api.?key|https?:\/\/|(?:\d{1,3}\.){3}\d{1,3})/i.test(bytes.toString('utf8')))throw Error('Potential private configuration; sharing blocked / 配置可能包含私密信息，已阻止分享');}
export async function regular153(root,path,max=ROOM_SYNC_MAX_FILE153){
 await ensureParents(root,path);const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<1||st.size>max)throw Error('Unsafe shared file / 分享文件不安全');return st;
}
export async function inspect153(root,name){
 const path=safePath(root,syncPath153(name)),st=await regular153(root,path);
 if(name.startsWith('config/')){if(st.size>1024*1024)throw Error('Configuration too large');safeConfig153(await readFile(path));}
 return {path:name,size:st.size,sha256:await digest(path,'sha256')};
}
export async function candidates153(root){
 const files=[];let visited=0;
 async function walk(folder,depth){
  const base=safePath(root,folder);let st;try{st=await lstat(base);}catch(e){if(e.code==='ENOENT')return;throw e;}if(!st.isDirectory()||st.isSymbolicLink())return;
  for(const entry of await readdir(base,{withFileTypes:true})){
   if(++visited>20000)throw Error('Too many entries to inspect safely / 待检查文件过多');
   const name=folder+'/'+entry.name;
   if(entry.isDirectory()&&folder.startsWith('config')&&depth<ROOM_SYNC_CONFIG_DEPTH153&&!/(account|token|secret|password|credential|session|auth|database|private|launcher)/i.test(name)){await walk(name,depth+1);continue;}
   if(!entry.isFile())continue;
   try{files.push(await inspect153(root,name));}catch{/* Exclude unsafe or unsupported files. */}
  }
 }
 for(const folder of ['mods','config','resourcepacks','shaderpacks'])await walk(folder,0);
 return files;
}
export async function space153(root,bytes){const st=await statfs(root);if(st.bavail*st.bsize<bytes+64*1024*1024)throw Error('Insufficient space for isolated synchronization / 空间不足，无法安全同步独立实例');}
export async function serveFile153(root,path,file,req,res,stillCurrent){
 await regular153(root,path);if(!await verified({path,hash:file.sha256,algorithm:'sha256',size:file.size})||!stillCurrent())throw Error('Snapshot changed');
 const range=req.headers.range;let start=0;
 if(range){const match=/^bytes=(\d+)-$/.exec(range);if(!match||!Number.isSafeInteger(+match[1])||+match[1]>=file.size){res.writeHead(416);res.end();return;}start=+match[1];res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${file.size-1}/${file.size}`);}
 res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Length',file.size-start);
 await pipeline(createReadStream(path,{start}),res);
}
export async function receiveFile153(root,path,file,fetchRange,signal){
 const part=path+'.part';await ensureParents(root,part);let offset=0;
 try{const st=await lstat(part);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>ROOM_SYNC_MAX_FILE153)throw Error('Unsafe partial file');offset=st.size;}catch(e){if(e.code!=='ENOENT')throw e;}
 if(offset>=file.size){if(offset===file.size&&await verified({path:part,hash:file.sha256,algorithm:'sha256',size:file.size})){if(file.path.startsWith('config/'))safeConfig153(await readFile(part));signal.throwIfAborted();await rename(part,path);return;}await rm(part);offset=0;}
 const response=await fetchRange(offset);let count=offset;
 if(response.status===206){if(response.headers.get('content-range')!==`bytes ${offset}-${file.size-1}/${file.size}`){await response.body?.cancel();throw Error('Invalid resume response');}}
 else if(response.status===200){count=offset=0;}else{await response.body?.cancel();throw Error('Sharing unavailable / 分享已不可用');}
 const declared=response.headers.get('content-length');if(declared!==null&&Number(declared)!==file.size-offset){await response.body?.cancel();throw Error('Invalid transfer size');}
 const bound=new Transform({transform(chunk,encoding,done){count+=chunk.length;done(count>file.size?Error('Transfer exceeds declared size'):null,chunk);}});
 await pipeline(Readable.fromWeb(response.body),bound,createWriteStream(part,{flags:offset?'a':'w'}),{signal});
 if(count!==file.size||!await verified({path:part,hash:file.sha256,algorithm:'sha256',size:file.size})){await rm(part);throw Error('File integrity check failed / 文件校验失败');}
 if(file.path.startsWith('config/'))safeConfig153(await readFile(part));signal.throwIfAborted();await rename(part,path);
}
