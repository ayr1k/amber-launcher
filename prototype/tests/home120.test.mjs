// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {PlayJournal,NewsFeed,normalizeNews,officialLink,HomePreferences,Screenshots} from '../desktop/home-services.mjs';
import {StorageSurvey} from '../desktop/maintenance.mjs';
import {LauncherCore} from '../desktop/core.mjs';
import {Themes,readTheme} from '../desktop/themes.mjs';
import {Settings} from '../desktop/workflows.mjs';
import {validateAppearance} from '../desktop/theme-schema.mjs';
import {calendarDays,dayKey} from '../src/calendar-model.mjs';
const {unzipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
async function temp(t){const root=await mkdtemp(join(tmpdir(),'amber120-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}

test('home scrolling defaults migrate old themes and survive save/export without allowing CSS',async t=>{
 const root=await temp(t),settings=new Settings(root),themes=await new Themes(root,settings).init();
 const old=readTheme(await readFile(new URL('../../docs/AMBER-Alloy-1.1.2.ambtheme',import.meta.url))).appearance;
 assert.equal(old.homeOverflow,'sections');
 const canvas={id:'root',type:'split',direction:'vertical',ratio:65,style:{scroll:'section'},children:[{id:'launch',type:'module',module:'launch'},{id:'news',type:'module',module:'news'}]};
 await settings.save({...await settings.get(),appearance:validateAppearance({homeOverflow:'page',canvas})});
 const saved=await new Settings(root).get();assert.equal(saved.appearance.homeOverflow,'page');assert.equal(saved.appearance.canvas.style.scroll,'section');
 const exported=readTheme(await themes.export(saved,{}));assert.equal(exported.appearance.homeOverflow,'page');assert.equal(exported.appearance.canvas.ratio,65);assert.equal(exported.appearance.canvas.style.scroll,'section');
 assert.throws(()=>validateAppearance({homeOverflow:'hidden'}));assert.throws(()=>validateAppearance({canvas:{...canvas,style:{scroll:'overflow:hidden'}}}));
});
const sum=d=>d.sessions.reduce((n,s)=>n+s.segments.reduce((n,[a,b])=>n+b-a,0),0);
test('journal counts observed runtime and excludes sleep, restart, clock jumps and lost exits',async t=>{
 const root=await temp(t);let now=Date.parse('2026-11-01T10:00:00Z');const j=new PlayJournal(root,()=>now),p={id:'run',instanceId:'i',startedAt:new Date(now).toISOString(),state:'running'};
 await j.observe([p]);now+=30000;await j.observe([p]);assert.equal(sum(await j.get()),30000);
 await j.suspend();now+=3600000;j.resume();await j.observe([p]);assert.equal(sum(await j.get()),30000);
 now+=30000;await j.observe([p]);assert.equal(sum(await j.get()),60000);
 const restart=new PlayJournal(root,()=>now);await restart.recover();now+=20000;await restart.observe([p]);assert.equal(sum(await restart.get()),60000);
 now+=120000;await restart.observe([p]);now-=1000;await restart.observe([p]);assert.equal(sum(await restart.get()),60000);
 now+=10000;await restart.observe([{...p,state:'failed',finishedAt:new Date(now).toISOString()}]);assert.equal(sum(await restart.get()),70000);assert.equal((await restart.get()).sessions[0].uncertain,true);
 const p2={...p,id:'second',startedAt:new Date(now).toISOString()};await restart.observe([p2]);now+=30000;await restart.observe([]);assert.equal((await restart.get()).sessions[1].state,'interrupted');
});
test('journal migration, opt-out and clear never fabricate or reimport old runtime',async t=>{
 const j=new PlayJournal(await temp(t));const h={runId:'old',instanceId:'i',startedAt:new Date().toISOString()};await j.migrate([h]);await j.migrate([h]);assert.equal((await j.get()).sessions.length,1);assert.equal(sum(await j.get()),0);
 await j.enable(false);await j.observe([{id:'new',instanceId:'j',startedAt:new Date().toISOString(),state:'running'}]);assert.equal((await j.get()).sessions.length,1);
 await j.clear();await j.migrate([h]);assert.equal((await j.get()).sessions.length,0);assert.equal((await j.get()).enabled,false);
 await writeFile(await j.file(),'broken');await assert.rejects(()=>j.get());assert.equal(await readFile(await j.file(),'utf8'),'broken');
});
test('calendar splits local-midnight sessions and filters instances',()=>{
 const start=new Date(2026,9,20,23,50).getTime(),end=new Date(2026,9,21,0,10).getTime();const s={id:'r',instanceId:'a',startedAt:new Date(start).toISOString(),segments:[[start,end]]};const d=calendarDays([s]);assert.equal(d[dayKey(new Date(start))].milliseconds,600000);assert.equal(d[dayKey(new Date(end))].milliseconds,600000);assert.deepEqual(calendarDays([s],'b'),{});
});
test('news validates destinations, retains cache on failure, reads text safely and cancels',async t=>{
 const root=await temp(t),entries=[{id:'news',title:'Official news',date:'2026-10-27',readMoreLink:'https://www.minecraft.net/en-us/article/test'}];let fail=false,calls=0;
 const f=async url=>{calls++;if(fail)throw Error('offline');return new Response(JSON.stringify(url.endsWith('/news.json')?{entries}:url.endsWith('/javaPatchNotes.json')?{entries:[{id:'patch',title:'Java patch',type:'release',date:'2026-10-28',contentPath:'javaPatchNotes/patch.json'}]}:{body:'<h1>Notes</h1><script>bad()</script><p>Fixed &amp; tested'}));};
 const n=new NewsFeed(root,f);assert.equal((await n.refresh()).items.length,2);const cached=await n.get(),patch=cached.items.find(i=>i.kind==='release');const detail=await n.detail(patch.id);assert.match(detail.body,/Fixed & tested/);assert.doesNotMatch(detail.body,/script|bad\(\)|<h1>/);const count=calls;await n.detail(patch.id);assert.equal(calls,count);
 fail=true;const partial=await n.refresh();assert.equal(partial.items.length,2);assert.ok(partial.error);assert.equal(await n.link(cached.items.find(i=>i.kind==='news').id),entries[0].readMoreLink);
 for(const url of ['javascript:alert(1)','https://minecraft.net.evil.test/','https://user@minecraft.net/','http://minecraft.net/'])assert.equal(officialLink(url),null);
 assert.equal(normalizeNews({entries:[{...entries[0],readMoreLink:'https://evil.test'}]},'news').length,0);
 const cancelling=new NewsFeed(root,async (u,{signal})=>new Promise((resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason));}));const pending=cancelling.refresh();cancelling.cancel();assert.deepEqual(await pending,partial);
});
test('home preferences reject invalid flags and paths; screenshot viewer rejects non-images',async t=>{
 const root=await temp(t),p=new HomePreferences(root);await p.save({newsAuto:true,toolFavorites:['screenshots']});assert.equal((await p.get()).newsAuto,true);await assert.rejects(()=>p.save({newsFilter:'arbitrary-url'}));
 const core=new LauncherCore(root);await core.init();const id=randomUUID(),dir=join(root,'instances',id);await mkdir(join(dir,'screenshots'),{recursive:true});await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'QA',createdAt:new Date().toISOString()}));await writeFile(join(dir,'screenshots/not-a-png.png'),'not an image');
 const shots=new Screenshots(core),items=await shots.list(id);assert.equal(items.length,1);await assert.rejects(()=>shots.read(items[0].token));await assert.rejects(()=>shots.read('../../accounts.json'));
});
test('storage survey supports cancellation and separates per-instance subfolders',async t=>{
 const root=await temp(t),core=new LauncherCore(root);await core.init();const id=randomUUID(),dir=join(root,'instances',id);await mkdir(join(dir,'mods'),{recursive:true});await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'QA',createdAt:new Date().toISOString()}));await writeFile(join(dir,'mods/a.jar'),'data');
 const scan=new StorageSurvey(core,join(root,'user-data'));scan.start();await scan.done;assert.equal(scan.get().state,'done');assert.equal(scan.get().instances[0].parts.find(p=>p.kind==='mods').bytes,4);scan.start();scan.cancel();await scan.done;assert.equal(scan.get().state,'cancelled');
});
test('first theme application confirms once, known themes apply directly, unsafe changes revert after restart',async t=>{
 const root=await temp(t),settings=new Settings(root),themes=await new Themes(root,settings).init();t.after(()=>clearTimeout(themes.timer));
 const entry=await themes.import(await readFile(new URL('../../docs/AMBER-Alloy-1.1.2.ambtheme',import.meta.url)));await themes.applyEntry(entry.id);assert.ok(themes.state());await themes.confirm(themes.state().id);await themes.reset();await themes.applyEntry(entry.id);assert.equal(themes.state(),null);assert.equal((await settings.get()).appearance.name,'AMBER Alloy');
 await themes.apply({...await settings.get(),appearance:{...(await settings.get()).appearance,fontOffset:2}});assert.equal(themes.state(),null);await themes.apply({...await settings.get(),appearance:{...(await settings.get()).appearance,windowOpacity:70}});assert.ok(themes.state());clearTimeout(themes.timer);const restart=await new Themes(root,new Settings(root)).init();assert.equal((await restart.settings.get()).appearance.windowOpacity,100);
});
test('Alloy 1.2 modules keep the original artwork and format, earlier themes remain readable',async()=>{
 const old=unzipSync(await readFile(new URL('../../docs/AMBER-Alloy-1.1.2.ambtheme',import.meta.url))),next=unzipSync(await readFile(new URL('../../docs/AMBER-Alloy-1.2.0.ambtheme',import.meta.url)));for(const k of Object.keys(old).filter(k=>k.startsWith('assets/')))assert.deepEqual(old[k],next[k]);
 const doc=JSON.parse(Buffer.from(next['theme.json']).toString());assert.equal(doc.schema,1);assert.ok(doc.requiredCapabilities.includes('home-modules-v1'));const a=readTheme(await readFile(new URL('../../docs/AMBER-Alloy-1.2.0.ambtheme',import.meta.url))).appearance;assert.equal(a.fontOffset,1.5);assert.equal(a.composition.sidebarAbout,true);
});

test('DST repeated hour counts elapsed time, and corrupt optional history can be cleared without breaking launch data',async t=>{
 const old=process.env.TZ;process.env.TZ='America/New_York';try{const a=Date.parse('2026-11-01T01:30:00-04:00'),b=Date.parse('2026-11-01T01:30:00-05:00');const d=calendarDays([{id:'dst',instanceId:'i',startedAt:new Date(a).toISOString(),segments:[[a,b]]}]);assert.equal(d['2026-11-01'].milliseconds,3600000);}finally{if(old===undefined)delete process.env.TZ;else process.env.TZ=old;}
 const root=await temp(t),j=new PlayJournal(root);await writeFile(await j.file(),JSON.stringify({schema:1,enabled:true,sessions:[null]}));await assert.rejects(()=>j.get());await j.clear();assert.equal((await j.get()).sessions.length,0);assert.equal((await j.get()).enabled,false);
 const n=new NewsFeed(root,async()=>new Response(JSON.stringify({entries:[]})));await writeFile(await n.file(),'broken');assert.deepEqual((await n.get()).items,[]);assert.deepEqual((await n.refresh()).items,[]);
});
