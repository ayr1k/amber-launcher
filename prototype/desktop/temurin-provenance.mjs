// SPDX-License-Identifier: MPL-2.0
import {createHash} from 'node:crypto';
import {readFile,readdir,mkdtemp,rm,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {ordinary170,json170} from './library-paths170.mjs';
import {treeFingerprint} from './java-provenance.mjs';
import {extractRuntimeTar} from './runtime-archive135.mjs';
import {extractZip} from './vanilla.mjs';
import {TaskQueue} from './task-queue132.mjs';
import legacy from './temurin-legacy-checksums.json' with {type:'json'};

// Vendor SHA-256 values from /v3/assets/latest/{major}/hotspot for the
// unsigned caches created by 9ef5350. Later releases retain a detached signature.
export function legacyChecksums(host){return legacy[host.javaOS+'-'+host.javaArch]||{};}
export const checksumOf=bytes=>createHash('sha256').update(bytes).digest('hex');

export async function verifyTemurinSignature(bytes,signature,publicKey){
 if(!signature?.length||signature.length>16384)throw Error('Missing or invalid Temurin signature');
 const pgp=process.versions.electron?await import('./vendor/openpgp.mjs'):await import('openpgp');
 const key=await pgp.readKey({armoredKey:publicKey??await readFile(new URL('adoptium-signing-key.asc',import.meta.url),'utf8')});
 if(publicKey===undefined&&key.getFingerprint()!=='3b04d753c9050d9a5d343f39843c48a565f8f04b')throw Error('Unexpected Temurin signing key');
 const result=await pgp.verify({message:await pgp.createMessage({binary:bytes}),verificationKeys:key,
  signature:await pgp.readSignature({binarySignature:signature})});
 if(result.signatures.length!==1)throw Error('Invalid Temurin signature');
 await result.signatures[0].verified;
}

export async function unpackTemurin(bytes,target,host){
 if(host.platform==='win32')await extractZip(bytes,target);else await extractRuntimeTar(bytes,target);
 const [top,...others]=await readdir(target,{withFileTypes:true});
 if(!top?.isDirectory()||others.length)throw Error('Invalid Temurin runtime layout');
 const exe=join(top.name,...(host.platform==='darwin'?['Contents','Home']:[]),'bin',host.javaName);
 const path=join(target,exe);
 await ordinary170(path);
 if(!(await lstat(path)).isFile())throw Error('Missing Java executable');
 return exe;
}

const inspections=new TaskQueue(2);
const recovered=new Map();
export function rememberTemurin(archive,record){recovered.set(archive,[record]);}
export async function offlineTemurin(root,host,major,signal,{pins=legacyChecksums(host),verify=verifyTemurinSignature}={}){
 const parent=join(root,'runtimes'),downloads=join(parent,'downloads');
 let names;
 try{await ordinary170(downloads);names=await readdir(downloads);}catch{signal?.throwIfAborted();return [];}
 const records=[];
 const ext=host.platform==='win32'?'.zip':'.tar.gz';
 for(const name of names){
  signal?.throwIfAborted();
  if(!name.endsWith(ext))continue;
  const checksum=name.slice(0,-ext.length);
  if(!/^[a-f0-9]{64}$/.test(checksum))continue;
  const archive=join(downloads,name);
  try{
   const candidates=await inspections.run(archive,async()=>{
    const cached=recovered.get(archive);
    if(cached)return cached;
    const pinMajor=Number(Object.keys(pins).find(k=>pins[k]===checksum));
    if(pinMajor&&major&&pinMajor!==major)return null;
    const receipt=await json170(archive+'.proof.json',{optional:true,max:32000});
    if(!pinMajor&&!receipt?.signature)return null;
    // A receipt can locate a sibling; only signed/pinned archive bytes define its contents and executable.
    const folder=receipt?.folder??checksum;
    if(folder!==checksum&&!(typeof folder==='string'&&/^temurin-verified-[a-zA-Z0-9]{6}$/.test(folder)))return null;
    const folders=[folder];
    // 9ef5350 kept a fresh sibling when its checksum directory was occupied.
    if(pinMajor&&!receipt)for(const name of await readdir(parent)){
     if(/^temurin-verified-[a-zA-Z0-9]{6}$/.test(name))folders.push(name);
    }
    await ordinary170(archive);
    const st=await lstat(archive);
    if(!st.isFile()||st.size>256_000_000)return null;
    const bytes=await readFile(archive,{signal});
    if(checksumOf(bytes)!==checksum)return null;
    if(!pinMajor)await verify(bytes,Buffer.from(receipt.signature,'base64'));
    signal?.throwIfAborted();
    const stage=await mkdtemp(join(parent,'temurin-check-'));
    try{
     const exe=await unpackTemurin(bytes,stage,host);
     const hash=await treeFingerprint(stage,{signal});
     const records=folders.map(folder=>{
      const home=join(parent,folder);
      return {home,path:join(home,exe),major:pinMajor||undefined,hash};
     });
     recovered.set(archive,records);return records;
    }finally{await rm(stage,{recursive:true,force:true});}
   },{signal});
   for(const record of candidates||[])if(!major||!record.major||major===record.major)records.push(record);
  }catch{signal?.throwIfAborted();}
 }
 return records;
}
