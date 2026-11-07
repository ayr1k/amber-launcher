// SPDX-License-Identifier: MPL-2.0
// Room-scoped, immutable client snapshots. No server directories or arbitrary paths.
import {createServer} from 'node:http';
import {createHash,randomBytes,randomUUID,generateKeyPairSync,sign,verify,createPublicKey,timingSafeEqual} from 'node:crypto';
import {readFile,writeFile,readdir,lstat,mkdir,copyFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
import {safePath,ensureParents,digest,download,verified} from './download.mjs';
import {instanceLoaders} from './compatibility.mjs';
import {atomicJson} from './core.mjs';

const MAX_FILE=64*1024*1024,MAX_TOTAL=1024*1024*1024;
const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=()=>{throw Error('Invalid client snapshot / 客户端环境清单无效');};
export async function requireRoomSyncReady152(core,id){
 const {dir,item}=await core.metadata(id);let receipt,record;
 for(const name of ['room-sync152.json','setup-report.json']){const path=join(dir,name);await ensureParents(dir,path);try{const value=JSON.parse(await readFile(path,'utf8'));if(name==='room-sync152.json')receipt=value;else record=value;}catch(e){if(e.code!=='ENOENT')throw e;}}
 if(item.roomSyncRequired||record?.roomSync||receipt){if(receipt?.state!=='ready')throw Error('Room environment incomplete; return to the room and confirm synchronization again / 房间环境未完成，请返回房间重新确认同步');validateSnapshot(receipt);}
}
export async function platformFile152(content,f,m,signal,version,project){
 const v=version||await content.api('version/'+f.versionId,{signal});
 if(v.id!==f.versionId||!v.game_versions?.includes(m.game)||!instanceLoaders(m).some(l=>v.loaders?.includes(l)))throw Error('Platform version mismatch / 原平台版本不匹配');
 if(f.source==='curseforge'&&v.project_id!==f.versionId.split('-').slice(0,2).join('-'))fail();
 const p=project||await content.api('project/'+v.project_id,{signal});
 if(p.client_side==='unsupported')throw Error('Server-only mod / 服务端专用模组');
 const file=v.files?.find(x=>x.hashes?.sha1===f.sha1&&x.size===f.size);
 if(!file?.url||f.source==='curseforge'&&p.distribution===false)throw Error('Original platform download unavailable or restricted; no host fallback / 原平台下载不可用或受限制，不会改由房主传输');
 return file;
}
export function syncPath(value){
 if(typeof value!=='string'||value.length>200||! /^(mods\/[^/]+\.jar|config\/[a-zA-Z0-9_./-]+\.(json|toml|properties|cfg))$/.test(value)||value.split('/').some(x=>!x||x==='.')||/[\x00-\x1f\x7f]/.test(value)||/(account|token|secret|password|credential|session|auth|database|\.env|private|launcher)/i.test(value))fail();
 safePath(process.cwd(),value);return value;
}
export function validateSnapshot(m){
 if(m?.schema!==1||!/^amber-[a-f0-9]{24}$/.test(m.room)||! /^[a-f0-9-]{36}$/.test(m.revision)||typeof m.name!=='string'||m.name.length>60||! /^[\w.+-]{1,80}$/.test(m.game)||!['vanilla','fabric','quilt','forge','neoforge'].includes(m.loader)||m.loader!=='vanilla'&&! /^[\w.+-]{1,100}$/.test(m.version)||!Array.isArray(m.files)||m.files.length>500)fail();
 const seen=new Set();let total=0;
 for(const f of m.files){syncPath(f.path);const key=f.path.toLowerCase();if(seen.has(key)||! /^[a-f0-9]{64}$/.test(f.sha256)||!Number.isSafeInteger(f.size)||f.size<1||f.size>MAX_FILE)fail();seen.add(key);total+=f.size;
  if(!['host','modrinth','curseforge'].includes(f.source)||f.source!=='host'&&(!(f.source==='curseforge'?/^cf-\d+-\d+$/:/^[a-zA-Z0-9]{1,64}$/).test(f.versionId)||! /^[a-f0-9]{40}$/.test(f.sha1)))fail();
 }
 if(total>MAX_TOTAL)fail();return m;
}
export function snapshotDiff(before,after){const old=new Map((before?.files||[]).map(f=>[f.path,f]));return {added:after.files.filter(f=>!old.has(f.path)).map(f=>f.path),changed:after.files.filter(f=>old.has(f.path)&&old.get(f.path).sha256!==f.sha256).map(f=>f.path),removed:(before?.files||[]).filter(f=>!after.files.some(n=>n.path===f.path)).map(f=>f.path),runtime:!!before&&['game','loader','version'].some(k=>before[k]!==after[k])};}
async function bytesAt(root,name){const path=safePath(root,syncPath(name));await ensureParents(root,path);const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size<1||st.size>MAX_FILE)fail();return readFile(path);}
function safeConfig(bytes){if(bytes.length>1024*1024||bytes.includes(0)||/(password|token|secret|credential|authorization|api.?key|https?:\/\/|(?:\d{1,3}\.){3}\d{1,3})/i.test(bytes.toString('utf8')))throw Error('Potential private configuration; sharing blocked / 配置可能包含私密信息，已阻止分享');}
export class RoomSync152{
 constructor(core,rooms,workflows,content){Object.assign(this,{core,rooms,workflows,content});this.root=join(core.root,'room-sync152');this.shared=null;this.previewed=null;this.state={phase:'idle'};this.epoch=0;}
 async prepareHost(invite){const keys=generateKeyPairSync('ed25519');this.privateKey=keys.privateKey;invite.sync={port:await this.listen(),key:keys.publicKey.export({type:'spki',format:'der'}).toString('base64'),token:randomBytes(32).toString('base64url')};}
 async listen(){this.server=createServer((req,res)=>this.serve(req,res).catch(()=>{if(!res.headersSent)res.writeHead(403);res.end();}));this.server.maxConnections=8;this.server.requestTimeout=15000;this.server.headersTimeout=10000;await new Promise((ok,no)=>{this.server.once('error',no);this.server.listen(0,'127.0.0.1',ok);});return this.server.address().port;}
 current(role){const r=this.rooms.current;if(r?.role!==role||r.state!=='running'||r.invite.expires<=Date.now())throw Error('Room unavailable / 房间不可用');return r;}
 async serve(req,res){const r=this.current('host'),expected=Buffer.from('Bearer '+r.invite.sync.token),actual=Buffer.from(req.headers.authorization||'');if(req.method!=='GET'||actual.length!==expected.length||!timingSafeEqual(actual,expected)||!this.shared)throw Error('Sharing disabled');const s=this.shared;
  if(req.url==='/manifest'){const body=Buffer.from(JSON.stringify(s.manifest));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({body:body.toString('base64'),signature:sign(null,body,this.privateKey).toString('base64')}));return;}
  const match=/^\/file\/([a-f0-9-]{36})\/([a-f0-9]{64})$/.exec(req.url||'');const f=match&&match[1]===s.manifest.revision&&s.manifest.files.find(f=>f.sha256===match[2]&&f.source==='host');if(!f)throw Error('Unknown file');const path=join(s.dir,f.sha256);await ensureParents(this.root,path);const bytes=await readFile(path);if(this.shared!==s||hash(bytes)!==f.sha256)throw Error('Snapshot changed');res.setHeader('Content-Length',bytes.length);res.end(bytes);
 }
 disable(){this.epoch++;this.shared=null;this.server?.closeAllConnections();return {enabled:false};}
 async close(){this.disable();this.cancel();this.previewed=null;if(!this.active)this.state={phase:'idle'};this.privateKey=null;this.server?.close();this.server=null;}
 async candidates(id){const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);if(item.liteVersion||item.loader==='optifine'||!['vanilla','fabric','quilt','forge','neoforge'].includes(item.loader))throw Error('Unsupported loader combination / 此加载器组合暂不支持同步');const files=[];
  for(const folder of ['mods','config']){const base=join(dir,folder);await ensureParents(dir,join(base,'.check'));for(const e of await readdir(base,{withFileTypes:true})){if(!e.isFile())continue;const path=folder+'/'+e.name;try{syncPath(path);const bytes=await bytesAt(dir,path);if(folder==='config')safeConfig(bytes);files.push({path,size:bytes.length,sha256:hash(bytes)});}catch{/* Omitted, never read or share unsafe entries. */}}}
  const candidate={token:randomUUID(),id,name:item.name,game:item.game,loader:item.loader,version:item.loaderVersion||null,files};this.candidate=candidate;return candidate;
 }
 async publish(input){const r=this.current('host'),epoch=++this.epoch;if(!input?.reviewed||!Array.isArray(input.paths)||input.paths.length>500)throw Error('Review selected files and permissions / 请检查所选文件及再分发权限');const server=(await this.rooms.servers.list()).find(s=>s.id===r.serverId);const selectedItem=(await this.core.metadata(input.id)).item;if(!server||server.game!==selectedItem.game||['fabric','quilt'].includes(server.type)&&server.type!==selectedItem.loader)throw Error('Server/client game or loader mismatch / 服务端与客户端版本或加载器不匹配');const candidate=this.candidate;if(!candidate||candidate.id!==input.id||candidate.token!==input.token||candidate.game!==selectedItem.game||candidate.loader!==selectedItem.loader||candidate.version!==(selectedItem.loaderVersion||null))throw Error('Review candidate files again / 请重新检查候选文件');const {dir}=await this.core.metadata(input.id),installed=await this.content.manifest(dir),files=[],revision=randomUUID(),snapshotDir=join(this.root,'snapshots',revision);await ensureParents(this.root,join(snapshotDir,'.check'));
  for(const path of input.paths){const selected=candidate.files.find(f=>f.path===path);if(!selected)fail();const bytes=await bytesAt(dir,path);if(hash(bytes)!==selected.sha256)throw Error('Client changed; review again / 客户端已变化，请重新检查');const f={path,size:bytes.length,sha256:hash(bytes),source:'host'};
   if(path.startsWith('mods/')){const saved=installed.files.find(f=>f.relative===path&&String(f.projectId).startsWith('cf-'));const sha1=createHash('sha1').update(bytes).digest('hex');let v;if(saved){if(!/^cf-\d+-\d+$/.test(saved.versionId)||saved.hash!==sha1)throw Error('CurseForge provenance mismatch / CurseForge 来源记录与文件不符');v=await this.content.api('version/'+saved.versionId);}else try{v=await this.content.api('version_file/'+sha1+'?algorithm=sha1');}catch(e){if(e.status!==404)throw Error('Cannot verify original platform; retry online / 无法核实原平台来源，请联网后重试');}
    if(v){const project=await this.content.api('project/'+v.project_id);if(project.client_side==='unsupported')throw Error('Server-only mod / 服务端专用模组: '+path);if(!v.game_versions?.includes(candidate.game)||!instanceLoaders(candidate).some(l=>v.loaders?.includes(l)))throw Error('Mod version mismatch / 模组版本不匹配: '+path);Object.assign(f,{source:saved?'curseforge':'modrinth',versionId:v.id,sha1});await platformFile152(this.content,f,candidate,undefined,v,project);}
   }
   if(f.source==='host'){if(!input.redistribution)throw Error('Host files require redistribution permission and privacy review / 房主文件须确认再分发许可与隐私检查');await writeFile(join(snapshotDir,f.sha256),bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});}files.push(f);
  }
  const manifest=validateSnapshot({schema:1,room:r.invite.name,revision,name:candidate.name,game:candidate.game,loader:candidate.loader,version:candidate.version,files});if(epoch!==this.epoch||this.current('host')!==r)throw Error('Sharing cancelled / 分享已取消');this.shared={manifest,dir:snapshotDir};return {enabled:true,manifest};
 }
 async request(path,limit,signal){const r=this.current('guest');if(!r.invite.sync||!r.syncLocalPort)throw Error('Host does not support synchronization / 房主未提供同步通道');const response=await fetch(`http://127.0.0.1:${r.syncLocalPort}${path}`,{headers:{Authorization:'Bearer '+r.invite.sync.token},redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])])});if(!response.ok)throw Error('Sharing unavailable or snapshot expired; refresh / 分享关闭、房主离线或快照过期，请刷新');let total=0;const chunks=[];for await(const chunk of response.body){total+=chunk.length;if(total>limit){await response.body.cancel().catch(()=>{});fail();}chunks.push(chunk);}if(this.current('guest')!==r)throw Error('Room changed');return Buffer.concat(chunks);}
 async remote(signal){const r=this.current('guest'),envelope=JSON.parse((await this.request('/manifest',500000,signal)).toString()),body=Buffer.from(envelope.body,'base64');const key=createPublicKey({key:Buffer.from(r.invite.sync.key,'base64'),type:'spki',format:'der'});if(!verify(null,body,key,Buffer.from(envelope.signature,'base64')))throw Error('Host identity check failed / 房主身份校验失败');const m=validateSnapshot(JSON.parse(body));if(m.room!==r.invite.name)fail();return m;}
 async preview(){if(this.active)throw Error('Cancel current synchronization first / 请先取消当前同步');const manifest=await this.remote(),previous=this.previewed?.manifest;this.previewed={token:randomUUID(),manifest};return {...this.previewed,diff:snapshotDiff(previous,manifest),size:manifest.files.reduce((n,f)=>n+f.size,0)};}
 cancel(){this.abort?.abort(Error('Synchronization cancelled / 同步已取消'));if(this.requestKey)this.workflows.cancel('new:'+this.requestKey);}
 get active(){return !!this.abort;}
 async install(token){if(this.active||!this.previewed||this.previewed.token!==token)throw Error('Review this environment first / 请先预览并确认环境');const plan=this.previewed,controller=new AbortController(),requestKey=randomUUID();let heartbeat;const watch=async()=>{try{const m=await this.remote(controller.signal);if(m.revision!==plan.manifest.revision)throw Error('Sharing changed; preview again / 分享已更新，请重新预览');}catch(e){controller.abort(e);this.workflows.cancel('new:'+requestKey);}};this.abort=controller;const signal=controller.signal;this.requestKey=requestKey;this.state={phase:'downloading'};
  try{const current=await this.remote(signal);if(JSON.stringify(current)!==JSON.stringify(plan.manifest))throw Error('Environment changed; preview and confirm again / 环境已更新，请重新预览并确认');const m=plan.manifest;let checking=false;heartbeat=setInterval(()=>{if(!checking){checking=true;watch().finally(()=>checking=false);}},2000);heartbeat.unref();
   for(const f of m.files){signal.throwIfAborted();const path=join(this.root,'cache',f.sha256);await ensureParents(this.root,path);const original=f.source!=='host'?await platformFile152(this.content,f,m,signal):null;if(await verified({path,hash:f.sha256,algorithm:'sha256',size:f.size}))continue;
    if(original){await download({path,url:original.url,hash:f.sha256,algorithm:'sha256',size:f.size},{root:this.root,signal,fetcher:this.core.fetcher});}
    else{const bytes=await this.request('/file/'+m.revision+'/'+f.sha256,f.size,signal);if(bytes.length!==f.size||hash(bytes)!==f.sha256)throw Error('File integrity check failed / 文件校验失败');if(f.path.startsWith('config/'))safeConfig(bytes);signal.throwIfAborted();const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,bytes,{flag:'wx'});await rename(temp,path);}
   }
   signal.throwIfAborted();this.state.phase='installing';
   // Every accepted revision gets a fresh instance. Saves and personal configuration never move.
   const item=await this.workflows.create({requestKey,name:('Room · '+m.name).slice(0,60),game:m.game,loader:m.loader,version:m.version,threads:this.core.downloadThreads||8},null,null,async item=>{this.state.instanceId=item.id;signal.throwIfAborted();const dir=await this.core.instancePath(item.id);for(const f of m.files){signal.throwIfAborted();const source=join(this.root,'cache',f.sha256);await ensureParents(this.root,source);if(!await verified({path:source,hash:f.sha256,algorithm:'sha256',size:f.size}))throw Error('Cache integrity check failed');const dest=safePath(dir,f.path);await ensureParents(dir,dest);await copyFile(source,dest);if(!await verified({path:dest,hash:f.sha256,algorithm:'sha256',size:f.size}))throw Error('Copied file integrity check failed');}await atomicJson(join(dir,'room-sync152.json'),{...m,state:'pending'});},null,null,async item=>{this.state.instanceId=item.id;const dir=await this.core.instancePath(item.id);await atomicJson(join(dir,'room-sync152.json'),{...m,state:'pending'});signal.throwIfAborted();});
   signal.throwIfAborted();const final=await this.remote(signal);if(final.revision!==m.revision)throw Error('Sharing changed; preview again');await atomicJson(join(await this.core.instancePath(item.id),'room-sync152.json'),{...m,state:'ready'});this.state={phase:'ready',instanceId:item.id,revision:m.revision};return this.state;
  }catch(e){this.state={...this.state,phase:signal.aborted?'cancelled':'failed',error:e.message};throw e;}finally{clearInterval(heartbeat);this.abort=null;}
 }
 async launchAddress(id){const r=this.current('guest');if(this.state.phase!=='ready'||this.state.instanceId!==id)throw Error('Complete room synchronization first / 请先完成房间同步');return `127.0.0.1:${r.localPort}`;}
}
