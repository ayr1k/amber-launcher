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

const hosts=new Set(['nya.globalslb.net','meta.quiltmc.org','maven.quiltmc.org','api.curseforge.com','edge.forgecdn.net','mediafilez.forgecdn.net','fill.papermc.io','fill-data.papermc.io','api.github.com','repo.maven.apache.org','repo.mumfrey.com','api.modrinth.com','cdn.modrinth.com','maven.minecraftforge.net','maven.neoforged.net','files.minecraftforge.net','dl.liteloader.com','repo.spongepowered.org','meta.fabricmc.net','maven.fabricmc.net','authlib-injector.yushi.moe','piston-meta.mojang.com','piston-data.mojang.com','launcher.mojang.com','launchermeta.mojang.com','libraries.minecraft.net','resources.download.minecraft.net','api.adoptium.net','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
export function safeURL(value){const u=new URL(value);if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.port||u.username||u.password)throw new Error('下载地址不在官方来源列表中。');return u.href;}
export function safePath(root,name){if(typeof name!=='string'||!name||name.includes('\\')||name.includes(':')||name.startsWith('/')||name.split('/').some(s=>s==='..'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s)||/[. ]$/.test(s)))throw new Error('不安全的文件路径。');const p=resolve(root,name);if(!p.startsWith(resolve(root)+sep))throw new Error('文件路径越界。');return p;}
export async function ensureParents(root,path){const rel=relative(resolve(root),resolve(path));if(rel.startsWith('..')||rel.includes(':'))throw new Error('文件路径越界。');let p=resolve(root);await mkdir(p,{recursive:true});for(const part of [''].concat(rel.split(sep).slice(0,-1))){if(part)p=resolve(p,part);await mkdir(p,{recursive:true});if((await lstat(p)).isSymbolicLink())throw new Error('安装目录不可使用链接。');}try{if((await lstat(path)).isSymbolicLink())throw new Error('目标文件不可使用链接。');}catch(e){if(e.code!=='ENOENT')throw e;}}
export async function digest(path,algorithm='sha1'){const h=createHash(algorithm);for await(const bytes of createReadStream(path))h.update(bytes);return h.digest('hex');}
export async function verified(file){try{const s=await lstat(file.path);return s.isFile()&&!s.isSymbolicLink()&&(!file.size||s.size===file.size)&&await digest(file.path,file.algorithm||'sha1')===file.hash;}catch{return false;}}
export async function officialFetch(url,{signal,fetcher=fetch,headers={}}={}){let next=safeURL(url);for(let i=0;i<6;i++){const r=await fetcher(next,{signal,redirect:'manual',headers:{'User-Agent':`${REPOSITORY_NAME}/${VERSION} (${REPOSITORY_URL})`,...headers,...await curseHeaders141(next)}});if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw new Error('下载重定向缺少地址。');next=safeURL(new URL(location,next).href);continue;}if(!r.ok){await r.body?.cancel();const error=new Error(`下载请求失败 (${r.status})`);error.status=r.status;error.retryAfterMs=retryAfter(r.headers.get('retry-after'));throw error;}return r;}throw new Error('下载重定向次数过多。');}
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
  if(await verified(file))return complete({cached:true},{bytes:file.size||0,phase:'cached'});
  if(file.url==='amber-cache:'+file.hash){const cache=safePath(root,'loader-cache/'+file.hash);if(!await verified({...file,path:cache}))throw Error('加载器补丁缓存损坏，请重新安装加载器。');signal?.throwIfAborted();await copyFile(cache,file.path);return complete({cached:true},{bytes:file.size||0,phase:'cached'});}
  await ensureParents(root,temporary);
  let last,credited=0;
  let useSegments=segments&&segmentRanges(file.size).length>0&&threads>1&&transferStatus144().limit>1;
  try{if((await lstat(temporary)).size>0)useSegments=false;}catch(e){if(e.code!=='ENOENT')throw e;}
  if(useSegments){try{const disk=await statfs(dirname(file.path));if(disk.bavail*disk.bsize<file.size*2)useSegments=false;}catch{useSegments=false;}}
  for(let attempt=0;attempt<3;attempt++){
    signal?.throwIfAborted();await network?.gate(signal);let offset=0;
    try{const st=await lstat(temporary);if(!st.isFile()||st.isSymbolicLink())throw Error('不安全的下载片段。');offset=st.size;}catch(e){if(e.code!=='ENOENT')throw e;}
    if(offset&&(await verified({...file,path:temporary})))return complete({cached:false,resumed:true},{bytes:offset,phase:'complete',resumed:true},true);
    if(offset>=(file.size||600_000_000)){await rm(temporary,{force:true});offset=0;}
    const controller=new AbortController();let idle,untrack;
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
      resetIdle();network?.event(file,{bytes:offset,resumed:offset>0,phase:'connecting'});
      const r=await officialFetch(file.url,{signal:combined,fetcher,headers:{'Accept-Encoding':'identity',...(offset?{Range:`bytes=${offset}-`}:{})}});
      if(r.status===206){const range=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(r.headers.get('content-range')||'');if(!range||+range[1]!==offset||+range[2]<offset||+range[2]>=+range[3]||file.size&&+range[3]!==file.size){await r.body?.cancel();throw Object.assign(Error('Invalid resume response / 续传响应无效'),{code:'CHECKSUM'});}}
      else if(offset){offset=0;await rm(temporary,{force:true});onBytes(-credited);credited=0;network?.event(file,{bytes:0,resumed:false,phase:'restarting'});}
      const h=createHash(file.algorithm||'sha1');if(offset)for await(const chunk of createReadStream(temporary))h.update(chunk);let count=offset;
      const monitor=new Transform({transform(chunk,_encoding,callback){resetIdle();count+=chunk.length;if(count>(file.size||600_000_000))return callback(Object.assign(Error('文件大小超过声明值。'),{code:'CHECKSUM'}));h.update(chunk);credited+=chunk.length;onBytes(chunk.length);network?.event(file,{bytes:count,phase:'downloading'});clearTimeout(idle);Promise.resolve(network?.bandwidth.take(chunk.length,combined)).then(()=>{resetIdle();callback(null,chunk);},callback);}});
      resetIdle();await pipeline(Readable.fromWeb(r.body),monitor,createWriteStream(temporary,{flags:offset?'a':'w'}),{signal:combined});
      network?.event(file,{phase:'verifying'});
      if((file.size&&count!==file.size)||h.digest('hex')!==file.hash)throw Object.assign(Error('下载文件校验失败。'),{code:'CHECKSUM'});
      return {result:{cached:false,resumed:offset>0},bytes:count};
      }catch(e){if(!signal?.aborted&&!network?.isPaused())network?.event(file,{error:networkReason(controller.signal.reason||e),phase:'retrying'});throw e;}
      },signal,{group,limit:()=>network?.concurrency(threads,scope)||threads});
      // A pause at final verification must not retain the shared network slot.
      clearTimeout(idle);untrack?.();untrack=null;
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
      if(e.status&&e.status<500&&![408,429,416].includes(e.status))break;
      // Very long rate limits require an explicit later retry, never retry early.
      if(e.retryAfterMs>300000)break;
      if(attempt<2){clearTimeout(idle);await delay(Math.max(e.retryAfterMs||0,400*2**attempt),undefined,{signal});}
    }finally{clearTimeout(idle);untrack?.();}
  }
  const reason=networkReason(last),help={restricted:'来源拒绝访问，请查看文件页面或检查来源设置。',missing:'来源暂时没有此文件，请切换来源或稍后重试。','rate-limited':'来源请求过多，请稍后继续下载。',timeout:'连接或传输超时，请检查网络后继续下载。',checksum:'文件校验未通过，未安装此文件，请切换来源后重试。',connection:'下载连接中断，已保留可续传片段，请检查网络后继续。'};
  throw Object.assign(new Error(`${file.label||'文件'}：${help[reason]} (${last.message})`),{code:'DOWNLOAD_'+reason.toUpperCase(),status:last.status});
}
export async function downloadPool(files,options){let next=0,failure=null;const unique=[...new Map(files.map(f=>[f.path,f])).values()],network=options.fetcher?.amberNetwork,max=Math.min(options.threads||8,unique.length),abort=new AbortController(),signal=AbortSignal.any([abort.signal,...(options.signal?[options.signal]:[])]);for(const f of unique)network?.event(f,{bytes:0});const transferGroup={};await Promise.allSettled(Array.from({length:max},async(_,worker)=>{try{while(next<unique.length&&!failure){signal.throwIfAborted();await network?.gate(signal);signal.throwIfAborted();if(next>=unique.length||failure)return;const f=unique[next++];await download(f,{...options,signal,transferGroup});options.onFile?.(f);}}catch(e){failure ||= e;abort.abort(e);}}));if(failure)throw failure;}
