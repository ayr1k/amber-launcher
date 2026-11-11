// SPDX-License-Identifier: MPL-2.0
import {readdir,lstat,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {ordinary170,json170} from './library-paths170.mjs';
import {readModMetadata} from './mod-import.mjs';
import {atomicJson} from './core.mjs';
import {safeURL} from './download.mjs';
import {VERSION} from './product.mjs';
import {REPOSITORY_URL} from './edition.mjs';
import {readBoundedFile,responseText} from './bounded-io.mjs';

export const directoryKey170=dir=>createHash('sha256').update(process.platform==='win32'?resolve(dir).toLowerCase():resolve(dir)).digest('hex');
const hash=b=>createHash('sha1').update(b).digest('hex');
const identifier=v=>typeof v==='string'&&/^[-\w]{1,100}$/.test(v);
const clean=v=>typeof v==='string'?v.slice(0,300):'';

// Only hashes leave this process. Never forward a filename, directory or archive.
export async function lookupModHashes170(hashes,{fetcher=fetch,signal}={}){
 if(!hashes.length||hashes.length>100||hashes.some(h=>! /^[a-f0-9]{40}$/.test(h)))throw Error('Invalid hash batch');
 const response=await fetcher(safeURL('https://api.modrinth.com/v2/version_files'),{method:'POST',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','User-Agent':`AMBER/${VERSION} (${REPOSITORY_URL})`},body:JSON.stringify({hashes,algorithm:'sha1'})});
 if(!response.ok){await response.body?.cancel();throw Object.assign(Error('Modrinth lookup failed'),{status:response.status});}
 const raw=await responseText(response,12000000);const data=JSON.parse(raw);
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid Modrinth response');
 const result={};for(const h of hashes){const v=data[h];if(v===undefined){result[h]={match:'unmatched'};continue;}
  const file=v.files?.find(f=>f.hashes?.sha1===h);if(!file||!identifier(v.id)||!identifier(v.project_id)||!Number.isSafeInteger(file.size)||file.size<1)throw Error('Modrinth returned a mismatched file');
  result[h]={match:'matched',projectId:v.project_id,versionId:v.id,version:clean(v.version_number),title:clean(v.name),size:file.size,games:Array.isArray(v.game_versions)?v.game_versions.filter(x=>typeof x==='string').slice(0,1000):[],loaders:Array.isArray(v.loaders)?v.loaders.filter(x=>typeof x==='string').slice(0,30):[],dependencies:Array.isArray(v.dependencies)?v.dependencies.filter(d=>d&&['required','optional','incompatible','embedded'].includes(d.dependency_type)&&(!d.project_id||identifier(d.project_id))&&(!d.version_id||identifier(d.version_id))).map(d=>({dependency_type:d.dependency_type,project_id:d.project_id||null,version_id:d.version_id||null})).slice(0,200):[]};
 }return result;
}

export class LibraryModIndex170 {
 constructor(stateRoot,{lookup=lookupModHashes170}={}){this.root=join(stateRoot,'mod-index170');this.lookup=lookup;this.running=new Map();this.states=new Map();this.hashCache=new Map();this.networkQueue=Promise.resolve();}
 state(dir){return this.states.get(directoryKey170(dir))||{state:'idle',completed:0,total:0,rows:[]};}
 cancel(dir){this.running.get(directoryKey170(dir))?.controller.abort();}
 async refreshLocal(dir){const running=this.running.get(directoryKey170(dir));if(running){running.controller.abort();await running.promise;}return this.start(dir,{remote:false});}
 async read(dir){return await json170(join(this.root,directoryKey170(dir)+'.json'),{optional:true,max:16000000})||{rows:[],state:'idle'};}
 start(dir,{remote=true}={}){const key=directoryKey170(dir);if(this.running.has(key))return this.running.get(key).promise;const controller=new AbortController(),record={controller};record.promise=this.scan(dir,{remote,signal:controller.signal}).finally(()=>{if(this.running.get(key)===record)this.running.delete(key);});this.running.set(key,record);return record.promise;}
 async scan(dir,{remote,signal}){
  const key=directoryKey170(dir),state={state:'scanning',completed:0,total:0,rows:[]};this.states.set(key,state);
  try{await ordinary170(dir);await ordinary170(join(dir,'mods'),{missing:true});await ordinary170(this.root,{missing:true});await mkdir(this.root,{recursive:true});const prior=await this.read(dir);
   let entries;try{entries=await readdir(join(dir,'mods'),{withFileTypes:true});}catch(e){if(e.code!=='ENOENT')throw e;entries=[];}
   entries=entries.filter(e=>/\.(jar|litemod)(\.disabled)?$/i.test(e.name));if(entries.length>20000)throw Error('Too many mod files');state.total=entries.length;
   for(const entry of entries){signal.throwIfAborted();const row={filename:entry.name,relative:'mods/'+entry.name.replace(/\.disabled$/i,''),enabled:! /\.disabled$/i.test(entry.name),type:'mod',title:entry.name,match:'pending',metadataState:'unknown',modIds:[]};state.rows.push(row);
    try{const path=join(dir,'mods',entry.name);await ordinary170(path);const before=await lstat(path);if(!before.isFile()||before.size>150000000||!before.size)throw Error('Not a supported regular mod archive (maximum 150 MB)');const bytes=await readBoundedFile(path,Math.min(150000000,before.size),{binary:true});const after=await lstat(path);if(bytes.length!==before.size||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ino!==after.ino)throw Error('File changed while scanning');row.hash=hash(bytes);row.size=bytes.length;row.algorithm='sha1';
     const cached=prior.rows?.find(r=>r.hash===row.hash&&r.size===row.size);if(cached?.metadataState==='parsed'){Object.assign(row,{local:cached.local,modIds:cached.modIds,metadataState:'parsed',title:cached.local?.title||row.title});}else try{const meta=readModMetadata(bytes);Object.assign(row,{local:meta,modIds:meta.modIds,metadataState:meta.modIds.length?'parsed':'unknown',title:meta.title||row.title});}catch(e){row.metadataState='invalid';row.metadataError=String(e.message).slice(0,300);}
     if(cached&&['matched','unmatched'].includes(cached.match)&&Date.now()-(cached.matchedAt||0)<86400000)Object.assign(row,{match:cached.match,remote:cached.remote,matchedAt:cached.matchedAt});else row.match=remote?'pending':'offline';
    }catch(e){row.error=String(e.message).slice(0,300);row.match='unavailable';row.metadataState='invalid';}state.completed++;await delay(0,undefined,{signal});
   }
   const pending=[...new Set(state.rows.filter(r=>r.match==='pending').map(r=>r.hash))];state.state='matching';
   for(let i=0;i<pending.length;i+=100){signal.throwIfAborted();const batch=pending.slice(i,i+100);let matches;
    const query=this.networkQueue.catch(()=>{}).then(async()=>{signal.throwIfAborted();const cached={},needed=[];for(const h of batch){const c=this.hashCache.get(h);if(c&&Date.now()-c.at<86400000)cached[h]=c.value;else needed.push(h);}if(!needed.length)return cached;await delay(500,undefined,{signal});const received=await this.lookup(needed,{signal});for(const h of needed){const value=received[h];if(value&&['matched','unmatched'].includes(value.match)){if(this.hashCache.size>=50000)this.hashCache.delete(this.hashCache.keys().next().value);this.hashCache.set(h,{at:Date.now(),value});}}return {...cached,...received};});this.networkQueue=query.catch(()=>{});
    try{matches=await query;signal.throwIfAborted();for(const row of state.rows.filter(r=>batch.includes(r.hash))){const found=matches[row.hash];if(!found||!['matched','unmatched'].includes(found.match)||found.match==='matched'&&found.size!==row.size)throw Error('Modrinth file size mismatch');Object.assign(row,{match:found.match,remote:found.match==='matched'?found:undefined,matchedAt:Date.now()});}}
    catch(e){signal.throwIfAborted();for(const row of state.rows.filter(r=>batch.includes(r.hash))){row.match='failed';row.matchError=String(e.message).slice(0,300);delete row.remote;}}
   }
   for(const row of state.rows){row.duplicateHashes=state.rows.filter(r=>r!==row&&r.hash&&r.hash===row.hash).map(r=>r.filename);row.duplicateModIds=state.rows.filter(r=>r!==row&&r.modIds.some(id=>row.modIds.includes(id))).map(r=>r.filename);}
   signal.throwIfAborted();state.state='complete';state.scannedAt=new Date().toISOString();await atomicJson(join(this.root,key+'.json'),state);return structuredClone(state);
  }catch(e){state.state=signal.aborted?'cancelled':'failed';state.error=String(e.message).slice(0,300);return structuredClone(state);}
 }
}
