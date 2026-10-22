// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
import {digest} from './download.mjs';
import {liteProfile} from './liteloader.mjs';
import {legacyGames} from './compatibility.mjs';
export function mergeLite(base,lite){
 if(base.mainClass!=='net.minecraft.launchwrapper.Launch')throw Error('此加载器不使用历史 LaunchWrapper，不能组合 LiteLoader');
 const libs=new Map(base.libraries.map(l=>[l.name.split(':').slice(0,2).join(':'),l]));
 for(const lib of lite.libraries)libs.set(lib.name.split(':').slice(0,2).join(':'),lib);
 const tweaks=lite.arguments.game;
 // In a combined launch LiteLoader owns game arguments; OptiFine's standalone
 // tweaker would append --version a second time. Its companion tweaker does not.
 const adapt=value=>typeof value==='string'?value.replace(/\boptifine\.OptiFineTweaker\b/g,'optifine.OptiFineForgeTweaker'):value;
 return {...base,libraries:[...libs.values()],...(base.minecraftArguments?{minecraftArguments:adapt(base.minecraftArguments)+' '+tweaks.join(' ')}:{arguments:{...base.arguments,game:[...(base.arguments?.game||[]).map(adapt),...tweaks]}})};
}
export async function configureLiteOverlay(core,id,version){
 const {dir,item}=await core.metadata(id);await core.requireStopped(dir);
 if(!legacyGames.includes(item.game)||!['forge','optifine'].includes(item.loader))throw Error('LiteLoader 组合需要受支持的 1.7.10–1.12.2 Forge / OptiFine 实例');
 return core.startJob(id,'loader-combination',async(job,signal)=>{
  job.phase=version?'配置历史加载器组合':'移除 LiteLoader 组合';
  if(await digest(join(dir,'loader.json'))!==item.loaderSha1)throw Error('加载器配置校验失败');
  let base;
  if(item.liteVersion){if(await digest(join(dir,'loader-base.json'))!==item.liteBaseSha1)throw Error('基础加载器备份校验失败');base=JSON.parse(await readFile(join(dir,'loader-base.json'),'utf8'));}
  else{base=JSON.parse(await readFile(join(dir,'loader.json'),'utf8'));if(!version)return;await atomicJson(join(dir,'loader-base.json'),base);item.liteBaseSha1=await digest(join(dir,'loader-base.json'));}
  const profile=version?mergeLite(base,await liteProfile(item.game,version,core.fetcher,signal,core.root)):base;signal.throwIfAborted();
  await atomicJson(join(dir,'loader.json'),profile);item.loaderSha1=await digest(join(dir,'loader.json'));item.status='metadata-ready';
  if(version)item.liteVersion=version;else{delete item.liteVersion;delete item.liteBaseSha1;}
  await atomicJson(join(dir,'instance.json'),item);
 });
}
