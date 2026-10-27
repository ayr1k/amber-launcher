// SPDX-License-Identifier: MPL-2.0
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {GuidedCreation} from '../desktop/guided.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Workflows} from '../desktop/workflows.mjs';
import {atomicJson} from '../desktop/core.mjs';
import {answers,defaults,desired,weights,score,matchVersion,planIssues,memoryBudget} from '../desktop/guided-model.mjs';
import {setLocale,languageTemplate} from '../desktop/localization.mjs';
import {g,text} from '../desktop/guided-text.mjs';
const GB=1073741824;
export function project(slug,type='mod',extra={}){return {id:slug,slug,title:slug,project_type:type,game_versions:['1.21.1','1.20.1'],loaders:['fabric'],client_side:'required',server_side:'unsupported',...extra};}
export function version(p,extra={}){const bytes=Buffer.from('synthetic test content '+p.id),hash=createHash('sha1').update(bytes).digest('hex');return {id:p.id+'-v1',project_id:p.id,version_number:'1',version_type:'release',date_published:'2025-01-01',game_versions:p.game_versions,loaders:p.project_type==='shader'?['iris']:['fabric'],files:[{filename:p.id+(p.project_type==='mod'?'.jar':'.zip'),primary:true,size:bytes.length,hashes:{sha1:hash},url:'https://cdn.modrinth.com/data/'+p.id+'/test'}],dependencies:[],...extra};}
export async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'amber-beta19-'));t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(root,'instances'));
 const ps=new Map(),vs=new Map();for(const [id,type]of [['sodium','mod'],['lithium','mod'],['modmenu','mod'],['emi','mod'],['iris','mod'],['complementary-reimagined','shader'],['bare-bones','resourcepack'],['faithful-32x','resourcepack'],['terralith','mod'],['litematica','mod']]){const p=project(id,type);ps.set(id,p);vs.set(id+'-v1',version(p));}
 const api=async path=>{if(path.startsWith('search?'))return {hits:[{project_id:'sodium',title:'sodium'}]};const [type,id,sub]=path.split('/');if(type==='project'&&sub?.startsWith('version'))return [...vs.values()].filter(v=>v.project_id===id);const v=(type==='project'?ps:vs).get(id);if(!v)throw Error('HTTP 404 '+path);return structuredClone(v);};
 const items=new Map(),jobs=[];
 const core={root,jobs,catalog:[{id:'1.21.1',type:'release'},{id:'1.20.1',type:'release'}],versions:async()=>({versions:core.catalog}),listInstances:async()=>[...items.values()],metadata:async id=>({item:items.get(id),dir:join(root,'instances',id)}),instancePath:async id=>join(root,'instances',id),requireStopped:async()=>{},downloadThreads:2,
  fetcher:async url=>new Response(Buffer.from('synthetic test content '+String(url).split('/')[4])),
  createInstance:async input=>{const id=randomUUID(),item={id,name:input.name,game:input.game,loader:'vanilla'},dir=join(root,'instances',id);await mkdir(dir);for(const f of ['mods','resourcepacks','shaderpacks','config','saves'])await mkdir(join(dir,f));items.set(id,item);return item;},
  prepareJava:async()=>({}),configureLoader:async(id,loader,v)=>{Object.assign(items.get(id),{loader,loaderVersion:v});return {};},install:async id=>{items.get(id).status='installed';return {};},
  startJob:async(id,kind,fn)=>{core.workflowGuard?.();const job={id:randomUUID(),instanceId:id,kind,state:'running',completed:0,transferred:0};jobs.push(job);try{await fn(job,new AbortController().signal);job.state='done';}catch(e){job.state='failed';job.error=e.message;}return job;},cancel:()=>{}};
 const content=new Modrinth(core);content.api=api;const workflows=new Workflows(core,content);workflows.choices=async(_game,loader)=>loader==='fabric'?[{version:'0.16',stable:true}]:[];
 const visuals={shader:{projectId:'complementary-reimagined',versionId:'complementary-reimagined-v1',hash:vs.get('complementary-reimagined-v1').files[0].hashes.sha1},profiles:{VERYLOW:{TEST:'0'},LOW:{TEST:'1'},MEDIUM:{TEST:'2'},HIGH:{TEST:'3'}},combinations:['1.21.1','1.20.1'].map(game=>({game,loader:'fabric',lod:'off',iris:'iris-v1',lodId:null}))};
 const guided=new GuidedCreation(core,content,workflows,{visuals,hardware:async()=>({memoryGB:16,cpu:'Test CPU',adapters:['Test GPU']}),space:async()=>100*GB});return {root,core,content,workflows,guided,ps,vs,items,visuals};
}