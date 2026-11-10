// SPDX-License-Identifier: MPL-2.0
import {mkdir,lstat,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {VanillaLauncher} from './launcher.mjs';
import {atomicJson} from './core.mjs';
import {safePath,digest,verified} from './download.mjs';
import {rulesAllow,requiredJava,effectiveArguments} from './vanilla.mjs';
import {gameEnvironment} from './platform135.mjs';
import {ordinary170,json170} from './library-paths170.mjs';
import {identifier} from './import-identify151.mjs';
import {sessionAlive} from './process-session.mjs';

const mainClasses=new Set(['net.minecraft.client.main.Main','net.minecraft.launchwrapper.Launch','net.fabricmc.loader.impl.launch.knot.KnotClient','net.fabricmc.loader.launch.knot.KnotClient','org.quiltmc.loader.impl.launch.knot.KnotClient']);
const tweaks=new Set(['net.minecraftforge.fml.common.launcher.FMLTweaker','cpw.mods.fml.common.launcher.FMLTweaker','optifine.OptiFineTweaker','optifine.OptiFineForgeTweaker','com.mumfrey.liteloader.launch.LiteLoaderTweaker']);
function maven(name,classifier){const p=name.split(':');if(p.length<3||p.length>4||p.some(s=>!/^[-\w.+]+$/.test(s)))throw Error('Invalid library coordinate / 依赖坐标无效');return `${p[0].replaceAll('.','/')}/${p[1]}/${p[2]}/${p[1]}-${p[2]}${classifier||p[3]?'-'+(classifier||p[3]):''}.jar`;}
const protectedOptions170=['tweakClass','gameDir','assetsDir','assetIndex','username','uuid','accessToken','userProperties','xuid','clientId'];
export function validateGameValues170(values,vars){
 // jopt-simple accepts unambiguous abbreviations and single-dash long options.
 // Require canonical spelling for every prefix of a protected option, including
 // ambiguous prefixes and equals forms, both before and after substitution.
 for(const token of values){if(!token.startsWith('-'))continue;if(!token.startsWith('--')&&!/^-\d+(?:\.\d+)?$/.test(token))throw Error('Non-canonical protected option / 不接受单横线游戏参数');const option=token.replace(/^-+/,'').split('=')[0];if(protectedOptions170.some(name=>name.startsWith(option))&&!protectedOptions170.some(name=>token==='--'+name))throw Error('Non-canonical protected option / 受保护选项必须使用完整规范形式');}
 for(let i=0;i<values.length;i++){if(values[i]==='--tweakClass'&&!tweaks.has(values[i+1]))throw Error('Unknown tweak class / 未识别的启动扩展');if(/^--(?:tweakClass|gameDir|assetsDir|assetIndex|username|uuid|accessToken|userProperties|xuid|clientId)=/.test(values[i]))throw Error('Ambiguous protected argument / 受保护参数有歧义');}
 for(const [option,value] of [['--gameDir',vars?.game_directory??'${game_directory}'],['--assetsDir',vars?.assets_root??'${assets_root}'],['--accessToken',vars?.auth_access_token??'${auth_access_token}'],['--uuid',vars?.auth_uuid??'${auth_uuid}'],['--username',vars?.auth_player_name??'${auth_player_name}']]){const positions=values.flatMap((v,i)=>v===option?[i]:[]);if(positions.length>1||positions.some(i=>values[i+1]!==value))throw Error('Unsafe protected argument / 不安全的受保护启动参数');}
}
export function safeArguments170(meta,env=gameEnvironment()){
 if(!mainClasses.has(meta.mainClass))throw Error('This launch entry is not supported yet; use the original launcher / 此启动入口尚不支持，请使用原启动器');
 const legacy=meta.minecraftArguments?.match(/"[^"]*"|\S+/g)?.map(s=>s.replace(/^"|"$/g,''));
 const game=legacy?[...legacy,...(meta.arguments?.game||[])]:meta.arguments?.game;
 if(!Array.isArray(game))throw Error('Missing game arguments / 缺少游戏启动参数');
 const allValues=game.flatMap(v=>typeof v==='string'?[v]:Array.isArray(v?.value)?v.value:[v?.value]);
 // Validate the same ordered tokens the launcher will use, after OS/feature filtering.
 // Persist only strings in this in-memory plan, so later expansion cannot change adjacency.
 const values=effectiveArguments(game,env);
 if(allValues.some(v=>typeof v!=='string'||v.length>10000||/[\x00-\x1f]/.test(v)))throw Error('Invalid game arguments / 游戏参数无效');
 validateGameValues170(values);
 // External JVM flags, agents, wrappers and shell commands are never adopted.
 const jvm=meta.arguments?.jvm||[];
 const allowed=new Set(['-Djava.library.path=${natives_directory}','-Dminecraft.launcher.brand=${launcher_name}','-Dminecraft.launcher.version=${launcher_version}','-cp','${classpath}','-XstartOnFirstThread','-XX:HeapDumpPath=MojangTricksIntelDriversForPerformance_javaw.exe_minecraft.exe.heapdump','-Dos.name=Windows 10','-Dos.version=10.0']);
 allowed.add('-Xss1M');
 for(const row of jvm){for(const v of typeof row==='string'?[row]:[row.value].flat())if(!allowed.has(v))throw Error('Custom JVM arguments are not adopted; use the original launcher / 不接管自定义 JVM 参数，请使用原启动器');}
 return {...meta,arguments:{game:values,jvm:['-Djava.library.path=${natives_directory}','-cp','${classpath}']}};
}
export function prioritizedLibraries170(meta){
 const patches=meta.patches||[];if(!Array.isArray(patches))throw Error('Invalid components');
 const priority=new Map();for(const p of patches){if(!Number.isSafeInteger(p.priority)||!Array.isArray(p.libraries))continue;for(const l of p.libraries)if(typeof l.name==='string')priority.set(l.name,Math.max(priority.get(l.name)??-Infinity,p.priority));}
 return [...(meta.libraries||[])].sort((a,b)=>(priority.get(b.name)||0)-(priority.get(a.name)||0));
}
export async function localPlan170(root,profile,env=gameEnvironment()){
 const meta=safeArguments170(profile.meta,env),files=[],classpath=[],natives=[];
 // LaunchWrapper Forge must receive the Forge-aware OptiFine adapter. HMCL's
 // persisted supplemental argument can still name the standalone adapter.
 if(profile.loader==='forge'&&profile.optifine&&meta.mainClass==='net.minecraft.launchwrapper.Launch')meta.arguments.game=meta.arguments.game.map((value,index,all)=>index>0&&all[index-1]==='--tweakClass'&&value==='optifine.OptiFineTweaker'?'optifine.OptiFineForgeTweaker':value);
 const add=async(relative,record,kind)=>{const path=safePath(root,relative);await ordinary170(path);const st=await lstat(path);if(!st.isFile())throw Error('Missing game file / 缺少游戏文件');if(record?.sha1&&!await verified({path,hash:record.sha1,size:record.size}))throw Error('Game file checksum mismatch / 游戏文件校验不匹配');files.push({path,hash:await digest(path,'sha256'),algorithm:'sha256'});if(kind==='class')classpath.push(path);if(kind==='native')natives.push({path,exclude:['META-INF/']});return path;};
 const coordinates=new Map(),seenPaths=new Set();
 const unique=async(path,record,kind)=>{if(seenPaths.has(kind+path))return;seenPaths.add(kind+path);await add(path,record,kind);};
 for(const library of prioritizedLibraries170(meta)){if(!rulesAllow(library.rules,env))continue;const parts=library.name?.split(':'),coordinate=parts?.slice(0,2).join(':');if(coordinates.has(coordinate)&&coordinates.get(coordinate)!==parts[2])continue;coordinates.set(coordinate,parts[2]);const artifact=library.downloads?.artifact;
  const emptyNativeStub=library.natives&&artifact?.size===22&&artifact.sha1==='b04f3ee8f5e43fa3b162981b50bb72fe1acabb33';
  if(!emptyNativeStub&&(artifact||!library.natives))await unique('libraries/'+(artifact?.path||maven(library.name)),artifact,'class');
  const classifier=library.natives?.[env.os]?.replace('${arch}','64');if(classifier){if(process.arch!=='x64')throw Error('Legacy external natives require x64 / 旧版外部原生库仅支持 x64');const record=library.downloads?.classifiers?.[classifier];await unique('libraries/'+(record?.path||maven(library.name,classifier)),record,'native');}
 }
 const jar=meta.jar||profile.chain.at(-1);if(!identifier(jar))throw Error('Invalid client jar path / 客户端 JAR 路径无效');await add(`versions/${jar}/${jar}.jar`,meta.downloads?.client,'class');
 // Forge binary patches require the original client before OptiFine patched classes.
 if(meta.mainClass==='net.minecraft.launchwrapper.Launch'){classpath.unshift(classpath.pop());const optifine=classpath.filter(p=>/[\\/]optifine[\\/]OptiFine[\\/]/i.test(p));for(const p of optifine){classpath.splice(classpath.indexOf(p),1);classpath.push(p);}}
 if(!identifier(meta.assetIndex?.id))throw Error('Missing asset index / 缺少资源索引');const index=await add(`assets/indexes/${meta.assetIndex.id}.json`,meta.assetIndex);
 // Assets are read in place; missing objects are reported, never silently repaired.
 const assets=await json170(index);if(!assets.objects||Object.keys(assets.objects).length>100000)throw Error('Invalid asset index / 资源索引无效');
 for(const value of Object.values(assets.objects)){if(!/^[a-f0-9]{40}$/.test(value?.hash))throw Error('Invalid asset hash / 资源校验值无效');const path=safePath(root,`assets/objects/${value.hash.slice(0,2)}/${value.hash}`);await ordinary170(path);const st=await lstat(path);if(!st.isFile()||st.size!==value.size)throw Error('Missing or incomplete assets; repair in the original launcher / 资源缺失或不完整，请在原启动器修复');}
 let logging=null;
 if(!meta.logging?.client&&(meta.libraries||[]).some(l=>l.name?.startsWith('org.apache.logging.log4j:log4j-core:'))){const old=/^1\.(?:[0-9]|10|11)(?:\.|$)/.test(profile.game),id=old?'client-1.7.xml':'client-1.12.xml';meta.logging={client:{argument:'-Dlog4j.configurationFile=${path}',type:'log4j2-xml',file:{id,sha1:old?'50c9cc4af6d853d9fc137c84bcd153e2bd3a9a82':'bd65e7d2e3c237be76cfbef4c2405033d7f91521',size:old?966:888}}};}

 if(meta.logging?.client){const c=meta.logging.client,f=c.file;if(c.argument!=='-Dlog4j.configurationFile=${path}'||c.type!=='log4j2-xml'||!identifier(f?.id)||!/^client.*\.xml$/.test(f.id)||!['bd65e7d2e3c237be76cfbef4c2405033d7f91521','50c9cc4af6d853d9fc137c84bcd153e2bd3a9a82'].includes(f.sha1))throw Error('Unsupported logging configuration; repair using the original launcher / 不支持的日志安全配置，请使用原启动器修复');logging={path:await add('assets/log_configs/'+f.id,f)};}
 return {meta,plan:{files,classpath,natives,index:{path:index},logging,validateGameArguments:(values,vars)=>validateGameValues170(values,{...vars,game_directory:profile.gameDir??vars.game_directory,assets_root:join(root,'assets')})}};
}
export class LibraryRuntime170 extends VanillaLauncher {
 async runningSessions170(){const rows=[...this.processes.values()].filter(r=>r.state==='running');await ordinary170(this.stateRoot,{missing:true});for(const entry of await readdir(this.stateRoot,{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;})){if(!entry.isDirectory())continue;const session=await json170(join(this.stateRoot,entry.name,'.amber-session.json'),{optional:true});if(session&&await sessionAlive(session)&&!rows.some(r=>r.id===session.id))rows.push({...session,instanceId:entry.name,state:'running'});}return rows;}
 constructor(registry,entry,stateRoot){super(entry.path);this.registry=registry;this.libraryId=entry.id;this.stateRoot=stateRoot;}
 async init(){await ordinary170(this.root);await ordinary170(this.stateRoot,{missing:true});await mkdir(this.stateRoot,{recursive:true});}
 async listInstances(){const rows=(await this.registry.scan(this.libraryId)).rows.filter(r=>!r.error);return Promise.all(rows.map(async r=>{const stored=await json170(join(this.stateRoot,r.id,'instance.json'),{optional:true});return {...r,...stored,id:r.id,name:stored?.name||r.id,icon:stored?.icon||'grass',status:'installed',external:true,createdAt:'',javaMajor:r.game?.startsWith('1.16')?8:null};}));}
 async instancePath(id){if(!identifier(id))throw Error('Invalid version');await this.registry.profile(this.libraryId,id);await this.init();const path=safePath(this.stateRoot,id);await ordinary170(path,{missing:true});await mkdir(path,{recursive:true});return path;}
 async metadata(id){const profile=await this.registry.profile(this.libraryId,id),dir=await this.instancePath(id);const stored=await json170(join(dir,'instance.json'),{optional:true});const item={...stored,id,name:stored?.name||id,icon:stored?.icon||'grass',game:profile.game,status:'installed',loader:profile.loader};return {profile,dir,item,meta:{...profile.meta,id:profile.game}};}
 async runtimeMetadata(id){const result=await this.metadata(id);if(!result.profile.gameDir)throw Error('Confirm this version’s game directory first / 请先确认此版本的游戏目录');const runtime=await localPlan170(this.root,result.profile);return {...result,...runtime,gameDirectory:result.profile.gameDir,external:true};}
 async validateExternalBeforeSpawn(id,runtime){const current=await this.registry.profile(this.libraryId,id);if(current.gameDir!==runtime.gameDirectory||JSON.stringify(current.fingerprints)!==JSON.stringify(runtime.profile.fingerprints))throw Error('Library changed during launch preparation / 启动准备期间实例库发生变化');for(const f of runtime.plan.files){await ordinary170(f.path);if(!await verified(f))throw Error('Game files changed during launch preparation / 启动准备期间游戏文件发生变化');}}
 async install(){throw Error('Repair external versions using the original launcher / 请使用原启动器修复外部版本');}
 async prepareJava(){throw Error('Select an existing Java runtime for external versions / 请为外部版本选择已有 Java');}
 async selectJava(id,path){if(!this.javaCandidates.has(path))throw Error('Select Java with the file picker');const result=await this.metadata(id);result.item.javaPath=path;await atomicJson(join(result.dir,'instance.json'),result.item);return this.javaCandidates.get(path);}
 async resolveGameJava(id){const {item,meta}=await this.metadata(id);const {inspectJava}=await import('./java.mjs');const java=item.javaPath?await inspectJava(item.javaPath):(await this.scanJava()).find(j=>j.major===requiredJava(meta));if(!java||java.major!==requiredJava(meta))throw Error(`Select Java ${requiredJava(meta)} / 请选择 Java ${requiredJava(meta)}`);return java;}
}
