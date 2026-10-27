// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture,project,version} from './guided-fixture.mjs';
import {answers,RULE_VERSION} from '../desktop/guided-model.mjs';
import {requestedFeatures,visualBudget,features} from '../desktop/guided-catalog.mjs';
import {GuidedCreation} from '../desktop/guided.mjs';
import {Workflows} from '../desktop/workflows.mjs';
import {ModUpdates} from '../desktop/mod-updates.mjs';
import {atomicJson} from '../desktop/core.mjs';
import {setLocale} from '../desktop/localization.mjs';
setLocale('en-US');
function add(f,slug,extra={},vextra={}){const p=project(slug,'mod',extra),v=version(p,vextra);f.ps.set(slug,p);f.vs.set(v.id,v);return v;}
async function rich(t){const f=await fixture(t);for(const def of Object.values(features))for(const slug of def.slugs)if(!f.ps.has(slug))add(f,slug);return f;}
test('three tiers respect explicit gameplay consent, server use, hardware uncertainty and previews',()=>{
 assert.throws(()=>answers({features:['invented']}));assert.throws(()=>answers({opengl46:'yes'}));
 for(const tier of ['aggressive','balanced','conservative']){
  assert.ok(!requestedFeatures(answers({change:'light',gameplay:['machinery']}),tier).includes('machinery'));
  assert.ok(!requestedFeatures(answers({play:'both',change:'expanded',gameplay:['terrain']}),tier).includes('terrain'));
  assert.equal(visualBudget(answers({gpu:'unknown',shaders:'on'}),tier,32).allowed,false);
  assert.equal(visualBudget(answers({gpu:'dedicated',power:true}),tier,32).shaders,false);
 }
 const a=answers({change:'expanded',gameplay:['farming','machinery']});
 assert.ok(requestedFeatures(a,'aggressive').includes('machinery'));
 assert.ok(!requestedFeatures(a,'balanced').includes('machinery'));
 assert.ok(!requestedFeatures(a,'conservative').includes('farming'));
 assert.equal(visualBudget(answers({gpu:'dedicated',resolution:'4k',fps:'120'}),'aggressive',32).profile,'VERYLOW');
});
test('recipe functionality substitutes at fixed game version without changing an exact required project',async t=>{
 const f=await rich(t);f.vs.get('jei-v1').game_versions=['1.20.1'];
 const input={play:'server',serverVersion:'1.21.1',serverLoader:'fabric',features:['recipes'],recipePreference:'jei'};
 const plans=await f.guided.recommend(input);assert.deepEqual(plans.map(p=>p.kind),['aggressive','balanced','conservative']);
 for(const p of plans){assert.equal(p.target.game,'1.21.1');assert.ok(p.roots.some(r=>r.slug==='emi'));assert.ok(!p.roots.some(r=>r.slug==='jei'));assert.equal(p.substitutions[0].from,'jei');}
 await assert.rejects(()=>f.guided.recommend({...input,must:['jei']}),/No checked combination/);
});
test('nonessential decorative availability cannot beat explicit required content',async t=>{
 const f=await rich(t);f.ps.get('jei').game_versions=['1.20.1'];f.vs.get('jei-v1').game_versions=['1.20.1'];
 const plans=await f.guided.recommend({must:['jei'],features:['connected','skins']});
 for(const p of plans){assert.equal(p.target.game,'1.20.1');assert.ok(p.roots.some(r=>r.slug==='jei'&&r.must));}
});
test('gameplay themes are not inferred from exploration and all three pure-vanilla tiers remain pure',async t=>{
 const f=await rich(t);const plans=await f.guided.recommend({content:['exploration'],change:'expanded',gameplay:[]});
 assert.ok(plans.every(p=>!p.roots.some(r=>r.group==='gameplay')));
 const vanilla=await f.guided.recommend({change:'vanilla'});assert.equal(vanilla.length,3);assert.ok(vanilla.every(p=>p.target.loader==='vanilla'&&!p.files.length));
});
test('visual registry pins shader and Iris files and selects lower settings for high resolution',async t=>{
 const f=await rich(t);const p=(await f.guided.recommend({gpu:'dedicated',shaders:'on',resolution:'4k'}))[0];
 assert.equal(p.visual.profile,'VERYLOW');assert.ok(p.files.some(f=>f.versionId==='complementary-reimagined-v1'));
 f.vs.set('shader-new',{...f.vs.get('complementary-reimagined-v1'),id:'shader-new',date_published:'2030-01-01'});
 const second=(await f.guided.recommend({gpu:'dedicated',shaders:'on'}))[0];assert.ok(!second.files.some(f=>f.versionId==='shader-new'));
});
test('LOD with shaders needs a declared exact combination and Voxy hardware confirmation',async t=>{
 const f=await rich(t);const dh=add(f,'distanthorizons'),voxy=add(f,'voxy',{}, {version_type:'beta'});
 for(const game of ['1.21.1','1.20.1'])for(const [lod,v]of [['dh',dh],['voxy',voxy]])f.visuals.combinations.push({game,loader:'fabric',lod,iris:'iris-v1',lodId:v.id});
 let p=(await f.guided.recommend({gpu:'dedicated',shaders:'on',lod:'dh'}))[0];assert.equal(p.visual.lod,'dh');assert.equal(f.guided.visualIssues(p.files,p.visual).length,0);
 const edited=await f.guided.edit(p.id,{roots:p.roots.filter(r=>r.slug!=='distanthorizons').map(r=>r.versionId)});assert.ok(edited.issues.errors.includes('visualUnverified'));
 p=(await f.guided.recommend({gpu:'dedicated',shaders:'on',lod:'voxy',freshness:'preview'}))[0];assert.equal(p.visual.lod,'off');
 p=(await f.guided.recommend({gpu:'dedicated',shaders:'on',lod:'voxy',opengl46:true}))[0];assert.equal(p.visual.lod,'off');
 p=(await f.guided.recommend({gpu:'dedicated',shaders:'on',lod:'voxy',opengl46:true,freshness:'preview'}))[0];assert.equal(p.visual.lod,'voxy');assert.ok(!p.files.some(f=>f.slug==='distanthorizons'));
});
test('unknown visual pairs degrade visibly without installing unsupported shader files',async t=>{
 const f=await rich(t);f.visuals.combinations=[];const p=(await f.guided.recommend({gpu:'dedicated',shaders:'on',lod:'dh'}))[0];
 assert.equal(p.visual.profile,'off');assert.ok(p.warnings.includes('shaderUnavailable'));assert.ok(p.warnings.includes('lodUnavailable'));
});
test('new-instance profiles are idempotent and never overwrite user shader settings',async t=>{
 const f=await rich(t);const p=(await f.guided.recommend({gpu:'dedicated',shaders:'on'}))[0],item=await f.guided.create(p.id,{name:'Visual'}),dir=await f.core.instancePath(item.id);
 const file=join(dir,'config/iris.properties');assert.match(await readFile(file,'utf8'),/enableShaders=true/);await f.guided.configureVisuals(item.id,p);
 await writeFile(file,'user settings');await assert.rejects(()=>f.guided.configureVisuals(item.id,p),/preserved/);assert.equal(await readFile(file,'utf8'),'user settings');
});
test('Beta 1.9 saved plans still open after the rules update',async t=>{
 const f=await fixture(t),p=(await f.guided.recommend({}))[0];p.ruleVersion='beta1.9-r1';delete p.visual;assert.doesNotThrow(()=>f.guided.validateSaved(p));assert.notEqual(RULE_VERSION,p.ruleVersion);
});
async function installed(t){const f=await rich(t);f.content.updates=new ModUpdates(f.core,f.content);const p=(await f.guided.recommend({features:[]})).find(p=>p.kind==='conservative');const item=await f.guided.create(p.id,{name:'Existing'});return {...f,item,dir:await f.core.instancePath(item.id)};}
test('existing-instance additions pin versions and preserve configs/worlds with undo history',async t=>{
 const f=await installed(t);await writeFile(join(f.dir,'saves/keep.txt'),'world');await writeFile(join(f.dir,'config/keep.txt'),'settings');
 const before=await f.content.manifest(f.dir);const old=f.vs.get('sodium-v1');f.vs.set('sodium-new',{...old,id:'sodium-new',date_published:'2030-01-01'});
 const plans=await f.guided.recommendAddon(f.item.id,{features:['recipes','food'],recipePreference:'jei',change:'expanded',gameplay:['machinery'],gpu:'dedicated',shaders:'on'});
 const p=plans.find(p=>p.kind==='conservative');assert.ok(p.roots.some(r=>r.versionId==='sodium-v1'));assert.ok(!p.roots.some(r=>r.group==='gameplay'));assert.equal(p.visual.profile,'off');
 await f.guided.installAddon(p.id);const after=await f.content.manifest(f.dir);for(const old of before.files)assert.deepEqual(after.files.find(f=>f.projectId===old.projectId),old);
 assert.equal(await readFile(join(f.dir,'saves/keep.txt'),'utf8'),'world');assert.equal(await readFile(join(f.dir,'config/keep.txt'),'utf8'),'settings');assert.ok(after.files.some(f=>f.projectId==='jei'));
 assert.ok((await f.content.updates.history(f.item.id)).length>0);
 const history=await f.content.updates.history(f.item.id);const last=history.find(h=>h.restorable);assert.ok(last);
 await f.workflows.wait(await f.content.updates.restore(f.item.id,last.id));
 assert.deepEqual((await f.content.manifest(f.dir)).files,before.files);
 assert.equal(await readFile(join(f.dir,'saves/keep.txt'),'utf8'),'world');
});
test('addition detects manual files and changed manifests before writing',async t=>{
 const f=await installed(t);await writeFile(join(f.dir,'mods/manual.jar'),'unidentified');await assert.rejects(()=>f.guided.recommendAddon(f.item.id,{features:['recipes']}),/unidentified/);
});
test('addition rejects newly introduced conflicts with existing content',async t=>{
 const f=await installed(t);f.vs.get('jei-v1').dependencies=[{dependency_type:'incompatible',project_id:'sodium'}];
 // Existing renderer root makes a conflict visible during plan resolution, not installation.
 const plans=await f.guided.recommendAddon(f.item.id,{features:['recipes']});for(const p of plans){assert.ok(!p.files.some(f=>f.projectId==='jei'));assert.ok(p.files.some(f=>f.projectId==='emi'));assert.ok(p.substitutions.some(s=>s.from==='jei'));}
});
test('addition cancellation/failure resumes exact content after restart',async t=>{
 const f=await installed(t);const p=(await f.guided.recommendAddon(f.item.id,{features:['recipes']}))[0];
 const install=f.content.install.bind(f.content);f.content.install=async()=>{throw Error('connection interrupted');};
 await assert.rejects(()=>f.guided.installAddon(p.id),/interrupted/);assert.equal((await f.workflows.pending())[0].kind,'guided-addon');f.content.install=install;
 const flows=new Workflows(f.core,f.content);new GuidedCreation(f.core,f.content,flows,{visuals:f.visuals,space:async()=>100*1073741824});await flows.retry(f.item.id);
 assert.equal((await flows.pending()).length,0);assert.ok((await f.content.manifest(f.dir)).files.some(f=>f.projectId==='jei'));
});
test('disabled equivalents stay disabled rather than being silently replaced',async t=>{
 const f=await installed(t);const p=(await f.guided.recommendAddon(f.item.id,{features:['recipes']}))[0];await f.guided.installAddon(p.id);
 await f.content.toggle(f.item.id,'mods/jei.jar',false);
 const plans=await f.guided.recommendAddon(f.item.id,{features:['recipes']});for(const q of plans){assert.ok(!q.files.some(f=>['jei','emi','rei'].includes(f.slug)));assert.ok(q.omitted.some(o=>o.reason==='disabledKept'));}
});
test('a newer but broken root release falls back within the same project before substituting',async t=>{
 const f=await rich(t);const old=f.vs.get('jei-v1');f.vs.set('jei-broken',{...old,id:'jei-broken',date_published:'2030-01-01',dependencies:[{dependency_type:'required',project_id:'missing-dependency'}]});
 const plans=await f.guided.recommend({features:['recipes']});for(const p of plans){assert.ok(p.files.some(f=>f.versionId==='jei-v1'));assert.ok(!p.substitutions.some(s=>s.feature==='recipes'));}
});
test('stale addon preview fails without overwriting content or starting a task',async t=>{
 const f=await installed(t);const p=(await f.guided.recommendAddon(f.item.id,{features:['recipes']}))[0];const before=await f.content.manifest(f.dir);before.files[0].updateLocked=true;await atomicJson(join(f.dir,'content.json'),before);
 await assert.rejects(()=>f.guided.installAddon(p.id),/Content changed/);assert.deepEqual((await f.content.manifest(f.dir)).files,before.files);assert.equal((await f.workflows.pending()).length,0);
});
test('addon recovery completes a committed exact manifest without a second installation',async t=>{
 const f=await installed(t),p=(await f.guided.recommendAddon(f.item.id,{features:['recipes']}))[0];await f.guided.installAddon(p.id);
 const path=join(f.dir,'content-task.json'),record=JSON.parse(await readFile(path,'utf8'));record.state='running';await atomicJson(path,record);
 const before=await f.content.manifest(f.dir);f.content.install=async()=>{throw Error('must not install twice');};
 await f.workflows.retry(f.item.id);assert.equal((await f.workflows.pending()).length,0);assert.deepEqual((await f.content.manifest(f.dir)).files,before.files);
});
test('new shader configuration validates all destinations before writing any settings',async t=>{
 const f=await rich(t),p=(await f.guided.recommend({gpu:'dedicated',shaders:'on'}))[0];const item=await f.core.createInstance({name:'Visual',game:p.target.game});await f.core.configureLoader(item.id,p.target.loader,p.target.version);
 for(const type of ['mod','resourcepack','shader'])await f.workflows.wait(await f.guided.installGroup(item.id,p,type));
 const dir=await f.core.instancePath(item.id);await writeFile(join(dir,'config/iris.properties'),'user');await assert.rejects(()=>f.guided.configureVisuals(item.id,p),/preserved/);
 const shader=p.files.find(f=>f.type==='shader');await assert.rejects(()=>readFile(join(dir,shader.relative+'.txt')),e=>e.code==='ENOENT');
});
test('explicit feature removals survive regeneration and cannot remove a required project',async t=>{
 const f=await rich(t);const plans=await f.guided.recommend({features:['recipes'],excludedFeatures:['recipes','renderer'],must:['sodium']});
 for(const p of plans){assert.ok(!p.roots.some(r=>r.feature==='recipes'));assert.ok(p.roots.some(r=>r.slug==='sodium'&&r.must));}
});
test('addition space and download estimates exclude installed files and a second game reserve',async t=>{
 const f=await installed(t);f.guided.space=async()=>128*1048576;
 const p=(await f.guided.recommendAddon(f.item.id,{features:['recipes'],diskGB:.12}))[0];
 assert.ok(p.issues.reserve<128*1048576);assert.ok(!p.issues.errors.includes('diskLimit'));
 assert.ok(p.issues.size<p.files.reduce((n,f)=>n+f.size,0));await f.guided.installAddon(p.id);
});

 test('removing and restoring a suggested shader retains the reviewed preset',async t=>{
 const f=await rich(t),p=(await f.guided.recommend({gpu:'dedicated',shaders:'on'}))[0];
 const without=await f.guided.edit(p.id,{roots:p.roots.filter(r=>r.type!=='shader').map(r=>r.versionId)});
 assert.equal(without.visual.profile,'off');
 const restored=await f.guided.edit(without.id,{roots:p.roots.map(r=>r.versionId)});
 assert.equal(restored.visual.profile,p.visual.profile);assert.ok(!restored.issues.errors.includes('visualUnverified'));
});
