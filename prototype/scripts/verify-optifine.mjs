import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Pass a user-obtained official OptiFine 1.21.1 installer. Never redistributed.
import {join,resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {installOptifine} from '../desktop/optifine.mjs';
const jar=process.argv[2];if(!jar)throw Error('Supply official OptiFine 1.21.1 JAR');
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();let item=(await core.listInstances()).find(i=>i.name==='OptiFine 独立验证'&&i.game==='1.21.1');if(!item){await core.versions();item=await core.createInstance({name:'OptiFine 独立验证',game:'1.21.1'});}
async function wait(j){let previous='';for(;;){const s=core.status().jobs.find(x=>x.id===j.id),line=`${s.phase} ${s.completed}/${s.total}`;if(previous!==line){console.log(line);previous=line;}if(s.state==='done')return;if(s.state!=='running')throw Error(s.error);await new Promise(r=>setTimeout(r,1000));}}
await wait(await core.prepareJava(item.id));await wait(await installOptifine(core,item.id,resolve(jar)));await wait(await core.install(item.id,{threads:12}));
const p=await core.launch(item.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3});try{for(let i=0;i<90;i++){await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');if(log.includes('OptiFine_1.21.1_HD_U_J1')&&log.includes('OpenAL initialized')&&log.includes('Created:')){console.log('OPTIFINE_RENDER_AND_AUDIO_OK',item.id,p.logPath);break;}if(core.status().processes.find(x=>x.id===p.id).state!=='running'||i===89)throw Error(log.slice(-5000));}}finally{const own=core.processes.get(p.id);if(own.state==='running')own.child.kill();}
