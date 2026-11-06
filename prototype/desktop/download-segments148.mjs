// SPDX-License-Identifier: MPL-2.0
import {createReadStream,createWriteStream} from 'node:fs';
import {lstat,rm} from 'node:fs/promises';
import {Readable,Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {withTransferBudget} from './task-queue132.mjs';

// Fixed boundaries make each append-only sidecar resumable without trusting a
// mutable bitmap. Small/unknown files and existing legacy partials stay serial.
export const SEGMENT_THRESHOLD = 32 * 1024 * 1024;
export function segmentRanges(size) {
  if(!Number.isSafeInteger(size)||size<SEGMENT_THRESHOLD)return [];
  const width=Math.ceil(size/4);
  return Array.from({length:4},(_,i)=>({start:i*width,end:Math.min(size,(i+1)*width)-1}));
}
export const segmentPaths=(temporary)=>Array.from({length:4},(_,i)=>temporary+'.segment-'+i);
export async function clearSegments(temporary){for(const path of segmentPaths(temporary))await rm(path,{force:true});}
const unsupported=()=>Object.assign(Error('Range download unavailable / 来源不支持分段下载'),{code:'RANGE_UNSUPPORTED'});
function validRange(response,start,end,size,etag){
  const encoding=response.headers.get('content-encoding');
  return response.status===206&&response.headers.get('content-range')===`bytes ${start}-${end}/${size}`&&
    (!encoding||encoding==='identity')&&(!etag||response.headers.get('etag')===etag);
}

export async function segmentedDownload(file,{temporary,signal,network,group,limit,fetchRange,ensurePath,onBytes,verify}){
  const ranges=segmentRanges(file.size),paths=segmentPaths(temporary),sizes=[];
  for(let i=0;i<paths.length;i++){
    await ensurePath(paths[i]);let size=0;
    try{const s=await lstat(paths[i]);if(!s.isFile()||s.isSymbolicLink())throw Error('Unsafe download segment');size=s.size;}catch(e){if(e.code!=='ENOENT')throw e;}
    if(size>ranges[i].end-ranges[i].start+1){await rm(paths[i],{force:true});size=0;}sizes.push(size);
  }
  let total=sizes.reduce((a,b)=>a+b,0),etag=null;
  const peers=new AbortController(),combined=AbortSignal.any([signal,peers.signal]);
  // Every connection, including the capability request, uses the same admission
  // queue. Never hold a parent ticket while waiting for child tickets.
  async function admitted(fn){return withTransferBudget(async()=>{
    combined.throwIfAborted();if(network?.isPaused())throw Error('Download paused');
    let idle;const timeout=new AbortController();
    const active=AbortSignal.any([combined,timeout.signal]);
    const reset=()=>{clearTimeout(idle);idle=setTimeout(()=>timeout.abort(Object.assign(Error('Download stalled'),{code:'IDLE'})),45000);};
    reset();try{return await fn(active,reset,()=>clearTimeout(idle));}catch(e){throw timeout.signal.reason||e;}finally{clearTimeout(idle);}
  },combined,{group,limit});}
  await admitted(async active=>{
    const response=await fetchRange(0,0,active);
    try{if(!validRange(response,0,0,file.size))throw unsupported();
      const tag=response.headers.get('etag');if(tag&&/^"[^"\r\n]*"$/.test(tag))etag=tag;
    }finally{await response.body?.cancel();}
  });
  network?.event(file,{bytes:total,phase:'downloading',resumed:total>0});
  let failure;
  await Promise.allSettled(ranges.map(async(range,i)=>{
    if(sizes[i]===range.end-range.start+1)return;
    try{await admitted(async(active,reset,stopIdle)=>{
      const start=range.start+sizes[i],response=await fetchRange(start,range.end,active,etag);
      if(!validRange(response,start,range.end,file.size,etag)){await response.body?.cancel();throw unsupported();}
      let received=0;const expected=range.end-start+1;
      const monitor=new Transform({transform(chunk,_encoding,done){
        received+=chunk.length;if(received>expected)return done(unsupported());
        stopIdle();Promise.resolve(network?.bandwidth.take(chunk.length,active)).then(()=>{
          reset();total+=chunk.length;onBytes(chunk.length);network?.event(file,{bytes:total,phase:'downloading'});done(null,chunk);
        },done);
      }});
      await pipeline(Readable.fromWeb(response.body),monitor,createWriteStream(paths[i],{flags:sizes[i]?'a':'w'}),{signal:active});
      if(received!==expected)throw unsupported();
    });}catch(e){failure ||= e;peers.abort(e);}
  }));
  if(failure)throw failure;
  combined.throwIfAborted();network?.event(file,{phase:'verifying'});
  // Assembly is bounded-memory and cancellable. Only a full hash-verified file
  // can be handed back for atomic publication by the caller.
  async function* chunks(){for(const path of paths)for await(const chunk of createReadStream(path)){combined.throwIfAborted();yield chunk;}}
  await pipeline(Readable.from(chunks()),createWriteStream(temporary),{signal:combined});
  const valid=await verify({...file,path:temporary});combined.throwIfAborted();
  if(!valid)throw Object.assign(Error('下载文件校验失败。'),{code:'CHECKSUM'});
  return {cached:false,resumed:sizes.some(n=>n>0),segmented:true};
}
