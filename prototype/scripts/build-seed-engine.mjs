// SPDX-License-Identifier: MPL-2.0
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {engineHashes} from './verify-seed-engine.mjs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),vendor=join(root,'desktop/vendor/cubiomes');
const sources=[];async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory()&&!['tests','docs'].includes(e.name))await scan(join(dir,e.name));else if(e.isFile()&&e.name.endsWith('.c')&&!['tests.c','xradv.c','quadbase.c'].includes(e.name))sources.push(join(dir,e.name));}}await scan(vendor);
await mkdir(join(root,'desktop/bin'),{recursive:true});
const zig=process.env.AMBER_ZIG||resolve(root,'../.qa/toolchain134/ziglang/zig.exe');
const r=spawnSync(zig,['cc','-target','x86_64-windows-gnu','-O2','-s','-fwrapv','-ffunction-sections','-I',vendor,join(root,'desktop/seed-engine134.c'),...sources,'-o',join(root,'desktop/bin/seed-engine.exe')],{stdio:'inherit',windowsHide:true});if(r.error)throw r.error;process.exitCode=r.status;
if(r.status===0)await writeFile(join(root,'desktop/bin/seed-engine.json'),JSON.stringify({compiler:'Zig 0.14.1',target:'x86_64-windows-gnu',...await engineHashes()},null,2)+'\n');
