import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Explicit live integration test: creates dedicated instances; never alters user instances.
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
const type=process.argv[2]||'forge',game=type==='liteloader'?'1.12.2':'1.21.1';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();
let item=(await core.listInstances()).find(i=>i.name===`更新二验证 ${type}`&&i.game===game);
if(!item){await core.versions();item=await core.createInstance({name:`更新二验证 ${type}`,game});}
async function wait(job){let previous='';for(;;){const j=core.status().jobs.find(x=>x.id===job.id),line=`${j.state} ${j.phase} ${j.completed}/${j.total}`;if(line!==previous){console.log(line);previous=line;}if(j.state==='done')return;if(j.state!=='running')throw Error(j.error);await new Promise(r=>setTimeout(r,1000));}}
await wait(await core.prepareJava(item.id));const versions=await core.loaderVersions(item.id,type);const version=versions.find(v=>v.stable)||versions[0];if(!version)throw Error('No loader');console.log(type,game,version.version);
await wait(await core.configureLoader(item.id,type,version.version));await wait(await core.install(item.id,{threads:12}));
if(type==='fabric'){const store=new Modrinth(core);const hits=await store.search(item.id,{query:'sodium',type:'mod'});console.log('SEARCH',hits.hits.map(p=>p.title).slice(0,3));const versions=await store.versions(item.id,'sodium');const plan=await store.preview(item.id,versions[0].id);console.log('PLAN',plan.files.map(p=>p.title));await wait(await store.install(item.id,plan.id));const local=await store.list(item.id);const target=local.find(f=>f.title==='Sodium');await store.toggle(item.id,target.relative);await store.toggle(item.id,target.relative+'.disabled');console.log('MODRINTH_INSTALL_AND_TOGGLE_OK');}
if(process.argv.includes('--launch')){const p=await core.launch(item.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3});console.log('LAUNCHED',p.pid,p.logPath);try{for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');if(type==='liteloader'&&log.includes('Error during LiteLoader'))throw Error('LiteLoader initialization failed: '+log.slice(-6000));if((log.includes('OpenAL initialized')||log.includes('Sound engine started'))&&log.includes('Created:')){console.log('RENDER_AND_AUDIO_OK',type);console.log(log.slice(-1800));process.exitCode=0;break;}const s=core.status().processes.find(x=>x.id===p.id);if(s.state!=='running')throw Error(log.slice(-6000));if(i===99)throw Error('Initialization timed out: '+log.slice(-3000));}}finally{const own=core.processes.get(p.id);if(own?.state==='running')own.child.kill();}}
