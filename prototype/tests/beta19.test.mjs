// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
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
setLocale('en-US');
const GB=1073741824;
function project(slug,type='mod',extra={}){return {id:slug,slug,title:slug,project_type:type,game_versions:['1.21.1','1.20.1'],loaders:['fabric'],client_side:'required',server_side:'unsupported',...extra};}
function version(p,extra={}){const bytes=Buffer.from('synthetic test content '+p.id),hash=createHash('sha1').update(bytes).digest('hex');return {id:p.id+'-v1',project_id:p.id,version_number:'1',version_type:'release',date_published:'2025-01-01',game_versions:p.game_versions,loaders:p.project_type==='shader'?['iris']:['fabric'],files:[{filename:p.id+(p.project_type==='mod'?'.jar':'.zip'),primary:true,size:bytes.length,hashes:{sha1:hash},url:'https://cdn.modrinth.com/data/'+p.id+'/test'}],dependencies:[],...extra};}
async function fixture(t){
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
test('questionnaire bounds, hard server constraints and conservative hardware defaults',()=>{
 assert.throws(()=>answers({content:['building','magic','technology','combat']}));assert.throws(()=>answers({must:['../../evil']}));assert.throws(()=>answers({memoryGB:Infinity}));
 assert.equal(answers({play:'single',serverVersion:'bad'}).serverVersion,'');assert.equal(answers({play:'server',serverVersion:'1.20.1'}).serverVersion,'1.20.1');
 assert.ok(!desired(answers({shaders:'on'}),'balanced',16).includes('iris'));assert.ok(desired(answers({shaders:'on',gpu:'dedicated'}),'balanced',16).includes('iris'));
 assert.ok(!desired(answers({play:'server',change:'expanded',content:['exploration','building'],experience:'expert'}),'balanced',16).includes('terralith'));
 assert.equal(Object.values(weights(defaults)).reduce((a,b)=>a+b),100);assert.ok(score({performance:1},answers({priority:'performance'}))>score({performance:1},defaults));assert.equal(memoryBudget(defaults,8),4);
});
test('client environment and shader engine constraints are strict',()=>{
 const p=project('p'),v=version(p),target={game:'1.21.1',loader:'fabric'};
 assert.equal(matchVersion({...p,environment:['client_and_server']},v,target,answers({play:'server'})),false);
 assert.equal(matchVersion({...p,environment:['unknown']},v,target,answers({play:'server'})),false);
 assert.equal(matchVersion({...p,environment:['server_only']},v,target,defaults),false);
 assert.equal(matchVersion({...p,project_type:'shader'},v,target,defaults),false);
 assert.equal(matchVersion(p,{...v,version_type:'beta'},target,defaults),false);
 assert.equal(matchVersion({...p,project_type:'resourcepack',environment:['unknown']},v,target,answers({play:'server'})),true);
});
test('explicit dependency file pins choose a compatible root release instead of newest',async t=>{
 const {guided,vs}=await fixture(t);const old=structuredClone(vs.get('sodium-v1'));old.id='sodium-old';old.date_published='2024-01-01';vs.set(old.id,old);vs.get('iris-v1').dependencies=[{dependency_type:'required',version_id:old.id,project_id:'sodium'}];
 const plans=await guided.recommend({must:['iris','sodium']});assert.ok(plans.length);assert.ok(plans[0].files.some(f=>f.versionId==='sodium-old'));assert.ok(plans[0].roots.some(r=>r.versionId==='sodium-old'));
});
test('removing shader support keeps a blocker until the shader is removed',async t=>{
 const {guided}=await fixture(t);const p=(await guided.recommend({shaders:'on',priority:'visual',gpu:'dedicated'})).find(x=>x.files.some(f=>f.type==='shader'));
 const edited=await guided.edit(p.id,{roots:p.roots.filter(r=>r.slug!=='iris').map(r=>r.versionId)});assert.ok(edited.issues.errors.includes('shaderSupportMissing'));await assert.rejects(()=>guided.create(edited.id,{name:'Blocked'}),/Compatibility checks/);
});
test('known competing render implementations are blocked even without platform declarations',()=>{
 const files=['sodium','embeddium'].map((slug,i)=>({slug,projectId:slug,versionId:slug+'-v1',relative:'mods/'+i+'.jar',dependencies:[],size:1}));assert.ok(planIssues(files,{},defaults).errors.includes('duplicateRenderer'));
});
test('recommendations preserve server version, loader and required mod',async t=>{
 const {guided}=await fixture(t);const plans=await guided.recommend({play:'server',serverVersion:'1.20.1',serverLoader:'fabric',serverLoaderVersion:'0.16',must:['emi']});
 assert.ok(plans.length);for(const p of plans){assert.equal(p.target.game,'1.20.1');assert.equal(p.target.version,'0.16');assert.ok(p.roots.some(r=>r.slug==='emi'&&r.must));assert.equal(p.tested,false);assert.equal(p.issues.errors.length,0);}
 await assert.rejects(()=>guided.recommend({play:'server',serverVersion:'unknown'}),/official catalog/);
 await assert.rejects(()=>guided.recommend({play:'server',serverVersion:'1.20.1',serverLoader:'fabric',serverLoaderVersion:'bad'}),/No checked combination/);
});
test('pure vanilla does not add a loader; no-common-version fails explicitly',async t=>{
 const {guided,ps}=await fixture(t);const plans=await guided.recommend({change:'vanilla'});assert.equal(plans[0].target.loader,'vanilla');assert.deepEqual(plans[0].files,[]);
 ps.get('emi').game_versions=['bad'];await assert.rejects(()=>guided.recommend({must:['emi']}),/no common version/);
});
test('combined roots detect incompatible versions and paths before creation',async t=>{
 const {guided,vs}=await fixture(t);vs.get('sodium-v1').dependencies=[{dependency_type:'incompatible',project_id:'emi'}];
 await assert.rejects(()=>guided.recommend({must:['sodium','emi']}),/No checked combination/);
 assert.deepEqual(planIssues([{projectId:'a',versionId:'1',relative:'mods/A.jar',size:10,dependencies:[]},{projectId:'b',versionId:'2',relative:'mods/a.jar',size:10,dependencies:[]}],{},defaults).errors,['duplicatePath']);
});
test('required opt-outs stay explicit and optional dependencies are opt-in',async t=>{
 const {guided,vs}=await fixture(t);vs.get('sodium-v1').dependencies=[{dependency_type:'required',project_id:'emi'},{dependency_type:'optional',project_id:'iris'}];
 const p=(await guided.recommend({}))[0];assert.ok(p.files.some(f=>f.projectId==='emi'));assert.ok(!p.files.some(f=>f.projectId==='iris'));
 const edited=await guided.edit(p.id,{roots:p.roots.map(r=>r.versionId),optional:['sodium-v1:1'],excluded:['sodium-v1:0']});assert.ok(edited.files.some(f=>f.projectId==='iris'));assert.ok(edited.issues.warnings.includes('missingDependency'));
 await assert.rejects(()=>guided.create(edited.id,{name:'test'}),/Acknowledge/);
 const removed=await guided.edit(p.id,{roots:p.roots.filter(r=>r.slug!=='sodium').map(r=>r.versionId)});const restored=await guided.edit(removed.id,{roots:p.roots.map(r=>r.versionId)});assert.ok(restored.files.some(f=>f.projectId==='sodium'));
});
test('draft persists, excludes unknown fields, and supports both edition roots',async t=>{
 const {guided,core,content,workflows}=await fixture(t);await guided.draft({play:'server',serverVersion:'1.20.1',password:'do not save'});
 const again=new GuidedCreation(core,content,workflows);assert.equal((await again.draft()).serverVersion,'1.20.1');assert.ok(!(await readFile(join(core.root,'guided-draft.json'),'utf8')).includes('password'));
});
test('pinned file mutation and low disk prevent instance creation',async t=>{
 const {guided,vs,items}=await fixture(t);const p=(await guided.recommend({}))[0];vs.get(p.files[0].versionId).files[0].hashes.sha1='f'.repeat(40);
 await assert.rejects(()=>guided.create(p.id,{name:'test'}),/pinned file/);assert.equal(items.size,0);
 const f=await fixture(t);const plan=(await f.guided.recommend({}))[0];f.guided.space=async()=>1;await assert.rejects(()=>f.guided.create(plan.id,{name:'test'}),/space/);assert.equal(f.items.size,0);
});
test('guided workflow installs exact files and preserves plan and memory',async t=>{
 const {guided,core}=await fixture(t);const p=(await guided.recommend({}))[0];const item=await guided.create(p.id,{name:'Test',threads:2});const dir=await core.instancePath(item.id);const report=JSON.parse(await readFile(join(dir,'setup-report.json'),'utf8'));
 assert.equal(report.state,'done');assert.ok(report.completed.includes('mods'));assert.equal(report.guided.files[0].versionId,p.files[0].versionId);assert.equal(JSON.parse(await readFile(join(dir,'launch-preferences.json'),'utf8')).memory,p.memory);
 for(const file of p.files)assert.equal(createHash('sha1').update(await readFile(join(dir,file.relative))).digest('hex'),file.hash);
});
test('failed visual stage resumes across restart with pinned versions, or can be skipped',async t=>{
 const f=await fixture(t);const p=(await f.guided.recommend({texture:'simple',gpu:'dedicated',shaders:'on',priority:'visual'})).find(p=>p.files.some(x=>x.type==='shader'));assert.ok(p);
 const original=f.guided.installGroup.bind(f.guided);f.guided.installGroup=async(id,p,type)=>{if(type==='resourcepack')throw Error('test interrupted');return original(id,p,type);};
 await assert.rejects(()=>f.guided.create(p.id,{name:'Visual',threads:2}),/interrupted/);const id=f.workflows.lastSetup;assert.equal((await f.workflows.pending())[0].step,'resources');
 const workflows=new Workflows(f.core,f.content),guided=new GuidedCreation(f.core,f.content,workflows,{visuals:f.visuals,space:async()=>100*GB});
 // An added newer release must never replace the pinned plan on restart.
 f.vs.set('sodium-v2',{...f.vs.get('sodium-v1'),id:'sodium-v2',date_published:'2030-01-01'});
 await workflows.retry(id);const saved=await guided.report(id);assert.ok(saved.files.some(x=>x.versionId==='sodium-v1'));assert.ok(!saved.files.some(x=>x.versionId==='sodium-v2'));
 const second=await fixture(t);const q=(await second.guided.recommend({texture:'simple'}))[0];const install=second.guided.installGroup.bind(second.guided);second.guided.installGroup=async(id,p,type)=>{if(type==='resourcepack')throw Error('test interruption');return install(id,p,type);};await assert.rejects(()=>second.guided.create(q.id,{name:'Skip'}));second.guided.installGroup=install;await second.guided.skipVisuals(second.workflows.lastSetup);assert.equal((await second.guided.report(second.workflows.lastSetup)).skippedVisuals,true);
});
test('malformed saved plans, forged tokens and required root removal fail closed',async t=>{
 const {guided}=await fixture(t);await assert.rejects(()=>guided.create('made-up',{name:'Test'}),/expired/);const p=(await guided.recommend({must:['sodium']}))[0];await assert.rejects(()=>guided.edit(p.id,{roots:[]}),/Invalid selection/);
 const bad=structuredClone(p);bad.files[0].relative='../accounts.json';assert.throws(()=>guided.validateSaved(bad));
});
test('all guide UI and error messages ship in both languages and custom-pack template',()=>{
 const template=languageTemplate();for(const k of Object.keys(text))assert.ok(template.messages['guide.'+k]);setLocale('zh-CN');assert.equal(g('guided'),'引导创建');setLocale('en-US');assert.equal(g('guided'),'Guided creation');
});
