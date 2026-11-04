// SPDX-License-Identifier: MPL-2.0
import {gunzipSync} from 'node:zlib';
import {readFile,writeFile,mkdir,symlink,lstat} from 'node:fs/promises';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {safePath,ensureParents} from './download.mjs';
export async function extractRuntimeTar(path,target){
 const b=gunzipSync(await readFile(path),{maxOutputLength:1_200_000_000});let at=0,pax={},longName=null;const links=[];
 const str=(h,a,n)=>h.subarray(a,a+n).toString().replace(/\0.*$/s,'');
 while(at+512<=b.length){const h=b.subarray(at,at+512);at+=512;if(h.every(x=>!x))break;
  const size=parseInt(str(h,124,12).trim()||'0',8),mode=parseInt(str(h,100,8).trim()||'644',8)&0o777;
  if(!Number.isSafeInteger(size)||size<0||size>600_000_000||at+size>b.length)throw Error('Invalid runtime archive');
  const data=b.subarray(at,at+size);at+=Math.ceil(size/512)*512;const type=str(h,156,1);
  if(type==='x'||type==='g'){let pos=0;while(pos<data.length){const end=data.indexOf(32,pos),len=Number(data.toString('ascii',pos,end));if(end<pos||!Number.isInteger(len)||len<=end-pos+1||pos+len>data.length)throw Error('Invalid PAX header');const record=data.toString('utf8',end+1,pos+len-1),eq=record.indexOf('=');pax[record.slice(0,eq)]=record.slice(eq+1);pos+=len;}continue;}
  if(type==='L'){longName=data.toString().replace(/\0.*$/s,'');continue;}
  const name=pax.path||longName||[str(h,345,155),str(h,0,100)].filter(Boolean).join('/'),link=pax.linkpath||str(h,157,100);pax={};longName=null;
  const out=safePath(target,name.replace(/\/$/,''));await ensureParents(target,out);
  if(type==='5')await mkdir(out,{recursive:true});
  else if(type==='0'||!type){try{await lstat(out);throw Error('Duplicate runtime archive entry');}catch(e){if(e.code!=='ENOENT')throw e;}await writeFile(out,data,{flag:'wx',mode});}
  else if(type==='2'){const dest=resolve(dirname(out),link),rel=relative(resolve(target),dest);if(isAbsolute(link)||rel==='..'||rel.startsWith('..'+String.fromCharCode(47))||rel.startsWith('..\\')||isAbsolute(rel))throw Error('Unsafe runtime symlink');links.push({out,link});}
  else throw Error('Unsupported runtime archive entry: '+type);
 }
 // Links are created last, so no regular file write can traverse an archive link.
 for(const {out,link} of links)await symlink(link,out);
}
