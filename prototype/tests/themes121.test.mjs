// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {Themes,readTheme} from '../desktop/themes.mjs';
import {Settings} from '../desktop/workflows.mjs';
import {validateSectionStyle,hasSectionPanels} from '../desktop/theme-composition.mjs';
import {themeMetadataErrors} from '../desktop/theme-schema.mjs';
const {unzipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'amber121-'));t.after(()=>rm(root,{recursive:true,force:true}));const settings=new Settings(root),themes=await new Themes(root,settings).init();return {root,settings,themes};}
test('section panel controls reject unbounded CSS and preserve omitted legacy fields',()=>{
 assert.deepEqual(validateSectionStyle({surfaceOpacity:80}),{surfaceOpacity:80});
 for(const style of [{radius:25},{borderWidth:-1},{shadow:'0 0 100px red'},{radius:NaN},{borderWidth:'1px'}])assert.throws(()=>validateSectionStyle(style));
 assert.deepEqual(validateSectionStyle({radius:8,borderWidth:1,shadow:'soft'}),{radius:8,borderWidth:1,shadow:'soft'});
});
test('new panels survive library/export with required capability; old themes remain readable',async t=>{
 const {settings,themes}=await fixture(t);
 for(const version of ['1.1.1','1.1.2','1.2.0']){const old=readTheme(await readFile(new URL('../../docs/AMBER-Alloy-'+version+'.ambtheme',import.meta.url)));assert.ok(!hasSectionPanels(old.appearance.canvas));}
 const entry=await themes.import(await readFile(new URL('../../docs/AMBER-Nocturne-1.2.1.ambtheme',import.meta.url)));
 const snapshot={...await settings.get(),appearance:entry.appearance,layout:entry.layout};
 const bytes=await themes.export(snapshot,{}),manifest=JSON.parse(Buffer.from(unzipSync(bytes)['theme.json']).toString());
 assert.ok(manifest.requiredCapabilities.includes('section-panels-v1'));assert.deepEqual(readTheme(bytes).appearance.canvas,entry.appearance.canvas);
});
test('draft recovery stores appearance only and never applies it; library save protects original',async t=>{
 const {root,settings,themes}=await fixture(t),before=await settings.get(),candidate={...before,appearance:{...before.appearance,name:'My copy',accent:'#abcdef'},accounts:[{accessToken:'must-not-store'}]};
 await themes.draft(candidate);const restored=await new Themes(root,settings).draft();assert.equal(restored.appearance.accent,'#abcdef');assert.equal(restored.accounts,undefined);assert.equal((await settings.get()).appearance.accent,before.appearance.accent);
 const saved=await themes.saveLocal(candidate,{});await assert.rejects(()=>themes.saveLocal(candidate,{}),/同名/);assert.equal((await themes.list()).length,1);assert.equal((await themes.list())[0].id,saved.id);
 await themes.draft(null);assert.equal(await themes.draft(),null);
});
test('export metadata validates fields without fabricating attribution',async t=>{
 const {settings,themes}=await fixture(t);assert.deepEqual(themeMetadataErrors({name:'Personal',author:'',source:'',license:''}),{});assert.ok(themeMetadataErrors({name:' ',author:'',source:'',license:''}).name);
 const s=await settings.get();await assert.rejects(()=>themes.export(s,{name:' '}),/名称/);await assert.rejects(()=>themes.export(s,{source:'\u202eevil'}),/格式/);
 const exported=readTheme(await themes.export(s,{name:'My copy',author:'',source:'',license:''}));assert.equal(exported.appearance.author,'');assert.equal(exported.appearance.license,'');
});
test('Alloy 1.2.1 preserves approved background bytes',async()=>{
 const old=unzipSync(await readFile(new URL('../../docs/AMBER-Alloy-1.2.0.ambtheme',import.meta.url))),next=unzipSync(await readFile(new URL('../../docs/AMBER-Alloy-1.2.1.ambtheme',import.meta.url)));
 for(const name of Object.keys(old).filter(k=>k.startsWith('assets/')))assert.deepEqual(next[name],old[name]);
});
