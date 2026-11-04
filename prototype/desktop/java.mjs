import {hostPlatform,javaArchitectureMatches} from './platform135.mjs';
import {extractRuntimeTar} from './runtime-archive135.mjs';
// SPDX-License-Identifier: MPL-2.0
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { officialFetch, download, safePath } from './download.mjs';
import { extractZip } from './vanilla.mjs';
const exec=promisify(execFile);
export async function inspectJava(path){
 const {stdout,stderr}=await exec(path,['-XshowSettings:properties','-version'],{windowsHide:true,timeout:10000,maxBuffer:100000,env:{...process.env,JAVA_TOOL_OPTIONS:'',_JAVA_OPTIONS:'',JDK_JAVA_OPTIONS:''}});
 const text=stdout+'\n'+stderr;const version=/java\.version\s*=\s*(\S+)/.exec(text)?.[1];const architecture=/os\.arch\s*=\s*(\S+)/.exec(text)?.[1];const home=/java\.home\s*=\s*([^\r\n]+)/.exec(text)?.[1]?.trim();if(!version||!home)throw new Error('无法识别 Java 运行时。');
 const major=Number(version.startsWith('1.')?version.split('.')[1]:version.split(/[.+_-]/)[0]);if(!javaArchitectureMatches(architecture))throw new Error('Java 架构需要与启动器一致 / Java architecture must match the launcher');return {path:join(home,'bin',hostPlatform().javaName),major,version,architecture};
}
async function findExecutables(root,depth=6){const result=[];try{for(const entry of await readdir(root,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const path=join(root,entry.name);if(entry.isFile()&&entry.name===hostPlatform().javaName)result.push(path);else if(entry.isDirectory()&&depth>0)result.push(...await findExecutables(path,depth-1));}}catch{}return result;}
export async function discoverJava(root){
 const candidates=new Set(['java',...(process.env.JAVA_HOME?[join(process.env.JAVA_HOME,'bin',hostPlatform().javaName)]:[])]);
 const locations=[join(root,'runtimes'),...(process.platform==='win32'?['Java','Eclipse Adoptium','Microsoft'].map(p=>join(process.env.ProgramFiles||'C:/Program Files',p)):process.platform==='darwin'?['/Library/Java/JavaVirtualMachines','/opt/homebrew/opt','/usr/local/opt']:['/usr/lib/jvm','/usr/java','/usr/local/openjdk8','/usr/local/openjdk17','/usr/local/openjdk21','/usr/local/openjdk25'])];
 for(const loc of locations)for(const file of await findExecutables(loc))candidates.add(file);
 const found=await Promise.all([...candidates].map(p=>inspectJava(p).catch(()=>null)));return [...new Map(found.filter(Boolean).map(j=>[j.path.toLowerCase(),j])).values()];
}
export async function installJava(root,major,job,signal,fetcher=fetch){
 if(![8,16,17,21,25].includes(major))throw new Error(`自动安装暂不支持 Java ${major}，请手动选择兼容的 Java。`);
 job.phase=`获取 Java ${major} 官方运行时`;
 const host=hostPlatform();if(!host.javaOS)throw Error('FreeBSD 请通过系统包管理器安装 OpenJDK，再检测 Java / Install OpenJDK using pkg, then detect Java');const extension=process.platform==='win32'?'.zip':'.tar.gz';const url=`https://api.adoptium.net/v3/assets/latest/${major}/hotspot?architecture=${host.javaArch}&image_type=jre&os=${host.javaOS}&vendor=eclipse`;
 const response=await officialFetch(url,{fetcher,signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});const releases=await response.json();const pkg=releases[0]?.binary?.package;if(!pkg||!pkg.name.endsWith(extension)||!/^[a-f0-9]{64}$/.test(pkg.checksum))throw new Error('Adoptium 未返回可校验的 Java ZIP 包。');
 const archive=safePath(root,'runtimes/downloads/'+pkg.checksum+extension);
 job.phase=`下载 Java ${major}`;
 await download({path:archive,url:pkg.link,hash:pkg.checksum,algorithm:'sha256',size:pkg.size,label:'Temurin Java'},{root,signal,fetcher,onBytes:n=>job.transferred+=n});
 signal.throwIfAborted();job.phase=`展开 Java ${major}`;const target=safePath(root,'runtimes/'+pkg.checksum);await mkdir(target,{recursive:true});for(const candidate of await findExecutables(target)){try{const info=await inspectJava(candidate);if(info.major===major)return info;}catch{}}try{if(extension==='.zip')await extractZip(archive,target);else await extractRuntimeTar(archive,target);}catch(e){throw Error('Java 解压失败，请移除该运行时缓存后重试 / Runtime extraction failed: '+e.message);}
 const candidates=await findExecutables(target);for(const path of candidates){const info=await inspectJava(path);if(info.major===major)return info;}
 throw new Error('下载的 Java 与游戏版本要求不匹配。');
}
