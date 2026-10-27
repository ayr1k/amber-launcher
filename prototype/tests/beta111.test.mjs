// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fixture} from './guided-fixture.mjs';
import {GuidedPreferences} from '../desktop/guided-preferences.mjs';
import {setLocale} from '../desktop/localization.mjs';
setLocale('en-US');
test('scoped autosaves survive restart, retain choices and exclude private fields',async t=>{
 const f=await fixture(t),store=f.guided.preferences;
 await store.draft('create',{answers:{features:['recipes'],token:'private'},ui:{name:'My setup',tier:'conservative',optional:['a:1'],excluded:['b:2'],snapshot:[{projectId:'emi',versionId:'emi-v1',title:'EMI',url:'secret'}]},password:'secret'});
 await store.draft('addon-test',{answers:{features:['food']},ui:{name:'Additions'}});
 const again=new GuidedPreferences(f.root),saved=await again.draft('create');assert.equal(saved.ui.name,'My setup');assert.deepEqual(saved.ui.optional,['a:1']);assert.equal(saved.answers.token,undefined);assert.equal(saved.ui.snapshot[0].url,undefined);assert.deepEqual((await again.draft('addon-test')).answers.features,['food']);
 await assert.rejects(()=>store.draft('../accounts',{}));
 await Promise.all(['one','two','three'].map(name=>store.draft('create',{answers:{},ui:{name}})));assert.equal((await store.draft('create')).ui.name,'three');
});
test('templates are local preferences, bounded, explicitly deleted, and validated on disk',async t=>{
 const f=await fixture(t),store=f.guided.preferences;
 let rows=await store.templates('save',{name:'  Builder  ',answers:{features:['recipes'],account:'secret'},files:[{url:'executable'}]});assert.equal(rows[0].name,'Builder');assert.equal(rows[0].answers.account,undefined);
 const raw=await readFile(join(f.root,'guided-templates.json'),'utf8');assert.ok(!raw.includes('secret')&&!raw.includes('executable'));
 await assert.rejects(()=>store.templates('save',{name:'builder',answers:{}}),/already exists/);
 await assert.rejects(()=>store.templates('save',{name:'\u202etest',answers:{}}));
 assert.equal((await new GuidedPreferences(f.root).templates())[0].id,rows[0].id);
 rows=await store.templates('delete',rows[0].id);assert.equal(rows.length,0);
 for(let i=0;i<20;i++)await store.templates('save',{name:'Preset '+i,answers:{}});
 await assert.rejects(()=>store.templates('save',{name:'Overflow',answers:{}}),/20/);
 await writeFile(join(f.root,'guided-templates.json'),'invalid');await assert.rejects(()=>store.templates());
});
test('network and rate-limit failures cannot become compatibility omissions',async t=>{
 const f=await fixture(t),api=f.content.api;
 for(const status of [429,503]){f.content.api=async path=>{if(path==='project/sodium'){const error=Error('upstream');error.status=status;throw error;}return api(path);};await assert.rejects(()=>f.guided.recommend({}),status===429?/rate-limited/:/could not be fully/);assert.equal(f.guided.generationStatus().running,false);}
 f.content.api=api;assert.ok((await f.guided.recommend({})).length);
});
test('network failure swallowed inside dependency preview still fails the generation',async t=>{
 const f=await fixture(t),api=f.content.api;f.vs.get('sodium-v1').dependencies=[{dependency_type:'optional',project_id:'test'}];
 f.content.api=async path=>{if(path.startsWith('project/test'))throw Error('fetch failed');return api(path);};
 await assert.rejects(()=>f.guided.recommend({}),/could not be fully/);
});
test('cancel generation retains saved answers, creates no instance and allows retry after drain',async t=>{
 const f=await fixture(t),api=f.content.api;let enter;const entered=new Promise(r=>enter=r);
 f.content.api=async(path,{signal}={})=>{enter();return new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});};
 const run=f.guided.recommend({features:['recipes']});await entered;f.guided.cancelGeneration();await assert.rejects(()=>run,/cancelled/);
 await new Promise(r=>setTimeout(r,10));assert.equal(f.items.size,0);assert.deepEqual((await f.guided.draft()).features,['recipes']);assert.equal(f.guided.generationStatus().running,false);
 f.content.api=api;assert.ok((await f.guided.recommend({})).length);
});
test('expired plans never install but saved preferences can generate a newly checked plan',async t=>{
 const f=await fixture(t),p=(await f.guided.recommend({features:['recipes']}))[0];f.guided.plans.get(p.id).expiresAt=0;
 await assert.rejects(()=>f.guided.create(p.id,{name:'Expired'}));assert.equal(f.items.size,0);
 const list=await f.guided.recommend(await f.guided.draft());assert.notEqual(list[0].id,p.id);assert.equal(f.guided.get(list[0].id).target.game,p.target.game);
});
test('addon preview groups enabled and disabled files without changing them',async t=>{
 const f=await fixture(t),p=(await f.guided.recommend({}))[0],item=await f.guided.create(p.id,{name:'Existing'});
 await f.content.toggle(item.id,'mods/modmenu.jar',false);const before=await f.content.manifest(await f.core.instancePath(item.id));
 for(const q of await f.guided.recommendAddon(item.id,{features:['recipes']})){assert.ok(q.disabled.some(x=>x.title==='modmenu'));assert.ok(q.satisfied.some(x=>x.title==='sodium'));}
 assert.deepEqual((await f.content.manifest(await f.core.instancePath(item.id))).files,before.files);
});
