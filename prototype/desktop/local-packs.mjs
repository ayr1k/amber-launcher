// SPDX-License-Identifier: MPL-2.0
// Local archives never supply executable launcher settings or filesystem destinations.
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {safePath,ensureParents,digest} from './download.mjs';
import {requireSpace} from './safe-copy.mjs';
import {readModMetadata} from './mod-import.mjs';
import {parsePack,packPath} from './modpacks.mjs';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
const MAX_ARCHIVE=300_000_000,MAX_EXPANDED=600_000_000,MAX_FILE=256_000_000;
const hash=b=>createHash('sha256').update(b).digest('hex');
const problem=(en,zh)=>Error(en+' / '+zh);
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=bytes=>{let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
const contentDirs=new Set(['mods','config','resourcepacks','shaderpacks','saves','defaultconfigs','kubejs','scripts']);

// Validate the complete directory before inflation: duplicate names, links, ZIP64,
// encrypted entries and suspicious expansion are rejected, including ignored files.
export function inspectZip(input){
 const b=Buffer.from(input);if(b.length>MAX_ARCHIVE)throw problem('Archive exceeds 300 MB','压缩包超过 300 MB，请精简后重试');
 let end=-1;for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--)if(b.readUInt32LE(p)===0x06054b50&&p+22+b.readUInt16LE(p+20)===b.length){end=p;break;}
 if(end<0)throw problem('Invalid ZIP archive','压缩包损坏或格式不支持，请重新下载');
 const count=b.readUInt16LE(end+10),offset=b.readUInt32LE(end+16),length=b.readUInt32LE(end+12);
 if(b.readUInt16LE(end+4)||b.readUInt16LE(end+6)||count!==b.readUInt16LE(end+8)||count>10000||offset+length!==end)throw problem('Unsupported or oversized ZIP directory','不支持分卷、ZIP64 或超过 10000 项的压缩包');
 const names=new Set(),rows=[];let pos=offset,total=0;
 for(let i=0;i<count;i++){
  if(pos+46>end||b.readUInt32LE(pos)!==0x02014b50)throw problem('Invalid ZIP directory','压缩包目录损坏');
  const flags=b.readUInt16LE(pos+8),method=b.readUInt16LE(pos+10),size=b.readUInt32LE(pos+24),packed=b.readUInt32LE(pos+20),n=b.readUInt16LE(pos+28),extra=b.readUInt16LE(pos+30),comment=b.readUInt16LE(pos+32),local=b.readUInt32LE(pos+42),mode=b.readUInt32LE(pos+38)>>>16;
  if(pos+46+n+extra+comment>end||!n||flags&1||![0,8].includes(method)||(mode&0xf000)===0xa000||size===0xffffffff||packed===0xffffffff)throw problem('Unsupported ZIP entry','压缩包含加密文件、链接或不支持的压缩格式');
  const raw=b.subarray(pos+46,pos+46+n),name=raw.toString('utf8'),path=name.replace(/\/$/,'');
  if(name.includes('\ufffd')||/[\x00-\x1f]/.test(name)||path.split('/').some(s=>!s||s==='.')||names.has(path.toLowerCase()))throw problem('Duplicate or invalid archive path','压缩包含重复或无效路径');
  safePath('pack-check',path);names.add(path.toLowerCase());
  if(local+30>offset||b.readUInt32LE(local)!==0x04034b50||b.readUInt16LE(local+6)!==flags||b.readUInt16LE(local+8)!==method)throw problem('Invalid ZIP entry header','压缩包文件头不一致');
  const ln=b.readUInt16LE(local+26),le=b.readUInt16LE(local+28);
  if(!b.subarray(local+30,local+30+ln).equals(raw)||local+30+ln+le+packed>offset)throw problem('Invalid ZIP entry bounds','压缩包文件范围无效');
  total+=size;if(total>MAX_EXPANDED||size>MAX_FILE)throw problem('Expanded archive exceeds limits','解压后超过 600 MB 或单文件超过 256 MB，请拆分内容后重试');
  if(!name.endsWith('/'))rows.push({name,size,crc:b.readUInt32LE(pos+16)});pos+=46+n+extra+comment;
 }
 if(pos!==end||!rows.length)throw problem('Empty or invalid archive','压缩包为空或目录无效');
 return rows;
}

export function parseLocalArchive(bytes,filename='pack.zip'){
 const rows=inspectZip(bytes);const names=rows.map(r=>r.name);
 let prefix='';let relative=names;
 // A single wrapper folder and .minecraft are common; never combine multiple roots.
 for(let depth=0;depth<3;depth++){
  if(relative.some(n=>n==='modrinth.index.json'||n==='manifest.json'||n==='backup.json'||contentDirs.has(n.split('/')[0])||/^options.*\.txt$/i.test(n)))break;
  const first=new Set(relative.map(n=>n.split('/')[0]));if(first.size!==1||relative.some(n=>!n.includes('/')))break;
  const part=[...first][0]+'/';prefix+=part;relative=relative.map(n=>n.slice(part.length));
 }
 if(relative.includes('backup.json')||relative.includes('instance.json'))return {kind:'backup',files:[],warnings:[]};
 const entries=unzipSync(bytes); // bounds and paths were checked before inflation
 for(const r of rows)if(!entries[r.name]||entries[r.name].length!==r.size||crc32(entries[r.name])!==r.crc)throw problem('Archive checksum mismatch','压缩包内容损坏，请重新下载或重新打包');
 if(relative.includes('modrinth.index.json')){
  if(prefix)throw problem('MRPACK index must be at archive root','MRPACK 清单必须位于压缩包根目录，请重新导出');
  const parsed=parsePack(bytes,'pack-check',{includeOptional:true});const deps=parsed.index.dependencies,keys=Object.keys(deps).filter(k=>k!=='minecraft');
  if(keys.length>1||keys.some(k=>!['fabric-loader','forge','neoforge'].includes(k)))throw problem('Unsupported loader combination','此整合包的加载器组合暂不支持，未开始安装');
  const loader=keys[0]==='fabric-loader'?'fabric':keys[0]||'vanilla',loaderVersion=keys.length?deps[keys[0]]:'';
  if(typeof deps.minecraft!=='string'||deps.minecraft.length>100||typeof loaderVersion!=='string'||loaderVersion.length>100)throw problem('Invalid version information','整合包版本信息无效');
  return {kind:'mrpack',title:String(parsed.index.name||basename(filename,'.mrpack')).slice(0,60),packVersion:String(parsed.index.versionId||'').slice(0,100),game:deps.minecraft,loader,version:loader==='forge'?deps.minecraft+'-'+loaderVersion:loaderVersion,files:parsed.files,warnings:parsed.warnings};
 }
 if(relative.includes('manifest.json')){
  let m;try{m=JSON.parse(Buffer.from(entries[prefix+'manifest.json']).toString('utf8'));}catch{throw problem('Invalid pack manifest','整合包清单损坏');}
  if(m.manifestType==='minecraftModpack'||m.minecraft&&Array.isArray(m.files))return {kind:'curseforge',title:String(m.name||'CurseForge').slice(0,100),files:[],warnings:[]};
  throw problem('Unrecognized manifest','无法识别此清单格式，请使用 MRPACK 或包含实际模组与配置的 ZIP');
 }
 const files=[],warnings=[];
 for(const row of rows){
  const relative=row.name.slice(prefix.length);
  if(/^(readme|license|changelog|credits)(\.[^/]*)?$/i.test(relative)||relative==='modlist.html'){warnings.push('Skipped documentation / 已跳过说明文件：'+relative);continue;}
  if(!contentDirs.has(relative.split('/')[0])&&!/^options[^/]*\.txt$/i.test(relative)&&relative!=='servers.dat')throw problem('Unsupported content: '+relative,'无法安全判断此文件用途：'+relative+'。请选择仅包含模组、配置、资源或存档的 ZIP');
  packPath('pack-check',relative);const data=entries[row.name];
  let metadata=null;if(/^mods\/[^/]+\.(jar|litemod)$/i.test(relative)){try{metadata=readModMetadata(data);}catch{throw problem('Invalid mod archive: '+relative,'模组文件损坏或元数据无法读取：'+relative);}if(!metadata.loaders.length)warnings.push('Unrecognized mod metadata / 无法识别模组版本与加载器：'+relative);}
  files.push({relative,metadata,hash:createHash('sha1').update(data).digest('hex'),size:data.length,bytes:data,title:relative});
 }
 if(!files.length)throw problem('No installable content','未找到可安装内容，请选择包含实际文件的整合包');
 return {kind:'zip',title:basename(filename,'.zip').slice(0,60),packVersion:'',game:'',loader:'fabric',version:'',files,warnings};
}

async function parseInWorker(bytes,name){return new Promise((resolve,reject)=>{const worker=new Worker(new URL(import.meta.url),{workerData:{localPack:true,bytes,name}});worker.once('message',v=>v.error?reject(Error(v.error)):resolve(v.result));worker.once('error',reject);worker.once('exit',code=>{if(code)reject(problem('Archive reader stopped','压缩包读取中断，请重新选择'));});});}
if(!isMainThread&&workerData?.localPack){try{parentPort.postMessage({result:parseLocalArchive(workerData.bytes,workerData.name)});}catch(e){parentPort.postMessage({error:e.message});}}

export class LocalPacks{
 constructor(core,packs,workflows){this.core=core;this.packs=packs;this.workflows=workflows;this.plans=new Map();}
 async preview(path){
  const st=await lstat(path);if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_ARCHIVE)throw problem('Invalid or oversized file','请选择不超过 300 MB 的普通整合包文件');
  const bytes=await readFile(path),name=basename(path);
  if(/\.json$/i.test(name)){if(bytes.length>2_000_000)throw problem('Manifest too large','清单过大');let value;try{value=JSON.parse(bytes.toString('utf8'));}catch{throw problem('Invalid JSON manifest','JSON 清单损坏');}if(value.format==='amber-mod-list')return {kind:'mod-list',files:[],warnings:[]};throw problem('Not a supported mod list','不是支持的模组清单，请使用模组迁移入口');}
  const parsed=await parseInWorker(bytes,name);if(!['zip','mrpack'].includes(parsed.kind))return parsed;
  const id=randomUUID(),sourceHash=hash(bytes);this.plans.clear();this.plans.set(id,{...parsed,bytes,sourceHash,expiresAt:Date.now()+1800000});
  const {bytes:_,files,...publicPlan}=parsed;return {...publicPlan,id,archiveBytes:bytes.length,files:files.map(({bytes,...f})=>({...f,download:!bytes,url:undefined})),downloadBytes:files.filter(f=>!f.bytes&&!f.optional).reduce((n,f)=>n+f.size,0)};
 }
 forget(id){this.plans.delete(id);}
 async create(id,input){
  const plan=this.plans.get(id);if(!plan||plan.expiresAt<Date.now())throw problem('Import preview expired','导入预览已过期，请重新选择文件');
  if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.length>60||!Array.isArray(input.optional)||input.optional.length>10000||new Set(input.optional).size!==input.optional.length)throw problem('Invalid import settings','导入设置无效');
  if(input.optional.some(p=>!plan.files.some(f=>f.optional&&f.relative===p)))throw problem('Invalid optional file selection','可选文件选择无效');
  const target=plan.kind==='mrpack'?plan:input;
  if(typeof target.game!=='string'||typeof target.version!=='string'||!['vanilla','fabric','forge','neoforge'].includes(target.loader))throw problem('Choose game and loader versions','请选择游戏与加载器版本');
  if(target.loader==='vanilla'&&plan.files.some(f=>f.relative.startsWith('mods/')))throw problem('Mods require a loader','此包包含模组，请选择相应加载器');
  const selected=plan.files.filter(f=>!f.optional||input.optional.includes(f.relative));
  const ids=new Set();for(const f of selected){const m=f.metadata;if(!m)continue;if(m.loaders.length&&!m.loaders.includes(target.loader))throw problem('Mod loader mismatch: '+f.relative,'模组声明的加载器与选择不符：'+f.relative);if(m.games.length&&m.games.every(g=>/^\d+(\.\d+){1,2}$/.test(g))&&!m.games.includes(target.game))throw problem('Minecraft version mismatch: '+f.relative,'模组声明的游戏版本与选择不符：'+f.relative);for(const id of m.modIds){if(ids.has(id))throw problem('Duplicate mod ID: '+id,'包内存在重复模组标识：'+id);ids.add(id);}}
  await requireSpace(this.core.root,plan.bytes.length+selected.reduce((n,f)=>n+f.size*2,0)+1073741824);
  return this.workflows.create({name:input.name.trim(),game:target.game,loader:target.loader,version:target.version,threads:this.core.downloadThreads||8},null,null,null,null,{plan,selected:input.optional});
 }
 async retain(dir,{plan,selected}){
  const path=join(dir,'.amber-setup','local-pack.zip');await ensureParents(dir,path);await writeFile(path,plan.bytes,{flag:'wx'});
  if(await digest(path,'sha256')!==plan.sourceHash)throw problem('Retained archive verification failed','保留的整合包校验失败，请检查磁盘');
  return {schema:1,hash:plan.sourceHash,kind:plan.kind,selected:[...selected],title:plan.title,packVersion:plan.packVersion};
 }
 async install(id,record){
  const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);if(record?.schema!==1||!/^[a-f0-9]{64}$/.test(record.hash)||!['zip','mrpack'].includes(record.kind)||!Array.isArray(record.selected)||record.selected.length>10000)throw problem('Invalid saved import plan','保存的导入计划损坏，请检查实例');
  const path=join(dir,'.amber-setup','local-pack.zip');await ensureParents(dir,path);const st=await lstat(path);if(!st.isFile()||st.size>MAX_ARCHIVE||await digest(path,'sha256')!==record.hash)throw problem('Retained archive is missing or changed','保留的整合包缺失或被修改，未继续安装');
  const parsed=await parseInWorker(await readFile(path),'local-pack.zip');if(parsed.kind!==record.kind)throw problem('Pack type changed','整合包类型不一致');
  if(record.selected.some(p=>!parsed.files.some(f=>f.optional&&f.relative===p)))throw problem('Saved optional selection is invalid','保存的可选文件选择无效');
  const files=parsed.files.filter(f=>!f.optional||record.selected.includes(f.relative));
  if(parsed.kind==='mrpack'&&(parsed.game!==item.game||parsed.loader!==item.loader||parsed.version!==(item.loaderVersion||'')))throw problem('Instance version changed','实例版本已改变，请恢复整合包要求的版本后继续');
  await requireSpace(this.core.root,files.reduce((n,f)=>n+f.size*2,0));
  const skipped=[...parsed.warnings,...parsed.files.filter(f=>f.optional&&!record.selected.includes(f.relative)).map(f=>'Optional file not selected / 未选择可选文件：'+f.relative)];
  const report={schema:1,source:'local',kind:record.kind,title:String(record.title).slice(0,100),packVersion:String(record.packVersion||'').slice(0,100),sourceHash:record.hash,importedAt:new Date().toISOString(),warnings:skipped,files:files.map(f=>({relative:f.relative,size:f.size}))};
  const key=randomUUID(),plan={id:key,instanceId:id,title:report.title,game:item.game,loader:item.loader,loaderVersion:item.loader==='forge'?item.loaderVersion?.replace(item.game+'-',''):item.loaderVersion,versionId:'local-'+record.hash,files,warnings:skipped,expiresAt:Date.now()+3600000,localReport:report};
  // A crash after the transaction committed but before the workflow checkpoint is safe.
  try{const saved=JSON.parse(await readFile(join(dir,'modpack.json'),'utf8'));if(saved.versionId===plan.versionId)return;}catch(e){if(e.code!=='ENOENT')throw e;}
  this.packs.plans.set(key,plan);return this.workflows.wait(await this.packs.install(id,key));
 }
 async report(id){const dir=await this.core.instancePath(id);try{const m=JSON.parse(await readFile(join(dir,'modpack.json'),'utf8'));return m.localReport||{source:'modrinth',title:m.title,packVersion:m.versionId,importedAt:null,warnings:m.warnings||[],files:[]};}catch(e){if(e.code==='ENOENT')return null;throw e;}}
}
