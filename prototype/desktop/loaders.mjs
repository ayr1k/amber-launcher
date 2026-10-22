// SPDX-License-Identifier: MPL-2.0
import { mkdir, readFile, writeFile, readdir, copyFile, open, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { officialFetch, download, downloadPool, safePath, ensureParents, digest } from './download.mjs';
import { planFiles, requiredJava } from './vanilla.mjs';
import { inspectJava } from './java.mjs';
const repos={forge:'https://maven.minecraftforge.net/net/minecraftforge/forge/',neoforge:'https://maven.neoforged.net/releases/net/neoforged/neoforge/'};
// NeoForge >= 26 includes the full MC major/minor/patch and a build component.
export function neoGame(version){const m=/^(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?/.exec(version);if(!m)return null;if(+m[1]<26)return `1.${+m[1]}${+m[2]?'.'+(+m[2]):''}`;if(!m[4])return null;const suffix=/\+(snapshot|pre|rc)-(\d+)$/.exec(version);return `${+m[1]}.${+m[2]}${+m[3]?'.'+(+m[3]):''}${suffix?'-'+suffix[1]+'-'+suffix[2]:''}`;}

export async function loaderVersions(game,type,fetcher=fetch){
 if(!repos[type])throw Error('不支持的加载器。');
 const xml=await (await officialFetch(repos[type]+'maven-metadata.xml',{fetcher,signal:AbortSignal.timeout(30000)})).text();
 return [...xml.matchAll(/<version>([^<]+)<\/version>/g)].map(m=>m[1]).filter(v=>type==='forge'?v.startsWith(game+'-'):neoGame(v)===game).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})).map(version=>({version,stable:!/(alpha|beta|snapshot)/i.test(version)}));
}
function mavenPath(name){if(!/^[\w.\-]+:[\w.\-]+:[\w.+\-]+(?::[\w.\-]+)?$/.test(name))throw Error('无法识别的 Maven 坐标：'+name);const [g,a,v,c]=name.split(':');return `${g.replaceAll('.','/')}/${a}/${v}/${a}-${v}${c?'-'+c:''}.jar`;}
export async function runInstaller(java,args,dir,signal){
 const log=await open(join(dir,'installer.log'),'w');
 try{await new Promise((resolve,reject)=>{const child=spawn(java,args,{cwd:dir,shell:false,windowsHide:true,stdio:['ignore',log.fd,log.fd],env:{...process.env,JAVA_TOOL_OPTIONS:'',_JAVA_OPTIONS:'',JDK_JAVA_OPTIONS:''}});let timeout=false;const stop=()=>child.kill();signal.addEventListener('abort',stop,{once:true});const timer=setTimeout(()=>{timeout=true;stop();},900000);child.once('error',reject);child.once('close',code=>{clearTimeout(timer);signal.removeEventListener('abort',stop);if(signal.aborted)reject(signal.reason);else if(code!==0)reject(Error(`官方安装器${timeout?'超时':'退出码 '+code}；日志：${join(dir,'installer.log')}`));else resolve();});});}finally{await log.close();}
}
export function withLoader(meta,profile){
 if(!profile)return meta;
 const names=new Set(profile.libraries.map(l=>l.name.split(':').slice(0,2).join(':')));
 const libraries=[...meta.libraries.filter(l=>!names.has(l.name.split(':').slice(0,2).join(':'))),...profile.libraries];
 const game=profile.minecraftArguments?profile.minecraftArguments.match(/(?:[^\s"]+|"[^"]*")+/g).map(x=>x.replace(/^"|"$/g,'')):[...(meta.arguments?.game||meta.minecraftArguments?.split(' ')||[]),...(profile.arguments?.game||[])];
 return {...meta,libraries,mainClass:profile.mainClass,arguments:{jvm:[...(meta.arguments?.jvm||['-Djava.library.path=${natives_directory}','-cp','${classpath}']),...(profile.arguments?.jvm||[])],game},amberExtra:profile.amberExtra||[]};
}
export async function installLoader(core,id,type,version){
 if(!repos[type])throw Error('不支持的加载器。');
 const {dir,item,meta}=await core.metadata(id);await core.requireStopped(dir);
 if(!(await loaderVersions(meta.id,type,core.fetcher)).some(v=>v.version===version))throw Error('所选加载器不适配此游戏版本。');
 const java=item.javaPath?await inspectJava(item.javaPath):(await core.scanJava()).find(j=>j.major===requiredJava(meta));if(!java)throw Error('请先自动准备 Java，再安装加载器。');
 return core.startJob(id,'loader',async(job,signal)=>{
  const work=join(core.root,'loader-work',randomUUID());await mkdir(work,{recursive:true});
  job.phase='下载官方加载器安装器';
  const url=repos[type]+version+'/'+type+'-'+version+'-installer.jar';
  const hash=(await (await officialFetch(url+'.sha1',{fetcher:core.fetcher,signal})).text()).trim().split(/\s/)[0];
  const installer={path:join(work,'installer.jar'),url,hash,label:type+' 安装器'};await download(installer,{root:core.root,fetcher:core.fetcher,signal,onBytes:n=>job.transferred+=n});
  const basePlan=planFiles(meta,core.root),seed=basePlan.files.filter(f=>f.path.includes('libraries')||f.label==='Minecraft 客户端');job.total=seed.length;
  await downloadPool(seed,{root:core.root,fetcher:core.fetcher,signal,threads:core.downloadThreads||8,onBytes:n=>job.transferred+=n,onFile:()=>job.completed++});
  for(const f of seed){const target=safePath(work,f.path.slice(core.root.length+1).replaceAll('\\','/'));await ensureParents(work,target);await copyFile(f.path,target);}
  await writeFile(join(work,'launcher_profiles.json'),JSON.stringify({profiles:{},selectedProfile:''}));
  const baseDir=safePath(work,'versions/'+meta.id);await mkdir(baseDir,{recursive:true});await writeFile(join(baseDir,meta.id+'.json'),JSON.stringify(meta));
  job.phase='运行官方安装器与客户端补丁处理器';
  try{await runInstaller(java.path,['-Djava.awt.headless=true','-jar',installer.path,'--installClient',work],work,signal);}
  catch(error){
    const log=await readFile(join(work,'installer.log'),'utf8');
    if(type!=='forge'||!log.includes('UnrecognizedOptionException')||!log.includes('installClient')||signal.aborted)throw error;
    await runInstaller(java.path,['-Djava.awt.headless=true','-cp',join(dirname(fileURLToPath(import.meta.url)),'java'),'AmberLegacyForge',installer.path,work,meta.id],work,signal);
  }
  signal.throwIfAborted();
  await adoptInstalledProfile(core,dir,item,meta,work,type,version,signal);
 });
}

export async function completeClientLibraries(core,work,profile,signal){
  profile.libraries=profile.libraries.filter(l=>l.clientreq!==false);
  for(const l of profile.libraries){
    const path=l.downloads?.artifact?.path||mavenPath(l.name),target=safePath(work,'libraries/'+path);
    try{await access(target);continue;}catch(e){if(e.code!=='ENOENT')throw e;}
    const url=l.downloads?.artifact?.url||(l.url||'https://libraries.minecraft.net/').replace(/^http:/,'https:').replace(/\/?$/,'/')+path;
    const hash=l.downloads?.artifact?.sha1||(await(await officialFetch(url+'.sha1',{fetcher:core.fetcher,signal})).text()).trim().split(/\s/)[0];
    await download({path:target,url,hash},{root:work,fetcher:core.fetcher,signal});
  }
}
export async function adoptInstalledProfile(core,dir,item,meta,work,type,version,signal){
  const candidates=(await readdir(join(work,'versions'),{withFileTypes:true})).filter(e=>e.isDirectory()&&e.name!==meta.id);if(candidates.length!==1)throw Error('安装器未生成唯一的客户端版本配置。');
  const name=candidates[0].name,profile=JSON.parse(await readFile(safePath(work,`versions/${name}/${name}.json`),'utf8'));
  if(profile.inheritsFrom!==meta.id||typeof profile.mainClass!=='string')throw Error('官方安装器返回的版本与实例不一致。');
  await completeClientLibraries(core,work,profile,signal);
  // Preserve every processor output; module-path arguments may reference non-classpath files.
  const extra=[];const walk=async(relative)=>{for(const entry of await readdir(safePath(work,relative),{withFileTypes:true})){const rel=relative+'/'+entry.name;if(entry.isSymbolicLink())throw Error('安装器输出不可包含符号链接。');if(entry.isDirectory())await walk(rel);else if(entry.isFile()){const source=safePath(work,rel),hash=await digest(source),cache=safePath(core.root,'loader-cache/'+hash);await ensureParents(core.root,cache);await copyFile(source,cache);const target=safePath(core.root,rel);await ensureParents(core.root,target);await copyFile(source,target);extra.push({path:rel.slice('libraries/'.length),sha1:hash,url:'amber-cache:'+hash});}}};await walk('libraries');
  for(const l of profile.libraries){const path=l.downloads?.artifact?.path||mavenPath(l.name);const stored=extra.find(f=>f.path===path);if(!stored)throw Error('安装器依赖文件缺失：'+path);l.downloads={...l.downloads,artifact:stored};}
  profile.amberExtra=extra;profile.amberFormat=1;
  const {atomicJson}=await import('./core.mjs');await atomicJson(join(dir,'loader.json'),profile);delete item.liteVersion;delete item.liteBaseSha1;item.loader=type;item.loaderVersion=type==='optifine'?(profile.libraries.find(l=>l.name.startsWith('optifine:OptiFine:'))?.name.split(':')[2]||version):version;item.loaderSha1=await digest(join(dir,'loader.json'));item.status='metadata-ready';await atomicJson(join(dir,'instance.json'),item);
}
