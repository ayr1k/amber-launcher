// SPDX-License-Identifier: MPL-2.0
import {createRequire} from 'node:module';
import {packPath} from './modpacks.mjs';
const {unzipSync,zipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
export async function convertCursePack141(bytes,provider){
 const {inspectZip}=await import('./local-packs.mjs');inspectZip(bytes);
 const entries=unzipSync(bytes),manifests=Object.keys(entries).filter(n=>/(^|\/)manifest.json$/.test(n));
 if(manifests.length!==1)throw Error('CurseForge manifest missing or ambiguous / 整合包清单缺失或不唯一');
 const name=manifests[0],prefix=name.slice(0,-13),m=JSON.parse(Buffer.from(entries[name]).toString('utf8'));
 if(m.manifestType!=='minecraftModpack'||m.manifestVersion!==1||!m.minecraft?.version||!Array.isArray(m.files)||m.files.length>5000)throw Error('Unsupported CurseForge manifest / 不支持的整合包清单');
 const dependencies={minecraft:m.minecraft.version};const loaders=m.minecraft.modLoaders||[];
 if(loaders.length>1)throw Error('Multiple pack loaders are not supported / 不支持多个加载器');
 if(loaders.length){const match=/^(forge|neoforge|fabric|quilt)-(.+)$/.exec(loaders[0].id);if(!match)throw Error('Unsupported pack loader / 不支持此加载器');dependencies[['quilt','fabric'].includes(match[1])?match[1]+'-loader':match[1]]=match[2];}
 const files=[],out={},paths=new Set();
 for(const entry of m.files){if(!Number.isSafeInteger(entry.projectID)||!Number.isSafeInteger(entry.fileID))throw Error('Invalid pack file ID');const v=await provider.version(`cf-${entry.projectID}-${entry.fileID}`),p=await provider.project(`cf-${entry.projectID}`),f=v.files[0];
  if(!f.url)throw Error(`作者未允许 API 下载：${p.title}。请从 CurseForge 项目页面手动获取完整包；本次没有安装文件。 / Author-restricted download: ${p.website||p.title}`);
  const folder={mod:'mods',resourcepack:'resourcepacks',shader:'shaderpacks'}[p.project_type];if(!folder)throw Error('Unsupported pack content: '+p.title);
  if(/[\\/]/.test(f.filename))throw Error('Invalid pack filename');const path=packPath('pack-check',folder+'/'+f.filename);if(paths.has(path.toLowerCase()))throw Error('Duplicate pack path');paths.add(path.toLowerCase());
  files.push({path,hashes:f.hashes,fileSize:f.size,downloads:[f.url],env:{client:entry.required===false?'optional':'required'}});
 }
 const override=prefix+String(m.overrides||'overrides')+'/';
 for(const [n,data]of Object.entries(entries)){if(!n.startsWith(override)||n.endsWith('/'))continue;const path=packPath('pack-check',n.slice(override.length));if(paths.has(path.toLowerCase()))throw Error('Pack override conflicts with downloaded file: '+path);out['overrides/'+path]=data;}
 out['modrinth.index.json']=Buffer.from(JSON.stringify({formatVersion:1,game:'minecraft',versionId:String(m.version||'1'),name:String(m.name||'CurseForge'),dependencies,files}));return zipSync(out,{level:1});
}
