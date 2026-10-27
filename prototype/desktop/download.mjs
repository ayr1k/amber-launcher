// SPDX-License-Identifier: MPL-2.0
import {VERSION} from './product.mjs';
import {REPOSITORY_NAME,REPOSITORY_URL} from './edition.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat, lstat, copyFile } from 'node:fs/promises';
import { dirname, resolve, sep, relative } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const hosts=new Set(['repo.maven.apache.org','repo.mumfrey.com','api.modrinth.com','cdn.modrinth.com','maven.minecraftforge.net','maven.neoforged.net','files.minecraftforge.net','dl.liteloader.com','repo.spongepowered.org','meta.fabricmc.net','maven.fabricmc.net','authlib-injector.yushi.moe','piston-meta.mojang.com','piston-data.mojang.com','launcher.mojang.com','launchermeta.mojang.com','libraries.minecraft.net','resources.download.minecraft.net','api.adoptium.net','github.com','release-assets.githubusercontent.com','objects.githubusercontent.com']);
export function safeURL(value){const u=new URL(value);if(u.protocol!=='https:'||!hosts.has(u.hostname)||u.port||u.username||u.password)throw new Error('下载地址不在官方来源列表中。');return u.href;}
export function safePath(root,name){if(typeof name!=='string'||!name||name.includes('\\')||name.includes(':')||name.startsWith('/')||name.split('/').some(s=>s==='..'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(s)||/[. ]$/.test(s)))throw new Error('不安全的文件路径。');const p=resolve(root,name);if(!p.startsWith(resolve(root)+sep))throw new Error('文件路径越界。');return p;}
export async function ensureParents(root,path){const rel=relative(resolve(root),resolve(path));if(rel.startsWith('..')||rel.includes(':'))throw new Error('文件路径越界。');let p=resolve(root);await mkdir(p,{recursive:true});for(const part of [''].concat(rel.split(sep).slice(0,-1))){if(part)p=resolve(p,part);await mkdir(p,{recursive:true});if((await lstat(p)).isSymbolicLink())throw new Error('安装目录不可使用链接。');}try{if((await lstat(path)).isSymbolicLink())throw new Error('目标文件不可使用链接。');}catch(e){if(e.code!=='ENOENT')throw e;}}
export async function digest(path,algorithm='sha1'){const h=createHash(algorithm);for await(const bytes of createReadStream(path))h.update(bytes);return h.digest('hex');}
export async function verified(file){try{const s=await lstat(file.path);return s.isFile()&&!s.isSymbolicLink()&&(!file.size||s.size===file.size)&&await digest(file.path,file.algorithm||'sha1')===file.hash;}catch{return false;}}
export async function officialFetch(url,{signal,fetcher=fetch}={}){let next=safeURL(url);for(let i=0;i<6;i++){const r=await fetcher(next,{signal,redirect:'manual',headers:{'User-Agent':`${REPOSITORY_NAME}/${VERSION} (${REPOSITORY_URL})`}});if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw new Error('下载重定向缺少地址。');next=safeURL(new URL(location,next).href);continue;}if(!r.ok){await r.body?.cancel();const error=new Error(`下载请求失败 (${r.status})`);error.status=r.status;throw error;}return r;}throw new Error('下载重定向次数过多。');}
export async function download(file,{root,signal,onBytes=()=>{},fetcher=fetch}={}){
  if(!/^[0-9a-f]{40}$|^[0-9a-f]{64}$/.test(file.hash))throw new Error('下载缺少完整性校验值。');
  signal?.throwIfAborted();await ensureParents(root,file.path);
  if(await verified(file))return {cached:true};
  if(file.url==='amber-cache:'+file.hash){const cache=safePath(root,'loader-cache/'+file.hash);if(!await verified({...file,path:cache}))throw Error('加载器补丁缓存损坏，请重新安装加载器。');await copyFile(cache,file.path);return {cached:true};}
  let last;
  for(let attempt=0;attempt<3;attempt++){
    signal?.throwIfAborted();const temporary=file.path+'.'+randomUUID()+'.part';
    try{
      const combined=AbortSignal.any([AbortSignal.timeout(300000),...(signal?[signal]:[])]);
      const r=await officialFetch(file.url,{signal:combined,fetcher});const h=createHash(file.algorithm||'sha1');let count=0;
      const monitor=new Transform({transform(chunk,_encoding,callback){count+=chunk.length;if(count>(file.size||600_000_000))return callback(new Error('文件大小超过声明值。'));h.update(chunk);onBytes(chunk.length);callback(null,chunk);}});
      await pipeline(Readable.fromWeb(r.body),monitor,createWriteStream(temporary,{flags:'wx'}),{signal:combined});
      if((file.size&&count!==file.size)||h.digest('hex')!==file.hash)throw new Error('下载文件校验失败。');
      await rename(temporary,file.path);return {cached:false};
    }catch(e){last=e;if(signal?.aborted)throw e;if(e.status&&e.status<500&&![408,429].includes(e.status))break;}finally{await rm(temporary,{force:true});}
    if(attempt<2)await delay(400*2**attempt,undefined,{signal});
  }
  throw new Error(`${file.label||'文件'}：${last.message}`);
}
export async function downloadPool(files,options){let next=0,failure=null;const unique=[...new Map(files.map(f=>[f.path,f])).values()];await Promise.allSettled(Array.from({length:Math.min(options.threads||8,unique.length)},async()=>{try{while(next<unique.length&&!failure){options.signal?.throwIfAborted();const f=unique[next++];await download(f,options);options.onFile?.(f);}}catch(e){failure ||= e;}}));if(failure)throw failure;}
