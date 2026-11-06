// SPDX-License-Identifier: MPL-2.0
// Actual Electron windows, isolated synthetic profiles; no real account/game.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile,readFile}=require('node:fs/promises');
const {tmpdir}=require('node:os');const {join,resolve}=require('node:path');
const {pathToFileURL}=require('node:url');const assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),stage=resolve(process.env.AMBER_QA_STAGE||root),output=resolve(process.env.AMBER_QA_OUTPUT||join(root,'.qa/startup148'));
const executablePath=process.env.AMBER_QA_ELECTRON||join(root,'node_modules/electron/dist/electron.exe');
async function waitFor(fn){for(let i=0;i<400;i++){const value=await fn();if(value)return value;await new Promise(r=>setTimeout(r,50));}throw Error('QA condition timed out');}
(async()=>{
 await mkdir(output,{recursive:true});const {Settings}=await import(pathToFileURL(join(stage,'desktop/workflows.mjs')).href);
 const cases=[{name:'light-en',language:'en-US',theme:'light',uiStyle:'square',width:1440,height:1000},
 {name:'dark-zh',language:'zh-CN',theme:'dark',uiStyle:'rounded',width:1024,height:768},
 {name:'custom-small',language:'en-US',theme:'dark',uiStyle:'rounded',motion:false,width:860,height:640,custom:true}];
 const results=[];
 for(const item of cases){
   const data=await mkdtemp(join(tmpdir(),'amber-startup148-')),library=join(data,'library');await mkdir(library);
   const settings=new Settings(library),defaults=await settings.get();
   const prefs={...defaults,language:item.language,theme:item.theme,uiStyle:item.uiStyle,motion:item.motion!==false};
   if(item.custom)prefs.appearance={...prefs.appearance,enabled:true,mode:'custom',background:'#131922',surface:'#1c2634',text:'#eaf2f8',muted:'#b9c5d8',accent:'#dfbb83',radius:16,motion:'none',fontSize:18};
   await settings.save(prefs);await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
   await writeFile(join(data,'startup-style.json'),JSON.stringify({prefs}));
   await writeFile(join(data,'window-state.json'),JSON.stringify({schema:1,bounds:{x:50,y:50,width:item.width,height:item.height},maximized:false}));
   const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
   const app=await electron.launch({executablePath,args:[stage,'--qa-ui','--qa-visible','--disable-gpu'],env});let logs='';app.process().stdout.on('data',v=>logs+=v);app.process().stderr.on('data',v=>logs+=v);
   try{
     assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),resolve(data));
     // Capture the production loading page if still present. No test delay is
     // added to the shipped startup path to make screenshots easier.
     const first=await app.firstWindow();let splashCaptured=false;
     if(first.url().includes('startup148.html'))try{await first.screenshot({path:join(output,item.name+'-startup.png')});splashCaptured=true;}catch{}
     const page=await waitFor(()=>app.windows().find(p=>p.url().startsWith('amber://app/')));page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
     await page.locator('.desktop-app').waitFor();
     await waitFor(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().length===1&&BrowserWindow.getAllWindows()[0].isVisible()));
     assert.deepEqual(errors,[]);assert.equal((await page.evaluate(()=>window.amberDesktop.info())).version,'1.4.8');
     const info=await page.evaluate(()=>window.amberDesktop.info());assert.equal(resolve(info.dataPath),resolve(library));
     await page.screenshot({path:join(output,item.name+'-main.png')});
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
     // Every primary destination must mount, including the changed download UI.
     for(const destination of item.language==='zh-CN'?['实例','内容下载','账号','设置','任务','实用工具']:['Instances','Content','Accounts','Settings','Tasks','Tools']){
       const button=page.locator('.primary-nav button').filter({hasText:destination}).first();
       if(await button.count()){await button.click();await page.waitForTimeout(80);assert.ok(await page.locator('.desktop-app').count());}
     }
     assert.deepEqual(errors,[]);
     const settingsButton=page.locator('.primary-nav button').filter({hasText:item.language==='zh-CN'?'设置':'Settings'}).first();await settingsButton.click();
     await page.getByRole('button',{name:item.language==='zh-CN'?'下载':'Download',exact:true}).click();
     await page.screenshot({path:join(output,item.name+'-downloads.png')});assert.deepEqual(errors,[]);
     await page.reload();await page.locator('.desktop-app').waitFor();assert.deepEqual(errors,[]);
     const marks=[...logs.matchAll(/AMBER_STARTUP (\{[^\r\n]+\})/g)].map(match=>JSON.parse(match[1]));
     assert.ok(marks.find(m=>m.stage==='ready'));results.push({name:item.name,edition:info.edition,data,marks,splashCaptured,errors,overflow});
   }finally{await app.close();await writeFile(join(output,item.name+'.log'),logs);}
 }
 await writeFile(join(output,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
