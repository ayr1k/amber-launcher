// SPDX-License-Identifier: MPL-2.0
// Both products are built from this exact source tree. No runtime edition switch.
import {cp,mkdir,readFile,writeFile,copyFile,access,realpath,lstat,rm} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'electron-builder';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const base=join(root,'releases','beta1.14');
const requested=process.argv.slice(2).filter(x=>!x.startsWith('--'));
const editions=requested.length?requested:['amber','ambere'];
if(editions.some(x=>!['amber','ambere'].includes(x)))throw Error('Expected amber or ambere');
async function run(file,args,cwd){await new Promise((ok,fail)=>{const p=spawn(file,args,{cwd,stdio:'inherit',windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:''}});p.on('error',fail);p.on('exit',code=>code===0?ok():fail(Error('Build exited '+code)));});}
for(const edition of editions){
 const name=edition==='ambere'?'AmberE':'AMBER',stage=join(base,'stages',name),out=join(base,name);
 // Only remove this product's generated staging directory, never a source or linked directory.
 const stageRoot=join(base,'stages');await mkdir(stageRoot,{recursive:true});
 if((await realpath(stageRoot)).toLowerCase()!==join(await realpath(root),'releases','beta1.14','stages').toLowerCase())throw Error('Staging must stay inside this workspace');
 try{const entry=await lstat(stage);const canonicalRoot=await realpath(stageRoot),canonicalStage=await realpath(stage);
  if(entry.isSymbolicLink()||!entry.isDirectory()||canonicalStage.toLowerCase()!==join(canonicalRoot,name).toLowerCase())throw Error('Unsafe build staging directory');
  await rm(stage,{recursive:true});
 }catch(e){if(e.code!=='ENOENT')throw e;}
 await mkdir(stage,{recursive:true});
 for(const entry of ['src','desktop','public','build','index.html','vite.config.mjs','LICENSE','THIRD_PARTY_NOTICES.md','BETA114-TESTING.md'])await cp(join(root,entry),join(stage,entry),{recursive:true});
 await copyFile(join(root,'..','CHANGELOG.md'),join(stage,'CHANGELOG.md'));
 const metadata={...pkg,name:edition==='ambere'?'ambere-launcher':pkg.name,description:name+' Minecraft Java launcher',dependencies:{},devDependencies:{}};
 await writeFile(join(stage,'package.json'),JSON.stringify(metadata,null,2));
 await writeFile(join(stage,'desktop/build-channel.mjs'),"export const BUILD_CHANNEL='"+(process.argv.includes('--public')?'public':'local')+"';\n");
 if(edition==='ambere'){
  await copyFile(join(root,'editions/ambere/testing.md'),join(stage,'BETA114-TESTING.md'));
  await copyFile(join(root,'editions/ambere/changelog.en.md'),join(stage,'CHANGELOG.md'));
  let source=await readFile(join(stage,'desktop/edition.mjs'),'utf8');await writeFile(join(stage,'desktop/edition.mjs'),source.replace("EDITION = 'amber'","EDITION = 'ambere'"));
  await writeFile(join(stage,'desktop/microsoft-config.mjs'),"// AmberE has no Microsoft application registration.\nexport const MICROSOFT_CLIENT_ID = '';\n");
  let preload=await readFile(join(stage,'desktop/preload.cjs'),'utf8');preload=preload.split('\n').filter(line=>!/^\s*(?:verifyOwnership|linkOwnership|configureAccount|startMicrosoft|pollMicrosoft|cancelMicrosoft|copyMicrosoft|openMicrosoft):/.test(line)).join('\n');await writeFile(join(stage,'desktop/preload.cjs'),preload);
  for(const kind of ['mark','lockup'])for(const suffix of ['','-mono','-reverse'])await copyFile(join(stage,`public/brand/ambere-${kind}${suffix}.svg`),join(stage,`public/brand/amber-${kind}${suffix}.svg`));
  await copyFile(join(root,'build/ambere.ico'),join(stage,'build/icon.ico'));
  await copyFile(join(root,'build/ambere.png'),join(stage,'public/brand/app-icon.png'));
  for(const file of ['build/installer.nsh','build/installer-preflight.ps1','index.html']){const text=await readFile(join(stage,file),'utf8');await writeFile(join(stage,file),text.replaceAll('AMBER','AmberE').replaceAll('amber-launcher','ambere-launcher'));}
 }
 await run(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--config',join(stage,'vite.config.mjs')],stage);
 const config={appId:'io.github.ayr1k.'+edition,productName:name,asar:false,npmRebuild:false,electronVersion:pkg.devDependencies.electron,electronDist:join(root,'node_modules/electron/dist'),directories:{output:out,buildResources:join(stage,'build')},files:['desktop/**/*','dist/client/**/*','package.json','LICENSE','THIRD_PARTY_NOTICES.md','!node_modules/**','!**/*.ttf','!dist/client/assets/sodium.png','!dist/client/assets/lithium.png','!dist/client/assets/iris.png','!dist/client/assets/modmenu.png','!dist/client/assets/fabric-api.png'],extraFiles:[{from:join(stage,'CHANGELOG.md'),to:'CHANGELOG.md'},{from:join(stage,'BETA114-TESTING.md'),to:'BETA114-TESTING.md'}],win:{target:[{target:'nsis',arch:['x64']}],executableName:name,icon:join(stage,'build/icon.ico'),signAndEditExecutable:true},nsis:{oneClick:false,perMachine:false,allowElevation:false,allowToChangeInstallationDirectory:true,createDesktopShortcut:true,createStartMenuShortcut:true,shortcutName:name,deleteAppDataOnUninstall:false,runAfterFinish:false,installerLanguages:['zh_CN','en_US'],displayLanguageSelector:true,include:join(stage,'build/installer.nsh'),installerIcon:join(stage,'build/icon.ico'),uninstallerIcon:join(stage,'build/icon.ico'),artifactName:name+'-${version}-Setup-${arch}.exe'}};
 if(process.argv.includes('--stage-only'))continue;
 await build({projectDir:stage,config,publish:'never'});
 const filename=`${name}-${pkg.version}-Setup-x64.exe`;await access(join(out,filename));await copyFile(join(out,filename),join(base,filename));
 const bytes=await readFile(join(base,filename));await writeFile(join(base,filename+'.sha256'),createHash('sha256').update(bytes).digest('hex')+'  '+filename+'\n');
 console.log('LOCAL_INSTALLER_READY',join(base,filename));
}
