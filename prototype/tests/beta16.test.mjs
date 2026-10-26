// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {WindowStateStore,fitWindow,supportsWindowCorners,runWindowAction,editingCommand} from '../desktop/window-state.mjs';
import {Settings,validateSettings} from '../desktop/workflows.mjs';
const displays=[{id:1,workArea:{x:0,y:0,width:1920,height:1040}},{id:2,workArea:{x:-1600,y:0,width:1600,height:900}}];
async function temp(t){const path=await mkdtemp(join(tmpdir(),'amber-window-'));t.after(()=>rm(path,{force:true,recursive:true}));return path;}
test('window restoration keeps negative monitor coordinates and clamps oversized windows',()=>{
 assert.deepEqual(fitWindow({x:-1400,y:40,width:1000,height:700},displays,1),{x:-1400,y:40,width:1000,height:700});
 assert.deepEqual(fitWindow({x:100,y:80,width:3000,height:2000},displays,1),{x:0,y:0,width:1920,height:1040});
});
test('disconnected monitor and corrupt placement recover on the primary work area',()=>{
 assert.deepEqual(fitWindow({x:-1800,y:0,width:1000,height:700},[displays[0]],1),{x:460,y:170,width:1000,height:700});
 for(const v of [null,{}, {x:NaN,y:0,width:1000,height:700},{x:0,y:0,width:-1,height:700}]){const actual=fitWindow(v,displays,1);assert.ok(actual.x>=0&&actual.y>=0&&actual.width<=1920&&actual.height<=1040);}
});
test('scaled small displays keep the title bar and full window in the work area',()=>{
 for(const scale of [1,1.25,1.5,2]){const area={x:0,y:0,width:Math.round(1366/scale),height:Math.round(728/scale)},actual=fitWindow({x:200,y:200,width:1440,height:1000},[{id:1,workArea:area}],1);assert.ok(actual.x>=0&&actual.y>=0);assert.ok(actual.x+actual.width<=area.width);assert.ok(actual.y+actual.height<=area.height);}
});
test('window placement persists normal bounds and maximized state across restart',async t=>{
 const root=await temp(t),store=new WindowStateStore(root),bounds={x:40,y:50,width:1080,height:760};
 await Promise.all([store.save({...bounds,x:20},false),store.save(bounds,true)]);
 assert.deepEqual(await new WindowStateStore(root).load(),{bounds,maximized:true});
 await writeFile(store.path,'invalid');assert.equal(await store.load(),null);
 await writeFile(store.path,'x'.repeat(16385));assert.equal(await store.load(),null);
 await assert.rejects(store.save({x:NaN},false));
});
test('window placement rejects links and preserves unrelated files',async t=>{
 const root=await temp(t),store=new WindowStateStore(root),other=join(root,'other');await mkdir(other);await writeFile(join(other,'keep'),'safe');await symlink(other,store.path,'junction');
 assert.equal(await store.load(),null);await assert.rejects(store.save({x:0,y:0,width:1000,height:700},false));assert.equal(await readFile(join(other,'keep'),'utf8'),'safe');
});
test('custom controls dispatch only supported actions and close through the normal guard',()=>{
 const calls=[];let maximized=false;const win={isDestroyed:()=>false,isMaximized:()=>maximized,minimize:()=>calls.push('minimize'),maximize:()=>{maximized=true;calls.push('maximize');},unmaximize:()=>{maximized=false;calls.push('restore');},close:()=>calls.push('close')};
 for(const a of ['minimize','maximize','maximize','close'])runWindowAction(win,a);
 assert.deepEqual(calls,['minimize','maximize','restore','close']);for(const a of ['destroy','quit','eval',null,{}])assert.throws(()=>runWindowAction(win,a));
});
test('window settings migrate independently from control corners and persist',async t=>{
 const root=await temp(t),settings=new Settings(root);await writeFile(settings.path,JSON.stringify({memory:8,uiStyle:'rounded',language:'en-US'}));const old=await settings.get();assert.equal(old.windowCorners,'system');
 await settings.save({...old,windowCorners:'square',titlebarColor:'accent'});const saved=await new Settings(root).get();assert.equal(saved.uiStyle,'rounded');assert.equal(saved.memory,8);assert.equal(saved.windowCorners,'square');assert.equal(saved.language,'en-US');
 for(const change of [{windowCorners:9},{windowCorners:'transparent'},{titlebarColor:'url(file)'}])assert.throws(()=>validateSettings(change));
});
test('system corner capability is honest on older Windows',()=>{assert.equal(supportsWindowCorners('win32','10.0.19045'),false);assert.equal(supportsWindowCorners('win32','10.0.22000'),true);assert.equal(supportsWindowCorners('win32','unknown'),false);assert.equal(supportsWindowCorners('linux','6.0'),false);});
test('editing shortcuts remain explicit without consuming Alt or system window keys',()=>{const input={type:'keyDown',control:true,key:'c'};assert.equal(editingCommand(input),'copy');assert.equal(editingCommand({...input,key:'Z',shift:true}),'redo');assert.equal(editingCommand({...input,key:'v',shift:true}),'pasteAndMatchStyle');for(const change of [{type:'keyUp'},{alt:true},{meta:true},{control:false},{key:'F4',alt:true},{key:'r'},{shift:true}])assert.equal(editingCommand({...input,...change}),null);});
