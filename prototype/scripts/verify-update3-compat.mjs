import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Modpacks} from '../desktop/modpacks.mjs';
import {Workflows} from '../desktop/workflows.mjs';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();const store=new Modrinth(core),work=new Workflows(core,store),packs=new Modpacks(core,store),mode=process.argv[2];
let previous='';const timer=setInterval(()=>{const j=core.status().jobs.at(-1),line=j&&`${j.state} ${j.phase} ${j.completed}/${j.total}`;if(line&&line!==previous){console.log(line);previous=line;}},2000);
try{let target;
 if(mode==='pack'){const source=(await core.listInstances()).find(i=>i.name==='更新二验证 fabric');const preview=await packs.preview(source.id,'91uNAmXo'),plan=packs.plans.get(preview.id);target=await work.create({name:'更新三验证 自动整合包',game:plan.game,loader:plan.loader,version:plan.loaderVersion,threads:12},null,null,async item=>{plan.instanceId=item.id;plan.expiresAt=Date.now()+600000;await work.wait(await packs.install(item.id,plan.id));});console.log('PACK_FILES',plan.files.length);}
 else if(mode==='optifine-combo'){await core.versions();target=await work.create({name:'更新三验证 Forge OptiFine',game:'1.21.1',loader:'forge',version:'1.21.1-52.0.16',addOptifine:true,threads:12},join(process.cwd(),'.test-tools/OptiFine_1.21.1_HD_U_J1.jar'));}
 else{const game=mode==='neoforge'?'26.1':'1.12.2',type=mode==='neoforge'?'neoforge':'forge';const choices=await work.choices(game,type),version=choices.find(v=>v.stable)||choices[0];if(!version)throw Error('No compatible loader');console.log('CONFIG',game,type,version.version);target=await work.create({name:'更新三验证 '+type+' '+game,game,loader:type,version:version.version,threads:12});}
 console.log('TARGET',target.id);if(process.argv.includes('--launch')){const p=await core.launch(target.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3});console.log('LAUNCHED',p.pid,p.logPath);try{for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');if((log.includes('OpenAL initialized')||log.includes('Sound engine started'))&&log.includes('Created:')){if(mode==='optifine-combo'&&!log.includes('OptiFine'))throw Error('Missing OptiFine initialization');console.log('RENDER_AND_AUDIO_OK');break;}if(core.status().processes.find(x=>x.id===p.id).state!=='running'||i===99)throw Error(log.slice(-5000));}}finally{const own=core.processes.get(p.id);if(own?.state==='running')own.child.kill();}}
}finally{clearInterval(timer);}
