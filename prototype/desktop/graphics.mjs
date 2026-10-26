// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {join,win32} from 'node:path';
import {release} from 'node:os';
import {readBoundedFile} from './bounded-io.mjs';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';

export const graphicsModes=['system','high-performance','power-saving'];
export function validateGraphicsMode(mode){if(!graphicsModes.includes(mode))throw Error('显卡偏好无效。');return mode;}
export function supportsGraphics(platform=process.platform,version=release()){return platform==='win32'&&Number(version.split('.')[2])>=19041;}
export function javaRegistryPath(path){if(typeof path!=='string'||path.length>1024||!win32.isAbsolute(path)||!/^javaw?\.exe$/i.test(win32.basename(path))||/[\x00-\x1f]/.test(path))throw Error('无法为此 Java 路径设置显卡偏好。');return win32.normalize(path);}
export function withGpuPreference(value,mode){validateGraphicsMode(mode);const fields=(value||'').split(';').filter(x=>x&&!/^GpuPreference=/i.test(x));if(mode!=='system')fields.push('GpuPreference='+(mode==='high-performance'?2:1));return fields.length?fields.join(';')+';':null;}
// Fixed script and stdin JSON: paths are data, never PowerShell source or shell arguments.
const registryScript=`$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$v=[Console]::In.ReadToEnd()|ConvertFrom-Json;$key=[Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Software\\Microsoft\\DirectX\\UserGpuPreferences');try{$present=$key.GetValueNames() -contains $v.path;$old=if($present){if($key.GetValueKind($v.path) -ne [Microsoft.Win32.RegistryValueKind]::String){throw 'Unsupported registry value'};$key.GetValue($v.path)}else{$null};if($v.action -eq 'read'){@{value=$old}|ConvertTo-Json -Compress}elseif($v.action -eq 'write'){if($old -cne $v.expected){throw 'Graphics preference changed externally'};if($null -eq $v.value){$key.DeleteValue($v.path,$false)}else{$key.SetValue($v.path,[string]$v.value,[Microsoft.Win32.RegistryValueKind]::String)};@{ok=$true}|ConvertTo-Json -Compress}else{throw 'Unsupported action'}}finally{$key.Dispose()}`;
function powershell(script,input){return new Promise((resolve,reject)=>{const executable=join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');const child=execFile(executable,['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:12000,maxBuffer:128000,encoding:'utf8'},(error,stdout)=>{if(error)return reject(Error('无法读取或应用 Windows 显卡偏好，请打开系统图形设置。'));try{resolve(JSON.parse(stdout.replace(/^\uFEFF/,'')));}catch{reject(Error('无法读取或应用 Windows 显卡偏好，请打开系统图形设置。'));}});child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(input));});}
export const windowsGraphicsRegistry={async read(path){return (await powershell(registryScript,{action:'read',path})).value;},async write(path,value,expected){await powershell(registryScript,{action:'write',path,value,expected});}};
export async function graphicsAdapters(){if(process.platform!=='win32')return [];const result=await powershell("$ErrorActionPreference='Stop';[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);@(Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name) | ConvertTo-Json -Compress",{});return (Array.isArray(result)?result:[result]).filter(x=>typeof x==='string').map(x=>x.slice(0,200)).slice(0,16);}
export function rendererFromLog(text){const lines=String(text||'').slice(-24000).split(/\r?\n/);for(const line of lines.reverse()){const match=/(?:OpenGL renderer(?: string)?|GL_RENDERER|Vulkan renderer)\s*[:=]\s*(.{3,200})/i.exec(line)||/OpenGL:\s*(.{3,200}?)\s+GL version\b/i.exec(line);if(match&&!/[\x00-\x1f]/.test(match[1]))return match[1].trim();}return null;}

export class GraphicsPreferences{
 constructor(root,{registry=windowsGraphicsRegistry,supported=supportsGraphics()}={}){this.root=root;this.path=join(root,'graphics-preferences.json');this.registry=registry;this.supported=supported;this.queue=Promise.resolve();}
 exclusive(fn){const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
 async load(){try{const data=JSON.parse(await readBoundedFile(this.path,256000));if(data.schema!==1||!Array.isArray(data.entries)||data.entries.length>256)throw Error();for(const e of data.entries){javaRegistryPath(e.path);if(![e.before,e.after,...('pendingFrom' in e?[e.pendingFrom]:[])].every(v=>v===null||typeof v==='string'&&v.length<16000))throw Error();}return data;}catch(e){if(e.code==='ENOENT')return {schema:1,entries:[]};throw Error('显卡偏好恢复记录无法读取，请打开系统图形设置。');}}
 async save(data){await ensureParents(this.root,this.path);await atomicJson(this.path,data);}
 apply(path,mode){return this.exclusive(async()=>{validateGraphicsMode(mode);if(!this.supported)return {state:mode==='system'?'system':'unsupported',mode};path=javaRegistryPath(path);const data=await this.load(),entry=data.entries.find(e=>e.path.toLowerCase()===path.toLowerCase());if(mode==='system'&&!entry)return {state:'system',mode};const current=await this.registry.read(path);
  if(mode==='system'){if(!entry)return {state:'system',mode};return this.restoreEntry(data,entry,current);}
  if(entry&&current!==entry.after&&current!==entry.before&&(!('pendingFrom' in entry)||current!==entry.pendingFrom))return {state:'external-change',mode};
  const next=withGpuPreference(current,mode);if(entry&&current===next)return {state:'applied',mode};
  const record=entry||{path,before:current,after:next};record.pendingFrom=current;record.after=next;if(!entry){if(data.entries.length>=256)throw Error('显卡偏好记录已满，请先恢复系统设置。');data.entries.push(record);}
  // Keep both sides of an in-flight write: a timeout may occur after Windows committed it.
  await this.save(data);await this.registry.write(path,next,current);delete record.pendingFrom;await this.save(data);return {state:'applied',mode};
 });}
 async restoreEntry(data,entry,current){const owned=current===entry.after||'pendingFrom' in entry&&current===entry.pendingFrom;if(owned&&current!==entry.before)await this.registry.write(entry.path,entry.before,current);const preserved=!owned&&current!==entry.before;data.entries=data.entries.filter(e=>e!==entry);await this.save(data);return {state:preserved?'external-preserved':'restored',mode:'system'};}
 restoreAll(){return this.exclusive(async()=>{const data=await this.load();for(const entry of [...data.entries])await this.restoreEntry(data,entry,await this.registry.read(entry.path));return true;});}
}
