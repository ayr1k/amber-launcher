// SPDX-License-Identifier: MPL-2.0
import {randomUUID} from 'node:crypto';
import {validateManifest} from './workflows.mjs';
import {directory174,sameDirectory174,snapshot174,planMigration174,targetSpec174,stamp174} from './migration-plan174.mjs';

const expired=()=>Error('来源、目标或内容已变化，请重新预览。');
const requestKey174=value=>{if(typeof value!=='string'||!/^[-\w]{1,100}$/.test(value))throw Error('Invalid request identity');return value;};
export class Transfers174 {
 constructor(registry,withLibrary){this.registry=registry;this.withLibrary=withLibrary;this.plans=new Map();this.requests=new Map();this.cancelledKeys=new Map();}
 async selected(id){await this.registry.entry(id);if((await this.registry.list()).selected!==id)throw expired();}
 prune(){for(const [id,p]of this.plans)if(p.expires<Date.now())this.plans.delete(id);if(this.plans.size>=100)throw Error('预览过多，请关闭旧操作后重试。');}
 async sources(libraryId,targetLibraryId,targetId){
  await this.registry.entry(libraryId);let target;
  if(targetId)target=await this.withLibrary(targetLibraryId,async g=>directory174((await g.core.metadata(targetId)).dir));
  return this.withLibrary(libraryId,async g=>{const rows=[];for(const item of await g.core.listInstances()){
   try{const m=await g.core.metadata(item.id),directory=await directory174(m.dir);rows.push({id:item.id,name:item.name,game:item.game,loader:item.loader,shared:m.profile?.isolation==='shared',disabled:!!target&&sameDirectory174(directory,target)});}
   catch(error){rows.push({id:item.id,name:item.name,disabled:true,error:error.message});}
  }return rows;});
 }
 async sourceManifest(source,signal){
  if(!source||typeof source.libraryId!=='string'||typeof source.instanceId!=='string')throw Error('请选择来源游戏库和实例。');
  await this.registry.entry(source.libraryId);
  return this.withLibrary(source.libraryId,g=>g.workflows.exclusive(async()=>{
   signal?.throwIfAborted();const before=await snapshot174(g.core,g.content,source.instanceId,{signal}),manifest=await g.workflows.export(source.instanceId,{signal});
   const after=await snapshot174(g.core,g.content,source.instanceId,{signal});signal?.throwIfAborted();if(before.stamp!==after.stamp)throw expired();return {manifest,snapshot:after};
  },source.instanceId));
 }
 async preview(libraryId,{source,manifest,target,requestKey}){
  await this.selected(libraryId);requestKey174(requestKey);this.cancel(requestKey);const controller=new AbortController();this.requests.set(requestKey,controller);const {signal}=controller;
  try{
   const original=source?await this.sourceManifest(source,signal):{manifest:validateManifest(manifest)},value=original.manifest;
   const plan=await this.withLibrary(libraryId,async g=>{
    const id=target?.id;if(!id&&g.core.external)throw Error('请切换到 AMBER 管理的游戏库创建独立实例。');
    const spec=id?null:{game:target?.game,loader:target?.loader,loaderVersion:target?.version||null,liteVersion:target?.liteVersion||null};
    if(!id&&(typeof spec.game!=='string'||!/^[-\w.]{1,100}$/.test(spec.game)||!['vanilla','quilt','fabric','forge','neoforge','liteloader','optifine'].includes(spec.loader)))throw Error('Invalid migration target');
    const snapshot=id?await snapshot174(g.core,g.content,id,{signal}):null;
    if(snapshot&&original.snapshot&&sameDirectory174(snapshot.directory,original.snapshot.directory))throw Error('源实例和目标实例指向同一游戏目录，不能迁移。');
    const prepared=await planMigration174(g.content,id||'preview174',value,{target:spec,signal});
    if(snapshot&&(await snapshot174(g.core,g.content,id)).stamp!==snapshot.stamp)throw expired();
    return {prepared,snapshot,target:id?{id}:spec};
   });
   await this.selected(libraryId);signal.throwIfAborted();this.prune();const token=randomUUID();
   this.plans.set(token,{libraryId,source,sourceSnapshot:original.snapshot,manifest:value,...plan,expires:Date.now()+600000});
   return {token,source:value.source,target:plan.prepared.target,sharedTarget:!!plan.snapshot?.shared,rows:plan.prepared.rows,expires:Date.now()+600000};
  }finally{if(this.requests.get(requestKey)===controller)this.requests.delete(requestKey);}
 }
 cancel(key){const active=this.requests.get(key);if(active)active.abort(Error('操作已取消。'));else if(typeof key==='string'){this.cancelledKeys.set(key,Date.now());for(const [k,time]of this.cancelledKeys)if(time<Date.now()-60000||this.cancelledKeys.size>200)this.cancelledKeys.delete(k);}}
 forget(token){this.plans.delete(token);}
 async take(libraryId,token,input){
  await this.selected(libraryId);const p=this.plans.get(token);this.plans.delete(token);
  if(!p||p.libraryId!==libraryId||p.expires<Date.now())throw expired();
  if(p.source){await this.registry.entry(p.source.libraryId);const snapshot=await this.withLibrary(p.source.libraryId,g=>snapshot174(g.core,g.content,p.source.instanceId));if(snapshot.stamp!==p.sourceSnapshot.stamp)throw expired();}
  if(p.target.id){const snapshot=await this.withLibrary(libraryId,g=>snapshot174(g.core,g.content,p.target.id));if(snapshot.stamp!==p.snapshot.stamp||p.sourceSnapshot&&sameDirectory174(snapshot.directory,p.sourceSnapshot.directory))throw expired();}
  else if(!input||stamp174(targetSpec174({game:input.game,loader:input.loader,loaderVersion:input.version||null,liteVersion:input.liteVersion||null}))!==stamp174(p.prepared.target))throw expired();
  await this.selected(libraryId);return p;
 }
 async guarded(key,fn){if(this.cancelledKeys.delete(key))throw Error('操作已取消。');if(this.requests.has(key))throw Error('请等待此操作结束');const c=new AbortController();this.requests.set(key,c);try{return await fn(c.signal);}finally{if(this.requests.get(key)===c)this.requests.delete(key);}}
 async run(libraryId,token,acknowledged=false){const entry=this.plans.get(token),id=entry?.target.id;if(!id)throw expired();if(entry.snapshot?.shared&&!acknowledged)throw Error('请确认共享目标目录会影响其他版本。');return this.guarded(id,async signal=>{
  const p=await this.take(libraryId,token);signal.throwIfAborted();
  return this.withLibrary(libraryId,g=>{
   // Library acquisition can yield before a cancellable workflow scope exists.
   signal.throwIfAborted();return g.workflows.migrate(p.target.id,p.manifest,p.prepared);
  });
 });}
 async create(libraryId,token,input,optifine){requestKey174(input.requestKey);return this.guarded('new:'+input.requestKey,async signal=>{
  const p=await this.take(libraryId,token,input);if(p.target.id)throw expired();signal.throwIfAborted();
  return this.withLibrary(libraryId,g=>{
   // Check after acquisition, with no await before create establishes its scope.
   signal.throwIfAborted();return g.workflows.create(input,optifine,p.manifest,null,null,null,null,p.prepared);
  });
 });}
}
