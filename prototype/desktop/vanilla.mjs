import {PRODUCT_NAME} from './edition.mjs';
import {VERSION} from './product.mjs';
// SPDX-License-Identifier: MPL-2.0
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { release } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { safePath, ensureParents } from './download.mjs';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');

export function rulesAllow(rules,env={os:'windows',arch:'x86_64',version:release(),features:{}}){if(!rules)return true;let allowed=false;for(const rule of rules){const os=rule.os;const match=(!os?.name||os.name===env.os)&&(!os?.arch||new RegExp(os.arch).test(env.arch))&&(!os?.version||new RegExp(os.version).test(env.version))&&Object.entries(rule.features||{}).every(([key,value])=>(env.features[key]||false)===value);if(match)allowed=rule.action==='allow';}return allowed;}
export function requiredJava(meta){if(meta.javaVersion?.majorVersion)return meta.javaVersion.majorVersion;const m=/^1\.(\d+)(?:\.(\d+))?/.exec(meta.id);if(!m)throw new Error('该历史版本未声明 Java 要求。');return +m[1]>=18?17:+m[1]===17?16:8;}
function descriptor(root,relative,record,label){if(!record?.url||!record.sha1)throw new Error(`${label}缺少下载或校验信息，该版本暂不支持。`);return {path:safePath(root,relative),url:record.url,hash:record.sha1,size:record.size,label};}
export function planFiles(meta,root){
 if(meta.inheritsFrom||!meta.mainClass||!meta.downloads?.client||!meta.assetIndex)throw new Error('当前仅支持具有完整官方元数据的原版客户端。');
 const files=[],classpath=[],natives=[];
 for(const library of meta.libraries||[]){if(!rulesAllow(library.rules))continue;
   const artifact=library.downloads?.artifact;
   if(artifact){const f=descriptor(root,'libraries/'+artifact.path,artifact,library.name);files.push(f);classpath.push(f.path);}
   const classifier=library.natives?.windows?.replace('${arch}','64');
   if(classifier){const record=library.downloads?.classifiers?.[classifier];const f=descriptor(root,'libraries/'+record?.path,record,library.name);files.push(f);natives.push({path:f.path,exclude:library.extract?.exclude||['META-INF/']});}
 }
 for(const f of meta.amberExtra||[])files.push(descriptor(root,'libraries/'+f.path,f,'加载器补丁'));
 const client=descriptor(root,'versions/'+meta.id+'/'+meta.id+'.jar',meta.downloads.client,'Minecraft 客户端');files.push(client);classpath.push(client.path);
 const index=descriptor(root,'assets/indexes/'+meta.assetIndex.id+'.json',meta.assetIndex,'资源索引');files.push(index);
 let logging=null;if(meta.logging?.client?.file){logging=descriptor(root,'assets/log_configs/'+meta.logging.client.file.id,meta.logging.client.file,'日志配置');files.push(logging);}
 return {files,classpath,natives,index,logging};
}
export function assetFiles(index,root){return Object.entries(index.objects||{}).map(([name,v])=>{if(!/^[0-9a-f]{40}$/.test(v.hash)||!Number.isSafeInteger(v.size)||v.size<0)throw new Error('资源索引无效。');return {path:safePath(root,`assets/objects/${v.hash.slice(0,2)}/${v.hash}`),hash:v.hash,size:v.size,url:`https://resources.download.minecraft.net/${v.hash.slice(0,2)}/${v.hash}`,label:name};});}
export async function extractZip(path,target,{exclude=[],onlyNative=false}={}){
 let total=0;
 const entries=unzipSync(new Uint8Array(await readFile(path)),{filter:file=>{
   safePath(target,file.name.replace(/\/$/,''));
   if(file.name.endsWith('/')||exclude.some(prefix=>file.name.startsWith(prefix))||(onlyNative&&!/\.(dll|so|dylib|jnilib)$/i.test(file.name)))return false;
   total+=file.originalSize;if(total>600_000_000||file.originalSize>300_000_000)throw new Error('压缩包展开大小超过限制。');return true;
 }});
 for(const [name,bytes] of Object.entries(entries)){const out=safePath(target,name);await ensureParents(target,out);await writeFile(out,bytes);}
}
export function offlineUUID(name){const bytes=createHash('md5').update('OfflinePlayer:'+name).digest();bytes[6]=(bytes[6]&15)|48;bytes[8]=(bytes[8]&63)|128;return bytes.toString('hex');}
export function expandArguments(values,vars,env){return values.flatMap(entry=>typeof entry==='string'?[entry]:rulesAllow(entry.rules,env)?[entry.value].flat():[]).map(value=>value.replace(/\$\{([^}]+)\}/g,(_,key)=>{if(!(key in vars))throw new Error('未知启动参数：'+key);return String(vars[key]);}));}
export function launchArguments(meta,plan,{dir,root,natives,username,memory=4,identity=null,extraJvm=[]}){
 if(!identity&&!/^[A-Za-z0-9_]{3,16}$/.test(username))throw new Error('离线玩家名称需要 3–16 个英文字母、数字或下划线。');
 if(!Number.isInteger(memory)||memory<1||memory>32)throw new Error('内存需要在 1–32 GB 范围内。');
 if(identity&&(!/^[a-f0-9]{32}$/i.test(identity.uuid)||typeof identity.name!=='string'||!identity.name||/[\x00-\x1f]/.test(identity.name)))throw Error('账号角色信息无效。');
 const vars={auth_player_name:identity?.name||username,auth_uuid:identity?.uuid||offlineUUID(username),auth_access_token:identity?.accessToken||'0',auth_session:identity?`token:${identity.accessToken}:${identity.uuid}`:'0',user_type:identity?.type||'legacy',user_properties:'{}',clientid:identity?.clientId||'',auth_xuid:identity?.xuid||'',version_name:meta.id,version_type:meta.type||'release',game_directory:dir,assets_root:join(root,'assets'),assets_index_name:meta.assetIndex.id,game_assets:join(root,'assets/virtual',meta.assetIndex.id),natives_directory:natives,library_directory:join(root,'libraries'),classpath:plan.classpath.join(';'),classpath_separator:';',launcher_name:PRODUCT_NAME,launcher_version:VERSION,resolution_width:'1100',resolution_height:'720'};
 const jvm=meta.arguments?.jvm||['-Djava.library.path=${natives_directory}','-cp','${classpath}'];
 const game=meta.arguments?.game||meta.minecraftArguments?.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(x=>x.replace(/^"|"$/g,''));if(!game)throw new Error('该历史版本没有可识别的启动参数。');
 const logging=plan.logging?[meta.logging.client.argument.replace('${path}',plan.logging.path)]:[];
 return ['-Xms512M',`-Xmx${memory}G`,'-Dfile.encoding=UTF-8',...extraJvm,...expandArguments(jvm,vars),...logging,meta.mainClass,...expandArguments(game,vars)];
}
