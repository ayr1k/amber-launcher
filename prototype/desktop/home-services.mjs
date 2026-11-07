// SPDX-License-Identifier: MPL-2.0
import {readFile,writeFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';

export class PlayJournal {
 constructor(root,now=()=>Date.now()){this.root=root;this.now=now;this.queue=Promise.resolve();this.suspended=false;}
 async file(){const p=join(this.root,'play-journal.json');await ensureParents(this.root,p);return p;}
 async get(){try{const d=JSON.parse(await readFile(await this.file(),'utf8'));if(d.schema!==1||!Array.isArray(d.sessions)||d.sessions.length>100000||typeof d.enabled!=='boolean'||d.sessions.some(s=>!s||typeof s.id!=='string'||typeof s.instanceId!=='string'||!Number.isFinite(Date.parse(s.startedAt))||!Array.isArray(s.segments)||s.segments.length>100000||s.segments.some(x=>!Array.isArray(x)||x.length!==2||!x.every(Number.isFinite)||x[1]<x[0]||x[1]-x[0]>366*86400000||Math.abs(x[0])>8.64e15||Math.abs(x[1])>8.64e15)))throw Error('Invalid play journal / 游玩记录无法读取');return d;}catch(e){if(e.code!=='ENOENT')throw e;return {schema:1,enabled:true,migrated:false,sessions:[]};}}
 change(fn){const task=this.queue.then(async()=>{const d=await this.get();await fn(d);await atomicJson(await this.file(),d);return d;});this.queue=task.catch(()=>{});return task;}
 migrate(history){return this.change(d=>{if(d.migrated)return;d.migrated=true;for(const h of history)if(!d.sessions.some(s=>s.id===h.runId))d.sessions.push({id:h.runId,instanceId:h.instanceId,startedAt:h.startedAt,state:'historical',segments:[],uncertain:true});});}
 enable(value){if(typeof value!=='boolean')throw Error('Invalid recording preference');return this.change(d=>{d.enabled=value;for(const s of d.sessions)if(s.state==='running'){s.state='interrupted';s.uncertain=true;delete s.lastSeen;}});}
 clear(){const task=this.queue.then(async()=>{let enabled=false;try{enabled=(await this.get()).enabled;}catch{}const d={schema:1,enabled,migrated:true,sessions:[]};await atomicJson(await this.file(),d);return d;});this.queue=task.catch(()=>{});return task;}
 // Only intervals observed at both ends are counted. Sleep, closed-launcher and clock gaps remain unknown.
 observe(processes){return this.change(d=>{if(!d.enabled)return;const now=this.now(),seen=new Set();
  for(const p of processes){if(!p.instanceId||!p.id||!Number.isFinite(Date.parse(p.startedAt)))continue;const key=p.instanceId+':'+p.startedAt;seen.add(key);
   let s=d.sessions.find(s=>s.instanceId===p.instanceId&&s.startedAt===p.startedAt);
   if(!s){if(p.state!=='running')continue;s={id:p.id,accountId:typeof p.accountId==='string'?p.accountId:null,instanceId:p.instanceId,startedAt:p.startedAt,state:'running',segments:[],uncertain:now-Date.parse(p.startedAt)>90000};d.sessions.push(s);}
   if(s.state==='historical')continue;
   if(s.lastSeen&&s.state==='running'){const end=p.finishedAt?Math.min(now,Date.parse(p.finishedAt)):now,elapsed=end-s.lastSeen;
    if(!this.suspended&&elapsed>=0&&elapsed<=90000){const last=s.segments.at(-1),start=Math.max(s.lastSeen,last?.[1]||0);if(end>start){if(last&&last[1]===start)last[1]=end;else s.segments.push([start,end]);}}else s.uncertain=true;
   }
   s.state=p.state;if(p.state==='running')s.lastSeen=now;else {s.finishedAt=p.finishedAt||null;delete s.lastSeen;}
  }
  for(const s of d.sessions)if(s.state==='running'&&!seen.has(s.instanceId+':'+s.startedAt)){s.state='interrupted';s.uncertain=true;delete s.lastSeen;}
 });}
 suspend(){this.suspended=true;return this.change(d=>{for(const s of d.sessions)if(s.state==='running'){delete s.lastSeen;s.uncertain=true;}});}
 recover(){return this.change(d=>{for(const s of d.sessions)if(s.state==='running'){delete s.lastSeen;s.uncertain=true;}});}
 resume(){this.suspended=false;}
}

const feedOrigin='https://launchercontent.mojang.com';
export function officialLink(value){try{const u=new URL(value);if(u.protocol!=='https:'||!['minecraft.net','www.minecraft.net','feedback.minecraft.net'].includes(u.hostname)||u.username||u.password||u.port)return null;u.search='';u.hash='';return u.href;}catch{return null;}}
export function normalizeNews(doc,kind){if(!Array.isArray(doc?.entries))throw Error('News source changed / 新闻来源格式已变化');return doc.entries.slice(0,120).flatMap(e=>{
 const url=officialLink(e.readMoreLink);const patch=kind==='java';
 if(typeof e.title!=='string'||!Number.isFinite(Date.parse(e.date))||(!patch&&!url))return [];
 const contentPath=patch&&/^javaPatchNotes\/[a-zA-Z0-9-]+\.json$/.test(e.contentPath)?e.contentPath:null;
 if(patch&&!contentPath)return [];
 const image=e.newsPageImage?.url||e.image?.url;return [{id:createHash('sha256').update(kind+':'+(e.id||e.title)).digest('hex').slice(0,24),title:e.title.slice(0,240),date:e.date,kind:patch?(e.type==='release'?'release':'snapshot'):'news',language:'en',url,contentPath,image:typeof image==='string'&&/^\/v2\/images\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp)$/i.test(image)?feedOrigin+image:null}];});}
async function limitedJSON(fetcher,url,signal){const r=await fetcher(url,{signal:signal||AbortSignal.timeout(12000),redirect:'error'});if(!r.ok)throw Error('News unavailable / 新闻暂时无法获取');const parts=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>4*1024*1024)throw Error('News response too large');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
export class NewsFeed {
 constructor(root,fetcher=fetch){this.root=root;this.fetcher=fetcher;this.pending=null;this.controller=null;this.details=new Map();}
 async file(){const p=join(this.root,'news-cache.json');await ensureParents(this.root,p);return p;}
 async get(){try{const d=JSON.parse(await readFile(await this.file(),'utf8'));if(!Array.isArray(d.items))throw new SyntaxError('Invalid news cache');d.items=d.items.slice(0,180).filter(e=>e&&typeof e.id==='string'&&/^[a-f0-9]{24}$/.test(e.id)&&typeof e.title==='string'&&e.title.length<=240&&Number.isFinite(Date.parse(e.date))&&['news','release','snapshot'].includes(e.kind)&&(e.kind==='news'?!!officialLink(e.url):/^javaPatchNotes\/[a-zA-Z0-9-]+\.json$/.test(e.contentPath||'')));return d;}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;return {items:[],checkedAt:null,error:e instanceof SyntaxError?'News cache could not be read; refresh to recover. / 新闻缓存无法读取，请刷新恢复。':null};}}
 cancel(){this.controller?.abort();}
 detail(id){if(this.details.has(id))return this.details.get(id);const task=this.loadDetail(id).finally(()=>this.details.delete(id));this.details.set(id,task);return task;}
 async loadDetail(id){
  const entry=(await this.get()).items.find(e=>e.id===id);if(!entry||!/^([a-f0-9]{24})$/.test(entry.id)||!/^javaPatchNotes\/[a-zA-Z0-9-]+\.json$/.test(entry.contentPath||''))throw Error('News item unavailable / 新闻条目已失效');
  const path=join(this.root,'news-details',entry.id+'.json');await ensureParents(this.root,path);
  try{const cached=JSON.parse(await readFile(path,'utf8'));if(typeof cached.body==='string'&&cached.body.length<=200000)return cached;}catch(e){if(e.code!=='ENOENT')throw e;}
  const doc=await limitedJSON(this.fetcher,feedOrigin+'/v2/'+entry.contentPath);if(typeof doc.body!=='string'||doc.body.length>200000)throw Error('News detail unavailable / 新闻正文暂不可用');
  // Text only; remote markup, links, images and scripts are never rendered as HTML.
  const body=doc.body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(?:br|p|h[1-6]|li)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,s=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[s]);
  const result={title:entry.title,date:entry.date,body,source:feedOrigin+'/v2/'+entry.contentPath};await atomicJson(path,result);return result;
 }
 async refresh(){if(this.pending)return this.pending;this.controller=new AbortController();const controller=this.controller;
  this.pending=(async()=>{const old=await this.get(),items=[],errors=[];for(const [path,kind] of [['news.json','news'],['javaPatchNotes.json','java']]){try{items.push(...normalizeNews(await limitedJSON(this.fetcher,feedOrigin+'/v2/'+path,AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])),kind));}catch(e){errors.push(e.message);items.push(...old.items.filter(x=>kind==='news'?x.kind==='news':x.kind!=='news'));}}
   if(controller.signal.aborted)return old;
   const data={items:[...new Map(items.map(i=>[i.id,i])).values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,180),checkedAt:new Date().toISOString(),error:errors.length?'Some news sources are unavailable; cached items are retained. / 部分新闻来源暂不可用，已保留缓存。':null};await atomicJson(await this.file(),data);return data;
  })().finally(()=>{this.pending=null;this.controller=null;this.details=new Map();});return this.pending;
 }
 async link(id){const entry=(await this.get()).items.find(e=>e.id===id);if(!entry)throw Error('News item unavailable / 新闻条目已失效');if(entry.url){const url=officialLink(entry.url);if(url)return url;}
  if(!/^javaPatchNotes\/[a-zA-Z0-9-]+\.json$/.test(entry.contentPath||''))throw Error('Invalid news link');
  const doc=await limitedJSON(this.fetcher,feedOrigin+'/v2/'+entry.contentPath);const html=String(doc.body||'');
  const urls=[doc.readMoreLink,doc.url,...Array.from(html.matchAll(/href=["'](https:\/\/[^"']+)["']/g),m=>m[1])];
  return urls.map(officialLink).find(u=>u&&(/\/article\/|\/articles\//.test(u)))||'https://www.minecraft.net/en-us/article';
 }
}

export class HomePreferences {
 constructor(root){this.root=root;this.queue=Promise.resolve();}
 async file(){const p=join(this.root,'home-preferences.json');await ensureParents(this.root,p);return p;}
 async get(){try{const d={...this.defaults(),...JSON.parse(await readFile(await this.file(),'utf8'))};if(typeof d.newsAuto!=='boolean'||typeof d.calendarCompact!=='boolean'||!['all','release','snapshot','news'].includes(d.newsFilter)||!Array.isArray(d.toolFavorites)||d.toolFavorites.some(x=>!['java','logs','screenshots','editor','gradient','seedmap','enchant'].includes(x)))throw Error('Invalid home preferences / 首页偏好无法读取');return d;}catch(e){if(e.code!=='ENOENT')throw e;return this.defaults();}}
 defaults(){return {newsAuto:false,newsFilter:'all',calendarCompact:false,toolFavorites:['java','logs','screenshots','editor','gradient']};}
 save(input){const task=this.queue.then(async()=>{const d={...await this.get(),...input};if(typeof d.newsAuto!=='boolean'||typeof d.calendarCompact!=='boolean'||!['all','release','snapshot','news'].includes(d.newsFilter)||!Array.isArray(d.toolFavorites)||d.toolFavorites.some(x=>!['java','logs','screenshots','editor','gradient','seedmap','enchant'].includes(x)))throw Error('Invalid home preferences');const clean=Object.fromEntries(Object.keys(this.defaults()).map(k=>[k,d[k]]));await atomicJson(await this.file(),clean);return clean;});this.queue=task.catch(()=>{});return task;}
}

export class Screenshots {
 constructor(core){this.core=core;this.tokens=new Map();this.identities=new Map();this.deleting=new Set();}
 async list(id){const dir=join(await this.core.instancePath(id),'screenshots');await ensureParents(this.core.root,dir);let names;try{if((await lstat(dir)).isSymbolicLink())throw Error('Screenshot folder cannot be a link');names=await readdir(dir);}catch(e){if(e.code==='ENOENT')return [];throw e;}const items=[];for(const name of names.filter(n=>/\.png$/i.test(n)).slice(0,2000)){const path=join(dir,name);await ensureParents(this.core.root,path);const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>20*1024*1024)continue;const token=createHash('sha256').update(path).digest('hex');this.tokens.set(token,path);this.identities.set(token,{ino:s.ino,size:s.size,mtimeMs:s.mtimeMs});items.push({token,name,date:new Date(s.mtimeMs).toISOString(),bytes:s.size});}return items.sort((a,b)=>b.date.localeCompare(a.date));}
 async trash(token,moveToTrash){
  if(this.deleting.has(token))throw Error('Screenshot deletion is in progress / 正在删除截图');
  this.deleting.add(token);
  try{
   const {path}=await this.read(token),expected=this.identities.get(token),current=await lstat(path);
   if(!expected||current.ino!==expected.ino||current.size!==expected.size||current.mtimeMs!==expected.mtimeMs)throw Error('Screenshot changed; refresh before deleting / 截图已变化，请刷新后再删除');
   // Never fall back to unlink: failure must leave the original in place.
   await moveToTrash(path);this.tokens.delete(token);this.identities.delete(token);return true;
  }finally{this.deleting.delete(token);}
 }
 async read(token){const path=this.tokens.get(token);if(!path)throw Error('Choose a screenshot again / 请重新选择截图');await ensureParents(this.core.root,path);const s=await lstat(path);if(!s.isFile()||s.isSymbolicLink()||s.size>20*1024*1024)throw Error('Invalid screenshot');const bytes=await readFile(path);if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.readUInt32BE(16)*bytes.readUInt32BE(20)>40_000_000)throw Error('Invalid screenshot image');return {path,bytes};}
}
