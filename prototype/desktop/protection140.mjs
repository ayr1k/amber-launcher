// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
const defaults={daily:false,exit:false,updates:false,count:10,gib:10};
export function validateProtection(v){if(!v||['daily','exit','updates'].some(k=>typeof v[k]!=='boolean')||!Number.isInteger(v.count)||v.count<1||v.count>100||!Number.isInteger(v.gib)||v.gib<1||v.gib>1000)throw Error('Invalid backup policy / 备份策略无效');return Object.fromEntries(Object.keys(defaults).map(k=>[k,v[k]]));}
export class Protection140{
 constructor(core,backups){this.core=core;this.backups=backups;this.busy=new Set();}
 async state(id){const dir=await this.core.instancePath(id);try{const r=JSON.parse(await readFile(join(dir,'backup-policy.json'),'utf8'));return {...r,policy:validateProtection(r.policy)};}catch(e){if(e.code==='ENOENT')return {policy:{...defaults},error:null};throw e;}}
 async save(id,policy){const r=await this.state(id);await this.write(id,{...r,policy:validateProtection(policy)});return this.state(id);}
 async write(id,r){await atomicJson(join(await this.core.instancePath(id),'backup-policy.json'),r);}
 async before(id,kind){const r=await this.state(id),day=new Date().toLocaleDateString('en-CA');if(kind==='daily'&&(!r.policy.daily||r.day===day)||kind==='updates'&&!r.policy.updates)return;await this.capture(id,kind,kind==='updates'?'configuration':'saves',kind==='daily'?{day}:{});}
 async capture(id,reason,mode,extra={}){if(this.busy.has(id))throw Error('Backup is running / 备份正在进行');this.busy.add(id);try{await this.backups.create(id,mode,reason);const r=await this.state(id);await this.write(id,{...r,...extra,error:null,lastBackup:new Date().toISOString()});await this.backups.prune(id,r.policy.count,r.policy.gib*1073741824);}catch(e){const r=await this.state(id);await this.write(id,{...r,error:e.message});throw e;}finally{this.busy.delete(id);}}
 async observe(processes){for(const p of processes){if(p.state!=='exited'||p.exitCode!==0||!p.finishedAt)continue;const r=await this.state(p.instanceId);if(r.lastExit===p.finishedAt)continue;await this.write(p.instanceId,{...r,lastExit:p.finishedAt,firstRun:p.finishedAt});const result=join(await this.core.instancePath(p.instanceId),'upgrade-result.json');try{const upgrade=JSON.parse(await readFile(result,'utf8'));if(upgrade.state==='awaiting-first-run')await atomicJson(result,{...upgrade,state:'normal-exit-observed',firstNormalExit:p.finishedAt});}catch(e){if(e.code!=='ENOENT')throw e;}if(r.policy.exit)await this.capture(p.instanceId,'exit','saves').catch(()=>{});}}
}
