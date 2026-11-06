// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ServerSchedules,validateSchedule,nextOccurrence} from '../desktop/server-schedules147.mjs';
import {shouldHideToTray} from '../desktop/tray147.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {TaskQueue} from '../desktop/task-queue132.mjs';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {validateSettings} from '../desktop/workflows.mjs';
const id='12345678-1234-1234-1234-123456789abc';
const task={serverId:id,name:'Noon restart',enabled:true,action:'restart',kind:'daily',time:'12:00'};
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'amber-schedule-test-'));t.after(()=>rm(root,{recursive:true,force:true}));let now=Date.parse('2026-11-06T10:00:00Z'),calls=[];const servers={read:async()=>({}),runs:new Map([[id,{state:'running'}]]),locks:new TaskQueue(),command:async(...args)=>calls.push(args),restartScheduled:async(...args)=>calls.push(args)};const schedules=await new ServerSchedules(root,servers,{now:()=>now}).init();return {root,servers,schedules,calls,advance:ms=>now+=ms};}
test('close behavior defaults preserve active servers and explicit quit always exits',()=>{assert.equal(validateSettings({}).closeBehavior,'server');for(const active of [true,false]){assert.equal(shouldHideToTray('server',active),active);assert.equal(shouldHideToTray('tray',active),true);assert.equal(shouldHideToTray('quit',active),false);assert.equal(shouldHideToTray('tray',active,true),false);}assert.throws(()=>validateSettings({closeBehavior:'bad'}));});
test('schedule validation rejects invalid intervals, time and multi-line commands',()=>{assert.equal(validateSchedule(task).time,'12:00');for(const patch of [{time:'24:00'},{kind:'interval',minutes:0},{kind:'interval',minutes:1.5},{action:'command',command:'say hi\nstop'},{serverId:'../world'},{kind:'once',at:'bad'}])assert.throws(()=>validateSchedule({...task,...patch}));});
test('daily next occurrence uses local calendar and skips current minute',()=>{const now=new Date(2026,10,6,12,0,0);assert.equal(new Date(nextOccurrence(task,+now)).getDate(),7);assert.equal(new Date(nextOccurrence(task,+now-1000)).getHours(),12);});
test('commands run once despite overlapping ticks, and edits persist',async t=>{const f=await fixture(t);await f.schedules.save({...task,action:'command',command:'say noon',kind:'interval',minutes:1});f.advance(60000);await Promise.all([f.schedules.tick(),f.schedules.tick()]);assert.deepEqual(f.calls,[[id,'say noon']]);const row=f.schedules.list().tasks[0];assert.equal(row.last.state,'done');await f.schedules.save({...row,enabled:false});f.advance(120000);await f.schedules.tick();assert.equal(f.calls.length,1);assert.equal(JSON.parse(await readFile(f.schedules.path)).tasks[0].enabled,false);});
test('missed, offline and busy occurrences are skipped without replay',async t=>{const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1});f.advance(130000);await f.schedules.tick();assert.equal(f.schedules.rows[0].last.state,'missed');f.servers.runs.clear();f.advance(60000);await f.schedules.tick();assert.equal(f.schedules.rows[0].last.state,'offline');f.schedules.blocked=()=>true;f.advance(60000);await f.schedules.tick();assert.equal(f.schedules.rows[0].last.state,'busy');assert.equal(f.calls.length,0);});
test('expired one-shot is disabled after restart; corrupt store is preserved',async t=>{const f=await fixture(t);await f.schedules.save({...task,kind:'once',at:'2026-11-06T10:01:00Z'});const restored=await new ServerSchedules(f.root,f.servers,{now:()=>Date.parse('2026-11-06T11:00:00Z')}).init();assert.equal(restored.rows[0].enabled,false);assert.equal(restored.rows[0].last.state,'missed');await writeFile(restored.path,'broken');const broken=await new ServerSchedules(f.root,f.servers).init();assert.ok(broken.error);await assert.rejects(broken.save(task));assert.equal(await readFile(broken.path,'utf8'),'broken');});
test('one-shot consumes claim before command, even when command fails',async t=>{const f=await fixture(t);f.servers.command=async()=>{const saved=JSON.parse(await readFile(f.schedules.path));assert.equal(saved.tasks[0].enabled,false);throw Error('test failure');};await f.schedules.save({...task,action:'command',command:'say test',kind:'once',at:'2026-11-06T10:01:00Z'});f.advance(60000);await f.schedules.tick();assert.equal(f.schedules.rows[0].last.state,'failed');assert.equal(f.schedules.rows[0].enabled,false);});
test('pause drains current work and prevents scheduled execution',async t=>{const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1});await f.schedules.pause();f.advance(60000);await f.schedules.tick();assert.equal(f.calls.length,0);});
function restartFixture(){const server=new Servers({root:tmpdir()}),writes=[];let resolveDone;const run={state:'running',exitCode:0,child:{stdin:{write:v=>writes.push(v)}},done:new Promise(r=>resolveDone=r)};server.runs.set(id,run);server.startUnlocked=async()=>{writes.push('start');return true;};return {server,run,writes,finish:()=>{run.state='stopped';resolveDone();}};}
test('scheduled restart waits for process exit before starting',async()=>{const f=restartFixture(),pending=f.server.restartScheduled(id);await new Promise(r=>setImmediate(r));assert.deepEqual(f.writes,['stop\n']);f.finish();await pending;assert.deepEqual(f.writes,['stop\n','start']);});
test('timeout never causes a late restart or force kill',async()=>{const f=restartFixture();await assert.rejects(f.server.restartScheduled(id,()=>false,10),/timed out/);f.finish();await new Promise(r=>setImmediate(r));assert.deepEqual(f.writes,['stop\n']);});
test('manual stop or app exit cancels a pending restart',async()=>{for(const exit of [false,true]){const f=restartFixture();let cancelled=false;const pending=f.server.restartScheduled(id,()=>cancelled);await new Promise(r=>setImmediate(r));if(exit)cancelled=true;else await f.server.stop(id);f.finish();await assert.rejects(pending,/cancelled/);assert.deepEqual(f.writes,['stop\n']);}});
test('exit backup can take the instance lock and finishes before scheduled restart',async()=>{
 const f=restartFixture(),pending=f.server.restartScheduled(id,()=>false,1000);
 await new Promise(r=>setImmediate(r));
 const backup=f.server.locks.run(id,async()=>{f.writes.push('backup');await new Promise(r=>setImmediate(r));f.writes.push('backup complete');f.finish();});
 await Promise.all([pending,backup]);assert.deepEqual(f.writes,['stop\n','backup','backup complete','start']);
});
test('failed exit backup prevents restart even after process has exited',async()=>{
 const f=restartFixture(),pending=f.server.restartScheduled(id);
 await new Promise(r=>setImmediate(r));
 await f.server.locks.run(id,()=>{f.run.backupError='Backup disk unavailable';f.finish();});
 await assert.rejects(pending,/did not stop cleanly/);assert.deepEqual(f.writes,['stop\n']);
});
test('a replacement run from manual launch is never started twice',async()=>{
 const f=restartFixture(),pending=f.server.restartScheduled(id);
 await new Promise(r=>setImmediate(r));f.server.runs.set(id,{state:'starting'});f.finish();
 await assert.rejects(pending,/cancelled/);assert.deepEqual(f.writes,['stop\n']);
});
test('resume skips even short sleep deadlines, without replaying commands',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1});await f.schedules.pause();f.advance(65000);
 await f.schedules.resumeAfterSleep();await f.schedules.pause();assert.equal(f.schedules.rows[0].last.state,'missed');assert.equal(f.calls.length,0);
});
const gate=()=>{let release;const promise=new Promise(r=>release=r);return {promise,release};};
test('cancelled restart remains active until automatic stop backup finishes',async t=>{
 const root=await mkdtemp(join(tmpdir(),'amber-finalize147-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const entered=gate(),backup=gate(),controller=new AbortController(),jar=Buffer.from('fake jar');
 await writeFile(join(root,'server.jar'),jar);await writeFile(join(root,'eula.txt'),'eula=true\n');
 const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stdout.setEncoding=child.stderr.setEncoding=()=>{};
 child.stdin=new EventEmitter();child.stdin.write=()=>{child.emit('close',0);};
 const server=new Servers({root},{inspectRuntime:async()=>({major:21,path:'unused'}),checkPort:async()=>{},spawnProcess:()=>child});
 server.stopped=async()=>{};server.read=async()=>({dir:root,item:{memory:1,status:'ready',javaPath:'unused',type:'vanilla',jarHash:createHash('sha256').update(jar).digest('hex')}});server.properties=async()=>({values:{}});
 server.afterNormalStop=async()=>{entered.release();await backup.promise;};
 await server.startUnlocked(id);server.runs.get(id).state='running';
 const restart=server.restartScheduled(id,()=>controller.signal.aborted,120000,{signal:controller.signal});await entered.promise;controller.abort();await assert.rejects(restart,/cancelled/);
 let completed=false;const shutdown=server.shutdown().then(()=>completed=true);
 try{assert.equal(server.active,true);await new Promise(r=>setImmediate(r));assert.equal(completed,false);}finally{backup.release();await shutdown;}
 assert.equal(server.active,false);
});
test('unclaimed queued work cannot overtake a requested pause',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1,action:'command',command:'say forbidden'});
 const block=gate();const held=f.schedules.serial(()=>block.promise);f.advance(60000);
 const tick=f.schedules.tick(),pause=f.schedules.save({...f.schedules.rows[0],enabled:false});block.release();
 await Promise.all([held,tick,pause]);assert.equal(f.calls.length,0);
});
test('sleep resume cannot write or restart scheduling during migration',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1});f.schedules.start();
 try{await f.schedules.withPaused(async()=>{
  const before=await readFile(f.schedules.path,'utf8');f.advance(65000);await f.schedules.resumeAfterSleep();
  assert.equal(f.schedules.paused,true);assert.equal(await readFile(f.schedules.path,'utf8'),before);assert.equal(f.schedules.timer,null);
 });await f.schedules.tick();assert.equal(f.calls.length,0);assert.equal(f.schedules.rows[0].last.state,'missed');}finally{await f.schedules.pause();}
});
test('resume deferred by migration restarts only after the hold even if already suspended',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1});f.schedules.start();await f.schedules.suspend();
 try{await f.schedules.withPaused(async()=>{f.advance(65000);await f.schedules.resumeAfterSleep();assert.equal(f.schedules.timer,null);});
  assert.ok(f.schedules.timer);await f.schedules.tick();assert.equal(f.calls.length,0);assert.equal(f.schedules.rows[0].last.state,'missed');
 }finally{await f.schedules.pause();}
});
test('valid 03:00 task fires at spring DST transition',async t=>{
 const previous=process.env.TZ;process.env.TZ='Europe/Berlin';
 t.mock.timers.enable({apis:['Date'],now:Date.parse('2026-03-29T00:59:59Z')});
 try{const root=await mkdtemp(join(tmpdir(),'amber-dst147-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const calls=[],servers={read:async()=>({}),runs:new Map([[id,{state:'running'}]]),locks:new TaskQueue(),command:async()=>calls.push(1)};
  const schedules=await new ServerSchedules(root,servers).init();await schedules.save({...task,time:'03:00',action:'command',command:'say dawn'});
  t.mock.timers.tick(1000);await schedules.tick();assert.equal(calls.length,1);
 }finally{t.mock.timers.reset();if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('a consumed one-shot restart can still be paused while it is running',async t=>{
 const f=await fixture(t),entered=gate();f.servers.restartScheduled=async(_id,_cancel,_timeout,{signal})=>{entered.release();await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));};
 await f.schedules.save({...task,kind:'once',at:'2026-11-06T10:01:00Z'});f.advance(60000);const work=f.schedules.tick();await entered.promise;
 const claimed=f.schedules.list().tasks[0];assert.equal(claimed.enabled,false);assert.equal(claimed.last.state,'running');
 await f.schedules.save({...claimed,enabled:false});await work;assert.equal(f.schedules.rows[0].last.state,'cancelled');
});
test('a slow restart does not delay another server or a pause request',async t=>{
 const f=await fixture(t),second='87654321-1234-1234-1234-123456789abc',entered=gate();
 f.servers.runs.set(second,{state:'running'});
 f.servers.restartScheduled=async(_id,_cancel,_timeout,{signal})=>{entered.release();await new Promise((resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});};
 await f.schedules.save({...task,kind:'interval',minutes:1});
 await f.schedules.save({...task,serverId:second,kind:'interval',minutes:1,action:'command',command:'say independent'});
 f.advance(60000);const work=f.schedules.tick();await entered.promise;
 await new Promise(r=>setImmediate(r));assert.deepEqual(f.calls,[[second,'say independent']]);
 const first=f.schedules.list().tasks[0];await f.schedules.save({...first,enabled:false});await work;
 assert.equal(f.schedules.rows[0].enabled,false);assert.equal(f.schedules.rows[0].last.state,'cancelled');
});
test('pause before execution is immediate even while claims are being persisted',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1,action:'command',command:'say never'});
 const entered=gate(),release=gate(),persist=f.schedules.persist.bind(f.schedules);let first=true;
 f.schedules.persist=async()=>{if(first){first=false;entered.release();await release.promise;}await persist();};
 f.advance(60000);const work=f.schedules.tick();await entered.promise;
 const paused=f.schedules.save({...f.schedules.list().tasks[0],enabled:false});release.release();await Promise.all([work,paused]);
 assert.equal(f.calls.length,0);assert.equal(f.schedules.rows[0].last.state,'cancelled');
});
test('busy instance admission skips instead of executing 180 seconds later',async t=>{
 const f=await fixture(t),entered=gate(),release=gate();const held=f.servers.locks.run(id,async()=>{entered.release();await release.promise;});await entered.promise;
 await f.schedules.save({...task,kind:'interval',minutes:1,action:'command',command:'say never late'});f.advance(60000);
 await f.schedules.tick();assert.equal(f.schedules.rows[0].last.state,'busy');assert.equal(f.servers.locks.waiting.length,0);
 f.advance(180000);release.release();await held;assert.equal(f.calls.length,0);
});
test('a claim delayed by persistence is rechecked at execution',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1,action:'command',command:'say expired'});
 const persist=f.schedules.persist.bind(f.schedules);let first=true;f.schedules.persist=async()=>{if(first){first=false;f.advance(180000);}await persist();};
 f.advance(60000);await f.schedules.tick();assert.equal(f.calls.length,0);assert.equal(f.schedules.rows[0].last.state,'missed');
});
test('daily task recomputes its first deadline when system time zone changes',async t=>{
 const previous=process.env.TZ;
 try{process.env.TZ='Etc/UTC';const f=await fixture(t);await f.schedules.save(task);assert.equal(f.schedules.rows[0].nextRun,'2026-11-06T12:00:00.000Z');
  process.env.TZ='Europe/Berlin';await f.schedules.tick();assert.equal(f.schedules.rows[0].nextRun,'2026-11-06T11:00:00.000Z');
  f.advance(3600000);await f.schedules.tick();assert.equal(f.calls.length,1);assert.equal(new Date(f.schedules.rows[0].nextRun).getHours(),12);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('200 maximum-length Chinese commands survive save and restart',async t=>{
 const f=await fixture(t);for(let n=0;n<200;n++)await f.schedules.save({...task,name:'中文任务'.repeat(20),kind:'interval',minutes:1,action:'command',command:'中'.repeat(2000)});
 assert.ok((await readFile(f.schedules.path)).length>1000000);
 const restored=await new ServerSchedules(f.root,f.servers).init();assert.equal(restored.error,undefined);assert.equal(restored.rows.length,200);assert.equal(restored.rows[199].command,'中'.repeat(2000));
});
test('scheduled restart cannot wait behind an occupied instance lock',async()=>{
 const f=restartFixture(),entered=gate(),release=gate();const held=f.server.locks.run(id,async()=>{entered.release();await release.promise;});await entered.promise;
 await assert.rejects(f.server.restartScheduled(id),e=>e.code==='TASK_QUEUE_BUSY');release.release();await held;assert.deepEqual(f.writes,[]);
});
test('cancellation during actual Java preflight or pre-start backup never spawns',async t=>{
 for(const phase of ['java','backup'])for(const action of ['stop','pause']){
  const root=await mkdtemp(join(tmpdir(),'amber-preflight147-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const entered=gate(),release=gate(),controller=new AbortController();let spawns=0;
  const jar=Buffer.from('isolated fake JAR');await writeFile(join(root,'server.jar'),jar);await writeFile(join(root,'eula.txt'),'eula=true\n');
  const server=new Servers({root},{inspectRuntime:async()=>{if(phase==='java'){entered.release();await release.promise;}return {major:21,path:'unused'};},checkPort:async()=>{},spawnProcess:()=>{spawns++;throw Error('Must not spawn');}});
  const done=gate(),old={state:'running',exitCode:0,done:done.promise,child:{stdin:{write:()=>{old.state='stopped';done.release();}}}};server.runs.set(id,old);
  server.stopped=async()=>{};server.read=async()=>({dir:root,item:{memory:1,status:'ready',javaPath:'unused',javaMajor:21,type:'vanilla',jarHash:createHash('sha256').update(jar).digest('hex')}});server.properties=async()=>({values:{}});
  server.beforeProtectedAction=async()=>{if(phase==='backup'){entered.release();await release.promise;}};
  const work=server.restartScheduled(id,()=>controller.signal.aborted,120000,{signal:controller.signal});await entered.promise;
  if(action==='stop')await server.stop(id);else controller.abort(Error('pause'));
  release.release();await assert.rejects(work,/cancelled/);assert.equal(spawns,0);assert.equal(server.runs.get(id),old);
 }
});
test('migration pause drains work and prevents all scheduler writes until finished',async t=>{
 const f=await fixture(t);await f.schedules.save({...task,kind:'interval',minutes:1});f.schedules.start();
 try{await assert.rejects(f.schedules.withPaused(async()=>{
  const before=await readFile(f.schedules.path,'utf8');f.advance(180000);await f.schedules.tick();assert.equal(await readFile(f.schedules.path,'utf8'),before);assert.equal(f.calls.length,0);throw Error('migration fixture failed');
 }),/migration fixture failed/);assert.equal(f.schedules.paused,false);
 }finally{await f.schedules.pause();}
});
