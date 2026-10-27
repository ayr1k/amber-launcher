import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Uses a new dedicated instance and only terminates its own spawned game.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Workflows} from '../desktop/workflows.mjs';
import {InstanceManagement} from '../desktop/instance-management.mjs';
import {defaultInstanceName} from '../desktop/appearance.mjs';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();
const store=new Modrinth(core),work=new Workflows(core,store),manager=new InstanceManagement(core,work);
const game='1.21.4',proof={startedAt:new Date().toISOString(),game,checks:[]};
let previous='';const timer=setInterval(()=>{const j=core.status().jobs.at(-1),line=j&&`${j.state} ${j.phase} ${j.completed}/${j.total}`;if(line&&line!==previous){console.log(line);previous=line;}},2000);
try{
 const loader=(await work.choices(game,'fabric')).find(v=>v.stable);
 const target=await work.create({name:defaultInstanceName(game,['fabric'])+' · 更新八验收',icon:'pickaxe',game,loader:'fabric',version:loader.version,threads:12});
 proof.instanceId=target.id;proof.loader=target.loaderVersion;assert.equal(target.icon,'pickaxe');assert.equal(target.status,'installed');proof.checks.push('create-download-java-fabric');
 console.log('CREATED',target.id,target.name);
 const tags=await store.categories();assert.ok(tags.some(c=>c.project_type==='mod'&&c.name==='optimization'));const sorted=await store.search(target.id,{type:'mod',category:'optimization',sort:'downloads'});assert.ok(sorted.hits.length);proof.checks.push('live-official-categories-compatible-sorted-search');
 const search=await store.search(target.id,{query:'Mod Menu',type:'mod'}),project=search.hits.find(p=>p.id==='mOgUt4GM');assert.ok(project,'Mod Menu must be returned by compatibility search');
 const versions=await store.versions(target.id,project.id);assert.ok(versions.length);
 const plan=await store.preview(target.id,versions[0].id);proof.files=plan.files.map(f=>({title:f.title,projectId:f.projectId,version:f.version}));
 console.log('COMPATIBLE_PLAN',JSON.stringify(proof.files));await work.wait(await store.install(target.id,plan.id));
 const root=(await store.list(target.id)).find(f=>f.projectId===project.id);assert.ok(root?.enabled);assert.ok(plan.files.length>1,'Exercise real dependency installation');
 const manifest=await store.manifest(await core.instancePath(target.id)),required=manifest.files.find(f=>f.projectId!==project.id&&manifest.files.some(c=>c.enabled!==false&&c.dependencies?.some(d=>d.dependency_type==='required'&&(d.version_id?d.version_id===f.versionId:d.project_id===f.projectId))));assert.ok(required);
 await assert.rejects(store.toggle(target.id,required.relative),/必需依赖/);await work.wait(await store.remove(target.id,root.relative));
 assert.ok(!(await store.list(target.id)).some(f=>f.projectId===project.id));await work.wait(await store.install(target.id,(await store.preview(target.id,versions[0].id)).id));
 await store.toggle(target.id,root.relative);await store.toggle(target.id,root.relative+'.disabled');proof.checks.push('search-recommend-preview-required-dependencies','protect-dependency','recoverable-remove-reinstall','toggle-retains-files');
 await manager.setIcon(target.id,'anvil');assert.equal((await core.metadata(target.id)).item.icon,'anvil');proof.checks.push('edit-icon-persistence');
 await store.validateLaunch(target.id);
 // Deliberately invalid JVM option in this dedicated test instance, to verify process-failure recovery.
 const failed=await core.launch(target.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3,extraJvm:['-XX:AmberIntentionalInvalidOption']});
 for(let i=0;i<30&&core.processes.get(failed.id).state==='running';i++)await new Promise(r=>setTimeout(r,200));
 assert.equal(core.processes.get(failed.id).state,'failed');
 for(let i=0;i<20;i++){try{await readFile(join(await core.instancePath(target.id),'last-run.json'));break;}catch{await new Promise(r=>setTimeout(r,100));}}
 const restored=await new VanillaLauncher(core.root).runtimeStatus();assert.equal(restored.processes.find(p=>p.instanceId===target.id)?.state,'failed');proof.failureLog=failed.logPath;proof.checks.push('real-jvm-failure-persisted-after-core-restart');
 const p=await core.launch(target.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3});proof.logPath=p.logPath;console.log('LAUNCHED',p.pid);
 try{for(let i=0;i<100;i++){
  await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');
  if((log.includes('OpenAL initialized')||log.includes('Sound engine started'))&&log.includes('Created:')&&/modmenu/i.test(log)){
   proof.checks.push('minecraft-render-audio-modmenu-initialized');console.log('RENDER_AUDIO_MODMENU_OK');break;
  }
  if(core.status().processes.find(x=>x.id===p.id).state!=='running'||i===99)throw Error(log.slice(-6000));
 }}finally{const own=core.processes.get(p.id);if(own?.state==='running'){own.child.kill();await new Promise(r=>own.child.once('close',r));}}
 proof.finishedAt=new Date().toISOString();await mkdir('design/qa/alpha8',{recursive:true});await writeFile('design/qa/alpha8/live-verification.json',JSON.stringify(proof,null,2));console.log('FULL_FLOW_OK',target.id);
}finally{clearInterval(timer);}
