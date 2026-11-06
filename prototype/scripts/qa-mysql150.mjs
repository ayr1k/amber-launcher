// SPDX-License-Identifier: MPL-2.0
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {MySQL150} from '../desktop/mysql150.mjs';
import {TaskQueue} from '../desktop/task-queue132.mjs';
if(!process.env.AMBER_MYSQL_ARCHIVE)throw Error('Set AMBER_MYSQL_ARCHIVE to the verified Oracle archive; this test uses temporary data only.');
const root=await mkdtemp(join(tmpdir(),'amber150-real-mysql-'));
const ids=[randomUUID(),randomUUID()];
const servers={root:join(root,'servers'),locks:new TaskQueue(4),dir:async id=>{assert.ok(ids.includes(id));const dir=join(root,'servers',id);await mkdir(dir,{recursive:true});return dir;},list:async()=>ids.map(id=>({id}))};
const codec={isEncryptionAvailable:async()=>true,encryptString:async s=>Buffer.from(s),decryptString:async b=>b.toString()};
const mysql=new MySQL150({root,fetcher:fetch},servers,codec);
try{
 await mkdir(mysql.component,{recursive:true});await copyFile(process.env.AMBER_MYSQL_ARCHIVE,join(mysql.component,'mysql.zip'));
 await Promise.all(ids.map(id=>mysql.initialize(id)));console.log('concurrent initialization and unique port allocation passed');
 const c1=await mysql.config(ids[0]),c2=await mysql.config(ids[1]);assert.notEqual(c1.port,c2.port);
 await mysql.start(ids[0]);await mysql.start(ids[1]);console.log('two independent processes passed');
 const a=await mysql.credentials(c1),b=await mysql.credentials(c2);assert.notEqual(a.plugin,b.plugin);
 const args=mysql.clientArgs(c1).map(arg=>arg==='--user=root'?'--user=plugin':arg);
 await mysql.command('mysql',args,{password:a.plugin,input:'USE plugins; CREATE TABLE test150(value INT); INSERT INTO test150 VALUES(150);'});
 await assert.rejects(mysql.command('mysql',args,{password:a.plugin,input:'SELECT * FROM mysql.user;'}));
 await assert.rejects(mysql.command('mysql',mysql.clientArgs(c2).map(arg=>arg==='--user=root'?'--user=plugin':arg),{password:a.plugin,input:'SELECT 1;'}));console.log('plugin scope and cross-instance credential isolation passed');
 await mysql.stop(ids[0]);assert.equal((await mysql.state(ids[1])).phase,'running');
 await mysql.backup(ids[0]);const backup=(await mysql.backups(ids[0]))[0];await mysql.restore(ids[0],backup.id);await mysql.start(ids[0]);
 assert.match(await mysql.command('mysql',args,{password:a.plugin,input:'SELECT value FROM plugins.test150;'}),/150/);console.log('offline backup, verified restore and other process survival passed');
 const recovered=new MySQL150({root,fetcher:fetch},servers,codec);await recovered.recover();assert.equal((await recovered.state(ids[1])).phase,'detached');await recovered.stop(ids[1]);assert.equal((await mysql.state(ids[0])).phase,'running');console.log('manager restart recovery and independent recovered shutdown passed');
}catch(e){console.error('TEST_FAILURE',e.message);for(const r of mysql.runs.values())console.error(r.tail);throw e;}finally{await mysql.shutdown();await rm(root,{recursive:true,force:true});}
