// SPDX-License-Identifier: MPL-2.0
import { cp, mkdir, rename, readFile, access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const target=join(root,'releases',`AMBER-${pkg.version}-win-x64`);
if(process.platform!=='win32'||process.arch!=='x64') throw new Error('This packaging script currently supports Windows x64 only.');
try { await access(target); throw new Error('Release directory already exists; use a new version to preserve the previous build.'); } catch(error) { if(error.code!=='ENOENT') throw error; }
await access(join(root,'dist/client/index.html'));
await mkdir(target,{recursive:true});
await cp(join(root,'node_modules/electron/dist'),target,{recursive:true});
await rename(join(target,'electron.exe'),join(target,'AMBER.exe'));
await rename(join(target,'LICENSE'),join(target,'LICENSE-Electron.txt'));
const app=join(target,'resources/app');
await mkdir(app,{recursive:true});
for(const file of ['package.json','LICENSE','THIRD_PARTY_NOTICES.md']) await cp(join(root,file),join(app,file));
await cp(join(root,'desktop'),join(app,'desktop'),{recursive:true});
await cp(join(root,'dist/client'),join(app,'dist/client'),{recursive:true,filter:source=>!source.endsWith('.ttf')&&!['sodium.png','lithium.png','iris.png','fabric-api.png','modmenu.png'].includes(source.split(/[\\/]/).at(-1))});
await cp(join(root,'LICENSE'),join(target,'LICENSE-MPL-2.0.txt'));
for(const file of ['README.md','VALIDATION.md','RELEASE-PLAN.md'])await cp(join(root,file),join(target,file));
await cp(join(root,'..','CHANGELOG.md'),join(target,'CHANGELOG.md'));
console.log(target);
