// SPDX-License-Identifier: MPL-2.0
import {join} from 'node:path';
import {readFile,chmod} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {atomicJson} from './core.mjs';
import {officialFetch,download,digest,ensureParents} from './download.mjs';
import {extractZip} from './vanilla.mjs';
const execute=promisify(execFile);
const platformNames={'win32-x64':'windows-x86_64','win32-arm64':'windows-aarch64','linux-x64':'linux-x86_64','linux-arm64':'linux-aarch64','darwin-x64':'macos-x86_64','darwin-arm64':'macos-aarch64','freebsd-x64':'freebsd-13.2-x86_64'};
export function easyTierChoices160(releases,platform=process.platform+'-'+process.arch){
 const name=platformNames[platform];if(!name)return [];
 return releases.filter(r=>!r.draft&&/^v\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(r.tag_name)).map(r=>{
  const version=r.tag_name.slice(1),asset=r.assets?.find(a=>a.name===`easytier-${name}-${r.tag_name}.zip`);
  if(!asset)return null;
  const valid=/^sha256:[a-f0-9]{64}$/.test(asset.digest||'')&&asset.browser_download_url===`https://github.com/EasyTier/EasyTier/releases/download/${r.tag_name}/${asset.name}`&&Number.isSafeInteger(asset.size)&&asset.size>0&&asset.size<200_000_000;
  return {version,url:asset.browser_download_url,hash:asset.digest?.slice(7),size:asset.size,prerelease:!!r.prerelease,disabled:!valid,reason:valid?'':'Official asset has no usable SHA-256 / 官方文件缺少可用 SHA-256'};
 }).filter(Boolean);
}
export function checkEasyTierHelp160(help){
 const flags=['bind-device','no-tun','ipv4','network-name','peers','no-listener','private-mode','rpc-portal','hostname','console-log-level','tcp-whitelist','udp-whitelist','port-forward'];
 const missing=flags.filter(f=>!help.includes('--'+f));
 if(!help.includes('ET_NETWORK_SECRET'))missing.push('ET_NETWORK_SECRET');
 if(missing.length)throw Error('This release lacks required room capabilities / 此版本缺少房间所需能力: '+missing.join(', '));
}
export class EasyTierVersions160 {
 constructor(rooms){this.rooms=rooms;this.core=rooms.core;this.pointer=join(this.core.root,'network-components','easytier-selection160.json');this.loaded=false;}
 async load(){if(this.loaded)return;await ensureParents(this.core.root,this.pointer);try{const value=JSON.parse(await readFile(this.pointer,'utf8'));if(!/^easytier160-[a-f0-9-]{36}$/.test(value.directory)||!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(value.component?.version)||! /^[a-f0-9]{64}$/.test(value.component?.binaryHash))throw Error('Invalid EasyTier selection / EasyTier 版本记录无效');this.rooms.component=value.component;this.rooms.root=join(this.core.root,'network-components',value.directory);}catch(e){if(e.code!=='ENOENT')throw e;}this.loaded=true;}
 async choices(){const rows=[];for(let page=1;page<=10;page++){const response=await officialFetch(`https://api.github.com/repos/EasyTier/EasyTier/releases?per_page=100&page=${page}`,{fetcher:this.core.fetcher,signal:AbortSignal.timeout(25000)});const text=await response.text();if(text.length>12_000_000)throw Error('Release metadata too large');const releases=JSON.parse(text);if(!Array.isArray(releases))throw Error('Invalid release list');rows.push(...easyTierChoices160(releases));if(releases.length<100)break;}return rows;}
 async install(version){const rooms=this.rooms;if(rooms.installing||this.core.jobs?.some(j=>j.instanceId==='network-component'&&j.state==='running'))throw Error('Component installation already queued / 组件安装已排队');if(rooms.active||rooms.starting||rooms.leavePromise||rooms.closing)throw Error('Stop the room before changing EasyTier / 请先断开房间再切换 EasyTier');rooms.installing=true;try{
  await this.load();const choices=await this.choices(),selected=choices.find(r=>r.version===version);if(!selected||selected.disabled)throw Error(selected?.reason||'Selected EasyTier release unavailable / 所选 EasyTier 版本不可用');
  const job=await this.core.startJob('network-component','network-component',async(job,signal)=>{try{
   const directory='easytier160-'+randomUUID(),root=join(this.core.root,'network-components',directory),path=join(root,'component.zip');await ensureParents(this.core.root,path);
   await download({...selected,path,algorithm:'sha256',label:'EasyTier '+version},{root:this.core.root,fetcher:this.core.fetcher,signal,onBytes:n=>job.transferred+=n});signal.throwIfAborted();await extractZip(path,root);
   const exe=await rooms.findExecutable(root);if(!exe)throw Error('EasyTier executable missing');if(process.platform!=='win32')await chmod(exe,0o755);
   const binaryHash=await digest(exe,'sha256');const result=await execute(exe,['--help'],{windowsHide:true,timeout:15000,maxBuffer:1_000_000,cwd:root,signal});checkEasyTierHelp160(result.stdout+result.stderr);signal.throwIfAborted();
   const component={...selected,binaryHash};await atomicJson(this.pointer,{schema:1,directory,component});rooms.root=root;rooms.component=component;
  }finally{rooms.installing=false;}});rooms.installing=false;return job;
 }catch(e){rooms.installing=false;throw e;}}
}
