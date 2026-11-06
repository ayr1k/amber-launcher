// SPDX-License-Identifier: MPL-2.0
// Reproducible loopback benchmark. No user libraries, accounts or live services.
import {createServer} from 'node:http';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {download,verified} from '../desktop/download.mjs';
import {configureTransferBudget} from '../desktop/task-queue132.mjs';
import {DownloadNetwork} from '../desktop/network.mjs';
const data=Buffer.alloc(32*1024*1024);for(let i=0;i<data.length;i++)data[i]=i%251;
const hash=createHash('sha256').update(data).digest('hex'),root=await mkdtemp(join(tmpdir(),'amber148-benchmark-')),rows=[];
let mode='per-connection',active=0;
const shared=[];
const sharedClock=setInterval(()=>{const next=shared.shift();if(next){shared.push(next);next();}},8);
const server=createServer((req,res)=>{
 const match=mode!=='no-range'&&/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
 const start=match?+match[1]:0,end=match&&match[2]?+match[2]:data.length-1;let cursor=start;
 res.writeHead(match?206:200,{'Content-Length':end-start+1,ETag:'"benchmark148"',...(match?{'Content-Range':`bytes ${start}-${end}/${data.length}`}:{})});
 active++;let timer,closed=false;
 const close=()=>{if(!closed){closed=true;clearTimeout(timer);active--;const index=shared.indexOf(send);if(index>=0)shared.splice(index,1);}};res.once('close',close);
 function send(){if(closed)return;const next=Math.min(end+1,cursor+128*1024);const writable=res.write(data.subarray(cursor,next));cursor=next;
   if(cursor>end){res.end();return;}
   if(mode==='shared-bottleneck')return;
   const schedule=()=>{timer=setTimeout(send,8);};
   if(writable)schedule();else res.once('drain',schedule);
 }if(mode==='shared-bottleneck')shared.push(send);else send();
});
try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));configureTransferBudget(8);
 const url=`http://127.0.0.1:${server.address().port}/fixture`;
 // Only the injected fixture transport maps the allowlisted production URL to
 // loopback. Production safeURL, redirects and source policies are unchanged.
 const transport=(_url,options)=>fetch(url,options);
 for(const scenario of ['per-connection','shared-bottleneck','no-range','app-limit']){
   mode=scenario;for(let trial=0;trial<3;trial++)for(const segments of trial%2?[true,false]:[false,true]){
     const network=new DownloadNetwork(root,{fetcher:transport});network.configure({mode:'official',fallback:false,bandwidthKib:scenario==='app-limit'?8192:0});
     const file={url:'https://cdn.modrinth.com/fixture',path:join(root,`${scenario}-${trial}-${segments}.bin`),size:data.length,hash,algorithm:'sha256'};
     const start=performance.now();const result=await network.run({id:'benchmark',kind:'install'},()=>download(file,{root,fetcher:network.request,segments}));const ms=performance.now()-start;
     if(!await verified(file))throw Error('Benchmark integrity failed');
     const row={scenario,trial:trial+1,mode:segments?'automatic':'serial',ms:Math.round(ms),MiBps:Number((32/(ms/1000)).toFixed(2)),segmented:!!result.segmented};rows.push(row);console.log(JSON.stringify(row));
   }
 }
 const median=xs=>xs.toSorted((a,b)=>a-b)[Math.floor(xs.length/2)];
 const summary=[...new Set(rows.map(r=>r.scenario))].map(scenario=>{const serial=median(rows.filter(r=>r.scenario===scenario&&r.mode==='serial').map(r=>r.ms)),automatic=median(rows.filter(r=>r.scenario===scenario&&r.mode==='automatic').map(r=>r.ms));return {scenario,serialMs:serial,automaticMs:automatic,speedup:Number((serial/automatic).toFixed(2))};});
 const report={node:process.version,platform:process.platform,bytes:data.length,sha256:hash,iterations:3,parallelBudget:8,method:'Same immutable file and loopback HTTP server; alternating order; elapsed includes disk writes, assembly and SHA-256. Fixture transport only; not a CDN or Internet speed claim.',summary,rows};
 if(process.argv[2])await writeFile(resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}finally{clearInterval(sharedClock);server.closeAllConnections();await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
