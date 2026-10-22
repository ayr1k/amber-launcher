// SPDX-License-Identifier: MPL-2.0
import {readFile,mkdir,readdir,lstat,rename,rmdir} from 'node:fs/promises';
import {join,resolve,sep,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {digest} from './download.mjs';
import {atomicJson} from './core.mjs';
import {treeFiles,copyVerified,requireSpace,separateDirectories} from './safe-copy.mjs';
export class Storage{
 constructor(userData){this.userData=userData;this.config=join(userData,'storage.json');}
 async get(){try{const r=JSON.parse(await readFile(this.config,'utf8'));if(r.schema!==1||typeof r.path!=='string')throw Error('数据位置配置损坏');return r;}catch(e){if(e.code==='ENOENT')return {schema:1,path:join(this.userData,'library'),onboarded:false};throw e;}}
 async complete(){const r=await this.get();r.onboarded=true;await atomicJson(this.config,r);return r;}
 async migrate(core,destination){const source=core.root,target=resolve(destination);separateDirectories(source,target);await mkdir(target,{recursive:true});if((await lstat(target)).isSymbolicLink()||(await readdir(target)).length)throw Error('请选择一个空文件夹，原有文件不会覆盖。');await treeFiles(target);const files=await treeFiles(source);await requireSpace(target,files.reduce((n,f)=>n+f.size,0));const stage=join(target,'.amber-copy-'+randomUUID());const entries=await copyVerified(source,stage,files,(completed,total)=>{core.operation={title:'复制并校验数据目录',state:'running',completed,total};core.workflowGuard?.();});const current=await treeFiles(source);if(JSON.stringify(current)!==JSON.stringify(files))throw Error('迁移期间源目录发生变化，已保留原目录，请关闭占用程序后重试。'); // Never switch to an incomplete copy.
 for(const f of entries){core.workflowGuard?.();if(await digest(join(source,...f.relative.split('/')),'sha256')!==f.hash)throw Error('源文件在迁移期间被修改，未切换目录。');}
 if((await readdir(target)).some(name=>name!==basename(stage)))throw Error('目标目录出现新文件，已停止切换，请选择空文件夹重试。');
 for(const f of files.filter(f=>/^instances\/[^/]+\/instance\.json$/.test(f.relative))){const path=join(stage,...f.relative.split('/')),item=JSON.parse(await readFile(path,'utf8'));if(typeof item.javaPath==='string'&&item.javaPath.toLowerCase().startsWith((source+sep).toLowerCase())){item.javaPath=target+item.javaPath.slice(source.length);await atomicJson(path,item);}}
 for(const name of await readdir(stage))await rename(join(stage,name),join(target,name));
 await rmdir(stage);
 // Preserve original data. Only switch the small bootstrap pointer after all copies verify.
 await atomicJson(this.config,{schema:1,path:target,onboarded:(await this.get()).onboarded});return target;}
}
