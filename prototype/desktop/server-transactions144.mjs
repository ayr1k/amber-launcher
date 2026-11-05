import {compareContentVersions} from './compatibility.mjs';
// SPDX-License-Identifier: MPL-2.0
import {readFile,writeFile,mkdir,copyFile,unlink,readdir,lstat,constants} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {safePath,ensureParents,verified,downloadPool} from './download.mjs';
import {requireSpace} from './safe-copy.mjs';
export const contentStamp=m=>createHash('sha256').update(JSON.stringify(m.files)).digest('hex');
const actual=f=>f.relative+(f.enabled===false?'.disabled':'');
const matches=(d,f)=>d.version_id?d.version_id===f.versionId:!!d.project_id&&d.project_id===f.projectId;
export function validateUpdateGraph(files){
  const enabled=files.filter(f=>f.enabled!==false);
  for(const f of enabled)for(const [i,d] of (f.dependencies||[]).entries()){
    if(d.dependency_type==='required'&&!(f.ignoredRequired||[]).includes(f.versionId+':'+i)&&!enabled.some(x=>matches(d,x)))throw Error(`「${f.title}」需要指定依赖版本，请同时选择对应依赖更新，或调整依赖勾选。`);
    if(d.dependency_type==='incompatible'&&enabled.some(x=>x.projectId!==f.projectId&&matches(d,x)))throw Error(`「${f.title}」与更新后的其他内容声明不兼容。`);
  }
  const paths=new Set();for(const f of files){const key=actual(f).toLowerCase();if(paths.has(key))throw Error('更新后的内容文件名冲突。');paths.add(key);}
}
function validFile(f){if(!f||!['sha1','sha256','sha512'].includes(f.algorithm||'sha1')||!new RegExp('^[a-f0-9]{'+({sha1:40,sha256:64,sha512:128}[f.algorithm||'sha1'])+'}$').test(f.hash)||!Number.isSafeInteger(f.size)||f.size<1||! /^(mods|plugins)\/[^/\\]+\.(jar|litemod|zip)$/i.test(f.relative))throw Error('模组恢复记录格式无效。');}
async function exists(path){try{await lstat(path);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function checked(dir,f){const path=safePath(dir,actual(f));await ensureParents(dir,path);if(!await verified({...f,path}))throw Error(`「${f.title}」的文件已被修改或缺失，请先修复内容，未覆盖现有文件。`);return path;}
// Journal precedes replacement. Backups survive successful updates and process crashes.
export async function recoverServerUpdate144(dir){
  const path=join(dir,'server-content-update.json');if(!await exists(path))return null;
  if((await lstat(path)).isSymbolicLink())throw Error('模组更新日志不可使用链接。');
  const tx=JSON.parse(await readFile(path,'utf8'));
  if(tx.schema!==1||! /^[a-f0-9-]{36}$/.test(tx.id)||!Array.isArray(tx.old)||!Array.isArray(tx.next)||tx.old.length>200||tx.next.length>200)throw Error('模组更新恢复记录无效。');
  for(const f of [...tx.old,...tx.next]){validFile(f);safePath(dir,actual(f));}
  const manifest=JSON.parse(await readFile(join(dir,'content-manifest.json'),'utf8'));
  const committed=manifest.updateId===tx.id;
  if(!committed){
    // Verify all backup sources before touching any current file.
    for(const f of tx.old)await checked(join(dir,'server-content-updates',tx.id,'files'),f);
    for(const f of tx.next){const p=safePath(dir,actual(f));await ensureParents(dir,p);if(await exists(p)){
      const old=tx.old.find(x=>actual(x).toLowerCase()===actual(f).toLowerCase());
      if(old&&await verified({...old,path:p}))continue;
      if(!await verified({...f,path:p}))throw Error('更新恢复发现外部修改，请保留文件并打开实例目录检查：'+actual(f));
      await unlink(p);
    }}
    for(const f of tx.old){const target=safePath(dir,actual(f));await ensureParents(dir,target);if(await exists(target)){if(!await verified({...f,path:target}))throw Error('无法覆盖更新期间被修改的文件：'+actual(f));}else await copyFile(safePath(join(dir,'server-content-updates',tx.id,'files'),actual(f)),target,constants.COPYFILE_EXCL);}
  }
  await ensureParents(dir,join(dir,'server-content-updates',tx.id,'record.json'));
  await atomicJson(join(dir,'server-content-updates',tx.id,'record.json'),{...tx,state:committed?'done':'recovered'});
  await unlink(path);return {id:tx.id,committed};
}
export class ServerTransactions144{
  async replace(dir,before,after,old,next,source,signal,job){
    if(old.length>200||next.length>200)throw Error('Update at most 200 files per batch / 每批最多更新 200 个文件');
    if(!await exists(join(dir,'content-manifest.json')))await atomicJson(join(dir,'content-manifest.json'),before);
    for(const f of [...old,...next])validFile(f);
    for(const f of old)await checked(dir,f);
    for(const f of next){const path=safePath(dir,actual(f));await ensureParents(dir,path);if(await exists(path)&&!old.some(x=>actual(x).toLowerCase()===actual(f).toLowerCase()))throw Error('已有同名文件，未覆盖：'+actual(f));if(!await verified({...f,path:source(f)}))throw Error('更新来源文件校验失败。');}
    const tx={schema:1,id:randomUUID(),createdAt:new Date().toISOString(),operation:job.operation||'update',before,after,old,next};
    const backup=join(dir,'server-content-updates',tx.id,'files');await ensureParents(dir,backup);await mkdir(backup,{recursive:true});
    for(const f of old){const from=await checked(dir,f),to=safePath(backup,actual(f));await ensureParents(backup,to);await copyFile(from,to,constants.COPYFILE_EXCL);await checked(backup,f);}
    signal?.throwIfAborted();await writeFile(join(dir,'server-content-update.json'),JSON.stringify(tx),{flag:'wx'});
    try{job.phase='替换文件并保留可恢复副本';for(const f of old){signal?.throwIfAborted();await unlink(await checked(dir,f));}for(const f of next){signal?.throwIfAborted();const to=safePath(dir,actual(f));await ensureParents(dir,to);await copyFile(source(f),to,constants.COPYFILE_EXCL);await checked(dir,f);}
      signal?.throwIfAborted();await atomicJson(join(dir,'content-manifest.json'),{...after,updateId:tx.id});
    }catch(e){await recoverServerUpdate144(dir);throw e;}
    await recoverServerUpdate144(dir);
  }
  async history(instanceId){const {dir}=await this.core.metadata(instanceId);let names;try{names=await readdir(join(dir,'server-content-updates'));}catch(e){if(e.code==='ENOENT')return [];throw e;}const list=[];
    for(const name of names.filter(n=>/^[a-f0-9-]{36}$/.test(n))){try{const record=join(dir,'server-content-updates',name,'record.json');await ensureParents(dir,record);const r=JSON.parse(await readFile(record,'utf8'));if(['done','recovered'].includes(r.state))list.push({id:name,operation:r.operation||'update',state:r.state,createdAt:r.createdAt,titles:(r.next.length?r.next:r.old.length?r.old:r.before.files.filter(f=>!r.after.files.some(n=>n.relative===f.relative))).map(f=>f.title),changes:r.next.map(f=>({title:f.title,from:r.old.find(o=>o.relative===f.relative||o.projectId&&o.projectId===f.projectId)?.version||'',to:f.version||'',enabled:f.enabled!==false})),restorable:r.state==='done'&&contentStamp(await this.content.manifest(dir))===contentStamp(r.after)});}catch{}}
    return list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  }
  async restore(instanceId,id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('无效更新记录。');const {dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);
    return this.core.startJob(instanceId,'content-update',async(job,signal)=>{await recoverServerUpdate144(dir);const recordPath=join(dir,'server-content-updates',id,'record.json');await ensureParents(dir,recordPath);const r=JSON.parse(await readFile(recordPath,'utf8')),current=await this.content.manifest(dir);
      if(r.id!==id||r.state!=='done'||contentStamp(current)!==contentStamp(r.after))throw Error('更新后内容已改变，不能直接恢复。请先备份实例并手动处理。');validateUpdateGraph(r.before.files);
      job.operation='restore';await this.replace(dir,current,r.before,r.next,r.old,f=>safePath(join(dir,'server-content-updates',id,'files'),actual(f)),signal,job);
    });
  }
}
