// SPDX-License-Identifier: MPL-2.0
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {readBoundedFile} from './bounded-io.mjs';
import {answers} from './guided-model.mjs';
import {g} from './guided-text.mjs';
import {message} from './localization.mjs';
import {defaults} from './guided-model.mjs';
export function templateDocument(value){
 const allowed=['format','schema','name','answers'];
 if(!value||value.format!=='amber-preference-template'||value.schema!==1||Object.keys(value).some(k=>!allowed.includes(k))||!plain(value.name,60)||!value.name.trim()||!value.answers||Object.keys(value.answers).some(k=>!Object.hasOwn(defaults,k)))throw Error(message('bench.templateFormat'));
 return {format:value.format,schema:1,name:value.name.trim(),answers:answers(value.answers)};
}
const plain=(v,max=80)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x1f\u202a-\u202e\u2066-\u2069]/.test(v);
export function workspace(value){
 if(!value||typeof value!=='object')throw Error(g('invalidDraft'));
 const a=answers(value.answers),ui=value.ui||{};
 if(!plain(ui.name||'',60)||!plain(ui.icon||'grass',30)||!['aggressive','balanced','conservative'].includes(ui.tier||'balanced'))throw Error(g('invalidDraft'));
 const keys=k=>{const xs=ui[k]||[];if(!Array.isArray(xs)||xs.length>100||xs.some(x=>!plain(x,220)))throw Error(g('invalidDraft'));return xs;};
 const snapshot=ui.snapshot||[];
 if(!Array.isArray(snapshot)||snapshot.length>100||snapshot.some(f=>!f||!plain(f.projectId,100)||!plain(f.versionId,100)||!plain(f.title,300)))throw Error(g('invalidDraft'));
 return {schema:1,answers:a,ui:{name:ui.name||'',icon:ui.icon||'grass',tier:ui.tier||'balanced',optional:keys('optional'),excluded:keys('excluded'),snapshot:snapshot.map(({projectId,versionId,title})=>({projectId,versionId,title}))}};
}
export class GuidedPreferences{
 constructor(root){this.root=root;this.queue=Promise.resolve();}
 async exportTemplate(id){const row=(await this.templates()).find(r=>r.id===id);if(!row)throw Error(g('invalidTemplate'));return templateDocument({format:'amber-preference-template',schema:1,name:row.name,answers:row.answers});}
 async previewTemplate(path){return templateDocument(JSON.parse(await readBoundedFile(path,64000)));}
 async importTemplate(value){const r=templateDocument(value);return this.templates('save',{name:r.name,answers:r.answers});}
 async read(file,fallback){try{return JSON.parse(await readBoundedFile(join(this.root,file),500000));}catch(e){if(e.code==='ENOENT')return fallback;throw Error(g('invalidDraft'));}}
 write(fn){const next=this.queue.then(fn);this.queue=next.catch(()=>{});return next;}
 async draft(scope,value){
  if(typeof scope!=='string'||! /^(create|addon-[a-zA-Z0-9-]{1,100})$/.test(scope))throw Error(g('invalidDraft'));
  const file='guided-workspace-'+scope+'.json';
  if(value===undefined){await this.queue;const saved=await this.read(file,null);return saved?workspace(saved):null;}
  const normalized=workspace(value);return this.write(async()=>{await atomicJson(join(this.root,file),normalized);return normalized;});
 }
 async templates(action='list',value){
  if(!['list','save','delete'].includes(action))throw Error(g('invalidTemplate'));
  return this.write(async()=>{
   const rows=await this.read('guided-templates.json',[]);
   if(!Array.isArray(rows)||rows.length>20||rows.some(r=>!r||!plain(r.name,60)||!plain(r.id,100)))throw Error(g('invalidTemplate'));
   const safe=rows.map(r=>({id:r.id,name:r.name,answers:answers(r.answers)}));
   if(action==='list')return safe;
   if(action==='delete'){if(!safe.some(r=>r.id===value))throw Error(g('invalidTemplate'));safe.splice(safe.findIndex(r=>r.id===value),1);}
   else{
    if(!plain(value?.name,60)||!value.name.trim())throw Error(g('invalidTemplate'));
    const a=answers(value.answers),name=value.name.trim();
    // A template contains preferences only: never executable paths, account state or pinned files.
    if(safe.length>=20)throw Error(g('templateLimit'));
    if(safe.some(r=>r.name.toLowerCase()===name.toLowerCase()))throw Error(g('templateDuplicate'));
    safe.push({id:randomUUID(),name,answers:a});
   }
   await atomicJson(join(this.root,'guided-templates.json'),safe);return safe;
  });
 }
}
