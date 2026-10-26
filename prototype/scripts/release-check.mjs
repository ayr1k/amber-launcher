// SPDX-License-Identifier: MPL-2.0
import {readFile,readdir,lstat} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const required=['LICENSE','THIRD_PARTY_NOTICES.md','pnpm-lock.yaml','public/licenses/RUNTIME-LICENSES.txt','public/fonts/LICENSE-Sarasa.txt','public/icons/LICENSE-lucide.txt','desktop/vendor/LICENSE-fflate','desktop/java/AmberLegacyForge.java','desktop/java/AmberOptifine.java'];
for(const file of required)if(!(await lstat(join(root,file))).isFile())throw Error('Missing '+file);
if(pkg.license!=='MPL-2.0'||pkg.packageManager!=='pnpm@11.25.0')throw Error('Unexpected package metadata');
const patterns=[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/gh[pousr]_[a-zA-Z0-9]{30,}/,/github_pat_[a-zA-Z0-9_]{50,}/];
let checked=0;
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isSymbolicLink())throw Error('Source link not allowed: '+e.name);if(e.isDirectory())await walk(path);else if(/\.(mjs|cjs|jsx|js|json|ya?ml|md|java)$/.test(e.name)){const text=await readFile(path,'utf8');if(patterns.some(p=>p.test(text)))throw Error('Potential private key/token in '+path);checked++;}}}
for(const dir of ['src','desktop','tests','scripts'])await walk(join(root,dir));
await walk(join(root,'../docs'));await walk(join(root,'../.github'));
for(const file of ['README.md','CHANGELOG.md','CONTRIBUTING.md','SECURITY.md','PRIVACY.md']){const text=await readFile(join(root,'..',file),'utf8');if(patterns.some(p=>p.test(text)))throw Error('Potential credential in '+file);checked++;}
console.log(`SOURCE_CHECK_OK: ${checked} source files inspected; required license texts and locked build metadata present.`);
console.log('This is a limited token scan, not a security audit or Microsoft/asset-rights approval. See BETA-RELEASE-CHECKLIST.md.');
