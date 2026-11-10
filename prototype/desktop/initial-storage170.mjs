import {Libraries170} from './libraries170.mjs';
// SPDX-License-Identifier: MPL-2.0
import {mkdir,lstat,readdir,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {ordinary170,json170} from './library-paths170.mjs';

async function exists(path){try{return await lstat(path);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
export async function needsInitialLocation170(storage){
 if(await exists(storage.config))return false;
 // Old installs without a bootstrap pointer already have user data. Do not
 // redirect or migrate that data just because onboarding was never completed.
 const path=(await storage.get()).path;if(await exists(path)&&(await readdir(path)).length)return false;
 return true;
}
export async function setInitialLocation170(storage,target,{edition='amber'}={}){
 if(!await needsInitialLocation170(storage))throw Error('Existing application data must use the relocation workflow / 已有应用数据请使用迁移流程');
 const path=resolve(target);await ordinary170(path,{missing:true});
 const external=!!await exists(join(path,'versions'))&&!await exists(join(path,'instances'));
 let dataPath=external?(await storage.get()).path:path;
 await ordinary170(dataPath,{missing:true});await mkdir(dataPath,{recursive:true});
 const owner=await json170(join(dataPath,'application-owner170.json'),{optional:true});if(owner&&owner.edition!==edition)throw Error('This location belongs to the other edition / 此应用数据位置属于另一产品');
 if(!external&&(await readdir(dataPath)).length&&!await exists(join(dataPath,'instances')))throw Error('Select an empty directory, an existing AMBER library, or .minecraft / 请选择空目录、已有 AMBER 库或 .minecraft');
 const probe=join(dataPath,'.amber-location-probe-'+randomUUID());await writeFile(probe,'',{flag:'wx'});await rm(probe);
 await mkdir(storage.userData,{recursive:true});
 if(external)await new Libraries170(dataPath,{edition}).preview(path);
 await atomicJson(join(dataPath,'application-owner170.json'),{schema:1,edition});
 await atomicJson(storage.config,{schema:1,path:dataPath,onboarded:false,initialExternal170:external?path:null,locationSelected170:true});
 return storage.get();
}
