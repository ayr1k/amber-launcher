// SPDX-License-Identifier: MPL-2.0
import {AsyncLocalStorage} from 'node:async_hooks';
import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {Readable} from 'node:stream';
import {isIP} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {VERSION} from './product.mjs';
import {REPOSITORY_URL,REPOSITORY_NAME} from './edition.mjs';

export const networkDefaults={mode:'auto',fallback:true,adaptive:true};
export function validateNetwork(v={}){const n={...networkDefaults,...v};if(!['auto','official','mainland'].includes(n.mode)||typeof n.fallback!=='boolean'||typeof n.adaptive!=='boolean')throw Error('Invalid download settings / 下载设置无效');return {mode:n.mode,fallback:n.fallback,adaptive:n.adaptive};}
export function mirrorURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.port||u.username||u.password)return null;const paths={
 'piston-meta.mojang.com':'','launchermeta.mojang.com':'','launcher.mojang.com':'','piston-data.mojang.com':'',
 'resources.download.minecraft.net':'/assets','libraries.minecraft.net':'/maven','maven.minecraftforge.net':'/maven','maven.fabricmc.net':'/maven'};
 return Object.hasOwn(paths,u.hostname)?'https://bmclapi2.bangbang93.com'+paths[u.hostname]+u.pathname+u.search:null;
}
export function publicAddress(ip){if(isIP(ip)===4){const [a,b]=ip.split('.').map(Number);return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19));}return isIP(ip)===6&&/^[23][0-9a-f]{3}:/i.test(ip)&&!/^2001:(?:0:|db8:)/i.test(ip);}
export function mirrorTarget(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||isIP(u.hostname.replace(/^\[|\]$/g,''))||!u.hostname.includes('.')||u.hostname.endsWith('.local'))throw Error('Unsafe mirror redirect / 镜像跳转地址不安全');return u;}
// BMCLAPI selects community CDN nodes. Resolve and pin a public address for each
// hop; never forward credentials, cookies or arbitrary headers to these nodes.
export async function pinnedFetch(value,{signal,headers={},method='GET',resolver=lookup}={}){
 const dnsSignal=AbortSignal.any([AbortSignal.timeout(5000),...(signal?[signal]:[])]);
 const u=mirrorTarget(value);dnsSignal.throwIfAborted();
 const addresses=await new Promise((resolve,reject)=>{const aborted=()=>reject(dnsSignal.reason);dnsSignal.addEventListener('abort',aborted,{once:true});Promise.resolve().then(()=>resolver(u.hostname,{all:true})).then(resolve,reject).finally(()=>dnsSignal.removeEventListener('abort',aborted));});signal?.throwIfAborted();
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw Error('Mirror resolved to a private address / 镜像解析到了非公网地址');
 const address=addresses[0],allowed={};for(const [k,v] of new Headers(headers))if(['user-agent','range','if-range','accept','accept-encoding'].includes(k))allowed[k]=v;
 return new Promise((resolve,reject)=>{const req=request(u,{method,headers:allowed,signal,lookup:(_host,options,cb)=>cb(null,...(options?.all?[[address]]:[address.address,address.family]))},res=>{
  res.on('error',()=>{});const h=new Headers();for(const [k,v]of Object.entries(res.headers))if(v!==undefined)h.set(k,Array.isArray(v)?v.join(', '):v);
  resolve(new Response(method==='HEAD'||[204,304].includes(res.statusCode)?null:Readable.toWeb(res),{status:res.statusCode,headers:h}));
 });req.setTimeout(15000,()=>req.destroy(Error('Connection timed out / 连接超时')));req.on('error',reject);req.end();});
}
export function retryAfter(value,now=Date.now()){if(!value)return 0;const seconds=Number(value);return Math.max(0,Number.isFinite(seconds)?seconds*1000:Date.parse(value)-now)||0;}
export function networkReason(e){if(e?.status===429)return 'rate-limited';if([401,403].includes(e?.status))return 'restricted';if(e?.status===404)return 'missing';if(e?.code==='CHECKSUM')return 'checksum';if(e?.code==='IDLE'||/timeout|timed out/i.test(e?.message||''))return 'timeout';return 'connection';}

export class DownloadNetwork{
 constructor(root,{fetcher=fetch,mirrorFetch=pinnedFetch}={}){this.root=root;this.raw=fetcher;this.mirrorFetch=mirrorFetch;this.settings=validateNetwork();this.context=new AsyncLocalStorage();this.jobs=new Map();this.cache=null;this.probing=null;this.cooldowns=new Map();this.request=this.request.bind(this);this.request.amberNetwork=this;}
 configure(v){this.settings=validateNetwork(v);}
 async init(){try{const c=JSON.parse(await readFile(join(this.root,'network-choice.json'),'utf8'));if(['official','mirror'].includes(c.source)&&c.expires>Date.now()&&c.expires<Date.now()+900000)this.cache=c;}catch{}return this;}
 async probe(url,fetcher=this.raw){const started=Date.now();try{const opts={method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(5000),headers:{'User-Agent':`${REPOSITORY_NAME}/${VERSION} (${REPOSITORY_URL})`}};let r=await fetcher(url,opts);await r.body?.cancel();if([404,405].includes(r.status)){r=await fetcher(url,{...opts,method:'GET'});await r.body?.cancel();}return {ok:r.status>=200&&r.status<400,ms:Date.now()-started,status:r.status};}catch(e){return {ok:false,ms:Date.now()-started,reason:networkReason(e)};}}
 async choose(){if(this.settings.mode!=='auto')return this.settings.mode==='mainland'?'mirror':'official';if(this.cache?.expires>Date.now())return this.cache.source;
 if(!this.probing)this.probing=(async()=>{const [a,b]=await Promise.all([this.probe('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'),this.probe('https://bmclapi2.bangbang93.com/mc/game/version_manifest_v2.json',this.mirrorFetch)]);const source=b.ok&&(!a.ok||b.ms+100<a.ms)?'mirror':'official';this.cache={source,expires:Date.now()+600000};await writeFile(join(this.root,'network-choice.json'),JSON.stringify(this.cache)).catch(()=>{});return source;})().finally(()=>{this.probing=null;});return this.probing;}
 run(job,fn){const scope={job,paused:false,requests:new Set(),files:new Map(),failures:0,sourceOverrides:new Map(),sources:new Map()};this.jobs.set(job.id,scope);return this.context.run(scope,()=>Promise.resolve().then(fn)).finally(()=>{this.jobs.delete(job.id);});}
 pause(id,value){const s=this.jobs.get(id);if(typeof value!=='boolean'||!s||!['install','java','content','modpack','content-update','server-install','server-content'].includes(s.job.kind)||(!s.job.downloadActive&&!s.paused))throw Error('This task cannot be paused now / 当前阶段暂不可暂停');s.paused=value;s.job.networkPaused=value;if(value)for(const c of s.requests)c.abort(Error('Download paused / 下载已暂停'));return true;}
 async gate(signal){const s=this.context.getStore();while(s?.paused){signal?.throwIfAborted();await delay(100,undefined,{signal});}}
 isPaused(){return !!this.context.getStore()?.paused;}
 track(controller){const s=this.context.getStore();if(s){s.requests.add(controller);s.job.downloadActive=(s.job.downloadActive||0)+1;}return ()=>{if(s){s.requests.delete(controller);s.job.downloadActive=Math.max(0,s.job.downloadActive-1);}};}
 rejectFile(url){const s=this.context.getStore();if(s&&this.settings.fallback&&mirrorURL(url)){const previous=s.sources.get(url);if(previous)s.sourceOverrides.set(url,previous==='mirror'?'official':'mirror');}}
 event(file,data){const s=this.context.getStore();if(!s)return;const key=file.path||file.url,exists=s.files.has(key);const old=s.files.get(key)||{bytes:0,size:file.size||0},next={...old,...data};s.files.set(key,next);if(data.error){s.failures++;s.successes=0;if(data.error==='rate-limited'||s.failures>=2)s.recoveryCap=2;}if(data.phase==='complete'){s.successes=(s.successes||0)+1;if(s.successes>=8){s.failures=0;s.successes=0;s.recoveryCap=Math.min(128,(s.recoveryCap||128)*2);}}
 s.bytes=(s.bytes||0)+next.bytes-old.bytes;s.total=(s.total||0)+(exists?0:old.size);const now=Date.now();s.sample??={at:now,bytes:s.bytes};if(data.phase==='downloading'&&now-s.sample.at>=1000){s.speed=Math.max(0,(s.bytes-s.sample.bytes)*1000/(now-s.sample.at));s.sample={at:now,bytes:s.bytes};}if(data.resumed||data.bytes<old.bytes)s.sample={at:now,bytes:s.bytes};
 s.job.network={...s.job.network,source:data.source||s.job.network?.source,phase:data.phase||s.job.network?.phase,reason:data.error||null,file:file.label||file.title||s.job.network?.file||'',bytes:s.bytes,totalBytes:s.total,resumed:s.job.network?.resumed||!!data.resumed,speed:s.speed||0,updatedAt:now,adaptive:this.settings.adaptive&&(s.recoveryCap||128)<128};
 }
 concurrency(max,scope=this.context.getStore()){return this.settings.adaptive?Math.max(1,Math.min(scope?.recoveryCap||128,max)):max;}
 async request(value,options={}){const mirror=mirrorURL(value);if(!mirror){this.event({url:value},{source:new URL(value).hostname,phase:'connecting'});return this.raw(value,options);}await this.gate(options.signal);const first=this.context.getStore()?.sourceOverrides.get(value)||await this.choose(),sources=this.settings.fallback?[first,first==='mirror'?'official':'mirror']:[first];let last;
 for(const source of sources){await this.gate(options.signal);const s=this.context.getStore(),controller=new AbortController();s?.requests.add(controller);const timer=setTimeout(()=>controller.abort(Error('Connection timed out / 连接超时')),30000);const signal=AbortSignal.any([controller.signal,...(options.signal?[options.signal]:[])]);const target=source==='mirror'?mirror:value;
 try{let next=target;const host=new URL(next).hostname,until=this.cooldowns.get(host)||0;if(until>Date.now()){this.event({url:value},{phase:'waiting',source});await delay(until-Date.now(),undefined,{signal});}
  let r;for(let hop=0;hop<6;hop++){r=await (source==='mirror'?this.mirrorFetch:this.raw)(next,{...options,signal,redirect:'manual'});if(source!=='mirror'||![301,302,303,307,308].includes(r.status))break;const location=r.headers.get('location');await r.body?.cancel();if(!location||hop===5)throw Error('Mirror redirect limit / 镜像跳转异常');next=mirrorTarget(new URL(location,next).href).href;}
  if(!r.ok&&!(source==='official'&&[301,302,303,307,308].includes(r.status))){const error=Object.assign(Error('Download request failed ('+r.status+')'),{status:r.status,retryAfterMs:retryAfter(r.headers.get('retry-after'))});if(r.status===429)this.cooldowns.set(host,Date.now()+Math.min(error.retryAfterMs||1000,300000));await r.body?.cancel();throw error;}
  s?.sources.set(value,source);this.event({url:value},{source,phase:'downloading'});return r;
 }catch(e){last=e;if(options.signal?.aborted||s?.paused)throw e;if(source===first&&this.settings.fallback)this.cache=null;}finally{clearTimeout(timer);s?.requests.delete(controller);}
 }throw last;}
 async diagnose(){const rows=await Promise.all([
 ['Minecraft','https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'],['BMCLAPI','https://bmclapi2.bangbang93.com/mc/game/version_manifest_v2.json'],['Modrinth','https://api.modrinth.com/v2/tag/category'],['Fabric','https://meta.fabricmc.net/v2/versions/game']
 ].map(async([name,url])=>({name,...await this.probe(url,name==='BMCLAPI'?this.mirrorFetch:this.raw)})));this.cache=null;return {checkedAt:new Date().toISOString(),rows};}
}
