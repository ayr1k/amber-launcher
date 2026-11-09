// SPDX-License-Identifier: MPL-2.0
import {readdir,lstat,readFile,writeFile,rename,link,unlink,chmod,copyFile} from 'node:fs/promises';
import {constants} from 'node:fs';
import {join,extname,dirname,basename} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {safePath,ensureParents} from './download.mjs';
const allowed=/\.(json5?|toml|ya?ml|properties|txt|cfg|conf|ini|js|zs|mcfunction)$/i;
const hash=b=>createHash('sha256').update(b).digest('hex');
const conflict=()=>Error('EDITOR_CONFLICT: File changed externally; edits retained. Compare the disk file / 文件已被外部修改；编辑内容已保留，请比较磁盘文件');
import {textMetadata} from './editor-text163.mjs';
export {textMetadata} from './editor-text163.mjs';
export class InstanceEditor {
 constructor(core,{directories=['config','defaultconfigs','kubejs','scripts'],files=['options.txt','servers.properties'],io={rename,link}}={}){this.core=core;this.directories=directories;this.files=files;this.io=io;this.queue=Promise.resolve();}
 async path(id,name){if(typeof name!=='string'||!allowed.test(name)||!this.directories.some(d=>name.startsWith(d+'/'))&&!this.files.includes(name))throw Error('Unsupported configuration path / 不支持的配置路径');const dir=await this.core.instancePath(id),p=safePath(dir,name);await ensureParents(dir,p);const s=await lstat(p);if(!s.isFile()||s.isSymbolicLink()||s.size>2_000_000)throw Error('Only text files up to 2 MB / 仅支持 2 MB 内文本');return p;}
 async list(id){const dir=await this.core.instancePath(id),rows=[];const walk=async(base,depth=0)=>{if(depth>12||rows.length>=2000)return;const p=safePath(dir,base);await ensureParents(dir,p);let entries;try{if((await lstat(p)).isSymbolicLink())return;entries=await readdir(p,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const e of entries){if(e.isSymbolicLink())continue;const n=base+'/'+e.name;if(e.isDirectory())await walk(n,depth+1);else if(allowed.test(n)&&!n.includes('.amber-edit-'))rows.push(n);}};for(const n of this.directories)await walk(n);for(const n of this.files)try{await this.path(id,n);rows.push(n);}catch{}return rows.sort();}
 async read(id,name){const p=await this.path(id,name),b=await readFile(p);if(b.length>2_000_000||b.includes(0))throw Error('Binary or unsupported encoding / 二进制或不支持的编码');let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);}catch{throw Error('Only UTF-8 is supported; original file unchanged / 仅支持 UTF-8，原文件未改动');}return {name,path:p,text,hash:hash(b),...textMetadata(text)};}
 save(id,input){const task=this.queue.then(async()=>{
  if(typeof input?.text!=='string'||Buffer.byteLength(input.text)>2_000_000||input.text.includes('\0'))throw Error('Invalid text or text too large / 文本无效或过大');
  const checkRunning=async()=>{if(this.core.runtimeStatus&&(await this.core.runtimeStatus()).processes.some(p=>p.instanceId===id&&p.state==='running'))throw Error('Stop the game before editing / 请先关闭游戏');};
  await checkRunning();const p=await this.path(id,input.name),old=await readFile(p),stat=await lstat(p);
  if(hash(old)!==input.hash)throw conflict();
  if(!(stat.mode&0o222))throw Error('EACCES: File is read-only; check its permissions before saving / 文件只读，请检查权限后重试');
  if(extname(p).toLowerCase()==='.json')JSON.parse(input.text.replace(/^\uFEFF/,''));
  const backup=p+'.amber-edit-'+Date.now()+'-'+randomUUID()+'.bak',tmp=p+'.amber-edit-'+randomUUID();let displaced=false;
  try{
   await writeFile(tmp,input.text,{flag:'wx',mode:stat.mode});await chmod(tmp,stat.mode);
   await checkRunning();await this.path(id,input.name);
   if(hash(await readFile(p))!==input.hash)throw conflict();
   // Move the actual entry, preserving even writes after the final hash check.
   await this.io.rename(p,backup);displaced=true;
   const moved=await lstat(backup);
   if(moved.isSymbolicLink()||!moved.isFile()||moved.dev!==stat.dev||moved.ino!==stat.ino||hash(await readFile(backup))!==input.hash)throw conflict();
   await ensureParents(await this.core.instancePath(id),p);
   // Exclusive creation cannot replace a competing writer's newly created entry.
   await this.io.link(tmp,p);
   const written=Buffer.from(input.text);
   if(hash(await readFile(backup))!==input.hash||hash(await readFile(p))!==hash(written))throw conflict();
   return {name:input.name,path:p,text:input.text,hash:hash(written),...textMetadata(input.text)};
  }catch(e){
   if(displaced){
    try{await ensureParents(await this.core.instancePath(id),p);const preserved=await lstat(backup);if(preserved.isSymbolicLink()||!preserved.isFile())throw Error('Unsafe recovery entry');await copyFile(backup,p,constants.COPYFILE_EXCL);}catch(restore){if(restore.code!=='EEXIST')e.message+='; Recovery file / 恢复文件: '+backup;}
    e.message+='; Preserved file / 已保留文件: '+backup;
   }
   throw e;
  }finally{await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')console.warn('Editor temporary file retained:',tmp,e.code);});}
 });this.queue=task.catch(()=>{});return task;}
 async history(id,name){
  const p=await this.path(id,name),prefix=basename(p)+'.amber-edit-',rows=[];
  for(const token of await readdir(dirname(p))){
   if(!token.startsWith(prefix))continue;
   const match=/^(\d+)(?:-[a-f0-9-]{36})?\.bak$/.exec(token.slice(prefix.length));
   if(!match)continue;
   const created=Number(match[1]);if(!Number.isSafeInteger(created)||created>8_640_000_000_000_000)continue;
   const file=join(dirname(p),token);await ensureParents(await this.core.instancePath(id),file);const st=await lstat(file);
   // rename preserves the source mtime; the token records when this backup was created.
   if(st.isFile()&&!st.isSymbolicLink()&&st.size<=2_000_000)rows.push({token,date:new Date(created).toISOString(),bytes:st.size});
  }
  return rows.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)||b.token.localeCompare(a.token)).slice(0,100);
 }
 async backup(id,name,token){const rows=await this.history(id,name);if(!rows.some(r=>r.token===token))throw Error('Backup unavailable / 备份不可用');const p=join(dirname(await this.path(id,name)),token);await ensureParents(await this.core.instancePath(id),p);const st=await lstat(p);if(st.isSymbolicLink()||!st.isFile())throw Error('Invalid backup');const b=await readFile(p);if(b.length>2_000_000||b.includes(0))throw Error('Invalid backup');const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b);return {text,...textMetadata(text)};}

}
