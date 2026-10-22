// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {atomicJson} from './core.mjs';
export const launchDefaults={accountId:null,memory:null};
export function validateLaunchPreferences(input){
 const v={...launchDefaults,...input};
 if(v.accountId!==null&&(typeof v.accountId!=='string'||v.accountId.length>100||!/^[a-zA-Z0-9_-]*$/.test(v.accountId)))throw Error('账号设置无效，请重新选择。');
 if(v.memory!==null&&(!Number.isInteger(v.memory)||v.memory<1||v.memory>32))throw Error('内存应为 1–32 GB，或使用全局默认值。');
 return {accountId:v.accountId,memory:v.memory};
}
export class LaunchPreferences{
 constructor(core){this.core=core;}
 async get(id){const dir=await this.core.instancePath(id);try{return validateLaunchPreferences(JSON.parse(await readFile(join(dir,'launch-preferences.json'),'utf8')));}catch(e){if(e.code==='ENOENT')return {...launchDefaults};throw e;}}
 async save(id,input){const dir=await this.core.instancePath(id);this.core.workflowGuard?.();const value=validateLaunchPreferences(input);await atomicJson(join(dir,'launch-preferences.json'),value);return value;}
}
