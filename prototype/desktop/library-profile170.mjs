// SPDX-License-Identifier: MPL-2.0
import {readdir,lstat,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {safePath,digest} from './download.mjs';
import {identifier} from './import-identify151.mjs';
import {ordinary170,json170,inside170} from './library-paths170.mjs';

const dataNames=['saves','mods','config','resourcepacks','shaderpacks','options.txt'];
const bad=()=>{throw Error('Unsupported or conflicting library metadata / 实例库元数据不受支持或存在冲突');};
function values(meta,key){const args=meta.arguments?.game||meta.minecraftArguments?.match(/"[^"]*"|\S+/g)?.map(x=>x.replace(/^"|"$/g,''))||[];if(!Array.isArray(args))bad();return args.flatMap((v,i)=>v===key?[args[i+1]]:typeof v==='string'&&v.startsWith(key+'=')?[v.slice(key.length+1)]:[]);}
function merge(parent,child){
 const result={...parent,...child,libraries:[...(child.libraries||[]),...(parent.libraries||[])]};
 if(parent.arguments||child.arguments)result.arguments={game:[...(parent.arguments?.game||[]),...(child.arguments?.game||[])],jvm:[...(parent.arguments?.jvm||[]),...(child.arguments?.jvm||[])]};
 delete result.inheritsFrom;return result;
}
export async function profile170(root,id,{directoryChoice=null}={}){
 if(!identifier(id))bad();await ordinary170(root);
 const chain=[],seen=new Set(),fingerprints=[];let next=id;
 while(next){if(!identifier(next)||seen.has(next)||chain.length===16)bad();seen.add(next);const file=safePath(root,`versions/${next}/${next}.json`),meta=await json170(file);if(meta.id!==next||meta.libraries&&!Array.isArray(meta.libraries))bad();chain.push(meta);fingerprints.push({path:file,sha256:await digest(file,'sha256')});next=meta.inheritsFrom;}
 let meta={};for(const entry of [...chain].reverse())meta=merge(meta,entry);
 // HMCL writes a resolved profile as well as patches. Never append patches again.
 const patches=meta.patches||[];if(!Array.isArray(patches)||patches.length>32)bad();
 const base=patches.find(p=>p.id==='game')?.version||chain.at(-1).id;
 const names=(meta.libraries||[]).map(l=>l?.name);if(names.some(n=>typeof n!=='string'))bad();
 const loader=names.some(n=>n.startsWith('net.fabricmc:fabric-loader:'))?'fabric':names.some(n=>n.startsWith('org.quiltmc:quilt-loader:'))?'quilt':names.some(n=>n.startsWith('net.minecraftforge:forge:'))?'forge':names.some(n=>n.startsWith('net.neoforged:neoforge:'))?'neoforge':'vanilla';
 const optifine=names.some(n=>/^optifine:|^net\.optifine:/.test(n))||patches.some(p=>p.id==='optifine');
 const versionDir=safePath(root,`versions/${id}`),explicit=chain.flatMap(m=>[...(m.gameDir?[m.gameDir]:[]),...values(m,'--gameDir')]).filter(p=>p!=='${game_directory}');
 const launcher=await json170(join(root,'launcher_profiles.json'),{optional:true});
 for(const p of Object.values(launcher?.profiles||{}))if(p?.lastVersionId===id&&p.gameDir)explicit.push(p.gameDir);
 const evidence=[];
 for(const p of explicit){if(typeof p!=='string'||p.includes('\0')||p.includes('${'))bad();const target=resolve(root,p);if(!inside170(root,target))throw Error('Configured game directory lies outside this library; register it explicitly / 配置的游戏目录位于库外，请单独确认注册');await ordinary170(target);evidence.push({path:target,source:'configured'});}
 // Per-version HMCL settings are authoritative only when present. Missing global
 // launcher settings must not be inferred from a folder name or a mods directory.
 const hmcl=await json170(join(versionDir,'hmclversion.cfg'),{optional:true});
 if(hmcl&&!hmcl.usesGlobal){const mode=hmcl.gameDirType;if(mode===0)evidence.push({path:root,source:'HMCL'});else if(mode===1)evidence.push({path:versionDir,source:'HMCL'});else if(mode===2){if(typeof hmcl.gameDir!=='string')bad();const path=resolve(root,hmcl.gameDir);if(!inside170(root,path))bad();await ordinary170(path);evidence.push({path,source:'HMCL'});}}
 const pclPath=join(versionDir,'PCL','Setup.ini');let pcl=null;try{await ordinary170(pclPath);const st=await lstat(pclPath);if(st.size>1000000)bad();pcl=await readFile(pclPath,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
 if(pcl){const current=[...pcl.matchAll(/^VersionArgumentIndieV2\s*:\s*(True|False)\s*$/gmi)],matches=[...pcl.matchAll(/^VersionArgumentIndie\s*:\s*(\d+)\s*$/gm)];if(matches.length>1||current.length>1)bad();if(current.length)evidence.push({path:current[0][1].toLowerCase()==='true'?versionDir:root,source:'PCL'});else if(matches[0]?.[1]==='1')evidence.push({path:versionDir,source:'PCL'});else if(matches[0]?.[1]==='2')evidence.push({path:root,source:'PCL'});}
 const paths=[...new Set(evidence.map(e=>resolve(e.path)))];if(paths.length>1)throw Error('Conflicting game-directory settings / 游戏目录配置存在冲突');
 const candidates=[];for(const path of [root,versionDir]){await ordinary170(path);const entries=await readdir(path);candidates.push({path,content:dataNames.filter(n=>entries.includes(n))});}
 if(directoryChoice&&!candidates.some(c=>c.path===directoryChoice)&&!paths.includes(directoryChoice))bad();
 const gameDir=directoryChoice||paths[0]||null;
 if(gameDir){await ordinary170(gameDir);for(const name of dataNames)await ordinary170(join(gameDir,name),{missing:true});}
 return {id,name:id,game:base,loader,optifine,versionDir,gameDir,isolation:gameDir?(gameDir===root?'shared':'isolated'):'unknown',directorySource:directoryChoice?'user':evidence[0]?.source||'unknown',candidates,chain:chain.map(m=>m.id),fingerprints,meta};
}
export async function scan170(root,choices={}){
 await ordinary170(root);await ordinary170(join(root,'versions'));const rows=[];
 for(const entry of await readdir(join(root,'versions'),{withFileTypes:true})){if(!entry.isDirectory()&&!entry.isSymbolicLink())continue;try{const {meta,...row}=await profile170(root,entry.name,{directoryChoice:choices[entry.name]});rows.push(row);}catch(e){rows.push({id:entry.name,name:entry.name,error:e.message,isolation:'unknown'});}}
 const modes=new Set(rows.map(r=>r.isolation));return {root,rows,isolation:modes.size===1?[...modes][0]||'unknown':modes.has('unknown')?'unknown':'mixed'};
}
