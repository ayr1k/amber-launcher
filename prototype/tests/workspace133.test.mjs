// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {observeTasks,mayDismissTasks} from '../src/task-feedback133.mjs';
import {searchCommands} from '../src/search133.mjs';
import {setLocale,t} from '../desktop/localization.mjs';
test('workspace search labels are registered in the shared English catalog',()=>{
 setLocale('en-US');try{for(const mode of ['local','online'])for(const [,zh] of searchCommands(mode,true))assert.notEqual(t(zh),zh,zh);}finally{setLocale('zh-CN');}
});
test('historical successful tasks do not replay on startup; new fast tasks do notify',()=>{
 const first=observeTasks(null,[{id:'old',state:'done'}]);assert.equal(first.changed.length,0);
 const next=observeTasks(first.seen,[{id:'old',state:'done'},{id:'fast',state:'done'}]);assert.deepEqual(next.changed.map(j=>j.id),['fast']);assert.equal(observeTasks(next.seen,[{id:'old',state:'done'},{id:'fast',state:'done'}]).changed.length,0);
});
test('parallel completion does not dismiss active work or unresolved failures',()=>{
 assert.equal(mayDismissTasks([{state:'done'},{state:'running'}]),false);assert.equal(mayDismissTasks([{state:'done'},{state:'failed'}]),false);assert.equal(mayDismissTasks([{state:'cancelled'}]),false);assert.equal(mayDismissTasks([{state:'done'},{state:'done'}]),true);
});
test('terminal transitions notify once without treating progress ticks as new tasks',()=>{
 const first=observeTasks(null,[{id:'a',state:'running',completed:0}]);assert.equal(first.changed.length,1);
 const tick=observeTasks(first.seen,[{id:'a',state:'running',completed:3}]);assert.equal(tick.changed.length,0);
 const end=observeTasks(tick.seen,[{id:'a',state:'done'}]);assert.equal(end.changed.length,1);
});
test('online commands have server destinations and omit client-only actions',()=>{
 const ids=searchCommands('online',true).map(r=>r[0]);for(const id of ['manage','mods','content','network','launch-settings','tasks','settings','tools','create'])assert.ok(ids.includes(id));assert.ok(!ids.includes('backups'));assert.ok(!ids.includes('appearance-layout'));
});
test('empty workspace retains creation, settings and connection commands without invalid instance actions',()=>{
 const ids=searchCommands('online',false).map(r=>r[0]);assert.ok(ids.includes('create'));assert.ok(ids.includes('network'));assert.ok(!ids.includes('mods'));assert.ok(!ids.includes('manage'));assert.ok(searchCommands('local',true).some(r=>r[0]==='backups'));
});
