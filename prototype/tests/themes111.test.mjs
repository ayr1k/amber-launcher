// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {createRequire} from 'node:module';
import {Themes,readTheme} from '../desktop/themes.mjs';import {appearanceDefaults,validateAppearance,validateCanvas} from '../desktop/theme-schema.mjs';
import {compositionDefaults,validateComposition,validateSectionStyle,needsComposition} from '../desktop/theme-composition.mjs';import {Settings} from '../desktop/workflows.mjs';
const {zipSync,unzipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
const canvas={id:'root',type:'split',direction:'horizontal',ratio:70,style:{gap:0,background:'global',viewport:true},children:[{id:'launch',type:'module',module:'launch',style:{padding:32}},{id:'recent',type:'module',module:'recent',style:{separator:'left',surfaceOpacity:85}}]};
function pack(doc){return zipSync({'theme.json':Buffer.from(JSON.stringify({format:'ambtheme',schema:1,...doc}))});}
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'amber-theme111-'));const settings=new Settings(root),themes=await new Themes(root,settings).init();t.after(async()=>{clearTimeout(themes.timer);await rm(root,{recursive:true,force:true});});return {root,settings,themes};}
test('published 1.1.0 starter imports unchanged with original defaults and no capability warning',async()=>{
 const bytes=await readFile(new URL('../../docs/AMBER-Theme-Starter.ambtheme',import.meta.url));const original=JSON.parse(Buffer.from(unzipSync(bytes)['theme.json']).toString());const result=readTheme(bytes);
 assert.equal(result.appearance.composition,null);assert.equal(needsComposition(result.appearance),false);assert.deepEqual(result.warnings,[]);
 for(const [key,value] of Object.entries(original.appearance))if(key!=='enabled')assert.deepEqual(result.appearance[key],value,key);
});
test('1.1.0 module tree remains byte-equivalent after validation when no new style is present',()=>{const old={id:'launch',type:'module',module:'launch'};assert.deepEqual(validateCanvas(old),old);assert.equal(validateAppearance({}).composition,null);assert.equal(validateAppearance({canvas:old}).composition,null);});
test('composition validation is bounded, strips code and never accepts runtime policy',()=>{
 assert.deepEqual(validateComposition({}),compositionDefaults);assert.equal(validateComposition({script:'bad',accountId:'private'}).accountId,undefined);
 for(const bad of [{gap:-1},{gap:100},{launchWidth:Infinity},{launchLayout:'html'},{dockOpacity:101},{headerHeight:1},{sidebarExtras:'false'},{launchTopSpace:NaN}])assert.throws(()=>validateComposition(bad));
 assert.equal(validateSectionStyle({script:'bad'}).script,undefined);for(const bad of [{padding:-1},{background:'https://example.org/track'},{position:101},{viewport:'yes'},{fit:'url(x)'}])assert.throws(()=>validateSectionStyle(bad));
});
test('section layout, backgrounds and composition round-trip with an explicit capability',async t=>{
 const {themes,settings}=await fixture(t);const appearance=validateAppearance({...appearanceDefaults,enabled:true,composition:{...compositionDefaults,launchLayout:'stacked'},canvas});
 const bytes=await themes.export({...await settings.get(),appearance},{});const doc=JSON.parse(Buffer.from(unzipSync(bytes)['theme.json']).toString());
 assert.ok(doc.requiredCapabilities.includes('composition-v1'));assert.deepEqual(doc.compatibleVersions,['1.1.1']);const parsed=readTheme(bytes);assert.deepEqual(parsed.appearance,appearance);
 const entry=await themes.import(bytes);await themes.trial({...await settings.get(),appearance:entry.appearance});await themes.confirm(themes.state().id);const restarted=await new Themes(themes.root,new Settings(themes.root)).init();assert.deepEqual((await restarted.settings.get()).appearance,appearance);
});
test('exporting legacy layout does not require the new capability',async t=>{const {themes,settings}=await fixture(t);const bytes=await themes.export(await settings.get(),{});const doc=JSON.parse(Buffer.from(unzipSync(bytes)['theme.json']).toString());assert.ok(!doc.requiredCapabilities.includes('composition-v1'));assert.ok(doc.compatibleVersions.includes('1.1.0'));});
test('new composition trial reverts safely across restart without affecting memory or account selection',async t=>{const {root,themes,settings}=await fixture(t);await settings.save({...await settings.get(),memory:12,defaultAccountId:'fixture'});await themes.trial({...await settings.get(),memory:30,appearance:{...appearanceDefaults,enabled:true,canvas,composition:{...compositionDefaults,dockOpacity:0}}});clearTimeout(themes.timer);const restart=await new Themes(root,new Settings(root)).init(),after=await restart.settings.get();assert.equal(after.appearance.composition,null);assert.equal(after.memory,12);assert.equal(after.defaultAccountId,'fixture');});
test('invalid capability/version metadata is rejected before import and unknown required features fail closed',()=>{for(const doc of [{requiredCapabilities:'composition-v1'},{compatibleVersions:1},{requiredCapabilities:[null]},{requiredCapabilities:['run-css']},{compatibleVersions:[{}]}])assert.throws(()=>readTheme(pack({...doc,appearance:{}})));});
test('deep section styles cannot bypass the image allowlist',()=>{assert.throws(()=>readTheme(pack({appearance:{canvas,backgroundAsset:'../../accounts.json'}})));assert.throws(()=>validateCanvas({...canvas,style:{background:'file:///C:/private'}}));});
