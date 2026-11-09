// SPDX-License-Identifier: MPL-2.0
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT);
const fs=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),out=join(root,'review164');await fs.mkdir(out,{recursive:true});const results=[],measurements=[];
 for(let trial=0;trial<3;trial++){
  const data=await fs.mkdtemp(join(tmpdir(),'amber164-ui-')),library=join(data,'library');await fs.mkdir(library);await fs.writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
  const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
  const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});
  try{
   assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
   let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}assert.ok(page);page.setDefaultTimeout(15000);await page.waitForFunction(()=>!!window.amberDesktop);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
   if(trial===0){
    for(const [language,theme,width,height,scale] of [['en-US','light',1440,960,1],['zh-CN','dark',1000,720,1.25]]){
     await page.evaluate(async({language,theme})=>window.amberDesktop.saveSettings({...await window.amberDesktop.settings(),language,theme}),{language,theme});await page.reload();await app.evaluate(({BrowserWindow},{width,height,scale})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/'));w.setSize(width,height);w.webContents.setZoomFactor(scale);},{width,height,scale});
     await page.getByRole('button',{name:language==='en-US'?'Settings':'设置',exact:true}).first().click();await page.locator('.settings-nav button').first().click();
     const checkbox=page.getByRole('checkbox',{name:language==='en-US'?'Trim conservatively before Minecraft starts':'启动 Minecraft 前自动保守整理'});await checkbox.waitFor();await checkbox.focus();const before=await checkbox.isChecked();await page.keyboard.press('Space');await page.waitForFunction(expected=>window.amberDesktop.settings().then(s=>s.prelaunchMemory164===expected),!before);await page.screenshot({path:join(out,language+'-'+theme+'.png')});results.push({language,theme,width,height,scale,keyboardToggle:true,persisted:true});
    }
    // Renderer-only outcome fixtures: actual native memory behavior is measured below.
    await app.evaluate(({ipcMain})=>{globalThis.qa164={active:{id:17,phase:'memory',startedAt:Date.now()},last:null,calls:[]};ipcMain.removeHandler('amber:prelaunch164');ipcMain.handle('amber:prelaunch164',(_event,action,id,kind)=>{if(action==='state')return globalThis.qa164;if(action==='cancel'){globalThis.qa164.calls.push({id,kind});return true;}});});
    await page.getByRole('button',{name:'跳过整理，继续启动',exact:true}).click();await page.getByRole('button',{name:'取消整个启动',exact:true}).click();assert.deepEqual(await app.evaluate(()=>globalThis.qa164.calls),[{id:17,kind:'memory'},{id:17,kind:'launch'}]);
    await app.evaluate(()=>{globalThis.qa164.active=null;globalThis.qa164.last={id:17,status:'not-trimmed',elapsedMs:2500,rows:[{pid:123,status:'access-denied',error:5}]};});await page.getByText('未能整理，继续启动',{exact:false}).waitFor();const box=await page.locator('.prelaunch164').boundingBox(),viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);await page.screenshot({path:join(out,'result-narrow-dark-125.png')});await page.locator('.prelaunch164').getByRole('button',{name:'关闭',exact:true}).click();results.push({syntheticStatus:true,distinctCancelButtons:true,viewportBounds:true});
   }
   const {Memory160}=await import(pathToFileURL(join(root,'desktop/memory160.mjs'))),{PrelaunchMemory164}=await import(pathToFileURL(join(root,'desktop/prelaunch-memory164.mjs')));
   const identity=await app.evaluate(()=>({pid:process.pid,creationTime:process.getCreationTime()}));assert.ok(identity.creationTime>0);
   const memory=new Memory160(identity),runner=new PrelaunchMemory164({memory,settings:{get:async()=>({prelaunchMemory164:true})}});
   const snapshot=async()=>({...await app.evaluate(({app})=>({at:Date.now(),main:app.getAppMetrics().find(r=>r.pid===process.pid)?.memory,rssBytes:process.memoryUsage().rss})),systemFreeBytes:require('node:os').freemem()});
   const before=await snapshot(),attempt=runner.begin(),start=performance.now(),result=await runner.run(attempt),chainDelayMs=performance.now()-start;runner.finish(attempt);const immediate=await snapshot();await new Promise(r=>setTimeout(r,1000));const after1s=await snapshot();await new Promise(r=>setTimeout(r,4000));const after5s=await snapshot();
   const disabled=new PrelaunchMemory164({memory,settings:{get:async()=>({prelaunchMemory164:false})}}),a=disabled.begin(),controlStart=performance.now();await disabled.run(a);const disabledDelayMs=performance.now()-controlStart;disabled.finish(a);
   measurements.push({trial,result,chainDelayMs,disabledDelayMs,before,immediate,after1s,after5s});

  }finally{await app.close();}
 }
 await fs.writeFile(join(out,'ui-measurements.json'),JSON.stringify({scope:'Isolated unpackaged launcher, real native main-process trim. Hook timing only; no Minecraft launched, no FPS or frame-time measurement.',results,measurements},null,2));console.log(JSON.stringify({results,measurements},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
