// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {Themes,readTheme} from '../desktop/themes.mjs';
import {Settings} from '../desktop/workflows.mjs';
import {validateAppearance,themeVariables} from '../desktop/theme-schema.mjs';
import {createElement,Fragment} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ControlButton} from '../src/ControlButton.mjs';
const {unzipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');

test('published Alloy 1.1.1 imports and survives restart without changing artwork or composition',async t=>{
 const bytes=await readFile(new URL('../../docs/AMBER-Alloy-1.1.1.ambtheme',import.meta.url));
 const original=JSON.parse(Buffer.from(unzipSync(bytes)['theme.json']).toString());
 const parsed=readTheme(bytes);assert.deepEqual(parsed.warnings,[]);
 assert.deepEqual(parsed.appearance.canvas,original.appearance.canvas);
 assert.deepEqual(parsed.appearance.composition,original.appearance.composition);
 const root=await mkdtemp(join(tmpdir(),'amber-theme112-')),settings=new Settings(root),themes=await new Themes(root,settings).init();
 t.after(async()=>{clearTimeout(themes.timer);await rm(root,{recursive:true,force:true});});
 const imported=await themes.import(bytes);await themes.trial({...await settings.get(),appearance:imported.appearance,layout:imported.layout});await themes.confirm(themes.state().id);
 const restart=await new Themes(root,new Settings(root)).init(),restored=(await restart.settings.get()).appearance;
 assert.deepEqual(restored,parsed.appearance);
 const asset=restored.backgroundAsset;
 assert.equal(createHash('sha256').update(await restart.asset(asset)).digest('hex'),asset.replace('.png',''));
 const exported=unzipSync(await restart.export(await restart.settings.get(),{}));
 assert.deepEqual(Buffer.from(exported['assets/'+asset]),Buffer.from(unzipSync(bytes)['assets/'+asset]));
});

test('text offset defaults to zero and rejects non-finite, executable or out-of-range values',()=>{
 assert.equal(validateAppearance({}).fontOffset,0);
 for(const value of [-3,-1.5,0,1.5,3])assert.equal(themeVariables({enabled:true,fontOffset:value})['--theme-text-offset'],value+'px');
 for(const fontOffset of [-3.1,3.1,NaN,Infinity,'2px',null])assert.throws(()=>validateAppearance({fontOffset}));
});

test('text offset follows confirmed themes, export/import and interrupted-trial recovery',async t=>{
 const root=await mkdtemp(join(tmpdir(),'amber-offset112-')),settings=new Settings(root),themes=await new Themes(root,settings).init();
 t.after(async()=>{clearTimeout(themes.timer);await rm(root,{recursive:true,force:true});});
 await themes.trial({...await settings.get(),appearance:validateAppearance({enabled:true,fontOffset:1.5})});await themes.confirm(themes.state().id);
 const parsed=readTheme(await themes.export(await settings.get(),{}));assert.equal(parsed.appearance.fontOffset,1.5);
 await themes.trial({...await settings.get(),appearance:{...parsed.appearance,fontOffset:-3}});clearTimeout(themes.timer);
 const restart=await new Themes(root,new Settings(root)).init();assert.equal((await restart.settings.get()).appearance.fontOffset,1.5);
 await restart.reset();assert.equal((await restart.settings.get()).appearance.fontOffset,0);
});

test('button text alignment keeps one adjacent label, native semantics and unwrapped icons',()=>{
 const icon=createElement('svg',{'aria-hidden':true,key:'icon'},createElement('path',{d:'M0 0h1'}));
 const html=renderToStaticMarkup(createElement(ControlButton,{type:'submit',disabled:true,'aria-label':'Confirm'},icon,'完成 ',createElement(Fragment,null,3,' 项')));
 assert.ok(html.startsWith('<button type="submit" disabled="" aria-label="Confirm">'));
 assert.match(html,/<svg aria-hidden="true"><path/);assert.equal((html.match(/data-control-text/g)||[]).length,1);assert.match(html,/>完成 3 项<\/span>/);
});
