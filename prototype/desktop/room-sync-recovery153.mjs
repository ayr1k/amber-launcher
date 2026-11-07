// SPDX-License-Identifier: MPL-2.0
import {readFile,lstat,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {ensureParents,safePath,verified} from './download.mjs';
import {regular153,safeConfig153} from './room-sync-io153.mjs';
import {ROOM_SYNC_MAX_MANIFEST153} from './room-sync-limits152.mjs';

export async function readRecord153(root,path,limit=ROOM_SYNC_MAX_MANIFEST153){
 try{await regular153(root,path,limit);return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
}
export function historyPath153(sync){const invite=sync.current('guest').invite;return join(sync.root,'history',createHash('sha256').update(invite.name+'\n'+invite.sync.key).digest('hex')+'.json');}
export async function saveHistory153(sync,path,record){await ensureParents(sync.root,path);await atomicJson(path,record);}
export async function conflicts153(core,id,manifest){
 const {dir,item}=await core.metadata(id);await core.requireStopped(dir);
 const receipt=await readRecord153(dir,join(dir,'room-sync152.json')),record=await readRecord153(dir,join(dir,'setup-report.json'));
 if(!item.roomSyncRequired||!receipt||receipt.state!=='pending'||!record?.roomSync||receipt.revision!==manifest.revision||receipt.room!==manifest.room||JSON.stringify(receipt.files)!==JSON.stringify(manifest.files)||item.game!==manifest.game||record.input?.loader!==manifest.loader|| (record.input?.version||null)!==(manifest.version||null))throw Error('Saved target no longer matches; create an independent instance / 原目标已变化，请创建独立实例');
 const conflicts=[];
 if(record.completed?.includes('loader')&&(item.loader!==manifest.loader||item.loaderVersion!==manifest.version))throw Error('Local runtime changed; create an independent instance / 本地加载器已变化，请创建独立实例');
 for(const f of manifest.files){const dest=safePath(dir,f.path);await ensureParents(dir,dest);try{await regular153(dir,dest);if(!await verified({path:dest,hash:f.sha256,algorithm:'sha256',size:f.size}))conflicts.push(f.path);}catch(e){if(e.code!=='ENOENT')throw e;}}
 return {dir,item,record,conflicts};
}
export async function copySelected153(sync,item,manifest,signal){
 const dir=await sync.core.instancePath(item.id);await sync.core.requireStopped(dir);
 // Inspect all destinations before any copy; never replace locally modified bytes.
 for(const f of manifest.files){const dest=safePath(dir,f.path);await ensureParents(dir,dest);try{await regular153(dir,dest);if(!await verified({path:dest,hash:f.sha256,algorithm:'sha256',size:f.size}))throw Error('Local file conflict: '+f.path+' / 本地修改冲突，请创建独立实例');}catch(e){if(e.code!=='ENOENT')throw e;}}
 for(const f of manifest.files){signal.throwIfAborted();const source=join(sync.root,'cache',f.sha256),dest=safePath(dir,f.path);await regular153(sync.root,source);if(!await verified({path:source,hash:f.sha256,algorithm:'sha256',size:f.size}))throw Error('Cache integrity check failed');if(f.path.startsWith('config/'))safeConfig153(await readFile(source));
  await ensureParents(dir,dest);try{await copyFile(source,dest,1);}catch(e){if(e.code!=='EEXIST')throw e;}await regular153(dir,dest);if(!await verified({path:dest,hash:f.sha256,algorithm:'sha256',size:f.size}))throw Error('Local file conflict: '+f.path);
 }
 await atomicJson(join(dir,'room-sync152.json'),{...manifest,state:'pending'});
}
