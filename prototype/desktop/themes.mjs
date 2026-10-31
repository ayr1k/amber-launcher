// SPDX-License-Identifier: MPL-2.0
import {readFile,writeFile,mkdir,readdir,lstat,rename,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
import {validateAppearance,visualSnapshot,assetId,appearanceDefaults,editableAppearance} from './theme-schema.mjs';
import {validateLayout} from './layout-schema.mjs';
const {unzipSync,zipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
import {needsComposition} from './theme-composition.mjs';
import {VERSION} from './product.mjs';
const limit=32*1024*1024,assetKeys=['backgroundAsset','heroAsset','artworkAsset'];
export function readTheme(bytes){
 if(bytes.length>limit)throw Error('Theme exceeds 32 MB / 主题包超过 32 MB');let total=0,count=0;const names=new Set();
 const entries=unzipSync(bytes,{filter:f=>{if(++count>64||names.has(f.name)||!(/^(theme\.json|preview\.png|assets\/[a-f0-9]{64}\.png|LICENSE\.txt)$/.test(f.name)))throw Error('Unsupported or unsafe theme entry / 主题包含不支持或不安全的文件');names.add(f.name);total+=f.originalSize;if(f.originalSize>20*1024*1024||total>64*1024*1024)throw Error('Theme expands beyond limits / 主题解压大小超限');return true;}});
 if(!entries['theme.json']||entries['theme.json'].length>128000)throw Error('Missing or oversized theme.json / 主题说明缺失或过大');
 const doc=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(entries['theme.json']));if(doc.format!=='ambtheme'||doc.schema!==1)throw Error('Unsupported theme format / 不支持的主题格式');
 for(const key of ['requiredCapabilities','compatibleVersions'])if(doc[key]!==undefined&&(!Array.isArray(doc[key])||doc[key].length>32||doc[key].some(v=>typeof v!=='string'||v.length>80)))throw Error('Invalid theme compatibility metadata');
 if(doc.requiredCapabilities?.some(k=>!['appearance-v1','layout-v1','composition-v1'].includes(k)))throw Error('Required theme capability unavailable / 缺少主题必需能力');
 const appearance=validateAppearance({...doc.appearance,enabled:true});const warnings=[];
 if(doc.compatibleVersions&&!doc.compatibleVersions.some(v=>[VERSION,'1.1.0'].includes(v)))warnings.push('Version not listed by author; preview before applying. / 作者未声明适配此版本，请先预览。');
 const unknown=Object.keys(doc.appearance||{}).filter(k=>!(k in appearance));if(unknown.length)warnings.push('Ignored optional fields / 已忽略可选字段: '+unknown.join(', '));
 const assets={};for(const key of assetKeys){const name=appearance[key];if(!name)continue;const data=entries['assets/'+name];if(!data||createHash('sha256').update(data).digest('hex')+'.png'!==name)throw Error('Missing or changed image / 图片缺失或校验不一致');if(Buffer.from(data).subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Theme images must be PNG / 主题图片必须为 PNG');const b=Buffer.from(data);if(b.length<24||b.readUInt32BE(16)*b.readUInt32BE(20)>16_000_000||!b.readUInt32BE(16)||!b.readUInt32BE(20))throw Error('Image dimensions exceed limits / 图片尺寸超限');assets[name]=data;}
 const chrome={};for(const [k,values] of Object.entries({windowCorners:['system','square'],titlebarColor:['theme','accent'],background:['forest','none']}))if(doc.chrome?.[k]!==undefined){if(!values.includes(doc.chrome[k]))throw Error('Invalid window preference / 窗口选项无效');chrome[k]=doc.chrome[k];}
 return {appearance,layout:doc.layout?validateLayout(doc.layout):null,chrome,warnings,assets};
}
export class Themes{
 constructor(root,settings){this.root=root;this.dir=join(root,'themes');this.settings=settings;this.pending=null;this.queue=Promise.resolve();}
 serial(fn){const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
 async persist(value){const result=await this.settings.save(value);this.onChanged?.(result);return result;}
 async safe(path){await ensureParents(this.root,path);return path;}
 async init(){await this.safe(join(this.dir,'assets','probe'));await mkdir(join(this.dir,'assets'),{recursive:true});await mkdir(join(this.dir,'library'),{recursive:true});
  try{const saved=JSON.parse(await readFile(await this.safe(join(this.dir,'trial.json')),'utf8'));await this.persist({...await this.settings.get(),...visualSnapshot(saved.previous)});await rm(join(this.dir,'trial.json'));}catch(e){if(e.code!=='ENOENT'){await rename(await this.safe(join(this.dir,'trial.json')),join(this.dir,'trial-corrupt-'+Date.now()+'.json'));await this.settings.save({...await this.settings.get(),appearance:{...appearanceDefaults}});this.recovery='Interrupted preview recovered to classic. / 中断的主题试用已恢复经典外观。';}}
  const v=await this.settings.get();if(v.appearance.enabled){try{for(const key of assetKeys)if(v.appearance[key])await this.asset(v.appearance[key]);}catch{await atomicJson(await this.safe(join(this.dir,'appearance-recovery.json')),visualSnapshot(v));await this.settings.save({...v,appearance:{...appearanceDefaults}});this.recovery='Theme images missing; classic appearance restored. / 主题图片缺失，已恢复经典外观。';}}return this;
 }
 async asset(name){if(!assetId.test(name))throw Error('Invalid asset');return readFile(await this.safe(join(this.dir,'assets',name)));}
 async storeAsset(bytes){const name=createHash('sha256').update(bytes).digest('hex')+'.png';await writeFile(await this.safe(join(this.dir,'assets',name)),bytes);return name;}
 async list(){const items=[];for(const name of await readdir(join(this.dir,'library'))){if(!/^[a-f0-9-]{36}\.json$/.test(name))continue;try{const doc=JSON.parse(await readFile(await this.safe(join(this.dir,'library',name)),'utf8'));items.push({...doc,appearance:validateAppearance(doc.appearance)});}catch{items.push({id:name.slice(0,-5),invalid:true,appearance:{name:'Unreadable theme / 无法读取的主题'}});}}return items;}
 async import(bytes){const parsed=readTheme(bytes);for(const [name,data]of Object.entries(parsed.assets))await writeFile(await this.safe(join(this.dir,'assets',name)),data);const entry={id:randomUUID(),appearance:parsed.appearance,layout:parsed.layout,chrome:parsed.chrome,warnings:parsed.warnings,importedAt:new Date().toISOString()};await atomicJson(await this.safe(join(this.dir,'library',entry.id+'.json')),entry);return entry;}
 async remove(id){if(!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid theme ID');await rm(await this.safe(join(this.dir,'library',id+'.json')),{force:true});}
 async export(settings,meta){const appearance=validateAppearance({...editableAppearance(settings),...meta,enabled:true});if(!appearance.heroAsset&&!['forest','none'].includes(settings.background)){const bytes=await readFile(await this.safe(join(this.root,'backgrounds',settings.background)));appearance.heroAsset=await this.storeAsset(bytes);}
 const entries={'theme.json':Buffer.from(JSON.stringify({format:'ambtheme',schema:1,compatibleVersions:needsComposition(appearance)?[VERSION]:['1.1.0',VERSION],requiredCapabilities:['appearance-v1',...(appearance.canvas?['layout-v1']:[]),...(needsComposition(appearance)?['composition-v1']:[])],appearance,chrome:{windowCorners:settings.windowCorners||'system',titlebarColor:settings.titlebarColor||'theme',background:settings.background==='none'?'none':'forest'},layout:validateLayout(settings.layout)},null,2))};for(const key of assetKeys)if(appearance[key])entries['assets/'+appearance[key]]=await this.asset(appearance[key]);return zipSync(entries,{level:6});}
 state(){return this.pending?{id:this.pending.id,expires:this.pending.expires}:null;}
 trial(input){return this.serial(async()=>{if(this.pending)await this.revertInner();const current=await this.settings.get(),previous=visualSnapshot(current);const candidate={...current,...visualSnapshot(input)};candidate.appearance=validateAppearance(candidate.appearance);for(const key of assetKeys)if(candidate.appearance[key])await this.asset(candidate.appearance[key]);await atomicJson(await this.safe(join(this.dir,'trial.json')),{previous});await atomicJson(await this.safe(join(this.dir,'previous.json')),previous);const next=await this.persist(candidate);const id=randomUUID();this.pending={id,previous,expires:Date.now()+30000};this.timer=setTimeout(()=>this.revert().catch(()=>{}),30000);return next;});}
 confirm(id){return this.serial(async()=>{if(!this.pending||id!==this.pending.id||Date.now()>this.pending.expires)throw Error('Preview expired / 试用已过期');await rm(await this.safe(join(this.dir,'trial.json')),{force:true});clearTimeout(this.timer);this.pending=null;return this.settings.get();});}
 async revertInner(){if(!this.pending)return this.settings.get();clearTimeout(this.timer);const previous=this.pending.previous;const result=await this.persist({...await this.settings.get(),...previous});await rm(await this.safe(join(this.dir,'trial.json')),{force:true});this.pending=null;return result;}
 revert(){return this.serial(()=>this.revertInner());}
 restore(){return this.serial(async()=>{if(this.pending)await this.revertInner();const previous=JSON.parse(await readFile(await this.safe(join(this.dir,'previous.json')),'utf8'));return this.persist({...await this.settings.get(),...visualSnapshot(previous)});});}
 reset(){return this.serial(async()=>{if(this.pending)await this.revertInner();const current=await this.settings.get();await atomicJson(await this.safe(join(this.dir,'previous.json')),visualSnapshot(current));return this.persist({...current,appearance:{...appearanceDefaults},layout:validateLayout({}),theme:'system',accent:'forest',uiStyle:'square',density:'comfortable',fontSize:14,motion:true,background:'forest',panelOpacity:100,titlebarColor:'theme'});});}
}
