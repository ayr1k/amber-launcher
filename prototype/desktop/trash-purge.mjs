// SPDX-License-Identifier: MPL-2.0
import {lstat,realpath,readdir,rm,rmdir} from 'node:fs/promises';
import {resolve,sep,join} from 'node:path';
// Refuse linked directories and inspect the entire tree before deleting any data.
export async function inspectTrashTree(root,trash,id){
 const expected=resolve(root,'instance-trash');
 if(resolve(trash)!==expected)throw Error('回收站路径不匹配，已停止操作。');
 for(const path of [root,trash,join(trash,id)]){const st=await lstat(path);if(st.isSymbolicLink()||!st.isDirectory()||resolve(await realpath(path)).toLowerCase()!==resolve(path).toLowerCase())throw Error('回收站包含目录链接，无法安全彻底删除。');}
 const target=resolve(trash,id);if(!target.startsWith(expected+sep)||target===expected)throw Error('删除路径越界。');
 let bytes=0,files=0;const walk=async path=>{const st=await lstat(path);if(st.isSymbolicLink())throw Error('实例中包含链接，请先手动检查并移除链接后重试。');const actual=await realpath(path);if(!actual.toLowerCase().startsWith((target+sep).toLowerCase())&&actual.toLowerCase()!==target.toLowerCase())throw Error('实例文件路径越界。');if(st.isDirectory()){for(const e of await readdir(path))await walk(join(path,e));}else if(st.isFile()){bytes+=st.size;files++;}else throw Error('实例中存在不支持的特殊文件。');};
 await walk(target);return {target,bytes,files};
}
export async function purgeTrashTree(target){
 // Keep identity records until payload removal succeeds, so a locked file can be retried.
 for(const name of await readdir(target)){if(['instance.json','trash-record.json'].includes(name))continue;await rm(join(target,name),{recursive:true,force:false});}
 await rm(join(target,'trash-record.json'),{force:true});await rm(join(target,'instance.json'),{force:true});await rmdir(target);
}
