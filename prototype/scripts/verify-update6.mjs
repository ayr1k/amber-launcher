import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Creates dedicated test instances; only terminates the game spawned by this test.
import {join} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Workflows} from '../desktop/workflows.mjs';
import {InstanceManagement} from '../desktop/instance-management.mjs';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();
const work=new Workflows(core,new Modrinth(core)),manager=new InstanceManagement(core,work);
const game=process.argv[2]||'1.12.2',mode=process.argv[3]||'forge-lite';
let previous='';const timer=setInterval(()=>{const j=core.status().jobs.at(-1),line=j&&`${j.state} ${j.phase} ${j.completed}/${j.total}`;if(line&&line!==previous){console.log(line);previous=line;}},2000);
try{
 const lite=(await work.choices(game,'liteloader'))[0];if(!lite)throw Error('No compatible LiteLoader');
 const forge=mode==='optifine-lite'?null:(await work.choices(game,'forge')).find(v=>mode==='triple'?v.version==='1.12.2-14.23.5.2847':v.stable);
 const path=mode==='forge-lite'?null:join(process.cwd(),'.test-tools/OptiFine_1.12.2_HD_U_G5.jar');
 const target=await work.create({name:`更新六验证 ${game} ${mode}`,game,loader:forge?'forge':'optifine',version:forge?.version,liteVersion:lite.version,addOptifine:mode==='triple',threads:12},path);
 console.log('TARGET',target.id,forge?.version,lite.version);
 if(process.argv.includes('--launch')){
  const p=await core.launch(target.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3});console.log('LAUNCHED',p.pid,p.logPath);
  try{for(let i=0;i<100;i++){
   await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');
   if(log.includes('Error during LiteLoader'))throw Error(log.slice(-6000));
   if((log.includes('OpenAL initialized')||log.includes('Sound engine started'))&&log.includes('Created:')){
    if(!/LiteLoader/.test(log)||mode!=='forge-lite'&&!/OptiFine/.test(log))throw Error('Missing component initialization');
    console.log('RENDER_AND_AUDIO_OK',mode);break;
   }
   if(core.status().processes.find(x=>x.id===p.id).state!=='running'||i===99)throw Error(log.slice(-6000));
  }}finally{const own=core.processes.get(p.id);if(own?.state==='running'){own.child.kill();await new Promise(r=>own.child.once('exit',r));}}
 }
 const dir=await core.instancePath(target.id);await writeFile(join(dir,'lifecycle-test.txt'),'preserve');
 await manager.rename(target.id,target.name+' ✓');await manager.remove(target.id);
 if(!(await manager.list()).some(i=>i.id===target.id))throw Error('Recycle entry missing');await manager.restore(target.id);
 if(await readFile(join(dir,'lifecycle-test.txt'),'utf8')!=='preserve')throw Error('Restored contents changed');
 console.log('RENAME_RECYCLE_RESTORE_OK',target.id);
}finally{clearInterval(timer);}
