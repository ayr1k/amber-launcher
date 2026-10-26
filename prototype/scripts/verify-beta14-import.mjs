// SPDX-License-Identifier: MPL-2.0
// Explicit opt-in network smoke. Uses only a fresh temporary instance and public Modrinth data.
import assert from 'node:assert/strict';
import {mkdtemp,realpath,mkdir,writeFile,readFile,rm,lstat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {ModUpdates} from '../desktop/mod-updates.mjs';
import {ModImport} from '../desktop/mod-import.mjs';
import {atomicJson} from '../desktop/core.mjs';
import {download,verified} from '../desktop/download.mjs';
const parent=await realpath(tmpdir()),root=await mkdtemp(join(parent,'amber-beta14-live-'));
try{
 const core=new VanillaLauncher(root);await core.init();const id=randomUUID(),dir=join(root,'instances',id);await mkdir(dir);await mkdir(join(dir,'mods'));
 await atomicJson(join(dir,'instance.json'),{schema:1,id,name:'Isolated public import verification',game:'1.21.4',loader:'fabric',status:'installed'});
 await atomicJson(join(dir,'version.json'),{id:'1.21.4',javaVersion:{majorVersion:21}});
 const content=new Modrinth(core),updates=new ModUpdates(core,content),imports=new ModImport(core,content,updates);
 const versions=await content.versions(id,'modmenu'),version=versions.find(v=>v.version_type==='release')||versions[0];assert.ok(version);
 const asset=version.files.find(f=>f.primary)||version.files[0],path=join(root,'public-modmenu.jar');
 await download({path,url:asset.url,hash:asset.hashes.sha1,size:asset.size},{root,signal:AbortSignal.timeout(60000)});
 const p=await imports.preview(id,[path],true),row=p.rows[0];assert.deepEqual(row.blockers,[]);assert.equal(row.versionId,version.id);assert.equal(row.projectId,version.project_id);
 async function done(j){for(let i=0;i<1000;i++){const current=core.jobs.find(x=>x.id===j.id);if(current.state!=='running'){assert.equal(current.state,'done',current.error);return;}await new Promise(r=>setTimeout(r,10));}throw Error('job timeout');}
 await done(await imports.apply(id,p.id,[row.key],false));assert.ok(await verified({path:join(dir,'mods/public-modmenu.jar.disabled'),hash:asset.hashes.sha1,size:asset.size}));
 const [h]=await updates.history(id);assert.equal(h.operation,'import');assert.ok(h.restorable);await done(await updates.restore(id,h.id));await assert.rejects(lstat(join(dir,'mods/public-modmenu.jar.disabled')));assert.ok(await lstat(path));
 console.log(JSON.stringify({result:'BETA14_PUBLIC_IMPORT_AND_RESTORE_OK',project:row.title,version:version.version_number,versionId:version.id,game:'1.21.4',sha1:createHash('sha1').update(await readFile(path)).digest('hex'),bytes:asset.size,originalPreserved:true,liveGameLaunch:false}));
}finally{assert.ok(resolve(root).startsWith(parent+sep)&&root.includes('amber-beta14-live-'));await rm(root,{recursive:true,force:true});}
