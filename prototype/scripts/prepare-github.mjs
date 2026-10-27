// SPDX-License-Identifier: MPL-2.0
import {readFile,writeFile,mkdir,readdir,lstat,cp,access} from 'node:fs/promises';
import {resolve,dirname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {PRODUCT_NAME,REPOSITORY_URL} from '../desktop/edition.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),repo=resolve(root,'..'),require=createRequire(import.meta.url);
const {zipSync}=require('../desktop/vendor/fflate.cjs');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const name=PRODUCT_NAME+'-'+pkg.version+'-github-source',target=join(root,'releases',name);
try{await access(target);throw Error('Source export already exists; preserve it and choose a new version.');}catch(e){if(e.code!=='ENOENT')throw e;}
const excluded=new Set(['sodium.png','lithium.png','iris.png','fabric-api.png','modmenu.png']);
const files=[];
async function collect(path){const st=await lstat(path);if(st.isSymbolicLink())throw Error('Source symlink rejected');if(st.isDirectory()){for(const name of await readdir(path))await collect(join(path,name));}else{if(path.endsWith('.ttf')||excluded.has(path.split(/[\\/]/).at(-1)))return;files.push(path);}}
for(const file of ['README.md','CHANGELOG.md','LICENSE','.gitignore','CONTRIBUTING.md','SECURITY.md','PRIVACY.md','docs','.github'])await collect(join(repo,file));
for(const file of ['build','electron-builder.yml','BETA111-TESTING.md','GUIDED-COMPATIBILITY.md','src','desktop','tests','public','worker','.openai','index.html','vite.config.mjs','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','.npmrc','LICENSE','README.md','THIRD_PARTY_NOTICES.md','BETA-RELEASE-CHECKLIST.md'])await collect(join(root,file));
try{await access(join(root,'editions'));await collect(join(root,'editions'));}catch(e){if(e.code!=='ENOENT')throw e;}
for(const script of ['prepare-sites-build.mjs','package-desktop.mjs','package-editions.mjs','prepare-edition-source.mjs','build-java-bridge.mjs','runtime-notices.mjs','check-locales.mjs','release-check.mjs','prepare-github.mjs',...(await readdir(join(root,'scripts'))).filter(n=>/^verify-.*\.mjs$/.test(n))])await collect(join(root,'scripts',script));
const archive={},manifest=[];await mkdir(target,{recursive:true});
for(const path of files.sort()){const name=relative(repo,path).replaceAll('\\','/'),bytes=await readFile(path);if(/(?:^|\/)(?:accounts|credentials|preferences)\.json$/.test(name))throw Error('Private state included');const dest=join(target,name);await mkdir(dirname(dest),{recursive:true});await cp(path,dest);archive[name]=new Uint8Array(bytes);manifest.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const metadata=JSON.stringify({version:pkg.version,repository:REPOSITORY_URL,files:manifest},null,2);await writeFile(join(target,'SOURCE-MANIFEST.json'),metadata);archive['SOURCE-MANIFEST.json']=Buffer.from(metadata);
const zip=zipSync(archive,{level:6}),zipPath=target+'.zip';await writeFile(zipPath,zip);const hash=createHash('sha256').update(zip).digest('hex');await writeFile(target+'.sha256',hash+'  '+name+'.zip\n');
console.log(JSON.stringify({directory:target,zip:zipPath,files:files.length,bytes:zip.length,sha256:hash},null,2));
