// SPDX-License-Identifier: MPL-2.0
import {inspectTrashTree,purgeTrashTree} from './trash-purge.mjs';
import {mkdir,readFile,readdir,lstat,rename,access} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
import {safePath,ensureParents} from './download.mjs';
import {validateIcon} from './appearance.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export class InstanceManagement{
 constructor(core,workflows){this.core=core;this.workflows=workflows;this.trash=join(core.root,'instance-trash');}
 async setIcon(id,value){return this.workflows.exclusive(async()=>{const icon=validateIcon(value);const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);item.icon=icon;await atomicJson(join(dir,'instance.json'),item);return item;});}
 async rename(id,name){return this.workflows.exclusive(async()=>{if(typeof name!=='string'||!name.trim()||name.trim().length>60)throw Error('名称应为 1–60 个字符');const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);item.name=name.trim();await atomicJson(join(dir,'instance.json'),item);return item;});}
 async remove(id){return this.workflows.exclusive(async()=>{const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const target=safePath(this.core.root,'instance-trash/'+id);await ensureParents(this.core.root,target);try{await access(target);throw Error('回收站存在同名实例标识，已停止操作');}catch(e){if(e.code!=='ENOENT')throw e;}await atomicJson(join(dir,'trash-record.json'),{schema:1,id,name:item.name,deletedAt:new Date().toISOString()});await rename(dir,target);return {id,name:item.name};});}
 async list(){await ensureParents(this.core.root,join(this.trash,'probe'));const result=[];for(const e of await readdir(this.trash,{withFileTypes:true})){if(!e.isDirectory()||!uuid.test(e.name))continue;try{const dir=join(this.trash,e.name);if((await lstat(dir)).isSymbolicLink())continue;const item=JSON.parse(await readFile(join(dir,'instance.json'),'utf8')),record=JSON.parse(await readFile(join(dir,'trash-record.json'),'utf8'));if(item.id===e.name&&record.id===e.name&&typeof item.name==='string'&&item.name.trim()&&typeof record.deletedAt==='string'&&Number.isFinite(Date.parse(record.deletedAt)))result.push({...item,deletedAt:record.deletedAt});}catch{}}return result.sort((a,b)=>b.deletedAt.localeCompare(a.deletedAt));}
 async trashDetails(id){if(!uuid.test(id))throw Error('无效实例标识');const item=(await this.list()).find(i=>i.id===id);if(!item)throw Error('回收实例不存在');const {bytes,files}=await inspectTrashTree(this.core.root,this.trash,id);return {id,name:item.name,bytes,files};}
 async purge(id,confirmation){return this.workflows.exclusive(async()=>{
  if(!uuid.test(id))throw Error('无效实例标识');const item=(await this.list()).find(i=>i.id===id);if(!item)throw Error('回收实例不存在');
  if(confirmation!==item.name)throw Error('请输入完整实例名称以确认彻底删除。');
  const {target,bytes,files}=await inspectTrashTree(this.core.root,this.trash,id);await this.core.requireStopped(target);
  if(this.core.processes&&[...this.core.processes.values()].some(p=>p.instanceId===id&&p.state==='running'))throw Error('实例的游戏仍在运行。');
  try{await purgeTrashTree(target);}catch(e){try{if((await lstat(target)).isDirectory()){await atomicJson(join(target,'instance.json'),item);await atomicJson(join(target,'trash-record.json'),{schema:1,id,name:item.name,deletedAt:item.deletedAt});}}catch{}throw Error('部分文件无法删除。请关闭占用文件的程序后，在回收站重试。已删除的文件无法恢复。'+e.message);}
  return {id,bytes,files};
 });}
 async restore(id){return this.workflows.exclusive(async()=>{if(!uuid.test(id))throw Error('无效实例标识');if(!(await this.list()).some(i=>i.id===id))throw Error('回收实例不存在');const source=safePath(this.core.root,'instance-trash/'+id),target=safePath(this.core.root,'instances/'+id);await ensureParents(this.core.root,source);await ensureParents(this.core.root,target);await this.core.requireStopped(source);try{await access(target);throw Error('同标识实例已存在，不能覆盖');}catch(e){if(e.code!=='ENOENT')throw e;}await rename(source,target);return (await this.core.metadata(id)).item;});}
}

