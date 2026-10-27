// SPDX-License-Identifier: MPL-2.0
import {IS_AMBERE} from './edition.mjs';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {safePath,verified,digest,ensureParents} from './download.mjs';
import {requiredJava} from './vanilla.mjs';
import {inspectJava} from './java.mjs';
export class InstanceHealth {
 constructor(core,content,workflows,accounts,prefs,settings,{inspect=inspectJava}={}){Object.assign(this,{core,content,workflows,accounts,prefs,settings,inspect});}
 async scan(id){return this.workflows.exclusive(async()=>{
  const check=()=>{if(this.workflows.cancelled)throw Error('实例检查已取消，未修改游戏文件。');};check();
  const rows=[],add=(key,title,state,detail,action)=>rows.push({key,title,state,detail,action});
  let data;try{data=await this.core.runtimeMetadata(id);}catch(e){add('metadata','版本与加载器配置','error',e.message,'folder');return {checkedAt:new Date().toISOString(),rows};}
  const {dir,item,meta}=data;await this.core.requireStopped(dir);
  this.core.operation={title:'检查实例（不会修改游戏文件）',state:'running'};
  const pending=(await this.workflows.pending()).find(p=>p.instanceId===id);
  add('setup','安装计划',pending?'error':'ok',pending?'有未完成的安装，请在任务中心继续。':'没有未完成的安装计划。',pending?'tasks':null);
  try{const receiptPath=join(dir,'installation.json');await ensureParents(dir,receiptPath);const r=JSON.parse(await readFile(receiptPath,'utf8'));if(item.status!=='installed'||(r.loaderSha1||null)!==(item.loaderSha1||null)||r.metadataSha1!==await digest(join(dir,'version.json'))||!Array.isArray(r.files)||!r.files.length)throw Error('安装记录与当前配置不一致，请校验并修复游戏。');let bad=0;for(const f of r.files){check();const path=safePath(this.core.root,f.relative);await ensureParents(this.core.root,path);if(!await verified({...f,path}))bad++;}add('files','游戏文件',bad?'error':'ok',bad?`${bad} 个文件缺失或校验不通过。修复会复用已验证的文件。`:`已核对安装记录中的 ${r.files.length} 个文件。`,bad?'repair':null);}catch(e){add('files','游戏文件','error',e.message,'repair');}
  check();
  try{const java=item.javaPath?await this.inspect(item.javaPath):(await this.core.scanJava()).find(j=>j.major===requiredJava(meta));if(!java||java.major!==requiredJava(meta))throw Error(`需要 Java ${requiredJava(meta)}，请自动准备或手动选择兼容版本。`);add('java','Java 运行时','ok',`Java ${java.version} 可用。`);}catch(e){add('java','Java 运行时','error',e.message,'java');}
  check();
  try{await this.content.validateLaunch(id);const files=await this.content.list(id);const missing=files.filter(f=>f.missing&&f.enabled!==false);if(missing.length)throw Error(`${missing.length} 个启用的内容文件缺失，请检查内容管理。`);const manual=files.filter(f=>f.type==='mod'&&!f.projectId);add('mods','已知模组依赖',manual.length?'warning':'ok',manual.length?`${manual.length} 个模组未识别来源，无法完整检查依赖。其余已知声明检查通过。`:'已知依赖与冲突声明检查通过；不保证所有运行时组合兼容。',manual.length?'mods':null);}catch(e){add('mods','已知模组依赖','error',e.message,'mods');}
  check();
  try{const prefs=await this.prefs.get(id),settings=await this.settings.get(),accountId=prefs.accountId??settings.defaultAccountId??'',accounts=(await this.accounts.list()).accounts,a=accounts.find(a=>a.id===accountId);if(accountId&&!a)throw Error('此实例选择的账号已移除，请重新选择。');if(!IS_AMBERE&&(!a||a.ownership?.state!=='verified'))throw Error('请先到账号页验证 Minecraft Java 版正版资格。离线资格有效期为 7 天。');add('account','启动账号',a?.type==='microsoft'?'warning':'ok',a?.type==='microsoft'?'AMBER 的 API 申请再次被拒，尚未获得批准；此检查不验证在线授权。':a?'已找到选择的账号，在线授权仅在启动时检查。':'使用临时离线身份，玩家名称会在启动页检查。',a?.type==='microsoft'?'accounts':null);}catch(e){add('account','启动账号','error',e.message,'accounts');}
  check();
  return {checkedAt:new Date().toISOString(),rows};
 });}
}
