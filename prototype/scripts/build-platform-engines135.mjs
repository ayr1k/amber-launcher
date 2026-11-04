// SPDX-License-Identifier: MPL-2.0
import {readdir,writeFile,readFile} from 'node:fs/promises';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';import {engineHashes} from './verify-seed-engine.mjs';
const root=resolve(import.meta.dirname,'..'),vendor=join(root,'desktop/vendor/cubiomes'),sources=[];
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory()&&!['tests','docs'].includes(e.name))await scan(join(dir,e.name));else if(e.isFile()&&e.name.endsWith('.c')&&!['tests.c','xradv.c','quadbase.c'].includes(e.name))sources.push(join(dir,e.name));}}await scan(vendor);
const targets={'linux-x64':'x86_64-linux-musl','darwin-x64':'x86_64-macos','darwin-arm64':'aarch64-macos'};
const manifest={sourceSha256:(await engineHashes()).sourceSha256,targets:{}};
for(const [name,target] of Object.entries(targets)){const out=join(root,'desktop/bin','seed-engine-'+name);const r=spawnSync(process.env.AMBER_ZIG||resolve(root,'../.qa/toolchain134/ziglang/zig.exe'),['cc','-target',target,'-O2','-s','-fwrapv','-I',vendor,join(root,'desktop/seed-engine134.c'),...sources,'-lm','-o',out],{stdio:'inherit',windowsHide:true});if(r.error||r.status!==0)throw r.error||Error('Engine build failed: '+name);manifest.targets[name]=createHash('sha256').update(await readFile(out)).digest('hex');console.log('ENGINE_READY',name);}
await writeFile(join(root,'desktop/bin/platform-engines.json'),JSON.stringify(manifest,null,2)+'\n');
