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
