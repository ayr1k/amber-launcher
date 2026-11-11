// SPDX-License-Identifier: MPL-2.0
import {relative,join} from 'node:path';
import {lstat,copyFile,constants} from 'node:fs/promises';
import {localPlan170} from './library-runtime170.mjs';
import {ordinary170,json170,inside170} from './library-paths170.mjs';
import {copyVerified} from './safe-copy.mjs';
import {safePath,digest,verified,ensureParents} from './download.mjs';

// An offline snapshot of the validated launch closure for this host platform.
// Deliberately omit launcher configuration, account stores, URLs and user JVM flags.
export async function launchClosure170(root,profile,options={}){
 const {meta,plan}=await localPlan170(root,profile,undefined,options),paths=new Set(plan.files.map(f=>f.path)),extra=[];
 if(plan.logging&&options.loggingRoot&&inside170(options.loggingRoot,plan.logging.path)){const path=plan.logging.path;paths.delete(path);extra.push({source:path,relative:'assets/log_configs/'+meta.logging.client.file.id,size:(await lstat(path)).size,hash:await digest(path,'sha256')});}
 for(const token of meta.arguments.game)if(/^--?.*(?:password|secret|session|token)/i.test(token)&&token!=='--accessToken')throw Error('Launch configuration may contain credentials; remove them before backup / 启动配置可能含凭据，请先移除再备份');
 const index=await json170(plan.index.path);
 for(const value of Object.values(index.objects)){const path=safePath(root,`assets/objects/${value.hash.slice(0,2)}/${value.hash}`);await ordinary170(path);if(!await verified({path,hash:value.hash,size:value.size}))throw Error('Asset checksum mismatch / 资源校验失败');paths.add(path);}
 const files=[];for(const path of paths){await ordinary170(path);const name=relative(root,path).replaceAll('\\','/');if(!/^(?:libraries|assets|versions)\//.test(name)||safePath(root,name)!==path)throw Error('Invalid launch closure path');files.push({relative:name,size:(await lstat(path)).size,hash:await digest(path,'sha256')});}
 const record=r=>r?Object.fromEntries(['path','id','sha1','size'].filter(k=>r[k]!==undefined).map(k=>[k,r[k]])):undefined;
 const metadata={id:profile.game,type:['release','snapshot','old_alpha','old_beta'].includes(meta.type)?meta.type:'release',mainClass:meta.mainClass,arguments:meta.arguments,javaVersion:meta.javaVersion?{majorVersion:meta.javaVersion.majorVersion}:undefined,assetIndex:record(meta.assetIndex),downloads:{client:record(meta.downloads?.client)},libraries:(meta.libraries||[]).map(l=>({name:l.name,rules:l.rules,natives:l.natives,extract:l.extract,downloads:l.downloads?{artifact:record(l.downloads.artifact),classifiers:Object.fromEntries(Object.entries(l.downloads.classifiers||{}).map(([k,v])=>[k,record(v)]))}:undefined})),patches:[{id:'game',version:profile.game},...(meta.patches||[]).filter(p=>Number.isSafeInteger(p.priority)).map(p=>({id:p.id,priority:p.priority,libraries:(p.libraries||[]).map(l=>({name:l.name}))}))]};
 if(meta.logging?.client)metadata.logging={client:{argument:meta.logging.client.argument,type:meta.logging.client.type,file:record(meta.logging.client.file)}};
 const jar=meta.jar||profile.chain.at(-1),client=`versions/${jar}/${jar}.jar`;
 if(!files.some(f=>f.relative===client))throw Error('Client missing from launch closure');
 return {metadata,files,extra,client,platform:process.platform,arch:process.arch};
}

export async function copyClosure170(root,target,closure,check=()=>{}){
 const files=await copyVerified(root,target,closure.files,check);for(const f of closure.extra||[]){check();await ordinary170(f.source);if(!await verified({path:f.source,hash:f.hash,size:f.size,algorithm:'sha256'}))throw Error('Private logging changed during backup');const path=safePath(target,f.relative);await ensureParents(target,path);await copyFile(f.source,path,constants.COPYFILE_EXCL);if(!await verified({path,hash:f.hash,size:f.size,algorithm:'sha256'}))throw Error('Backup logging checksum mismatch');files.push({relative:f.relative,size:f.size,hash:f.hash});}return files;
}
