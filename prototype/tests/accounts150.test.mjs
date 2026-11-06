// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {PlayJournal} from '../desktop/home-services.mjs';
import {accountStatistics} from '../desktop/account-statistics150.mjs';

async function fixture(t){const root=await mkdtemp(join(tmpdir(),'amber150-journal-'));t.after(()=>rm(root,{recursive:true,force:true}));let time=Date.parse('2026-11-06T00:00:00Z');return {journal:new PlayJournal(root,()=>time),advance:n=>time+=n,run:(id,accountId)=>({id,instanceId:id,accountId,state:'running',startedAt:new Date(time).toISOString()})};}
test('account attribution is fixed at launch and old sessions remain unassigned',async t=>{
 const f=await fixture(t),a=f.run('a','account-a'),b=f.run('b','account-b'),old=f.run('old',undefined);
 await f.journal.observe([a,b,old]);f.advance(30000);await f.journal.observe([a,b,old]);
 // A UI selection, refreshed token or changed name must not move any existing time.
 f.advance(30000);await f.journal.observe([{...a,accountId:'other',name:'renamed'},b,{...old,accountId:'current'}]);
 const data=await f.journal.get();assert.equal(accountStatistics(data,'account-a').totalMs,60000);assert.equal(accountStatistics(data,'account-b').totalMs,60000);assert.equal(accountStatistics(data,'other').totalMs,0);assert.equal(accountStatistics(data,'current').totalMs,0);assert.equal(accountStatistics(data,'account-a').historicalMs,60000);
});
test('failed launches, repeated observations, restart and opt-out do not invent time',async t=>{
 const f=await fixture(t),run=f.run('a','account-a');await f.journal.observe([{...run,state:'failed'}]);assert.equal((await f.journal.get()).sessions.length,0);
 await f.journal.observe([run]);f.advance(30000);await f.journal.observe([run]);await f.journal.observe([run]);assert.equal(accountStatistics(await f.journal.get(),'account-a').totalMs,30000);
 await f.journal.recover();f.advance(60000);await f.journal.observe([run]);assert.equal(accountStatistics(await f.journal.get(),'account-a').totalMs,30000);
 await f.journal.enable(false);f.advance(30000);await f.journal.observe([run]);assert.equal(accountStatistics(await f.journal.get(),'account-a').totalMs,30000);
});
test('legacy migration preserves unknown duration without assigning current account',async t=>{
 const f=await fixture(t);await f.journal.migrate([{runId:'legacy',instanceId:'old',startedAt:new Date().toISOString()}]);await f.journal.migrate([]);const data=await f.journal.get();assert.equal(data.sessions.length,1);assert.equal(data.sessions[0].accountId,undefined);assert.equal(accountStatistics(data,'current').totalMs,0);
});
