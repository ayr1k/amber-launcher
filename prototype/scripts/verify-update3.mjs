import {verificationIdentity} from './verify-identity.mjs';
// SPDX-License-Identifier: MPL-2.0
// Live test creates a dedicated target; the existing test source is read-only.
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {Workflows} from '../desktop/workflows.mjs';
const core=new VanillaLauncher(join(process.env.APPDATA,'AMBER/library'));await core.init();const store=new Modrinth(core),work=new Workflows(core,store);
const source=(await core.listInstances()).find(i=>i.name==='更新二验证 fabric');if(!source)throw Error('Missing dedicated alpha 4 test source');
const manifest=await work.export(source.id);manifest.mods.push({title:'验证未知项目',projectId:null,reason:'预期跳过'});
console.log('SOURCE',source.id,manifest.mods.map(m=>m.title));const choices=await work.choices('1.20.1','fabric');
let last='';const timer=setInterval(()=>{const j=core.status().jobs.at(-1);const line=j&&`${j.state} ${j.phase} ${j.completed}/${j.total}`;if(line&&last!==line){console.log(line);last=line;}},1500);
try{const target=await work.create({name:'更新三验证 跨版本迁移',game:'1.20.1',loader:'fabric',version:choices.find(v=>v.stable).version,threads:12},null,manifest);console.log('TARGET',target.id);const report=await work.report(target.id);console.log('REPORT',JSON.stringify(report));if(!report.results.some(r=>r.state==='installed')||!report.results.some(r=>r.state==='skipped'))throw Error('Incomplete migration report');const after=await work.export(source.id);if(JSON.stringify(after.mods)!==JSON.stringify(manifest.mods.slice(0,-1)))throw Error('Source changed');console.log('SOURCE_UNCHANGED');
if(process.argv.includes('--launch')){const p=await core.launch(target.id,{identity:await verificationIdentity(),username:'AmberTest',memory:3});console.log('LAUNCHED',p.pid,p.logPath);try{for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,1000));const log=await readFile(p.logPath,'utf8');if((log.includes('OpenAL initialized')||log.includes('Sound engine started'))&&log.includes('Created:')){console.log('RENDER_AND_AUDIO_OK');break;}if(core.status().processes.find(x=>x.id===p.id).state!=='running'||i===99)throw Error(log.slice(-4000));}}finally{const own=core.processes.get(p.id);if(own?.state==='running')own.child.kill();}}}finally{clearInterval(timer);}
