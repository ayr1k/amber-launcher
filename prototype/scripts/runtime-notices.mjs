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
const seen=new Set();
async function collect(name,resolver=require){if(seen.has(name))return;seen.add(name);let entry;try{entry=resolver.resolve(name+'/package.json');}catch{entry=resolver.resolve(name==='@codemirror/legacy-modes'?name+'/mode/properties':name);}let folder=dirname(entry);while(folder!==dirname(folder)){try{const pkg=JSON.parse(await readFile(join(folder,'package.json'),'utf8'));if(pkg.name===name){let license;for(const file of ['LICENSE','LICENSE.txt','LICENSE.md'])try{license=await readFile(join(folder,file),'utf8');break}catch{}if(!license)throw Error('Missing license: '+name);output+='\n\n===== '+name+' '+pkg.version+' =====\n'+license;for(const dep of Object.keys(pkg.dependencies||{}))await collect(dep,createRequire(join(folder,'package.json')));return}}catch(e){if(e.message?.startsWith('Missing license'))throw e;}folder=dirname(folder)}throw Error('Package not found: '+name)}
for(const name of ['skinview3d','codemirror','@codemirror/lang-json','@codemirror/lang-javascript','@codemirror/legacy-modes','@lezer/highlight'])await collect(name);
for(const name of ['cubiomes-MIT','cJSON-MIT','gradient-generator-MIT','enchant-order-MIT'])output+='\n\n===== '+name+' =====\n'+await readFile(join(root,'public/licenses',name+'.txt'),'utf8');
await mkdir(join(root,'public/licenses'),{recursive:true});await writeFile(join(root,'public/licenses/RUNTIME-LICENSES.txt'),output.replace(/\r?\n/g,'\r\n'));
console.log('Frontend runtime license texts collected.');
