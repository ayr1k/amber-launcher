// SPDX-License-Identifier: MPL-2.0
// Failure injection exists only in temporary QA wrappers, never shipped code.
const {mkdtemp,writeFile,access}=require('node:fs/promises');
const {spawn}=require('node:child_process');const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');const {pathToFileURL}=require('node:url');const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),stage=resolve(process.env.AMBER_QA_STAGE||root),exe=join(root,'node_modules/electron/dist/electron.exe');
 for(const scenario of ['missing-library','module-error','navigation-error','quit-missing-library']){
   const data=await mkdtemp(join(tmpdir(),'amber-startup-failure148-')),wrapper=join(data,'fixture.cjs');
   if(scenario.endsWith('missing-library'))await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:join(data,'disconnected-drive'),onboarded:true}));
   const injected=scenario==='quit-missing-library'?`const {app,ipcMain,dialog}=require('electron');ipcMain.once('amber:startup-painted',()=>{require('node:assert/strict').equal(app.getPath('userData'),process.env.AMBER_SMOKE_ROOT);process.argv.splice(process.argv.indexOf('--qa-ui'),1);});dialog.showMessageBox=async options=>{require('node:assert/strict').match(options.message,/No empty library/);console.log('QA_STORAGE_QUIT');return {response:2};};`:scenario==='missing-library'?'':`const {protocol}=require('electron');const handle=protocol.handle.bind(protocol);protocol.handle=(scheme,fn)=>handle(scheme,request=>{
     if(${JSON.stringify(scenario)}==='module-error'&&new URL(request.url).pathname.startsWith('/assets/')&&new URL(request.url).pathname.endsWith('.js'))return new Response('throw new Error("Injected QA module failure")',{headers:{'Content-Type':'application/javascript'}});
     if(${JSON.stringify(scenario)}==='navigation-error'&&request.url==='amber://app/')throw Error('Injected QA navigation failure');return fn(request);});`;
   await writeFile(wrapper,injected+`\nimport(${JSON.stringify(pathToFileURL(join(stage,'desktop/bootstrap148.mjs')).href)});`);
   const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
   const child=spawn(exe,[wrapper,'--qa-ui','--disable-gpu'],{env,windowsHide:true});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
   const timer=setTimeout(()=>child.kill(),25000);const code=await new Promise((done,reject)=>{child.on('error',reject);child.on('exit',done);});clearTimeout(timer);
   assert.equal(code,scenario==='quit-missing-library'?0:1,log);assert.match(log,scenario==='quit-missing-library'?/QA_STORAGE_QUIT/:/AMBER_STARTUP_FAILED/);
   if(scenario.endsWith('missing-library')){await assert.rejects(access(join(data,'library')));await assert.rejects(access(join(data,'disconnected-drive')));}
   console.log(JSON.stringify({scenario,exitCode:code,noEmptyLibrary:scenario.endsWith('missing-library')}));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
