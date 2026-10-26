// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
export class LibraryState {
 constructor(core){this.core=core;this.queue=Promise.resolve();}
 async get(){try{await ensureParents(this.core.root,join(this.core.root,'library-state.json'));const v=JSON.parse(await readFile(join(this.core.root,'library-state.json'),'utf8'));if(v.schema!==1||!Array.isArray(v.favorites)||!Array.isArray(v.history)||v.favorites.some(id=>typeof id!=='string')||v.history.some(h=>!h||typeof h.instanceId!=='string'||typeof h.runId!=='string'||!Number.isFinite(Date.parse(h.startedAt)))||!['created','name','recent','game'].includes(v.sort))throw Error('实例排序记录无法读取，请保留数据并检查文件。');return v;}catch(e){if(e.code==='ENOENT')return {schema:1,favorites:[],sort:'created',history:[]};throw e;}}
 change(fn){const task=this.queue.then(async()=>{const v=await this.get();await fn(v);await atomicJson(join(this.core.root,'library-state.json'),v);return v;});this.queue=task.catch(()=>{});return task;}
 async favorite(id,value){await this.core.instancePath(id);if(typeof value!=='boolean')throw Error('收藏选项无效。');return this.change(v=>{v.favorites=v.favorites.filter(x=>x!==id);if(value)v.favorites.push(id);});}
 sort(value){if(!['created','name','recent','game'].includes(value))throw Error('排序选项无效。');return this.change(v=>{v.sort=value;});}
 async launched(id,run){await this.core.instancePath(id);return this.change(v=>{v.history=[{instanceId:id,startedAt:new Date().toISOString(),runId:run.id},...v.history].slice(0,100);});}
}
