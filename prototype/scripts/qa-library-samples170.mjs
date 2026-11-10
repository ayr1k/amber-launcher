// SPDX-License-Identifier: MPL-2.0
// Private local evidence only. Do not upload sample contents, paths or file hashes.
import {mkdir,readdir,lstat,cp,writeFile} from 'node:fs/promises';
import {resolve,join,relative} from 'node:path';
import {digest} from '../desktop/download.mjs';
import {profile170} from '../desktop/library-profile170.mjs';
import {localPlan170} from '../desktop/library-runtime170.mjs';
import assert from 'node:assert/strict';
const source=resolve(process.env.AMBER_SAMPLE_ROOT),out=resolve(process.env.AMBER_SAMPLE_OUTPUT);
await mkdir(out); // Never reuse or overwrite a previous evidence/copy directory.
async function hashes(root){const rows=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isSymbolicLink())throw Error('Sample contains link');if(e.isDirectory())await walk(path);else if(e.isFile())rows.push({path:relative(root,path),bytes:(await lstat(path)).size,sha256:await digest(path,'sha256')});}}await walk(root);return rows.sort((a,b)=>a.path.localeCompare(b.path));}
const before=await hashes(source);await writeFile(join(out,'original-before.json'),JSON.stringify(before));
const copy=join(out,'samples');await cp(source,copy,{recursive:true,errorOnExist:true,force:false});assert.deepEqual(await hashes(copy),before);const rows=[];
for(const sample of await readdir(copy,{withFileTypes:true})){if(!sample.isDirectory())continue;const root=join(copy,sample.name,'.minecraft');for(const id of await readdir(join(root,'versions'))){const versionDir=join(root,'versions',id);if(!(await lstat(versionDir)).isDirectory())continue;const detected=await profile170(root,id);const candidate=detected.candidates.filter(c=>c.content.length);const choice=candidate.length===1?candidate[0].path:null;const row={sample:sample.name,id,detectedIsolation:detected.isolation,directoryConfirmedForQA:choice===root?'root':choice===versionDir?'version':null,loader:detected.loader,optifine:detected.optifine};
try{if(!choice)throw Error('Sample game directory ambiguous');const p=await profile170(root,id,{directoryChoice:choice}),plan=await localPlan170(root,p);row.localPlan={files:plan.plan.files.length,classpath:plan.plan.classpath.length,natives:plan.plan.natives.length,mainClass:plan.meta.mainClass};}catch(e){row.error=e.message;}rows.push(row);}}
const after=await hashes(source);assert.deepEqual(after,before);await writeFile(join(out,'original-after.json'),JSON.stringify(after));await writeFile(join(out,'sample-results.json'),JSON.stringify({originalFiles:before.length,originalBytes:before.reduce((n,f)=>n+f.bytes,0),originalUnchanged:true,copyVerified:true,rows},null,2));console.log(JSON.stringify({originalFiles:before.length,originalUnchanged:true,copyVerified:true,rows},null,2));
