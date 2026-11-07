// SPDX-License-Identifier: MPL-2.0
import {AsyncLocalStorage} from 'node:async_hooks';

// Register before the first await. Nested reads are part of their owning operation,
// including reads that discover an old backup and start a migration later.
export class DatabaseOperations150 {
 constructor(){this.context=new AsyncLocalStorage();this.pending=new Map();this.paused=false;}
 get active(){return this.pending.size>0;}
 activeFor(id){return [...this.pending.values()].some(key=>key===id);}
 run(id,fn){
  if(this.context.getStore()===this){try{return Promise.resolve(fn());}catch(error){return Promise.reject(error);}}
  if(this.paused)return Promise.reject(Error('Database operations are paused for exit or data migration / 数据库操作正在等待退出或数据迁移完成'));
  const task=Promise.withResolvers();
  const result=task.promise.finally(()=>this.pending.delete(result));this.pending.set(result,id);
  try{task.resolve(this.context.run(this,fn));}catch(error){task.reject(error);}return result;
 }
 async quiesce(fn){
  if(this.paused)throw Error('Database maintenance is already in progress / 数据库维护操作进行中');
  this.paused=true;
  try{await Promise.allSettled([...this.pending.keys()]);return await this.context.run(this,fn);}
  finally{this.paused=false;}
 }
}
