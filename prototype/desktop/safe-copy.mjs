// SPDX-License-Identifier: MPL-2.0
import {lstat,readdir,mkdir,copyFile,constants,realpath,statfs} from 'node:fs/promises';
import {resolve,join,relative,sep,dirname} from 'node:path';
import {safePath,digest,ensureParents} from './download.mjs';
export async function treeFiles(root,include=()=>true){
 root=resolve(root);if((await lstat(root)).isSymbolicLink()||resolve(await realpath(root)).toLowerCase()!==root.toLowerCase())throw Error('数据目录不能使用符号链接或目录联接。');const files=[];
 async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name),name=relative(root,path).split(sep).join('/');const st=await lstat(path);if(st.isSymbolicLink())throw Error('发现目录链接，请先检查：'+name);if(!include(name,st.isDirectory()))continue;if(st.isDirectory())await walk(path);else if(st.isFile())files.push({relative:name,size:st.size});else throw Error('不支持的特殊文件：'+name);}}
 await walk(root);return files.sort((a,b)=>a.relative.localeCompare(b.relative));
}
export async function requireSpace(path,bytes){const s=await statfs(path);if(s.bavail*s.bsize<bytes+64*1024*1024)throw Error('目标磁盘剩余空间不足，请选择更大的磁盘。');return s.bavail*s.bsize;}
export async function copyVerified(source,target,files,onProgress=()=>{}){
 await mkdir(target,{recursive:true});let completed=0;const manifest=[];
 for(const f of files){const from=safePath(source,f.relative),to=safePath(target,f.relative);await ensureParents(source,from);await ensureParents(target,to);const st=await lstat(from);if(st.size!==f.size)throw Error('文件大小发生变化：'+f.relative);if(!st.isFile()||st.isSymbolicLink())throw Error('源文件不再是普通文件。');const hash=await digest(from,'sha256');if(f.hash&&f.hash!==hash)throw Error('备份文件校验失败：'+f.relative);await copyFile(from,to,constants.COPYFILE_EXCL);if(await digest(to,'sha256')!==hash||await digest(from,'sha256')!==hash)throw Error('复制期间文件发生变化，请关闭占用程序后重试。');manifest.push({relative:f.relative,size:st.size,hash});onProgress(++completed,files.length);}
 return manifest;
}
export function separateDirectories(a,b){const x=resolve(a).toLowerCase(),y=resolve(b).toLowerCase();if(x===y||x.startsWith(y+sep)||y.startsWith(x+sep))throw Error('新旧数据目录不能相同或相互包含。');}
