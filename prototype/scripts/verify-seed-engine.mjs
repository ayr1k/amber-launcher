// SPDX-License-Identifier: MPL-2.0
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function engineHashes(){const files=['desktop/seed-engine134.c'];async function scan(dir){for(const e of await readdir(join(root,dir),{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else if(/\.[ch]$/.test(e.name))files.push(p);}}await scan('desktop/vendor/cubiomes');const h=createHash('sha256');for(const f of files.sort()){h.update(f+'\0');h.update(await readFile(join(root,f)));}return {sourceSha256:h.digest('hex'),binarySha256:createHash('sha256').update(await readFile(join(root,'desktop/bin/seed-engine.exe'))).digest('hex')};}
export async function verify(){const saved=JSON.parse(await readFile(join(root,'desktop/bin/seed-engine.json'),'utf8')),actual=await engineHashes();if(saved.sourceSha256!==actual.sourceSha256||saved.binarySha256!==actual.binarySha256)throw Error('Seed engine source/binary changed. Run build-seed-engine.mjs before packaging.');console.log('SEED_ENGINE_VERIFIED');}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await verify();
