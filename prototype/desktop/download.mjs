import {curseHeaders141} from './curseforge-key141.mjs';
import {withFileLock,withTransferBudget,transferStatus144} from './task-queue132.mjs';
import {segmentRanges,segmentedDownload,clearSegments,segmentPaths} from './download-segments148.mjs';
// SPDX-License-Identifier: MPL-2.0
import {VERSION} from './product.mjs';
import {REPOSITORY_NAME,REPOSITORY_URL} from './edition.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, statfs, lstat, copyFile } from 'node:fs/promises';
import { dirname, resolve, sep, relative } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {retryAfter,networkReason} from './network.mjs';
import {SourceHealth,contentFailure,filePlatform,fileSource,readContentJson} from './content-sources176.mjs';
import {authorizedCurseForgeURL,curseForgeFileURL} from './curseforge-delivery176.mjs';

const hosts=new Set(['cdn.mysql.com','nya.globalslb.net','meta.quiltmc.org','maven.quiltmc.org','api.curseforge.com','edge.forgecdn.net','mediafilez.forgecdn.net','fill.papermc.io','fill-data.papermc.io','api.github.com','repo.maven.apache.org','repo.mumfrey.com','api.modrinth.com','cdn.modrinth.com','maven.minecraftforge.net','maven.neoforged.net','files.minecraftforge.net','dl.liteloader.com','repo.spongepowered.org','meta.fabricmc.net','maven.fabricmc.net','authlib-injector.yushi.moe','piston-meta.mojang.com','piston-data.mojang.com','launcher.mojang.com','launchermeta.mojang.com','libraries.minecraft.net','resources.download.minecraft.net','api.adoptium.net','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
export function safeURL(value){const u=new URL(value);if(u.protocol!=='https:'||!(hosts.has(u.hostname)||u.hostname==='amber.ayuki-ayr1k.com'&&!u.search&&!u.hash&&/^\/mirror\/v1\/(?:amber|ambere)\/\d+\.\d+\.\d+\/[A-Za-z0-9.-]+$/.test(u.pathname))||u.port||u.username||u.password)throw new Error('下载地址不在官方来源列表中。');return u.href;}
export function safePath(root,name){if(typeof name!=='string'||!name||name.includes('\\')||name.includes(':')||name.startsWith('/')||name.split('/').some(s=>s==='..'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s)||/[. ]$/.test(s)))throw new Error('不安全的文件路径。');const p=resolve(root,name);if(!p.startsWith(resolve(root)+sep))throw new Error('文件路径越界。');return p;}
export async function ensureParents(root,path){const rel=relative(resolve(root),resolve(path));if(rel.startsWith('..')||rel.includes(':'))throw new Error('文件路径越界。');let p=resolve(root);await mkdir(p,{recursive:true});for(const part of [''].concat(rel.split(sep).slice(0,-1))){if(part)p=resolve(p,part);await mkdir(p,{recursive:true});if((await lstat(p)).isSymbolicLink())throw new Error('安装目录不可使用链接。');}try{if((await lstat(path)).isSymbolicLink())throw new Error('目标文件不可使用链接。');}catch(e){if(e.code!=='ENOENT')throw e;}}
export async function digest(path,algorithm='sha1'){const h=createHash(algorithm);for await(const bytes of createReadStream(path))h.update(bytes);return h.digest('hex');}
function fileChecksum(file){
 const checksum=createHash(file.algorithm||'sha1');
 const platformChecksum=file.curseForgeSha1?createHash('sha1'):null;
 return {update(bytes){checksum.update(bytes);platformChecksum?.update(bytes);},matches(){
  return checksum.digest('hex')===file.hash&&(!platformChecksum||platformChecksum.digest('hex')===file.curseForgeSha1);
 }};
}
export async function verified(file){try{
 const s=await lstat(file.path);
 if(!s.isFile()||s.isSymbolicLink()||file.size&&s.size!==file.size)return false;
 const checksum=fileChecksum(file);
 for await(const bytes of createReadStream(file.path))checksum.update(bytes);
 return checksum.matches();
}catch{return false;}}
const hasCurseForgeIdentity=file=>String(file.versionId||'').startsWith('cf-');
const transferHeaders=new Set(['accept','accept-encoding','range','if-range']);
const responseOrigins=new WeakMap(), contentHealth=new WeakMap();
export async function officialFetch(url,{signal,fetcher=fetch,headers={},sameOrigin=false,publicFile=false,onHop,authorizedEdgeURL}={}){
 let next=safeURL(url);
 const origin=new URL(next).origin;
 const initialPlatform=publicFile&&filePlatform(next);
 const authorizedCurseForge=initialPlatform==='curseforge'&&next===authorizedEdgeURL&&Boolean(curseForgeFileURL(next));
 for(let hop=0;hop<6;hop++){
  const u=new URL(next), same=u.origin===origin;
  if(filePlatform(next)==='curseforge'&&(!authorizedCurseForge||!curseForgeFileURL(next))){
   throw Object.assign(Error('CurseForge file address lacks an official authorization / CurseForge 下载地址缺少官方授权'),{code:'CURSEFORGE_DISTRIBUTION',status:403});
  }
  const outbound=new Headers({'User-Agent':`${REPOSITORY_NAME}/${VERSION} (${REPOSITORY_URL})`});
  for(const [key,value] of new Headers(headers))if(transferHeaders.has(key)||same&&!publicFile&&key!=='x-api-key')outbound.set(key,value);
  const authorizedEdgeFile=hop===0&&authorizedCurseForge;
  if(same&&!publicFile||authorizedEdgeFile){
   for(const [key,value] of Object.entries(await curseHeaders141(next,{authorizedEdgeFile})))outbound.set(key,value);
  }
  // Fetch doubles and the network router receive a plain header object.
  const values=Object.fromEntries(outbound);
  if(values.range){values.Range=values.range;delete values.range;}
  if(values['if-range']){values['If-Range']=values['if-range'];delete values['if-range'];}
  onHop?.(next);
  const r=await fetcher(next,{signal,redirect:'manual',credentials:'omit',headers:values});
  if([301,302,303,307,308].includes(r.status)){
   const location=r.headers.get('location');
   await r.body?.cancel();
   if(!location)throw new Error('Download redirect has no address / 下载重定向缺少地址');
   next=safeURL(new URL(location,next).href);
   if(sameOrigin&&new URL(next).origin!==origin||publicFile&&(new URL(next).hostname.startsWith('api.')||initialPlatform&&filePlatform(next)!==initialPlatform)){
    throw Error('Unexpected download redirect / 下载重定向超出来源范围');
   }
   continue;
  }
  if(!r.ok){
   const error=Object.assign(Error(`HTTP ${r.status} · ${u.hostname}`),{status:r.status,host:u.hostname,retryAfterMs:retryAfter(r.headers.get('retry-after'))});
   await r.body?.cancel();
   throw error;
  }
  responseOrigins.set(r,u.hostname);
  return r;
 }
 throw Error('Too many redirects / 下载重定向次数过多');
}

async function refreshModrinthAddress(file, fetcher, signal){
 const identity=file.versionId;
 if(typeof identity==='string'&&/^[A-Za-z0-9]{1,100}$/.test(identity)){
  const r=await officialFetch('https://api.modrinth.com/v2/version/'+identity,{fetcher,signal,sameOrigin:true});
  const version=await readContentJson(r);
  if(version.id!==identity||!Array.isArray(version.files))return null;
  const match=version.files.find(f=>f.hashes?.[file.algorithm||'sha1']===file.hash&&f.size===file.size);
  return match&&filePlatform(safeURL(match.url))==='modrinth'?safeURL(match.url):null;
 }
 return null;
}
export function download(file,options={}){return withFileLock(file.path,()=>downloadUnlocked(file,options),options.signal);}
async function downloadUnlocked(file,{root,signal,onBytes=()=>{},fetcher=fetch,threads=128,transferGroup,segments=true}={}){
  if(!/^[0-9a-f]{40}$|^[0-9a-f]{64}$|^[0-9a-f]{128}$/.test(file.hash))throw new Error('下载缺少完整性校验值。');
  signal?.throwIfAborted();await ensureParents(root,file.path);
  const network=fetcher.amberNetwork,scope=network?.context.getStore(),group=scope||transferGroup||signal||Symbol('transfer');
  // Stable, hash-specific partials survive cancellation and process restart.
  const temporary=file.path+'.amber-'+(file.hash.length>64?file.hash.slice(0,40):file.hash)+'.part';
  async function complete(result,event,publish=false){
    signal?.throwIfAborted();await network?.gate(signal);signal?.throwIfAborted();
    if(publish)await rename(temporary,file.path);
    // All success paths converge here, including recovery after a process died
    // between assembly, publication and cleanup. Never recurse or follow links.
    try{
      const paths=[temporary,...segmentPaths(temporary)];
      for(const path of paths){await ensureParents(root,path);try{if(!(await lstat(path)).isFile())throw Error('Unexpected download sidecar type / 下载临时文件类型异常');}catch(e){if(e.code!=='ENOENT')throw e;}}
      for(const path of paths)await rm(path,{force:true});
    }catch(cause){throw Object.assign(Error('Download verified; temporary-file cleanup failed / 下载已校验，临时文件清理失败',{cause}),{code:'SIDECAR_CLEANUP'});}
    network?.event(file,event);return result;
  }
  const platform=URL.canParse(file.url)?filePlatform(file.url):undefined;
  const isContent=!!platform||Array.isArray(file.urls);
  const auto=isContent&&(network?.settings.contentMode||'auto')==='auto';
  const allowFallback=auto&&network?.settings.fallback!==false;
  const original=file.url, curseForgeAsset=platform==='curseforge'||hasCurseForgeIdentity(file);
  let authorizedEdgeURL, first=original, replacePartial=false;
  if(curseForgeAsset){
   const selected=curseForgeFileURL(original);
   if(!selected)throw Object.assign(Error('CurseForge file address could not be verified. Preview it again or open the project page. / 无法验证 CurseForge 文件地址，请重新预览或打开项目页。'),{code:'CURSEFORGE_DISTRIBUTION',status:403});
   await network?.gate(signal);
   const timeout=AbortSignal.timeout(9500), authorizationSignal=signal?AbortSignal.any([signal,timeout]):timeout;
   authorizedEdgeURL=await authorizedCurseForgeURL(file,{fetcher,request:officialFetch,signal:authorizationSignal});
   if(authorizedEdgeURL!==selected){
    if(!allowFallback)throw Error('CurseForge changed the selected file address. Preview the file again. / CurseForge 已更新文件地址，请重新预览。');
    replacePartial=true;
   }
   first=authorizedEdgeURL;
  }
  if(await verified(file))return complete({cached:true},{bytes:file.size||0,phase:'cached'});
  if(file.url==='amber-cache:'+file.hash){const cache=safePath(root,'loader-cache/'+file.hash);if(!await verified({...file,path:cache}))throw Error('加载器补丁缓存损坏，请重新安装加载器。');signal?.throwIfAborted();await copyFile(cache,file.path);return complete({cached:true},{bytes:file.size||0,phase:'cached'});}
  await ensureParents(root,temporary);
  if(replacePartial){
   await rm(temporary,{force:true});
   network?.event(file,{bytes:0,source:new URL(first).hostname,phase:'restarting',fallback:'Official CurseForge file address refreshed / 已更新官方文件地址'});
  }
  if(isContent&&!contentHealth.has(fetcher))contentHealth.set(fetcher,new SourceHealth());
  const health=contentHealth.get(fetcher);
  const candidates=[first];
  if(allowFallback&&!curseForgeAsset)for(const url of (file.urls||[]).slice(0,8)){
   try{
    const safe=safeURL(url);
    if(filePlatform(safe)!=='curseforge'&&!candidates.some(value=>fileSource(value)===fileSource(safe)))candidates.push(safe);
   }catch{}
  }
  const choices=allowFallback?health.ordered(candidates,fileSource).slice(0,2):candidates;
  const visited=new Set(), failures=[];
  let current=choices.shift(), refreshed=false, retriedWithoutRange=false, last, credited=0;
  let useSegments=!isContent&&segments&&segmentRanges(file.size).length>0&&threads>1&&transferStatus144().limit>1;
  try{if((await lstat(temporary)).size>0)useSegments=false;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(useSegments){try{const disk=await statfs(dirname(file.path));if(disk.bavail*disk.bsize<file.size*2)useSegments=false;}catch{useSegments=false;}}
  for(let attempt=0;attempt<3;attempt++){
    signal?.throwIfAborted();await network?.gate(signal);let offset=0;
    try{const st=await lstat(temporary);if(!st.isFile()||st.isSymbolicLink())throw Error('不安全的下载片段。');offset=st.size;}catch(e){if(e.code!=='ENOENT')throw e;}
    if(offset&&(await verified({...file,path:temporary})))return complete({cached:false,resumed:true},{bytes:offset,phase:'complete',resumed:true},true);
    if(offset>=(file.size||600_000_000)){await rm(temporary,{force:true});offset=0;}
    const controller=new AbortController();let idle,untrack,connectTimer,headMs,started=Date.now();
    const resetIdle=()=>{clearTimeout(idle);idle=setTimeout(()=>controller.abort(Object.assign(Error('Download stalled / 下载长时间没有数据'),{code:'IDLE'})),45000);};
    const combined=AbortSignal.any([controller.signal,...(signal?[signal]:[])]);
    try{
      network?.event(file,{phase:'queued'});
      if(useSegments){
        untrack=network?.track(controller);
        const result=await segmentedDownload(file,{temporary,signal:combined,network,group,
          limit:()=>network?.concurrency(threads,scope)||threads,
          ensurePath:path=>ensureParents(root,path),verify:verified,
          onBytes:bytes=>{credited+=bytes;onBytes(bytes);},
          fetchRange:(start,end,active,etag)=>officialFetch(file.url,{signal:active,fetcher,headers:{'Accept-Encoding':'identity',Range:`bytes=${start}-${end}`,...(etag?{'If-Range':etag}:{})}})});
        return await complete(result,{bytes:file.size,phase:'complete'},true);
      }
      const completed=await withTransferBudget(async()=>{try{
      if(network?.isPaused())throw Error('Download paused / 下载已暂停');
      untrack=network?.track(controller);
      started=Date.now();
      resetIdle();network?.event(file,{bytes:offset,resumed:offset>0,phase:'connecting'});
      if(isContent){
       const cooldown=(health.get(fileSource(current))?.cooldown||0)-Date.now();
       if(cooldown>0)throw Object.assign(Error('Rate limited / 请求过于频繁'),{status:429,retryAfterMs:cooldown,cooldown:true});
       connectTimer=setTimeout(()=>controller.abort(Object.assign(Error('Connection timed out / 连接超时'),{code:'IDLE'})),allowFallback&&choices.length?6000:12000);
      }
      const r=await officialFetch(current,{signal:combined,fetcher,publicFile:isContent,authorizedEdgeURL,
        onHop:isContent?url=>visited.add(url):undefined,
        headers:{'Accept-Encoding':'identity',...(offset?{Range:`bytes=${offset}-`}:{})}});
      clearTimeout(connectTimer);
      headMs=Date.now()-started;
      if(isContent)network?.event(file,{source:responseOrigins.get(r),phase:'downloading'});
      if(r.status===206){const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers.get('content-range')||'');if(!range||+range[1]!==offset||+range[2]<offset||+range[2]>=+range[3]||file.size&&+range[3]!==file.size){await r.body?.cancel();throw Object.assign(Error('Invalid resume response / 续传响应无效'),{code:'CHECKSUM'});}}
      else if(offset){offset=0;await rm(temporary,{force:true});onBytes(-credited);credited=0;network?.event(file,{bytes:0,resumed:false,phase:'restarting'});}
      const h=fileChecksum(file);if(offset)for await(const chunk of createReadStream(temporary))h.update(chunk);let count=offset;
      const monitor=new Transform({transform(chunk,_encoding,callback){resetIdle();count+=chunk.length;if(count>(file.size||600_000_000))return callback(Object.assign(Error('文件大小超过声明值。'),{code:'CHECKSUM'}));h.update(chunk);credited+=chunk.length;onBytes(chunk.length);network?.event(file,{bytes:count,phase:'downloading'});clearTimeout(idle);Promise.resolve(network?.bandwidth.take(chunk.length,combined)).then(()=>{resetIdle();callback(null,chunk);},callback);}});
      resetIdle();await pipeline(Readable.fromWeb(r.body),monitor,createWriteStream(temporary,{flags:offset?'a':'w'}),{signal:combined});
      network?.event(file,{phase:'verifying'});
      if((file.size&&count!==file.size)||!h.matches())throw Object.assign(Error('下载文件校验失败。'),{code:'CHECKSUM'});
      return {result:{cached:false,resumed:offset>0},bytes:count};
      }catch(e){if(!signal?.aborted&&!network?.isPaused())network?.event(file,{error:networkReason(controller.signal.reason||e),phase:'retrying'});throw e;}
      },signal,{group,limit:()=>network?.concurrency(threads,scope)||threads});
      // A pause at final verification must not retain the shared network slot.
      clearTimeout(idle);untrack?.();untrack=null;
      if(isContent)health.record(fileSource(current),null,headMs);
      return await complete(completed.result,{bytes:completed.bytes,phase:'complete'},true);
    }catch(e){untrack?.();untrack=null;last=controller.signal.reason||e;if(signal?.aborted||e.code==='SIDECAR_CLEANUP')throw e;if(network?.isPaused()){attempt--;continue;}
      if(useSegments){
        useSegments=false;onBytes(-credited);credited=0;
        network?.event(file,{bytes:0,error:networkReason(last),phase:'retrying'});
        // Keep only the contiguous prefix for serial resume and release shard
        // storage before fallback. Never reuse a failed hash.
        if(e.code!=='CHECKSUM'){
          try{const first=segmentPaths(temporary)[0];if((await lstat(first)).isFile())await copyFile(first,temporary);}catch(copyError){if(copyError.code!=='ENOENT')throw copyError;}
        }
        await clearSegments(temporary);
        // Capability negotiation is not one of the normal retry attempts.
        if(e.code==='RANGE_UNSUPPORTED'){attempt--;continue;}
      }
      if(e.code==='CHECKSUM'||e.status===416){await rm(temporary,{force:true});onBytes(-credited);credited=0;network?.event(file,{bytes:0});if(e.code==='CHECKSUM')network?.rejectFile(file.url);}
      if(isContent){
        const reason=contentFailure(last), host=last.host||new URL(current).hostname;
        if(!e.cooldown&&e.status!==404&&e.code!=='CHECKSUM')health.record(fileSource(current),last.status===429?{...last,retryAfterMs:last.retryAfterMs||600}:last,headMs??Date.now()-started);
        failures.push(`${host} (${last.status?`HTTP ${last.status}`:reason})`);
        // Some official CDN routes return 404 for Range while a normal GET
        // succeeds at the exact same address. Discard the partial first.
        if(offset&&e.status===404&&!retriedWithoutRange&&attempt<2){
         retriedWithoutRange=true;
         await rm(temporary,{force:true});
         onBytes(-credited);credited=0;
         network?.event(file,{bytes:0,source:host,phase:'restarting',error:reason,fallback:failures.at(-1)+' Range'});
         continue;
        }
        let next;
        if(allowFallback&&![401,403].includes(e.status))next=choices.find(url=>!visited.has(url));
        if(!next&&allowFallback&&e.status===404&&!refreshed&&platform&&attempt<2){
         refreshed=true;
         try{
          const timeout=AbortSignal.timeout(5500);
          const refreshSignal=signal?AbortSignal.any([signal,timeout]):timeout;
          if(curseForgeAsset){
           next=await authorizedCurseForgeURL({...file,url:current},{fetcher,request:officialFetch,signal:refreshSignal,refresh:true});
           authorizedEdgeURL=next;
          }else next=await refreshModrinthAddress(file,fetcher,refreshSignal);
          if(next&&visited.has(next))next=null;
          if(!next)failures.push('official lookup: same or unavailable address / 官方查询未返回新地址');
         }catch(error){
          signal?.throwIfAborted();
          if(curseForgeAsset&&['CURSEFORGE_DISTRIBUTION','CONTENT_CONFIGURATION','CHECKSUM'].includes(error.code))throw error;
          failures.push(`official lookup: ${error.status?`HTTP ${error.status}`:contentFailure(error)}`);
         }
        }
        if(next&&attempt<2){
         choices.splice(0);
         current=next;
         // Never combine bytes from different routes. The original hash remains authoritative.
         await rm(temporary,{force:true});
         onBytes(-credited);credited=0;
         network?.event(file,{bytes:0,source:new URL(next).hostname,phase:'retrying',error:reason,fallback:failures.at(-1)});
         continue;
        }
        if(e.status===429){
         const remaining=(health.get(fileSource(current))?.cooldown||0)-Date.now();
         if(attempt>=2||remaining>2500)break;
         clearTimeout(idle);clearTimeout(connectTimer);
         await delay(Math.max(remaining,400),undefined,{signal});
         continue;
        }
        if(e.status===404||e.code==='CHECKSUM')break;
      }
      if(e.status&&e.status<500&&![408,429,416].includes(e.status))break;
      // Very long rate limits require an explicit later retry, never retry early.
      if(e.retryAfterMs>300000)break;
      if(attempt<2){clearTimeout(idle);await delay(Math.max(e.retryAfterMs||0,400*2**attempt),undefined,{signal});}
    }finally{clearTimeout(idle);clearTimeout(connectTimer);untrack?.();}
  }
  if(curseForgeAsset&&last.status===401)throw Object.assign(Error(`CurseForge CDN authentication failed (${file.versionId}). Try the official installer or check for a launcher update. / CurseForge 文件鉴权失败，请使用官方安装包或检查启动器更新。`),{code:'CURSEFORGE_CDN_AUTH',status:401});
  const reason=networkReason(last),help={restricted:'来源拒绝访问，请查看文件页面或检查来源设置。',missing:'来源暂时没有此文件，请切换来源或稍后重试。','rate-limited':'来源请求过多，请稍后继续下载。',timeout:'连接或传输超时，请检查网络后继续下载。',checksum:'文件校验未通过，未安装此文件，请切换来源后重试。',connection:'下载连接中断，已保留可续传片段，请检查网络后继续。'};
  throw Object.assign(new Error(`${file.label||'文件'}：${help[reason]} (${isContent?[file.versionId,...failures].filter(Boolean).join(' → '):last.message})`),{code:'DOWNLOAD_'+reason.toUpperCase(),status:last.status});
}
export async function downloadPool(files,options){let next=0,failure=null;const unique=[...new Map(files.map(f=>[hasCurseForgeIdentity(f)?f.path+'\0'+f.versionId:f.path,f])).values()],network=options.fetcher?.amberNetwork,max=Math.min(options.threads||8,unique.length),abort=new AbortController(),signal=AbortSignal.any([abort.signal,...(options.signal?[options.signal]:[])]);for(const f of unique)network?.event(f,{bytes:0});const transferGroup={};await Promise.allSettled(Array.from({length:max},async(_,worker)=>{try{while(next<unique.length&&!failure){signal.throwIfAborted();await network?.gate(signal);signal.throwIfAborted();if(next>=unique.length||failure)return;const f=unique[next++];await download(f,{...options,signal,transferGroup});options.onFile?.(f);}}catch(e){failure ||= e;abort.abort(e);}}));if(failure)throw failure;}
