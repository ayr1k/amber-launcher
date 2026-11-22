// SPDX-License-Identifier: MPL-2.0
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat, mkdir, mkdtemp, readlink, readdir, rename, rm, copyFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {ordinary170} from './library-paths170.mjs';
import {withFileLock} from './task-queue132.mjs';

// From Mojang's java-runtime index and its hash-checked file manifests.
// Each pin hashes JSON rows [relative path, size, raw SHA-1], ordered by path.
// https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json
const pins={
 x64:[
  [8,'jre-legacy','76c742150cf8a04a35d110b79295ca62132e11a3a2209e7d3131078c04825a0d'],
  [16,'alpha','a89aa5ca3bb3bb858d6d4b50841d74a918fc0f532f45943eeb9ba7a772829d94'],
  [17,'beta','2add6ed851957a942b58acb191278a6151847c46f00cb4a807781d17c2970615'],
  [17,'gamma','2add6ed851957a942b58acb191278a6151847c46f00cb4a807781d17c2970615'],
  [17,'gamma-snapshot','2add6ed851957a942b58acb191278a6151847c46f00cb4a807781d17c2970615'],
  [21,'delta','6c7d63968003401b52257c1fa2c33a93b1d515ad5e5d3f1499e7bbd36dc71fe8'],
  [25,'epsilon','b438e4f2d4e20f22cba1ab666698e07e99ca6fb431bd421eb27a5ee1f375a933']
 ],
 arm64:[
  [17,'gamma','544f19e72612236d5b38be0908eb93fa263e9742e4cf2e6a2c7d78ea5d6494ee'],
  [17,'gamma-snapshot','544f19e72612236d5b38be0908eb93fa263e9742e4cf2e6a2c7d78ea5d6494ee'],
  [21,'delta','d69f8304d2f62a4f0dc6ff17e2b3b02c5ced3c8aaa9f560b7e4850a75ad2dd84'],
  [25,'epsilon','adaae24ac0f840faaf253a99436008366a57ddd8d69b4c0e82f83516a620e3f3']
 ]
};

export function mojangCandidates(runtimeRoot,arch,major){
 return (pins[arch]||[]).filter(([version])=>!major||version===major).map(([version,name,hash])=>{
  const component=name==='jre-legacy'?name:'java-runtime-'+name;
  return {home:join(runtimeRoot,component,'windows-'+arch,component),hash,major:version};
 });
}

export async function treeFingerprint(home,{signal,mojang=false,copyTo}={}){
 const rows=[];
 let count=0,bytes=0;
 async function walk(prefix){
  for(const entry of await readdir(join(home,prefix),{withFileTypes:true})){
   signal?.throwIfAborted();
   const name=prefix?prefix+'/'+entry.name:entry.name,path=join(home,name);
   if(++count>12000||name.length>600)throw Error('Runtime tree is too large');
   if(entry.isDirectory()){
    if(!mojang)rows.push([name,'directory']);
    await walk(name);continue;
   }
   if(!mojang&&entry.isSymbolicLink()){rows.push([name,'link',await readlink(path)]);continue;}
   if(!entry.isFile())throw Error('Unexpected runtime entry');
   const st=await lstat(path);
   bytes+=st.size;
   if(!st.isFile()||bytes>(mojang?180_000_000:650_000_000))throw Error('Unexpected runtime file');
   let verifiedPath=path;
   if(copyTo){
    verifiedPath=join(copyTo,name);
    await mkdir(dirname(verifiedPath),{recursive:true});
    await copyFile(path,verifiedPath);
   }
   const hash=createHash(mojang?'sha1':'sha256');
   for await(const chunk of createReadStream(verifiedPath,{signal}))hash.update(chunk);
   const row=[name,st.size,hash.digest('hex')];
   if(!mojang)row.push(st.mode&0o7777);
   rows.push(row);
  }
 }
 await walk('');
 rows.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
 return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

export async function verifiedMojangHome(root,candidate,signal){
 const parent=join(root,'runtimes'),target=join(parent,'mojang-'+candidate.hash);
 return withFileLock(target,async()=>{
  async function matches(home){
   try{await ordinary170(home);return await treeFingerprint(home,{signal,mojang:true})===candidate.hash;}
   catch{signal?.throwIfAborted();return false;}
  }
  if(await matches(target))return target;
  if(!await matches(candidate.home))return null;
  await ordinary170(parent,{missing:true});
  await mkdir(parent,{recursive:true});
  const stage=await mkdtemp(join(parent,'mojang-verified-'));
  let retained=false;
  try{
   // Verify the private copy itself before any process can load its DLLs.
   const hash=await treeFingerprint(candidate.home,{signal,mojang:true,copyTo:stage});
   if(hash!==candidate.hash)return null;
   signal?.throwIfAborted();
   try{await rename(stage,target);return target;}catch(error){
    if(!['EEXIST','ENOTEMPTY','EPERM','EACCES'].includes(error.code))throw error;
    // Preserve an existing directory which failed verification.
    retained=true;return stage;
   }
  }finally{if(!retained)await rm(stage,{recursive:true,force:true});}
 },signal);
}
