// SPDX-License-Identifier: MPL-2.0
import {release} from 'node:os';
export function hostPlatform(platform=process.platform,arch=process.arch){
 if(!['win32','darwin','linux','freebsd'].includes(platform)||!['x64','arm64'].includes(arch))throw Error('Unsupported platform / 不支持此系统或架构');
 return {platform,arch,os:{win32:'windows',darwin:'osx',linux:'linux',freebsd:'freebsd'}[platform],javaOS:{win32:'windows',darwin:'mac',linux:'linux'}[platform],javaArch:arch==='arm64'?'aarch64':'x64',javaName:platform==='win32'?'java.exe':'java',separator:platform==='win32'?';':':',executableSuffix:platform==='win32'?'.exe':''};
}
export function gameEnvironment(platform=process.platform,arch=process.arch){const h=hostPlatform(platform,arch);return {os:h.os,arch:arch==='arm64'?'aarch64':'x86_64',version:release(),features:{}};}
export function updateAssetName(product,version,platform=process.platform,arch=process.arch){
 return platform==='win32'?`${product}-${version}-Setup-${arch}.exe`:platform==='darwin'?`${product}-${version}-mac-${arch}.zip`:platform==='linux'?`${product}-${version}-linux-${arch}.deb`:null;
}
export function javaArchitectureMatches(value,arch=process.arch){return (arch==='arm64'?['aarch64','arm64']:['amd64','x86_64']).includes(value);}
