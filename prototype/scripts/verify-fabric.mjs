import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Opt-in live integration: creates a dedicated instance and uses the shared cache.
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { VanillaLauncher } from '../desktop/launcher.mjs';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();
let item=(await core.listInstances()).find(i=>i.name==='Fabric 启动验证'&&i.game==='1.21.1');
if(!item){await core.versions();item=await core.createInstance({name:'Fabric 启动验证',game:'1.21.1'});}
async function wait(j){let previous='';for(;;){const s=core.status().jobs.find(x=>x.id===j.id);const text=`${s.state} ${s.phase} ${s.completed}/${s.total}`;if(previous!==text){console.log(text);previous=text;}if(s.state==='done')return;if(s.state!=='running')throw Error(s.error);await new Promise(r=>setTimeout(r,1000));}}
const versions=await core.fabricVersions(item.id);const stable=versions.find(v=>v.stable);if(!stable)throw Error('No stable Fabric');console.log('FABRIC',item.id,stable.version);
await wait(await core.configureFabric(item.id,stable.version));await wait(await core.install(item.id,{threads:12}));await wait(await core.prepareJava(item.id));
if(process.argv.includes('--launch')){const p=await core.launch(item.id,{identity:await verificationIdentity(),username:'AmberPlayer',memory:3});console.log('LAUNCHED',p.pid,p.logPath);for(let i=0;i<45;i++){await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');if(log.includes('OpenAL initialized')&&log.includes('Created:')&&log.includes('Fabric Loader')){console.log('FABRIC_RENDER_AND_AUDIO_OK');console.log(log.slice(-2000));process.exit(0);}const state=core.status().processes.find(x=>x.id===p.id);if(state.state!=='running')throw Error('Game exited: '+log.slice(-2000));}throw Error('Game initialization was not confirmed within 45 seconds');}
