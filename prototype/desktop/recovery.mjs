// SPDX-License-Identifier: MPL-2.0
// Copy transactions retain a journal before publishing any file. On restart,
// uncommitted verified files are moved to recovery storage, never erased.
import {readFile,writeFile,rename,unlink,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {safePath,ensureParents,verified} from './download.mjs';
import {atomicJson} from './core.mjs';
import {recoverModUpdate} from './mod-updates.mjs';
const filename='content-transaction.json';
const allowed=relative=>typeof relative==='string'&&(/^(mods|config|resourcepacks|shaderpacks|saves|defaultconfigs|kubejs|scripts)\//.test(relative)||/^[^/]+\.(txt|dat|cfg|properties|png)$/i.test(relative)||/^[^/]+\.json$/i.test(relative)&&!['instance.json','loader-base.json','trash-record.json','version.json','loader.json','installation.json','content.json','modpack.json','setup-report.json','content-task.json','migration-report.json','content-transaction.json','recovery-report.json'].includes(relative.toLowerCase()));
export async function beginTransaction(dir,manifest,files,cleanup=[]){
 const tx={schema:1,id:randomUUID(),manifest,files:files.map(f=>({relative:f.relative,hash:f.hash,size:f.size})),cleanup};
 await writeFile(join(dir,filename),JSON.stringify(tx),{flag:'wx'});return tx;
}
export async function finishTransaction(dir){await unlink(join(dir,filename)).catch(e=>{if(e.code!=='ENOENT')throw e;});}
export async function recoverInstance(dir){
 let tx;try{if((await lstat(join(dir,filename))).isSymbolicLink())throw Error('恢复日志不可为链接');tx=JSON.parse(await readFile(join(dir,filename),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
 if(tx.schema!==1||! /^[a-f0-9-]{36}$/.test(tx.id)||!['content.json','modpack.json'].includes(tx.manifest)||!Array.isArray(tx.files)||tx.files.length>10000||!Array.isArray(tx.cleanup))throw Error('恢复日志格式无效，请检查实例目录');
 for(const f of [...tx.files,...tx.cleanup])if(!allowed(f.relative)||! /^[a-f0-9]{40}$/.test(f.hash))throw Error('恢复日志包含无效路径或校验值');
 let manifest;try{manifest=JSON.parse(await readFile(join(dir,tx.manifest),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const committed=manifest?.transactionId===tx.id,report={schema:1,id:tx.id,committed,moved:[],preserved:[],recoveredAt:new Date().toISOString()};
 for(const f of committed?tx.cleanup:tx.files){const path=safePath(dir,f.relative);await ensureParents(dir,path);try{await lstat(path);}catch(e){if(e.code==='ENOENT')continue;throw e;}if(await verified({...f,path})){const backup=safePath(dir,`content-recovery/${tx.id}/${f.relative}`);await ensureParents(dir,backup);await rename(path,backup);report.moved.push(f.relative);}else report.preserved.push(f.relative);}
 await atomicJson(join(dir,'recovery-report.json'),report);await finishTransaction(dir);return report;
}
export async function recoverTransactions(core){const results=[];for(const item of await core.listInstances()){try{const dir=await core.instancePath(item.id);const update=await recoverModUpdate(dir);if(update)results.push({name:item.name,modUpdate:update});const r=await recoverInstance(dir);if(r)results.push({name:item.name,...r});for(const recordName of ['setup-report.json','content-task.json']){const path=join(dir,recordName);try{const setup=JSON.parse(await readFile(path,'utf8'));if(setup.state==='running'){setup.state='interrupted';setup.error='上次配置被中断；请在任务中心继续安装。';await atomicJson(path,setup);results.push({name:item.name,interrupted:true});}}catch(e){if(e.code!=='ENOENT')throw e;}}}catch(e){results.push({name:item.name,error:e.message});}}return results;}
