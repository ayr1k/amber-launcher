// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {LibraryScope170} from '../desktop/library-scope170.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {ServerUpdates144} from '../desktop/server-updates144.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';

test('inherited adapters own overrides without mutating default or selected services',async()=>{
 const scope=new LibraryScope170(),base={value:1,metadata(){return this.value;}},other={value:2,metadata(){return this.value;}},core=scope.wrap('core',base);
 for(const graph of [null,{core:other}])await scope.run(graph,async()=>{const derived=Object.create(core);derived.metadata=()=>99;derived.value=3;assert.equal(derived.metadata(),99);assert.equal(derived.value,3);assert.equal(core.metadata(),graph?2:1);core.value=graph?2:1;assert.equal(Object.hasOwn(derived,'metadata'),true);});
 assert.equal(base.metadata(),1);assert.equal(other.metadata(),2);
});

test('fresh native instance creation remains usable after server adapter initialization',async t=>{
 const root=await mkdtemp(join(tmpdir(),'amber-new171-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const bytes=Buffer.from(JSON.stringify({id:'1.21.4',mainClass:'net.minecraft.client.main.Main'})),raw=new VanillaLauncher(root,{fetcher:async()=>new Response(bytes)}),scope=new LibraryScope170(),core=scope.wrap('core',raw);
 raw.catalog=[{id:'1.21.4',url:'https://piston-meta.mojang.com/v1/packages/test/1.21.4.json',sha1:createHash('sha1').update(bytes).digest('hex')}];new ServerUpdates144(new Servers(core));
 const item=await core.createInstance({name:'New native instance',game:'1.21.4',icon:'grass'}),content=new Modrinth(core);
 assert.equal((await core.metadata(item.id)).dir,join(root,'instances',item.id));assert.deepEqual(await content.list(item.id),[]);
});

test('server updates preserve client search, content, download target and restarted library scopes',async t=>{
 const root=await mkdtemp(join(tmpdir(),'amber-scope171-'));t.after(()=>rm(root,{recursive:true,force:true}));const id=randomUUID(),bytes=Buffer.from('controlled resource pack'),hash=createHash('sha1').update(bytes).digest('hex');
 const make=async name=>{const core=new VanillaLauncher(join(root,name)),dir=join(core.root,'instances',id);await mkdir(join(dir,'mods'),{recursive:true});await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'same name',game:'1.21.4',loader:'fabric',status:'ready',createdAt:new Date().toISOString()}));await writeFile(join(dir,'version.json'),JSON.stringify({id:'1.21.4'}));await writeFile(join(dir,'mods','keep.jar.disabled'),'keep disabled');await writeFile(join(dir,'content.json'),JSON.stringify({schema:1,files:[{relative:'mods/keep.jar',filename:'keep.jar',enabled:false,updateLocked:true}]}));return core;};
 const first=await make('upgraded'),second=await make('additional');
 for(let restart=0;restart<2;restart++){
  const scope=new LibraryScope170(),core=scope.wrap('core',first),servers=new Servers(core),updates=new ServerUpdates144(servers),content=new Modrinth(core);
  const original=first.metadata;await core.metadata(id);assert.notEqual(updates.core.metadata,core.metadata);
  for(const selected of [first,second,first,second])await scope.run(selected===first?null:{core:selected},async()=>{
   const metadata=await core.metadata(id);assert.equal(metadata.dir,join(selected.root,'instances',id));
   const listed=await content.list(id);assert.ok(listed.some(f=>f.name==='keep.jar.disabled'||f.relative==='mods/keep.jar.disabled'));assert.equal((await content.manifest(metadata.dir)).files[0].updateLocked,true);
   content.api=async route=>{if(route.startsWith('search?')){assert.ok(decodeURIComponent(route).includes('versions:1.21.4'));return {hits:[],total_hits:0};}throw Error(route);};assert.deepEqual(await content.search(id),{hits:[],total:0});
   // The production content service must resolve the same scoped client path
   // after asynchronous work, not the server adapter or another selected root.
   await new Promise(resolve=>setTimeout(resolve,1));assert.equal((await core.metadata(id)).dir,metadata.dir);
   const project='pack'+restart+selected.root.endsWith('additional'),version='v'+project;
   content.api=async route=>route==='version/'+version?{id:version,project_id:project,version_number:version,game_versions:['1.21.4'],loaders:[],dependencies:[],files:[{filename:project+'.zip',size:bytes.length,hashes:{sha1:hash},url:'https://cdn.modrinth.com/data/'+project+'/versions/'+version+'/pack.zip'}]}:route==='project/'+project?{id:project,title:project,project_type:'resourcepack'}:Promise.reject(Error(route));
   selected.fetcher=async()=>new Response(bytes);
   const plan=await content.preview(id,version),job=await content.install(id,plan.id);
   for(let n=0;n<200&&selected.jobs.find(j=>j.id===job.id)?.state==='running';n++)await new Promise(r=>setTimeout(r,10));
   const done=selected.jobs.find(j=>j.id===job.id);assert.equal(done.state,'done',done.error);assert.deepEqual(await readFile(join(metadata.dir,'resourcepacks',project+'.zip')),bytes);
  });
  assert.equal(first.metadata,original);await assert.rejects(updates.core.metadata(id),/servers/);
 }
 assert.equal(await readFile(join(first.root,'instances',id,'mods','keep.jar.disabled'),'utf8'),'keep disabled');assert.equal(await readFile(join(second.root,'instances',id,'mods','keep.jar.disabled'),'utf8'),'keep disabled');
});
