// SPDX-License-Identifier: MPL-2.0
// One local release command produces matching Windows/macOS/Linux/FreeBSD artifacts.
import {readFile,mkdir,access,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('..',import.meta.url)),pkg=JSON.parse(await readFile(join(root,'package.json'))),cache=resolve(process.env.AMBER_PLATFORM_CACHE||join(root,'../.qa/platform135-downloads'));
const run=(file,args)=>new Promise((ok,fail)=>{const p=spawn(file,args,{cwd:root,stdio:'inherit',windowsHide:true});p.on('error',fail);p.on('exit',c=>c?fail(Error('Packaging failed: '+c)):ok());});
await run(process.execPath,[join(root,'scripts/package-editions.mjs'),...process.argv.slice(2)]);
await mkdir(cache,{recursive:true});const base=`https://github.com/electron/electron/releases/download/v${pkg.devDependencies.electron}/`;
for(const file of ['SHASUMS256.txt',...['darwin-x64','darwin-arm64','linux-x64'].map(p=>`electron-v${pkg.devDependencies.electron}-${p}.zip`)]){try{await access(join(cache,file));}catch{const r=await fetch(base+file);if(!r.ok)throw Error('Runtime download failed: '+r.status);await writeFile(join(cache,file),Buffer.from(await r.arrayBuffer()));}}
await run(process.env.AMBER_PYTHON||'python',['-X','utf8',join(root,'scripts/package-platforms135.py'),'--cache',cache]);
