// SPDX-License-Identifier: MPL-2.0
import {lstat,rename,copyFile,unlink,readdir,constants} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {InstanceWorkbench,tracked} from './instance-workbench.mjs';
import {treeFiles,copyVerified,requireSpace} from './safe-copy.mjs';
import {digest,safePath,ensureParents} from './download.mjs';
import {atomicJson} from './core.mjs';
import {ordinary170,json170} from './library-paths170.mjs';
import {validateUpdateGraph} from './mod-updates.mjs';
import {externalBackupFilter170} from './library-backups170.mjs';
import {LaunchPreferences,validateLaunchPreferences} from './launch-preferences.mjs';
const fingerprint=files=>createHash('sha256').update(JSON.stringify(files.map(({relative,size,hash})=>({relative,size,hash})).sort((a,b)=>a.relative.localeCompare(b.relative)))).digest('hex');

// History has a logical content.json entry, physically stored in AMBER state.
// A checkpoint restores the game files and their content manifest together.
export class ExternalWorkbench170 extends InstanceWorkbench {
 constructor(core,workflows,content){super(core,workflows);this.content=content;}
 async settingsRoot(id){const state=await this.core.statePath(id),root=join(state,'settings-history170');await ensureParents(state,join(root,'probe'));return root;}
 async settingsRows(id){const root=await this.settingsRoot(id),rows=[];for(const name of await readdir(root)){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;const r=await json170(join(root,name));if(r?.schema===1&&r.id+'.json'===name&&r.instanceId===id){r.before=validateLaunchPreferences(r.before);r.after=validateLaunchPreferences(r.after);rows.push(r);}}return rows;}
 async record(id,kind,fn,signal){if(kind!=='settings')return super.record(id,kind,fn,signal);const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);const prefs=new LaunchPreferences(this.core),before=await prefs.get(id),root=await this.settingsRoot(id),r={schema:1,id:randomUUID(),instanceId:id,createdAt:new Date().toISOString(),kind:'settings',state:'recording',before,after:before};await atomicJson(join(root,r.id+'.json'),r);try{const result=await fn();r.state='done';return result;}finally{r.after=await prefs.get(id);if(r.state==='recording')r.state='interrupted';await atomicJson(join(root,r.id+'.json'),r);}}
 async inspect(id){const result=await super.inspect(id),current=await new LaunchPreferences(this.core).get(id);for(const r of await this.settingsRows(id)){const changed=JSON.stringify(r.before)!==JSON.stringify(r.after);result.rows.push({id:r.id,kind:r.kind,state:r.state,createdAt:r.createdAt,changes:changed?[{relative:'launch-preferences.json',kind:'changed'}]:[],restorable:changed&&JSON.stringify(current)===JSON.stringify(r.after),blockReason:null});}result.rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));return result;}
 async restore(id,token){const r=(await this.settingsRows(id)).find(r=>r.id===token);if(!r)return super.restore(id,token);return this.workflows.exclusive(async()=>{const {dir}=await this.ready(id);await this.core.requireStopped(dir);const prefs=new LaunchPreferences(this.core);if(JSON.stringify(await prefs.get(id))!==JSON.stringify(r.after))throw Error('Launch preferences changed; refresh before restoring');return this.record(id,'settings',()=>prefs.save(id,r.before));});}
 async copyList(dir,saves){return treeFiles(dir,externalBackupFilter170(saves?'full':'configuration'));}
 async copySnapshot(dir,stage,files,progress){await copyVerified(dir,stage,files.filter(f=>f.relative!=='content.json'),progress);return copyVerified(await this.state(dir),stage,files.filter(f=>f.relative==='content.json'),progress);}
 async verifyContent(dir){const manifest=await this.content.manifest(dir);validateUpdateGraph(manifest.files);for(const f of manifest.files){const path=safePath(dir,f.relative+(f.enabled===false?'.disabled':''));await ordinary170(path);if(await digest(path,f.algorithm||'sha1')!==f.hash)throw Error('Content changed outside AMBER / 内容已在 AMBER 外改变');}}
 async state(dir){const state=await this.core.contentStateDirectory(dir),path=join(state,'content.json');await ordinary170(path,{missing:true});try{await lstat(path);}catch(e){if(e.code!=='ENOENT')throw e;await atomicJson(path,await this.content.manifest(dir));}return state;}
 async scan(dir,signal){const files=await treeFiles(dir,(name,isDir)=>!['content.json','launch-preferences.json'].includes(name)&&tracked(name,isDir));const state=await this.state(dir),path=join(state,'content.json'),st=await lstat(path);files.push({relative:'content.json',size:st.size});if(files.length>20000)throw Error('Too many checkpoint files');for(const f of files){signal?.throwIfAborted();f.hash=await digest(safePath(f.relative==='content.json'?state:dir,f.relative),'sha256');}return files.sort((a,b)=>a.relative.localeCompare(b.relative));}
 async capture(dir,kind,signal,paths){const files=await this.scan(dir,signal);await this.observe(dir,files);const selected=files.filter(f=>paths?paths.has(f.relative):kind==='settings'?false:kind==='visual'?!['mods','resourcepacks','shaderpacks','content.json'].includes(f.relative.split('/')[0]):true);await requireSpace(this.core.root,selected.reduce((n,f)=>n+f.size,0));const r={schema:1,id:randomUUID(),createdAt:new Date().toISOString(),kind,target:await this.identity(dir),state:'recording',before:files,backedUp:selected.map(f=>f.relative),after:null},folder=join(await this.root(dir),r.id,'files');
  await copyVerified(dir,folder,selected.filter(f=>f.relative!=='content.json'),()=>{signal?.throwIfAborted();this.workflows.checkCancelled();});await copyVerified(await this.state(dir),folder,selected.filter(f=>f.relative==='content.json'));await this.save(dir,r);return r;
 }
 async replace(dir,source,desired,current){await this.validateFiles(desired);await this.validateFiles(current);const want=new Map(desired.map(f=>[f.relative,f])),have=new Map(current.map(f=>[f.relative,f])),state=await this.state(dir);for(const f of desired){if(have.get(f.relative)?.hash===f.hash)continue;const p=safePath(source,f.relative);await ordinary170(p);if(await digest(p,'sha256')!==f.hash)throw Error('Checkpoint source changed');}if(fingerprint(await this.scan(dir))!==fingerprint(current))throw Error('Files changed outside AMBER; nothing overwritten / 文件已在 AMBER 外改变，未覆盖');
  for(const name of new Set([...have.keys(),...want.keys()])){const old=have.get(name),next=want.get(name);if(old?.hash===next?.hash)continue;const root=name==='content.json'?state:dir,target=safePath(root,name),displaced=target+'.amber-checkpoint-'+randomUUID();await ensureParents(root,target);let moved=false;
   try{if(old){if(await digest(target,'sha256')!==old.hash)throw Error('File changed before restore');await rename(target,displaced);moved=true;await ordinary170(displaced);if(await digest(displaced,'sha256')!==old.hash)throw Error('File changed during restore; preserved at '+displaced);}if(next){await copyFile(safePath(source,name),target,constants.COPYFILE_EXCL);if(await digest(target,'sha256')!==next.hash)throw Error('Restored file verification failed');}if(moved)await unlink(displaced);
   }catch(e){if(moved){try{await copyFile(displaced,target,constants.COPYFILE_EXCL);await unlink(displaced);}catch{e.message+='; Preserved file / 已保留文件: '+displaced;}}throw e;}
  }
 }
}
