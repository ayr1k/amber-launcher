// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rename,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LauncherCore} from '../desktop/core.mjs';
import {PrelaunchMemory164} from '../desktop/prelaunch-memory164.mjs';
import {watchPrelaunch} from '../src/watch-prelaunch.mjs';

test('lookup rereads the requested marker, respects original case and rejects incomplete instances',async t=>{
  const root=await mkdtemp(join(tmpdir(),'amber1710-lookup-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const core=new LauncherCore(root),id='aaaaaaaa-bbbb-4000-8000-000000000001';
  await core.init();
  const dir=join(root,'instances',id), marker=join(dir,'instance.json');
  await mkdir(dir);
  for(const contents of ['{','null','{}',JSON.stringify({id,schema:2}),JSON.stringify({id:id.toUpperCase(),schema:1})]){
    await writeFile(marker,contents);
    await assert.rejects(core.instancePath(id),/实例不存在/);
  }
  await writeFile(marker,JSON.stringify({id,schema:1}));
  assert.equal(await core.instancePath(id),dir);
  await assert.rejects(core.instancePath(id.toUpperCase()),/无效的实例标识/);
  await rename(marker,marker+'.old');
  await assert.rejects(core.instancePath(id),/实例不存在/);
});

test('the overlay receives a wakeup at each real launch boundary',()=>{
  const changes=[];
  const service=new PrelaunchMemory164({onActivity:()=>changes.push(service.state().active?.id??null)});
  const first=service.begin();
  service.finish(first);
  const second=service.begin();
  service.finish(first);
  service.finish(second);
  assert.deepEqual(changes,[first.id,null,second.id,null]);
});

test('hidden or unmounted overlays drop late responses and release listeners and timers',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const visibility=new EventTarget(),listeners=new Set(),requests=[],seen=[];
  const api={
    onPrelaunchActivity(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
    prelaunch164(){return new Promise(resolve=>requests.push(resolve));}
  };
  for(let cycle=0;cycle<3;cycle++){
    const off=watchPrelaunch(api,visibility,value=>seen.push(value));
    assert.equal(listeners.size,1);
    const idle=requests.shift();
    for(const fn of listeners)fn();
    requests.shift()({active:{id:cycle+1}});
    idle({active:null});
    await Promise.resolve();
    assert.equal(seen.at(-1).active.id,cycle+1);
    t.mock.timers.tick(150);
    const late=requests.shift();
    visibility.hidden=true;
    visibility.dispatchEvent(new Event('visibilitychange'));
    late({active:{id:99}});
    await Promise.resolve();
    t.mock.timers.tick(1000);
    assert.equal(requests.length,0);
    visibility.hidden=false;
    visibility.dispatchEvent(new Event('visibilitychange'));
    requests.shift()({active:null,last:{status:'launch-cancelled'}});
    await Promise.resolve();
    assert.equal(seen.at(-1).last.status,'launch-cancelled');
    t.mock.timers.tick(5000);
    assert.equal(requests.length,0);
    for(const fn of listeners)fn();
    const disposed=requests.shift(),prev=seen.length;
    off();
    disposed({active:{id:100}});
    await Promise.resolve();
    visibility.dispatchEvent(new Event('visibilitychange'));
    t.mock.timers.tick(1000);
    assert.equal(listeners.size,0);
    assert.equal(requests.length,0);
    assert.equal(seen.length,prev);
  }
});
