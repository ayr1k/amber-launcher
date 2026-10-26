// SPDX-License-Identifier: MPL-2.0
import {validateGraphicsMode} from './graphics.mjs';
import {recoverInstance} from './recovery.mjs';
import {validateBackground} from './backgrounds.mjs';
import {validateLayout,defaultLayout} from './layout-schema.mjs';
import {configureLiteOverlay} from './legacy-combinations.mjs';
import {canCombine} from './compatibility.mjs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { atomicJson } from './core.mjs';
import { digest, safePath } from './download.mjs';
import { fabricVersions } from './fabric.mjs';
import { liteVersions } from './liteloader.mjs';
import { loaderVersions } from './loaders.mjs';
import { importOptifine, optifineGame } from './local-content.mjs';
import { installOptifine } from './optifine.mjs';

export const defaults={graphicsMode:'system',windowCorners:'system',titlebarColor:'theme',language:"system",copyLoginCode:true,defaultAccountId:null,panelOpacity:100,background:'forest',theme:'system',uiStyle:'square',accent:'forest',density:'comfortable',motion:true,fontSize:14,threads:8,memory:4,layout:defaultLayout};
export function validateSettings(input){
 const s={...defaults,...input};
 validateGraphicsMode(s.graphicsMode);
 if(!['square','system'].includes(s.windowCorners)||!['theme','accent'].includes(s.titlebarColor))throw Error('窗口设置无效。');
 if(typeof s.language!=="string"||!(/^(system|zh-CN|en-US|x-[a-z0-9-]{2,32})$/.test(s.language))||typeof s.copyLoginCode!=="boolean")throw Error("语言或剪贴板设置无效。");
 if(!Number.isInteger(s.panelOpacity)||s.panelOpacity<60||s.panelOpacity>100)throw Error('面板不透明度应为 60–100%。');
 if(!['square','rounded'].includes(s.uiStyle)||!['system','light','dark'].includes(s.theme)||!['forest','amber','slate'].includes(s.accent)||!['comfortable','compact'].includes(s.density)||typeof s.motion!=='boolean'||![13,14,16,18].includes(s.fontSize)||!Number.isInteger(s.threads)||s.threads<1||s.threads>16||!Number.isInteger(s.memory)||s.memory<1||s.memory>32)throw Error('设置值不在支持范围内。');
 if(s.defaultAccountId!==null&&(typeof s.defaultAccountId!=='string'||s.defaultAccountId.length>100||!/^[a-zA-Z0-9_-]*$/.test(s.defaultAccountId)))throw Error('默认账号无效。');
 s.layout=validateLayout(s.layout);s.background=validateBackground(s.background);
 return Object.fromEntries(Object.keys(defaults).map(k=>[k,s[k]]));
}
export class Settings{
 constructor(root){this.path=join(root,'preferences.json');}
 async get(){try{return validateSettings(JSON.parse(await readFile(this.path,'utf8')));}catch(e){if(e.code==='ENOENT')return {...defaults};throw e;}}
 async save(input){const value=validateSettings(input);await atomicJson(this.path,value);return value;}
}
export function validateManifest(value){
 if(value?.format!=='amber-mod-list'||value.schema!==1||!Array.isArray(value.mods)||value.mods.length>500)throw Error('不支持的迁移清单（最多 500 个模组）。');
 return {format:'amber-mod-list',schema:1,source:String(value.source||'导入的清单').slice(0,100),mods:value.mods.map(m=>{if(m.projectId!=null&&!/^[a-zA-Z0-9]{1,100}$/.test(m.projectId))throw Error('清单包含无效项目 ID。');return {provider:'modrinth',projectId:m.provider&&m.provider!=='modrinth'?null:m.projectId||null,versionId:typeof m.versionId==='string'?m.versionId.slice(0,100):null,version:typeof m.version==='string'?m.version.slice(0,100):null,title:String(m.title||m.projectId||'未知模组').slice(0,200),enabled:m.enabled!==false,reason:m.provider&&m.provider!=='modrinth'?'不支持此清单的内容来源':String(m.reason||'').slice(0,300)};})};
}
export class Workflows{
 constructor(core,content){this.core=core;this.content=content;this.context=new AsyncLocalStorage();this.active=false;this.cancelled=false;this.lastSetup=null;this.resumes=new Map();core.workflowGuard=()=>{if(this.active&&!this.context.getStore())throw Error('正在配置实例或迁移内容，请等待任务结束。');if(this.active&&this.cancelled)throw Error('安装已取消，已完成的文件已保留。');};}
 async exclusive(fn){if(this.active||this.core.jobs.some(j=>j.state==='running'))throw Error('请等待当前任务结束。');this.active=true;this.cancelled=false;try{return await this.context.run(true,fn);}finally{this.active=false;this.core.operation=null;}}
 cancel(){if(!this.active)return;this.cancelled=true;for(const job of this.core.jobs.filter(j=>j.state==='running'))this.core.cancel(job.id);}
 checkCancelled(){if(this.cancelled)throw Error('安装已取消，已完成的文件已保留。');}
 state(){return {active:this.active,cancelled:this.cancelled,instanceId:this.lastSetup};}
 async retry(id){return this.exclusive(async()=>{this.lastSetup=id;const dir=await this.core.instancePath(id);await this.core.requireStopped(dir);let record=null;try{record=JSON.parse(await readFile(join(dir,'setup-report.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  if(record&&record.state!=='done'){if(record.schema!==2||!record.input)throw Error('此旧版任务没有完整安装计划，请在版本设置中继续。');const resume=this.resumes.get(id);return resume?resume():this.runPlan(id,record);}
  try{const r=JSON.parse(await readFile(join(dir,'content-task.json'),'utf8'));if(!['done','dismissed'].includes(r.state))return this.runContent(id,r);}catch(e){if(e.code!=='ENOENT')throw e;}
  return (await this.core.metadata(id)).item;
 });}
 async pending(){const result=[];for(const item of await this.core.listInstances()){for(const filename of ['setup-report.json','content-task.json']){try{const r=JSON.parse(await readFile(join(await this.core.instancePath(item.id),filename),'utf8'));if(!['done','dismissed'].includes(r.state)){result.push({instanceId:item.id,name:item.name,state:r.state,step:r.step,completed:r.completed||[],error:r.error,resumable:filename==='content-task.json'?r.schema===1:r.schema===2,kind:r.kind||'setup',active:this.active&&r.state==='running'&&this.lastSetup===item.id});break;}}catch(e){if(e.code!=='ENOENT'){result.push({instanceId:item.id,name:item.name,state:'failed',completed:[],resumable:false,error:'安装记录无法读取，请在实例设置检查。'});break;}}}}return result;}
 async repairSetup(id){return this.exclusive(async()=>{const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const pending=(await this.pending()).find(p=>p.instanceId===id);if(!pending||pending.resumable)throw Error('此任务可以直接继续，请刷新任务中心。');await mkdir(join(dir,'.amber-setup'),{recursive:true});for(const name of ['setup-report.json','content-task.json']){try{await copyFile(join(dir,name),join(dir,'.amber-setup',Date.now()+'-'+name));await atomicJson(join(dir,name),{state:'done',note:'原始记录已保留，按当前配置修复'});}catch(e){if(e.code!=='ENOENT')throw e;}}const record={schema:2,state:'running',step:'java',input:{game:item.game,loader:'vanilla',threads:8},completed:[],startedAt:new Date().toISOString()};await atomicJson(join(dir,'setup-report.json'),record);this.lastSetup=id;return this.runPlan(id,record);});}
 async dismissContent(id){return this.exclusive(async()=>{const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);const path=join(dir,'content-task.json'),record=JSON.parse(await readFile(path,'utf8'));await recoverInstance(dir);record.state='dismissed';record.finishedAt=new Date().toISOString();await atomicJson(path,record);});}
 async startContent(id,plan,kind='content'){return this.exclusive(async()=>{if((await this.pending()).some(p=>p.instanceId===id))throw Error('此实例还有未完成的安装，请先到任务中心继续。');this.lastSetup=id;const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const r={schema:1,kind,state:'running',step:'content',game:item.game,loader:item.loader,versionId:kind==='pack'?plan.versionId:plan.rootVersionId,optional:plan.selectedOptional||[],excludedRequired:plan.excludedRequired||[],completed:[],startedAt:new Date().toISOString()};await atomicJson(join(dir,'content-task.json'),r);return this.runContent(id,r);});}
 async runContent(id,r){const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);if(r.schema!==1||!['content','pack'].includes(r.kind)||typeof r.versionId!=='string'||!/^[-\w]{1,100}$/.test(r.versionId)||r.game!==item.game||r.loader!==item.loader)throw Error('内容恢复计划与当前实例不匹配，请检查版本设置。');const save=()=>atomicJson(join(dir,'content-task.json'),r);r.state='running';delete r.error;await save();try{this.checkCancelled();let job;if(r.kind==='pack')job=await this.installPack(id,r.versionId);else{const plan=await this.content.preview(id,r.versionId,r.optional,r.excludedRequired||[]);this.checkCancelled();job=await this.wait(await this.content.install(id,plan.id));}this.checkCancelled();r.state='done';r.completed=['content'];return job||{state:'done'};}catch(e){r.state=this.cancelled?'cancelled':'failed';r.error=e.message;throw e;}finally{r.finishedAt=new Date().toISOString();await save();}}
 async runPlan(id,record,afterSetup){
  const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const input=record.input;
  if(!input||input.game!==item.game||!['vanilla','fabric','forge','neoforge','liteloader','optifine'].includes(input.loader)||!Number.isInteger(input.threads)||input.threads<1||input.threads>16)throw Error('安装计划已损坏，请在版本设置中检查。');
  const optifinePath=record.optifine?join(dir,'.amber-setup','optifine.jar'):null;
  if(optifinePath&&await digest(optifinePath)!==record.optifine)throw Error('保留的 OptiFine 安装器缺失或被修改，请重新选择官方安装器。');
  const completed=new Set(record.completed||[]),save=()=>atomicJson(join(dir,'setup-report.json'),record);
  const step=async(key,fn)=>{this.checkCancelled();if(completed.has(key))return;record.step=key;await save();await this.wait(await fn());this.checkCancelled();completed.add(key);record.completed=[...completed];await save();};
  record.state='running';delete record.error;await save();
  try{
   await step('java',()=>this.core.prepareJava(id));
   if(input.loader==='optifine')await step('loader',()=>installOptifine(this.core,id,optifinePath));
   else if(input.loader!=='vanilla')await step('loader',()=>this.core.configureLoader(id,input.loader,input.version));
   if(input.liteVersion)await step('lite',()=>configureLiteOverlay(this.core,id,input.liteVersion));
   await step('game',()=>this.core.install(id,{threads:input.threads}));
   if(input.addOptifine)await step('optifine',()=>importOptifine(this.core,id,optifinePath));
   if(record.manifest)await step('migration',()=>this.migrateInner(id,record.manifest));
   if(record.packVersion)await step('content',()=>this.installPack(id,record.packVersion));
   else if(afterSetup)await step('content',()=>afterSetup(item));
   this.checkCancelled();record.state='done';record.step='done';this.resumes.delete(id);
  }catch(e){record.state=this.cancelled?'cancelled':'failed';record.error=e.message;throw Error(`实例“${item.name}”已保留，可在任务中心继续安装。${e.message}`);}
  finally{record.finishedAt=new Date().toISOString();await save();}
  return (await this.core.metadata(id)).item;
 }
 async wait(result){if(!result?.id||!result.state)return result;while(true){const job=this.core.jobs.find(j=>j.id===result.id);if(!job)throw Error('任务记录丢失。');if(job.state==='done')return job;if(job.state!=='running')throw Error(job.error||'任务已取消。');await new Promise(r=>setTimeout(r,150));}}
 async choices(game,type){if(!this.core.catalog)await this.core.versions();if(!this.core.catalog.some(v=>v.id===game))throw Error('未知 Minecraft 版本。');return type==='vanilla'||type==='optifine'?[]:type==='fabric'?fabricVersions(game,this.core.fetcher):type==='liteloader'?liteVersions(game,this.core.fetcher):loaderVersions(game,type,this.core.fetcher);}
 async create(input,optifinePath,manifest,afterSetup){return this.exclusive(async()=>{this.lastSetup=null;
  if(!this.core.catalog)await this.core.versions();
  if(!Number.isInteger(input.threads)||input.threads<1||input.threads>16)throw Error('并发数应为 1–16');
  if(!['vanilla','fabric','forge','neoforge','liteloader','optifine'].includes(input.loader))throw Error('不支持的加载器组合。');
  if(input.liteVersion&&(!['forge','optifine'].includes(input.loader)||!canCombine(input.game,[input.loader],'liteloader')))throw Error('所选历史加载器组合不兼容');
  if(input.liteVersion&&!(await this.choices(input.game,'liteloader')).some(v=>v.version===input.liteVersion))throw Error('请选择兼容的 LiteLoader 版本');
  if(input.addOptifine&&input.loader!=='forge')throw Error('OptiFine 组合目前仅支持 Forge');
  if((input.loader==='optifine'||input.addOptifine)&&!optifinePath)throw Error('请选择官方 OptiFine 安装器。');
  if(!['vanilla','optifine'].includes(input.loader)&&!(await this.choices(input.game,input.loader)).some(v=>v.version===input.version))throw Error('请选择兼容的加载器版本。');
  if(optifinePath&&optifineGame(await readFile(optifinePath))!==input.game)throw Error('所选 OptiFine 不适配目标 Minecraft 版本');
  this.checkCancelled();this.lastSetup=null;const item=await this.core.createInstance(input),dir=await this.core.instancePath(item.id);this.lastSetup=item.id;
  const record={schema:2,state:'running',input:Object.fromEntries(['game','loader','version','liteVersion','addOptifine','threads'].map(k=>[k,input[k]])),manifest:manifest?validateManifest(manifest):null,packVersion:input.packVersion||null,startedAt:new Date().toISOString(),completed:[]};
  if(optifinePath){await mkdir(join(dir,'.amber-setup'),{recursive:true});const cached=join(dir,'.amber-setup','optifine.jar');await copyFile(optifinePath,cached);record.optifine=await digest(cached);}
  await atomicJson(join(dir,'setup-report.json'),record);
  const run=()=>this.runPlan(item.id,record,afterSetup);this.resumes.set(item.id,run);return run();
 });}
 async export(id){const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const files=await this.content.list(id),manifest=await this.content.manifest(dir),mods=[];
  for(const row of files.filter(f=>f.type==='mod')){const saved=manifest.files.find(f=>f.relative===row.relative.replace(/\.disabled$/,''));let projectId=null,reason='';try{if(row.missing)throw Error('源文件缺失');const hash=await digest(safePath(dir,row.relative));if(saved?.hash===hash)projectId=saved.projectId;else projectId=(await this.content.api(`version_file/${hash}?algorithm=sha1`)).project_id;if(!projectId)throw Error('Modrinth 未识别此文件');}catch(e){reason=e.message;}mods.push({provider:'modrinth',projectId,versionId:saved?.versionId,version:row.version,title:row.title,enabled:row.enabled,reason});}
  return validateManifest({format:'amber-mod-list',schema:1,source:`${item.name} · ${item.game}`,mods});
 }
 async migrate(id,manifest){return this.exclusive(()=>this.migrateInner(id,manifest));}
 async migrateInner(id,input){const manifest=validateManifest(input),{dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);const report={schema:1,source:manifest.source,target:`${item.name} · ${item.game} / ${item.loader}`,startedAt:new Date().toISOString(),results:[]},disabled=[];
  try{for(const mod of manifest.mods){this.checkCancelled();const row={title:mod.title,projectId:mod.projectId,previousVersion:mod.version,state:'skipped'};report.results.push(row);if(!mod.projectId){row.reason=mod.reason||'无法识别 Modrinth 项目';continue;}
   try{const versions=await this.content.versions(id,mod.projectId);if(!versions.length){row.reason='目标 Minecraft / 加载器没有兼容版本';continue;}const plan=await this.content.preview(id,versions[0].id);const job=await this.wait(await this.content.install(id,plan.id));row.state='installed';row.version=versions[0].version_number;if(!mod.enabled)disabled.push(mod.projectId);}
   catch(e){row.reason=e.message;if(/取消/.test(e.message)){row.state='cancelled';report.cancelled=true;break;}}
   await atomicJson(join(dir,'migration-report.json'),report);
  }
  if(report.cancelled)for(const mod of manifest.mods.slice(report.results.length))report.results.push({title:mod.title,projectId:mod.projectId,state:'skipped',reason:'任务已取消，未执行'});
  // Preserve disabled roots only when no enabled installed project requires them.
  const installed=await this.content.manifest(dir),required=new Set();
  for(const f of installed.files.filter(f=>!disabled.includes(f.projectId)))for(const d of f.dependencies||[])if(d.dependency_type==='required'){if(d.project_id)required.add(d.project_id);if(d.version_id){const dep=installed.files.find(x=>x.versionId===d.version_id);if(dep)required.add(dep.projectId);}}
  let changed=true;while(changed){changed=false;for(const f of installed.files.filter(f=>required.has(f.projectId)))for(const d of f.dependencies||[])if(d.dependency_type==='required'){const target=d.project_id||installed.files.find(x=>x.versionId===d.version_id)?.projectId;if(target&&!required.has(target)){required.add(target);changed=true;}}}
  const pending=new Set(disabled.filter(p=>!required.has(p)));
  // Disable consumers before their dependencies, independent of manifest order.
  let progressed=true;while(progressed&&pending.size){progressed=false;for(const project of pending){const f=installed.files.find(f=>f.projectId===project);if(!f||f.enabled===false){pending.delete(project);progressed=true;continue;}const consumers=installed.files.filter(c=>c!==f&&c.enabled!==false&&(c.dependencies||[]).some(d=>d.dependency_type==='required'&&(d.version_id?d.version_id===f.versionId:d.project_id===project)));if(consumers.length)continue;await this.content.toggle(id,f.relative);f.enabled=false;pending.delete(project);progressed=true;}}
  for(const project of new Set(disabled))if(required.has(project)||pending.has(project)){const row=report.results.find(r=>r.projectId===project);if(row)row.note=required.has(project)?'被其他已启用模组依赖，保持启用':'循环依赖无法逐项停用，保持启用';}
  }finally{report.finishedAt=new Date().toISOString();await atomicJson(join(dir,'migration-report.json'),report);}return report;
 }
 async report(id){try{return JSON.parse(await readFile(join(await this.core.instancePath(id),'migration-report.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
}
