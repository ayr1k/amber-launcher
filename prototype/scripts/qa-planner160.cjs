// SPDX-License-Identifier: MPL-2.0
// Only the reviewed settings/connection layout; synthetic server, no services or memory operations.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),output=join(root,'.qa','planner160');
(async()=>{
 await mkdir(output,{recursive:true});const data=await mkdtemp(join(tmpdir(),'amber160-layout-')),library=join(data,'library');await mkdir(library);
 const {Settings}=await import(pathToFileURL(join(root,'desktop/workflows.mjs')));const settings=new Settings(library);
 await settings.save({...await settings.get(),language:'en-US',startup160:{mode:'online',page:'home'}});
 await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const id='a1111111-1111-4111-8111-111111111111',server=join(library,'servers',id);await mkdir(server,{recursive:true});await writeFile(join(server,'server.json'),JSON.stringify({schema:1,id,name:'Synthetic layout fixture / 布局夹具',type:'paper',game:'1.21.1',status:'new',memory:2,createdAt:new Date().toISOString()}));await writeFile(join(server,'server.properties'),'server-port=25565\n');
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});const report=[];
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}assert.ok(page);page.setDefaultTimeout(15000);await page.locator('.desktop-app[data-page="server-overview"]').waitFor();assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  await app.evaluate(({ipcMain})=>{const original=ipcMain._invokeHandlers.get('amber:server');ipcMain.removeHandler('amber:server');ipcMain.handle('amber:server',(event,action,...args)=>{if(action==='coreChoices')return [{key:'build',title:'Paper',rows:[{version:'1',kind:'STABLE',recommended:true},{version:'2',kind:'EXPERIMENTAL',recommended:false}]}];if(action==='install'){globalThis.qaInstall160=args;return {}; }return original(event,action,...args);});});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));


  for(const language of ['en-US','zh-CN'])for(const theme of ['light','dark'])for(const [width,height]of [[1280,900],[860,640]]){
   const name=language+'-'+theme+'-'+width,en=language==='en-US';
   await page.evaluate(async({language,theme})=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language,theme,uiStyle:theme==='dark'?'rounded':'square'});window.dispatchEvent(new Event('amber-settings-changed'));},{language,theme});await page.waitForFunction(lang=>document.documentElement.lang===lang,language);await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);
   await page.getByRole('button',{name:en?'Launch program planner':'启动程序规划',exact:true}).click();await page.locator('.modal145:visible .plan-block160').first().waitFor();
   if(report.length===0){
    await page.getByRole('button',{name:en?'+ Wait':'+ 等待',exact:true}).click();await page.locator('.modal145:visible .plan-block160 input[type=number]').fill('10');await page.getByRole('button',{name:'Move step up 2',exact:true}).click();assert.match(await page.locator('.modal145:visible .plan-block160').first().innerText(),/Wait/);await page.locator('.modal145:visible .plan-block160').nth(1).getByRole('button',{name:'Remove',exact:true}).click();await page.getByRole('button',{name:'Save launch plan',exact:true}).click();await page.locator('.modal145:visible').getByText('Saved',{exact:true}).waitFor();const saved=await page.evaluate(id=>window.amberDesktop.server('flow160',id),id);assert.deepEqual(saved.services.plan.steps,[{type:'wait',seconds:10}]);
    await page.evaluate(id=>{window.qaRun160=window.amberDesktop.server('start',id);},id);await page.getByRole('button',{name:'Cancel execution',exact:true}).click();await page.evaluate(()=>window.qaRun160);const cancelled=await page.evaluate(id=>window.amberDesktop.server('flow160',id),id);assert.equal(cancelled.services.last.phase,'cancelled');
    for(const label of ['+ Start FRP / Sakura tunnel','+ Start MySQL','+ Start server and wait until ready','+ Send one command','+ Stop normally and create verified backup'])await page.getByRole('button',{name:label,exact:true}).click();
   }
   const geometry=await page.evaluate(()=>{const body=[...document.querySelectorAll('.flow160')].find(e=>e.getBoundingClientRect().width>0),h=body.querySelector('h3'),title=body.parentElement.querySelector('header h2');return {overflow:body.scrollWidth-body.clientWidth,padding:parseFloat(getComputedStyle(body).paddingLeft),alignment:Math.abs(h.getBoundingClientRect().x-title.getBoundingClientRect().x)};});assert.ok(geometry.overflow<=2&&geometry.padding>=20&&geometry.alignment<2);await page.screenshot({path:join(output,name+'-top.png')});await page.locator('.modal145:visible .plan-editor160 h3').scrollIntoViewIfNeeded();await page.screenshot({path:join(output,name+'-modules.png')});await page.locator('.modal145:visible .flow160').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:join(output,name+'-bottom.png')});report.push({name,geometry});await page.locator('.modal145:visible>header button').click();
  }
  await page.getByRole('button',{name:'核心维护与复制…',exact:true}).click();const choice=page.getByRole('combobox',{name:'Paper',exact:true});await choice.click();await page.getByRole('option',{name:'2 · EXPERIMENTAL',exact:true}).click();await page.screenshot({path:join(output,'zh-CN-dark-860-core-choice.png')});await page.getByRole('button',{name:'下载／修复核心与 Java',exact:true}).click();assert.deepEqual(await app.evaluate(()=>globalThis.qaInstall160),[id,{build:'2'}]);
  assert.deepEqual(errors,[]);await writeFile(join(output,'result.json'),JSON.stringify({status:'PLANNER160_UI_OK',data,cases:report},null,2));console.log('PLANNER160_UI_OK: 8 layout cases; reorder/save/readback/cancel; no real services started');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
