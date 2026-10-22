// SPDX-License-Identifier: MPL-2.0
import {readFile,copyFile,stat,constants,mkdir,writeFile,rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {basename,join} from 'node:path';
import {createRequire} from 'node:module';
import {atomicJson} from './core.mjs';
import {safePath,ensureParents} from './download.mjs';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
export function optifineGame(bytes){
 let total=0;const entries=unzipSync(bytes,{filter:f=>{if(!/(^|\/)Config\.class$/.test(f.name))return false;total+=f.originalSize;if(f.originalSize>2_000_000||total>8_000_000)throw Error('OptiFine 元数据过大');return true;}});
 const versions=new Set(Object.values(entries).flatMap(b=>[...Buffer.from(b).toString('latin1').matchAll(/OptiFine_([0-9]+(?:\.[0-9]+){1,2})_HD_/g)].map(m=>m[1])));
 if(versions.size!==1)throw Error('无法可靠识别 OptiFine 对应的 Minecraft 版本');return [...versions][0];
}
// OptiFine is supplied by the user from its official download page; never redistributed.
export async function importOptifine(core,id,path){
 const {dir,item}=await core.metadata(id);await core.requireStopped(dir);
 if(item.loader!=='forge')throw Error('此版本仅支持将 OptiFine 作为 Forge 模组导入；请先安装与 OptiFine 官方兼容列表一致的 Forge。');
 if(core.jobs.some(j=>j.state==='running'))throw Error('请先等待安装任务完成。');
 const info=await stat(path);if(info.size>100_000_000)throw Error('OptiFine 文件过大。');
 const bytes=await readFile(path);let installer=false,forge=false;
 unzipSync(bytes,{filter:f=>{if(f.name==='optifine/Installer.class')installer=true;if(/optifine\/(OptiFineForgeTweaker|OptiFineTransformationService)\.class$/.test(f.name))forge=true;return false;}});
 if(!installer||!forge)throw Error('未识别为支持 Forge 的 OptiFine 官方 JAR。');
 if(optifineGame(bytes)!==item.game)throw Error('OptiFine 与当前 Minecraft 版本不匹配。');
 const name=basename(path);if(!name.toLowerCase().endsWith('.jar'))throw Error('请选择 OptiFine JAR 文件。');
 const target=safePath(dir,'mods/'+name);await ensureParents(dir,target);await copyFile(path,target,constants.COPYFILE_EXCL);item.optifineVersion=name.replace(/^OptiFine_|\.jar$/g,'');await atomicJson(join(dir,'instance.json'),item);return {name,path:join('mods',name)};
}
export function worldEntries(bytes,root){
 let total=0;const entries=unzipSync(bytes,{filter:f=>{safePath(root,f.name.replace(/\/$/,''));if(f.name.endsWith('/'))return false;total+=f.originalSize;if(total>1_000_000_000||f.originalSize>200_000_000)throw Error('地图解压大小超过限制。');return true;}});
 const levels=Object.keys(entries).filter(n=>n==='level.dat'||/^[^/]+\/level\.dat$/.test(n));if(levels.length!==1)throw Error('地图 ZIP 须包含一个根目录或一级文件夹内的 level.dat。');
 const prefix=levels[0].slice(0,-'level.dat'.length);return Object.entries(entries).filter(([n])=>n.startsWith(prefix)).map(([n,data])=>({name:n.slice(prefix.length),data}));
}
export async function importWorld(core,id,path){const {dir}=await core.metadata(id);await core.requireStopped(dir);if((await stat(path)).size>600_000_000)throw Error('地图 ZIP 超过 600 MB。');return core.startJob(id,'world',async(job,signal)=>{
 const entries=worldEntries(await readFile(path),dir),name='导入地图-'+randomUUID().slice(0,8),stage=safePath(dir,'world-import/'+name),target=safePath(dir,'saves/'+name);await ensureParents(dir,stage);await mkdir(stage);job.phase='导入地图到独立存档目录';job.total=entries.length;
 for(const e of entries){signal.throwIfAborted();const out=safePath(stage,e.name);await ensureParents(stage,out);await writeFile(out,e.data,{flag:'wx'});job.completed++;}await ensureParents(dir,target);await rename(stage,target);
 });}
