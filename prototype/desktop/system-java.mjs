// SPDX-License-Identifier: MPL-2.0
import {lstat, readlink, readdir} from 'node:fs/promises';
import {posix,win32} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {TaskQueue} from './task-queue132.mjs';
const exec=promisify(execFile),windowsScans=new TaskQueue(1);

async function windowsSystemJava(signal){
 // Locate the OS shell from the loaded Windows KnownDLL, independently of PATH,
 // SystemRoot, JAVA_HOME and user-supplied registry or game configuration.
 const dll=process.report?.getReport().sharedObjects?.find(p=>win32.isAbsolute(p)&&/[/\\]System32[/\\]ntdll\.dll$/i.test(p));
 if(!dll)return [];
 const system32=win32.dirname(dll),shellDir=win32.join(system32,'WindowsPowerShell','v1.0');
 const script=fileURLToPath(new URL('./system-java-windows.ps1',import.meta.url));
 return windowsScans.run('system',async()=>{
  try{
   const {stdout}=await exec(win32.join(shellDir,'powershell.exe'),['-NoLogo','-NoProfile','-NonInteractive','-File',script],{
    signal,windowsHide:true,cwd:system32,timeout:30000,maxBuffer:64000,
    env:{SystemRoot:win32.dirname(system32),windir:win32.dirname(system32),PATH:system32,PSModulePath:win32.join(shellDir,'Modules')}
   });
   return JSON.parse(stdout);
  }catch{signal?.throwIfAborted();return [];}
 },{signal});
}

// Only the administrator can populate or replace any part of a system JVM,
// including external configuration and symlink targets used by distro packages.
export async function trustedSystemJava(home,signal,fs={lstat,readlink,readdir}){
 const checked=new Map(),visited=new Set();
 let entries=0;
 async function inspect(path){
  signal?.throwIfAborted();
  let stat=checked.get(path);
  if(!stat){
   if(++entries>24000)throw Error('System Java tree exceeds limit');
   stat=await fs.lstat(path);
   if(stat.uid!==0||(!stat.isSymbolicLink()&&(stat.mode&0o022)))throw Error('Writable or unowned system Java: '+path+' (uid '+stat.uid+', gid '+stat.gid+', mode '+(stat.mode&0o7777).toString(8)+')');
   checked.set(path,stat);
  }
  return stat;
 }
 async function resolveProtected(path){
  let current='/',pending=path.split('/'),links=0;
  await inspect(current);
  while(pending.length){
   const name=pending.shift();
   if(!name||name==='.')continue;
   if(name==='..'){current=posix.dirname(current);continue;}
   current=posix.join(current,name);
   const stat=await inspect(current);
   if(stat.isSymbolicLink()){
    if(++links>40)throw Error('Too many system Java links');
    const target=await fs.readlink(current);
    current=target.startsWith('/')?'/':posix.dirname(current);
    pending=target.split('/').concat(pending);
   }
  }
  return current;
 }
 async function walk(path){
  if(visited.has(path))return;
  visited.add(path);
  const st=await inspect(path);
  if(st.isSymbolicLink()){
   // A dangling link below protected parents can only be filled by the admin.
   let dest;try{dest=await resolveProtected(path);}catch(e){if(e.code==='ENOENT')return;throw e;}
   await walk(dest);
  }else if(st.isDirectory()){
   for(const name of await fs.readdir(path))await walk(posix.join(path,name));
  }else if(!st.isFile())throw Error('Unexpected system Java entry');
 }
 const canonical=await resolveProtected(home);
 const java=await resolveProtected(posix.join(canonical,'bin/java'));
 if(java!==posix.join(canonical,'bin/java')||!(await inspect(java)).isFile())return null;
 await walk(canonical);
 return java;
}

export async function systemJavaCandidates(platform,signal){
 if(platform==='win32')return windowsSystemJava(signal);
 let roots;
 if(platform==='darwin')roots=['/Library/Java/JavaVirtualMachines'];
 else if(platform==='linux')roots=['/usr/lib/jvm','/usr/java'];
 else if(platform==='freebsd')roots=['/usr/local'];
 else return [];
 const result=new Set();
 for(const root of roots){
  let entries;try{entries=await readdir(root,{withFileTypes:true});}catch{continue;}
  for(const entry of entries){
   signal?.throwIfAborted();
   if(!entry.isDirectory()&&!entry.isSymbolicLink()||platform==='freebsd'&&!/^openjdk\d+$/.test(entry.name))continue;
   const home=posix.join(root,entry.name,platform==='darwin'?'Contents/Home':'');
   try{const path=await trustedSystemJava(home,signal);if(path)result.add(path);}catch{signal?.throwIfAborted();}
  }
 }
 return [...result];
}
