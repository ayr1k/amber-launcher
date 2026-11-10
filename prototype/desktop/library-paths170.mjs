// SPDX-License-Identifier: MPL-2.0
import {lstat,realpath,readFile} from 'node:fs/promises';
import {resolve,parse,join,relative,sep} from 'node:path';

export const libraryError=message=>Error(message);
export function inside170(root,path){const r=relative(resolve(root),resolve(path));return !r||r!=='..'&&!r.startsWith('..'+sep)&&!parse(r).root;}
export async function ordinary170(path,{missing=false}={}){
 const full=resolve(path),parts=full.slice(parse(full).root.length).split(sep);let cursor=parse(full).root;
 for(const part of parts){cursor=join(cursor,part);try{const st=await lstat(cursor);if(st.isSymbolicLink())throw libraryError('Linked paths are not supported / 不支持链接目录');}catch(e){if(missing&&e.code==='ENOENT')return full;throw e;}}
 const canonical=await realpath(full);
 if((process.platform==='win32'?canonical.toLowerCase():canonical)!==(process.platform==='win32'?full.toLowerCase():full))throw libraryError('Path alias is not supported / 不支持目录别名');
 return full;
}
export async function json170(path,{optional=false,max=16000000}={}){
 try{await ordinary170(path);const st=await lstat(path);if(!st.isFile()||st.size>max)throw libraryError('Invalid configuration file / 配置文件无效或过大');let value;try{value=JSON.parse(await readFile(path,'utf8'));}catch(error){if(error instanceof SyntaxError)throw libraryError('Invalid configuration JSON / 配置 JSON 无效');throw error;}if(!value||typeof value!=='object'||Array.isArray(value))throw libraryError('Invalid configuration / 配置无效');return value;}catch(e){if(optional&&e.code==='ENOENT')return null;throw e;}
}
