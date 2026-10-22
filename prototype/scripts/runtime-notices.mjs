// SPDX-License-Identifier: MPL-2.0
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
let output='Bundled frontend runtime dependencies\nLicenses below retain the original copyright and permission notices.\n';
for(const name of ['react','react-dom','scheduler','@phosphor-icons/react']){
 const resolver=name==='scheduler'?createRequire(require.resolve('react-dom/package.json')):require;
 const folder=dirname(resolver.resolve(name+'/package.json')),pkg=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));
 output+=`\n\n===== ${name} ${pkg.version} =====\n`+await readFile(join(folder,'LICENSE'),'utf8');
}
await mkdir(join(root,'public/licenses'),{recursive:true});await writeFile(join(root,'public/licenses/RUNTIME-LICENSES.txt'),output);
console.log('Frontend runtime license texts collected.');
