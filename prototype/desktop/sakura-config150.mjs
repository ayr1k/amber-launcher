// SPDX-License-Identifier: MPL-2.0
import {setTimeout as delay} from 'node:timers/promises';
import {atomicJson} from './core.mjs';

// Retry only a Windows replacement that was denied or busy. atomicJson keeps
// the old file intact and removes its temporary file after a failed rename.
// Callers retain the configuration queue; remote requests are never retried.
export async function writeSakuraConfig150(path,value,{platform=process.platform,sleep=delay}={}){
 for(let attempt=0;;attempt++){
  try{return await atomicJson(path,value);}
  catch(error){
   if(platform!=='win32'||error.syscall!=='rename'||!['EPERM','EBUSY'].includes(error.code)||attempt>=4)throw error;
   await sleep(25*2**attempt);
  }
 }
}
