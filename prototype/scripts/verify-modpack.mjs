import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Live opt-in regression. Downloads a public pack into a new isolated test instance.
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Modpacks} from '../desktop/modpacks.mjs';
const c=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await c.init();await c.versions();
const instance=await c.createInstance({name:'MRPACK 集成验证',game:'1.21.1'}),store=new Modrinth(c),packs=new Modpacks(c,store);
async function wait(j){let previous='';for(;;){const s=c.status().jobs.find(x=>x.id===j.id),line=`${s.phase} ${s.completed}/${s.total}`;if(previous!==line){console.log(line);previous=line;}if(s.state==='done')return;if(s.state!=='running')throw Error(s.error);await new Promise(r=>setTimeout(r,1000));}}
await wait(await c.prepareJava(instance.id));await wait(await c.configureLoader(instance.id,'fabric','0.18.4'));await wait(await c.install(instance.id,{threads:12}));
const plan=await packs.preview(instance.id,'91uNAmXo');console.log('PLAN',plan.title,plan.files.length,plan.compatible);await wait(await packs.install(instance.id,plan.id));console.log('MRPACK_INSTALLED',instance.id);
if(process.argv.includes('--launch')){const p=await c.launch(instance.id,{identity:await verificationIdentity(),username:'AmberTest',memory:4});try{for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');if(log.includes('Created:')&&log.includes('OpenAL initialized')){console.log('MRPACK_RENDER_AND_AUDIO_OK',p.logPath);break;}if(c.status().processes.find(x=>x.id===p.id).state!=='running'||i===89)throw Error(log.slice(-4000));}}finally{const own=c.processes.get(p.id);if(own.state==='running')own.child.kill();}}
