// SPDX-License-Identifier: MPL-2.0
import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {safePath,digest} from './download.mjs';
import {neoGame,loaderVersions} from './loaders.mjs';
import {fabricVersions} from './fabric.mjs';
import {quiltVersions} from './quilt142.mjs';
export const identifier=s=>typeof s==='string'&&/^[-\w.+]{1,150}$/.test(s)&&s!=='.'&&s!=='..';
const fail=message=>{throw Error(message)};
export async function readImportJson(path,noLinks){
 await noLinks(path);const st=await lstat(path);
 if(!st.isFile()||st.size>16000000)fail('版本 JSON 无效或过大。');
 const value=JSON.parse(await readFile(path,'utf8'));
 if(!value||typeof value!=='object'||Array.isArray(value))fail('版本 JSON 无效或过大。');
 return value;
}
function argumentValues(meta,key){
 const args=meta.arguments?.game??(typeof meta.minecraftArguments==='string'?meta.minecraftArguments.match(/"[^"]*"|\S+/g)?.map(x=>x.replace(/^"|"$/g,'')):[])??[];
 if(!Array.isArray(args))fail('版本元数据结构损坏。');
 return args.flatMap((a,i)=>a===key?[args[i+1]]:typeof a==='string'&&a.startsWith(key+'=')?[a.slice(key.length+1)]:[]);
}
export async function identifyProfile(root,id,noLinks){
 const chain=[],seen=new Set(),metadata=[];let next=id;
 while(next){
  if(!identifier(next)||seen.has(next)||chain.length>=16)fail('版本继承无效 / Invalid version inheritance');
  seen.add(next);const path=safePath(root,`versions/${next}/${next}.json`),m=await readImportJson(path,noLinks);
  if(m.id!==next)fail('版本标识不匹配 / Version ID mismatch');
  if(m.inheritsFrom!==undefined&&!identifier(m.inheritsFrom)||m.libraries!==undefined&&!Array.isArray(m.libraries))fail('版本元数据结构损坏。');
  chain.push(m);metadata.push({path,hash:await digest(path,'sha256')});next=m.inheritsFrom;
 }
 const libraries=chain.flatMap(m=>m.libraries||[]).map(l=>{if(!l||typeof l.name!=='string')fail('版本元数据结构损坏。');return l.name});
 const loaders=[];
 for(const [prefix,type] of [['org.quiltmc:quilt-loader:','quilt'],['net.fabricmc:fabric-loader:','fabric'],['net.minecraftforge:forge:','forge'],['net.neoforged:neoforge:','neoforge']]){
  for(const name of libraries.filter(n=>n.startsWith(prefix))){const version=name.slice(prefix.length).split(':')[0];if(!identifier(version))fail('加载器元数据冲突或无效。');if(!loaders.some(l=>l.loader===type&&l.version===version))loaders.push({loader:type,version});}
 }
 if(loaders.length>1)fail('加载器元数据冲突或无效。');
 const {loader='vanilla',version=''}=loaders[0]||{},main=chain.find(m=>m.mainClass)?.mainClass;
 const classes={vanilla:['net.minecraft.launchwrapper.Launch','net.minecraft.client.main.Main','net.minecraft.client.Minecraft','com.mojang.rubydung.RubyDung'],fabric:['net.fabricmc.loader.impl.launch.knot.KnotClient','net.fabricmc.loader.launch.knot.KnotClient'],quilt:['org.quiltmc.loader.impl.launch.knot.KnotClient'],forge:['net.minecraft.launchwrapper.Launch','cpw.mods.modlauncher.Launcher','cpw.mods.bootstraplauncher.BootstrapLauncher'],neoforge:['cpw.mods.bootstraplauncher.BootstrapLauncher','cpw.mods.modlauncher.Launcher','net.neoforged.fml.startup.Client']};
 if(main&&!classes[loader].includes(main)||!main)fail('无法识别此自定义客户端，请保留原启动器 / Unrecognized custom client; use its original launcher');
 const evidence=[];
 const add=(game,source)=>{if(!identifier(game))fail('版本元数据结构损坏。');evidence.push({game,source})};
 // The terminal ID is only a candidate. It is never stripped or assumed official.
 const terminal=chain.at(-1);add(terminal.id,'id');
 for(const m of chain){
  if(m.clientVersion!==undefined)add(m.clientVersion,'clientVersion');
  for(const game of argumentValues(m,'--fml.mcVersion'))add(game,'--fml.mcVersion');
 }
 for(const name of libraries){
  const parts=name.split(':');
  if(parts[0]==='net.fabricmc'&&parts[1]==='intermediary')add(parts[2],'intermediary');
  if(parts[0]==='net.minecraftforge'&&parts[1]==='forge'){const at=parts[2].lastIndexOf('-');if(at>0)add(parts[2].slice(0,at),'forge');}
  if(parts[0]==='net.neoforged'&&parts[1]==='neoforge'){const game=neoGame(parts[2]);if(game)add(game,'neoforge');}
 }
 const explicit=[...new Set(evidence.filter(e=>e.source!=='id').map(e=>e.game))];
 const directories=chain.flatMap(m=>[...(m.gameDir===undefined?[]:[m.gameDir]),...argumentValues(m,'--gameDir')]).filter(p=>p!=='${game_directory}');
 if(directories.some(p=>typeof p!=='string'||!p||p.includes('${')||p.includes('\0')))fail('游戏数据目录配置无效。');
 return {game:explicit.length===1?explicit[0]:terminal.id,loader,version,chain:chain.map(m=>m.id),evidence,metadata,directories};
}
export async function directoryChoices(root,profile,groups,noLinks){
 const explicit=[...(profile.explicitGameDir?[profile.explicitGameDir]:[]),...profile.directories].map(p=>resolve(root,p));
 const choices=[],directoryIssues=[];
 const add=async(path,kind)=>{await noLinks(path);if(!(await lstat(path)).isDirectory())fail('游戏数据目录配置无效。');await readdir(path);if(!choices.some(c=>c.path===path))choices.push({path,kind});};
 if(explicit.length){for(const path of [...new Set(explicit)])try{await add(path,'configured');}catch(e){
  // A moved/inaccessible configured data path does not invalidate version evidence.
  // Keep unsafe links and other unexpected failures blocked; never substitute a path.
  if(!['ENOENT','ENOTDIR','EACCES','EPERM'].includes(e.code))throw e;
  directoryIssues.push({path,reason:['ENOENT','ENOTDIR'].includes(e.code)?'原配置的游戏数据目录不存在或已搬迁，请选择实际目录。':'无法读取原配置的游戏数据目录，请检查权限或选择实际目录。'});
 }}
 else{
  const isolated=safePath(root,`versions/${profile.versionId}`);
  const hasData=async path=>{await noLinks(path);const names=await readdir(path);return groups.some(g=>names.includes(g));};
  if(await hasData(root))await add(root,'shared');
  if(await hasData(isolated))await add(isolated,'isolated');
  if(!choices.length)await add(root,'shared');
 }
 return {directories:choices,directoryIssues,gameDir:!directoryIssues.length&&choices.length===1?choices[0].path:null};
}
export async function validateImportVersion(core,profile,choice){
 let catalog;try{await core.versions();catalog=core.catalog;}catch{return {state:'unavailable',reason:'无法连接官方版本目录，请检查网络后重试。'};}
 const known=new Set(catalog.map(v=>v.id));
 const candidates=[...new Set(profile.evidence.filter(e=>known.has(e.game)).map(e=>e.game))];
 const explicit=profile.evidence.filter(e=>e.source!=='id');
 const needsConfirmation=candidates.length!==1||explicit.some(e=>!known.has(e.game));
 if(choice&&!known.has(choice))return {state:'unsupported',reason:'此基础版本不在官方目录 / Base version unavailable in official catalog'};
 if(!choice&&needsConfirmation)return {state:'needs-version',reason:'基础版本证据不足或冲突，请确认 Minecraft 版本。',candidates,versions:catalog.map(v=>v.id)};
 const game=choice||candidates[0];
 if(profile.loader!=='vanilla'){
  let rows;try{rows=await (profile.loader==='fabric'?fabricVersions(game,core.fetcher):profile.loader==='quilt'?quiltVersions(game,core.fetcher):loaderVersions(game,profile.loader,core.fetcher));}catch{return {state:'unavailable',reason:'无法连接加载器目录，请检查网络后重试。'};}
  if(!rows.some(v=>v.version===profile.version))return {state:'unsupported',reason:'所选基础版本与加载器组合不受支持。'};
 }
 return {state:'ready',game,confirmed:!!choice,candidates};
}
