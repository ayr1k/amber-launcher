// SPDX-License-Identifier: MPL-2.0
import {join,resolve,sep} from 'node:path';
import {rm} from 'node:fs/promises';
import {treeFiles} from './safe-copy.mjs';
export async function cleanupPrivateCopies(userData,kind){if(!['updates','upgrade-backups'].includes(kind))throw Error('不支持的清理目标。');const root=resolve(userData),target=resolve(join(root,kind));if(!target.startsWith(root+sep))throw Error('清理路径无效。');try{await treeFiles(target);}catch(e){if(e.code==='ENOENT')return false;throw e;}await rm(target,{recursive:true,force:false});return true;}
