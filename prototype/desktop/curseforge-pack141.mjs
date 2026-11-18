// SPDX-License-Identifier: MPL-2.0
import {packPath} from './modpacks.mjs';
import {archiveKey} from './pack-zip176.mjs';
import {carryCurseForgeApproval} from './curseforge-delivery176.mjs';
export async function resolveCursePack(m,provider,{signal}={}){
 if(m.manifestType!=='minecraftModpack'||m.manifestVersion!==1||!m.minecraft?.version||!Array.isArray(m.files)||m.files.length>5000)throw Error('Unsupported CurseForge manifest / 不支持的整合包清单');
 const dependencies={minecraft:m.minecraft.version};const loaders=m.minecraft.modLoaders||[];
 if(loaders.length>1)throw Error('Multiple pack loaders are not supported / 不支持多个加载器');
 if(loaders.length){const match=/^(forge|neoforge|fabric|quilt)-(.+)$/.exec(loaders[0].id);if(!match)throw Error('Unsupported pack loader / 不支持此加载器');dependencies[['quilt','fabric'].includes(match[1])?match[1]+'-loader':match[1]]=match[2];}
 const files=[],paths=new Set(),ids=new Set(),projects=new Map();
 for(const entry of m.files){
  signal?.throwIfAborted();
  if(!Number.isSafeInteger(entry?.projectID)||!Number.isSafeInteger(entry?.fileID)||entry.projectID<1||entry.fileID<1)throw Error('Invalid pack file ID / 整合包文件 ID 无效');
  const projectId=`cf-${entry.projectID}`, versionId=`${projectId}-${entry.fileID}`;
  if(ids.has(versionId))throw Error('Duplicate pack file ID / 整合包包含重复文件 ID');
  ids.add(versionId);
  const v=await provider.version(versionId,{signal});
  if(!projects.has(projectId))projects.set(projectId,await provider.project(projectId,{signal}));
  const p=projects.get(projectId),f=v.files[0];
  if(!f.url||p.distribution===false)throw Error(`Third-party download unavailable / CurseForge 未提供第三方下载：${p.title} (${versionId})`);
  const folder={mod:'mods',resourcepack:'resourcepacks',shader:'shaderpacks'}[p.project_type];if(!folder)throw Error('Unsupported pack content: '+p.title);
  if(typeof f.filename!=='string'||/[\\/]/.test(f.filename))throw Error('Invalid pack filename');const path=packPath('pack-check',folder+'/'+f.filename),key=archiveKey(path);if(paths.has(key))throw Error('Duplicate pack path');paths.add(key);
  files.push({...carryCurseForgeApproval(f,p),path,hashes:f.hashes,fileSize:f.size,downloads:[f.url],env:{client:entry.required===false?'optional':'required'},versionId});
 }
 return {formatVersion:1,game:'minecraft',versionId:String(m.version||'1'),name:String(m.name||'CurseForge'),dependencies,files};
}
