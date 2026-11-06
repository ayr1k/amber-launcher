// SPDX-License-Identifier: MPL-2.0
// Windows/Electron compositor handoff, fresh isolated profiles on every trial.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises');
const {spawn}=require('node:child_process');const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),stage=resolve(process.env.AMBER_QA_STAGE||root);
const output=resolve(process.env.AMBER_QA_OUTPUT||join(root,'.qa/startup148-timing'));
const exe=join(root,'node_modules/electron/dist/electron.exe');
async function waitFor(fn){for(let i=0;i<400;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,25));}throw Error('Startup timing timed out');}
(async()=>{
 await mkdir(output,{recursive:true});const results=[];
 for(const mode of ['gpu','software'])for(let trial=1;trial<=3;trial++){
  const data=await mkdtemp(join(tmpdir(),'amber-startup-timing148-')),wrapper=join(data,'fixture.cjs');
  // Time an initialized empty library; first-run onboarding is covered by its
  // dedicated desktop runner and must not intercept the navigation assertion.
  const library=join(data,'library');await mkdir(library);await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
  // Observe show and successive compositor surfaces (the first can be cached).
  // Do not force frames,
  // change background throttling, or introduce any delay in production startup.
  await writeFile(wrapper,`const {app,nativeImage}=require('electron');global.__qaFrames=[];global.__qaShows=[];
app.on('browser-window-created',(_event,w)=>{w.on('show',()=>{const url=w.webContents.getURL();global.__qaShows.push({url,at:Date.now()});if(url.startsWith('amber://app/')&&!global.__qaFrames.length){w.webContents.beginFrameSubscription(frame=>{global.__qaFrames.push({at:Date.now(),frame:nativeImage.createFromBitmap(Buffer.from(frame.toBitmap()),frame.getSize())});if(global.__qaFrames.length>=12)w.webContents.endFrameSubscription();});setTimeout(()=>{if(!w.isDestroyed())w.webContents.endFrameSubscription();global.__qaFramesDone=true;},600);}});});
import(${JSON.stringify(pathToFileURL(join(stage,'desktop/bootstrap148.mjs')).href)});`);
  const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
  const args=[wrapper,'--qa-ui','--qa-visible',...(mode==='software'?['--disable-gpu']:[])];
  const app=await electron.launch({executablePath:exe,args,env});let logs='';
  app.process().stdout.on('data',b=>logs+=b);app.process().stderr.on('data',b=>logs+=b);
  try{
   assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),resolve(data));
   const page=await waitFor(()=>app.windows().find(p=>p.url().startsWith('amber://app/')));
   await waitFor(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length===1&&BrowserWindow.getAllWindows()[0].isVisible()));
   await waitFor(()=>app.evaluate(()=>global.__qaFramesDone));
   const renderer=await page.evaluate(()=>({commit:performance.timeOrigin+performance.getEntriesByName('amber:startup-committed')[0]?.startTime,ui:!!document.querySelector('.desktop-app'),text:document.body.innerText.length,contentOpacity:Number(getComputedStyle(document.querySelector('.workspace-scroll:not([hidden]) > .main-content')).opacity)}));
   assert.ok(renderer.ui&&renderer.text>100&&Number.isFinite(renderer.commit));
   assert.equal(renderer.contentOpacity,1,'Initial content must be readable without waiting for an entrance animation');
   const observation=await app.evaluate(({app})=>{const frames=global.__qaFrames.map(({frame,at})=>{const pixels=frame.toBitmap(),size=frame.getSize();let contentInk=0;for(let i=0;i<pixels.length;i+=4){const x=(i/4)%size.width,y=Math.floor(i/4/size.width);if(x>300&&y>150&&y<600&&Math.max(pixels[i],pixels[i+1],pixels[i+2])<160)contentInk++;}return {at,contentInk};});const usable=frames.findIndex(f=>f.contentInk>500);return {shows:global.__qaShows,frames,usable,firstPNG:global.__qaFrames[0]?.frame.toPNG().toString('base64'),usablePNG:global.__qaFrames[usable]?.frame.toPNG().toString('base64'),gpu:app.getGPUFeatureStatus()};});
   const shows=observation.shows.filter(s=>s.url.startsWith('amber://app/'));
   await writeFile(join(output,`${mode}-${trial}-first-frame.png`),Buffer.from(observation.firstPNG,'base64'));
   assert.equal(shows.length,1);assert.ok(observation.usable>=0,'No usable main content appeared');
   const showToContentMs=observation.frames[observation.usable].at-shows[0].at;
   assert.ok(showToContentMs<250,`Main content remained unavailable for ${showToContentMs}ms after show`);
   await writeFile(join(output,`${mode}-${trial}-usable-frame.png`),Buffer.from(observation.usablePNG,'base64'));
   const commitToShowMs=shows[0].at-renderer.commit;
   assert.ok(commitToShowMs>=-5&&commitToShowMs<500,`Commit-to-show ${commitToShowMs}ms regressed toward hidden rAF throttling`);
   const info=await page.evaluate(()=>window.amberDesktop.info());
   await page.locator('.primary-nav button').nth(1).click();
   assert.equal(await page.locator('.workspace-scroll:not([hidden]) > .main-content').evaluate(el=>getComputedStyle(el).animationName),'amber-enter','Later navigation keeps the global animation');
   // Launch a real second process against this same isolated profile.
   if(trial===1){const second=spawn(exe,args,{env,windowsHide:true,stdio:'ignore'});const timer=setTimeout(()=>second.kill(),10000);const code=await new Promise((done,reject)=>{second.on('exit',done);second.on('error',reject);});clearTimeout(timer);assert.equal(code,0);assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length),1);}
   const marks=[...logs.matchAll(/AMBER_STARTUP (\{[^\r\n]+\})/g)].map(m=>JSON.parse(m[1]));
   results.push({edition:info.edition,mode,trial,data,renderer,commitToShowMs:Math.round(commitToShowMs*10)/10,showToContentMs,firstUsableFrame:observation.usable,frames:observation.frames,marks,gpu:observation.gpu,singleInstance:trial===1?'passed':'not repeated'});
  }finally{await app.close();await writeFile(join(output,`${mode}-${trial}.log`),logs);}
 }
 await writeFile(join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({edition,mode,trial,commitToShowMs,marks})=>({edition,mode,trial,commitToShowMs,marks})),null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
