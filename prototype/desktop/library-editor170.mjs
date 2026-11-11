// SPDX-License-Identifier: MPL-2.0
import {mkdir,readdir,lstat,copyFile,unlink,readFile,constants} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {InstanceEditor,textMetadata} from './editor130.mjs';
import {ordinary170} from './library-paths170.mjs';
import {digest} from './download.mjs';
import {withFileLock} from './task-queue132.mjs';

export class ExternalEditor170 extends InstanceEditor {
 async archiveRoot(id,name){const {dir}=await this.core.metadata(id),state=await this.core.contentStateDirectory(dir),root=join(state,'editor',createHash('sha256').update(name).digest('hex'));await ordinary170(root,{missing:true});await mkdir(root,{recursive:true});return root;}
 async save(id,input){const {dir}=await this.core.metadata(id),state=await this.core.contentStateDirectory(dir);return withFileLock(join(state,'operation'),async()=>{await this.core.requireStopped(dir);const before=new Set((await super.history(id,input.name)).map(r=>r.token));const root=await this.archiveRoot(id,input.name),actual=await this.path(id,input.name);const result=await super.save(id,input);
  for(const row of await super.history(id,input.name)){if(before.has(row.token))continue;const source=join(dirname(actual),row.token),dest=join(root,row.token);await ordinary170(source);const hash=await digest(source,'sha256');await copyFile(source,dest,constants.COPYFILE_EXCL);if(await digest(dest,'sha256')!==hash||await digest(source,'sha256')!==hash)throw Error('Editor recovery file changed; both copies retained / 编辑恢复文件发生变化，已保留两份副本');await unlink(source);}
  return result;
 });}
 async history(id,name){const live=await super.history(id,name),root=await this.archiveRoot(id,name);for(const token of await readdir(root)){const match=/\.amber-edit-(\d+)-[a-f0-9-]{36}\.bak$/.exec(token);if(!match)continue;const path=join(root,token);await ordinary170(path);const st=await lstat(path);if(st.isFile()&&st.size<=2000000)live.push({token,date:new Date(Number(match[1])).toISOString(),bytes:st.size,archived:true});}return live.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,100);}
 async backup(id,name,token){const row=(await this.history(id,name)).find(r=>r.token===token);if(!row)throw Error('Backup unavailable');if(!row.archived)return super.backup(id,name,token);const path=join(await this.archiveRoot(id,name),token);await ordinary170(path);const bytes=await readFile(path);if(bytes.length>2000000||bytes.includes(0))throw Error('Invalid backup');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);return {text,...textMetadata(text)};}
}
