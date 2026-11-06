// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Servers} from '../desktop/servers132.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Ports150} from '../desktop/ports150.mjs';
import {Sakura150} from '../desktop/sakura150.mjs';
import {MySQL150,MYSQL150} from '../desktop/mysql150.mjs';
import {ServerManagement140} from '../desktop/server-management140.mjs';
import {atomicJson} from '../desktop/core.mjs';
const codec={isEncryptionAvailable:async()=>true,encryptString:async s=>Buffer.from(s),decryptString:async b=>b.toString()};
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'amber-network150-'));t.after(()=>rm(root,{recursive:true,force:true}));const core=new VanillaLauncher(root),servers=await new Servers(core).init();const a=await servers.create({name:'A',type:'vanilla',game:'1.21.1',port:25565}),b=await servers.create({name:'B',type:'vanilla',game:'1.21.1',port:25566});return {root,core,servers,a,b,ports:new Ports150(servers)};}
test('ports persist per instance, share authoritative main settings, distinguish transports and reject collisions',async t=>{
 const {servers,a,b,ports}=await fixture(t);const rows=await ports.save(a.id,{name:'Voice',protocol:'udp',port:24454}),voice=rows[1];assert.equal((await ports.list(b.id)).length,1);assert.equal((await new Ports150(servers).list(a.id))[1].id,voice.id);
 await ports.save(b.id,{name:'TCP',protocol:'tcp',port:24454});await assert.rejects(ports.save(b.id,{name:'Other voice',protocol:'udp',port:24454}),/conflict|assigned/);await assert.rejects(ports.save(a.id,{id:'main',name:'Wrong',protocol:'tcp',port:25570}),/server settings/);
 const props=await servers.properties(a.id);await servers.saveProperties(a.id,{hash:props.hash,changes:{'server-port':'25570'}});assert.equal((await ports.list(a.id))[0].port,25570);
 ports.inUse=async()=>true;await assert.rejects(ports.remove(a.id,voice.id),/linked/);ports.inUse=null;await ports.remove(a.id,voice.id);await assert.rejects(ports.resolve(a.id,voice.id),/association/);
 ports.reserved=async()=>[{protocol:'tcp',port:33070}];await assert.rejects(ports.save(a.id,{name:'Reserved',protocol:'tcp',port:33070}),/assigned/);
});
test('multi-tunnel startup, failure, stop and removal remain independent including immediate cancellation',async t=>{
 const {core,servers,a,b,ports}=await fixture(t),workers=[];
 const manager=new Sakura150(core,servers,codec,ports,{workerFactory:()=>{const w={active:false,busy:false,state:async()=>({run:w.current}),async start(id){w.active=true;w.current={serverId:id,state:'running'};if(w.fail){w.active=false;throw Error('fixture failure');}},async stop(){w.active=false;if(w.current)w.current.state='stopped';}};workers.push(w);return w;}});
 manager.base.state=async()=>({installed:true});await manager.save(a.id,{name:'A main',portId:'main',tunnel:'100',token:'fixture-token'});await manager.save(b.id,{name:'B main',portId:'main',tunnel:'101'});const [first,second]=(await manager.config()).tunnels;
 await Promise.all([manager.start(first.id),manager.start(second.id)]);assert.equal(workers.filter(w=>w.active).length,2);await manager.stop(first.id);assert.equal(workers[1].active,true);await manager.remove(first.id);assert.equal(workers[1].active,true);assert.equal((await manager.config()).tunnels.length,1);
 await assert.rejects(manager.remove(second.id),/Stop/);await manager.stop(second.id);const pending=manager.start(second.id);const rejected=assert.rejects(pending,/cancelled/);await manager.stop(second.id);await rejected;assert.equal(manager.active,false);
 // A failed worker does not clear any other worker's state.
 await manager.save(a.id,{name:'A again',portId:'main',tunnel:'102'});const third=(await manager.config()).tunnels.find(x=>x.tunnel==='102');await manager.start(second.id);manager.workerFactory=()=>({active:false,start:async()=>{throw Error('fixture failure');},state:async()=>({run:null}),stop:async()=>{}});await assert.rejects(manager.start(third.id),/fixture failure/);assert.equal(manager.workers.get(second.id).active,true);await manager.stop();
});
test('legacy Sakura bindings migrate without losing encrypted credentials or changing disk on read',async t=>{
 const {core,servers,a,ports}=await fixture(t),manager=new Sakura150(core,servers,codec,ports);const file=join(manager.base.root,'settings.json');await mkdir(manager.base.root,{recursive:true});const original=JSON.stringify({secret:'encrypted-fixture',bindings:{[a.id]:{tunnel:'100'}}});await writeFile(file,original);assert.equal((await manager.config()).tunnels[0].portId,'main');assert.equal(await readFile(file,'utf8'),original);
});
test('database interrupted initialization preserves data; backup corruption is rejected before replacing current data',async t=>{
 const {core,servers,a}=await fixture(t),db=new MySQL150(core,servers,codec);db.install=async()=>{};db.command=async()=>{throw Error('fixture initialization failure');};await assert.rejects(db.initialize(a.id),/fixture/);assert.equal((await db.config(a.id)).phase,'incomplete');const p=await db.paths(a.id);await mkdir(p.data,{recursive:true});await writeFile(join(p.data,'fixture'),'preserved');await db.resetPreparation(a.id);assert.equal(await db.config(a.id),null);
 const config={schema:1,serverId:a.id,version:MYSQL150.version,port:33070,phase:'ready',secret:Buffer.from(JSON.stringify({admin:'fixture',plugin:'fixture-plugin'})).toString('base64')};await mkdir(p.data);await writeFile(join(p.data,'fixture'),'current');await atomicJson(p.config,config);await db.backup(a.id);const backup=(await db.backups(a.id))[0];await writeFile(join(p.backups,backup.id,'data','fixture'),'corrupt');await assert.rejects(db.restore(a.id,backup.id));assert.equal(await readFile(join(p.data,'fixture'),'utf8'),'current');
});
test('server copies and exit snapshots never copy database credentials or live data',async t=>{
 const {core,servers,a}=await fixture(t),dir=await servers.dir(a.id);await mkdir(join(dir,'mysql150'));await writeFile(join(dir,'mysql150','settings.json'),'private fixture');await writeFile(join(dir,'amber-ports.json'),'port fixture');const copy=await servers.copy(a.id);await assert.rejects(readFile(join(await servers.dir(copy.id),'mysql150','settings.json')),{code:'ENOENT'});await assert.rejects(readFile(join(await servers.dir(copy.id),'amber-ports.json')),{code:'ENOENT'});
 const management=new ServerManagement140(core,servers);const token=await management.snapshot(a.id,'exit');const manifest=JSON.parse(await readFile(join(management.root,token,'backup.json')));assert.ok(manifest.files.every(f=>!f.relative.startsWith('mysql150/')));
});
