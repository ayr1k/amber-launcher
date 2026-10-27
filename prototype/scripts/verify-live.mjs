import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Explicit opt-in integration check: downloads official game files and Java.
import { join } from 'node:path';
import { VanillaLauncher } from '../desktop/launcher.mjs';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER','library'));
await core.init();
let instance=(await core.listInstances()).find(i=>i.name==='原版启动验证'&&i.game==='1.21.1');
if(!instance){await core.versions();instance=await core.createInstance({name:'原版启动验证',game:'1.21.1'});}
console.log('INSTANCE',instance.id,core.root);
async function wait(job){let previous='';while(true){const state=core.status().jobs.find(j=>j.id===job.id);const line=`${state.state} ${state.phase} ${state.completed}/${state.total} ${Math.round(state.transferred/1048576)} MiB`;if(line!==previous){console.log(line);previous=line;}if(state.state==='done')return;if(state.state==='failed'||state.state==='cancelled')throw new Error(state.error);await new Promise(r=>setTimeout(r,3000));}}
await wait(await core.install(instance.id,{threads:12}));
await wait(await core.prepareJava(instance.id));
console.log('INSTALL_AND_JAVA_OK');
if(process.argv.includes('--launch')){
 const processInfo=await core.launch(instance.id,{identity:await verificationIdentity(),username:'AmberPlayer',memory:3});console.log('LAUNCHED',JSON.stringify(processInfo));
 const timer=setInterval(()=>{const p=core.status().processes.find(p=>p.id===processInfo.id);console.log('GAME_STATE',p.state,'\n'+p.tail.slice(-1800));if(p.state!=='running'){clearInterval(timer);process.exitCode=p.exitCode===0?0:1;}},10000);
}
