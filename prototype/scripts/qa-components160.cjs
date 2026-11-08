// SPDX-License-Identifier: MPL-2.0
// Component selectors only; synthetic server, mocked install IPC, no services or memory operations.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),output=join(root,'.qa','components160');
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

  await app.evaluate(({ipcMain})=>{const original=ipcMain._invokeHandlers.get('amber:server');ipcMain.removeHandler('amber:server');ipcMain.handle('amber:server',(event,action,...args)=>{if(action==='networkChoices160')return [{version:'2.6.4'},{version:'2.6.3'},{version:'2.7.0-beta',prerelease:true},{version:'2.5.0',disabled:true}];if(action==='networkInstall'||action==='mysqlInitialize'){globalThis.qaComponent160={action,args};return {}; }return original(event,action,...args);});});
  await page.getByRole('button',{name:'Connections',exact:true}).click();await page.getByRole('button',{name:'Load other official releases',exact:true}).click();
  const choice=page.getByRole('combobox',{name:'EasyTier download version',exact:true});await choice.click();await page.getByRole('option',{name:'2.6.3',exact:true}).click();await page.getByRole('button',{name:'Download and switch',exact:true}).click();assert.deepEqual(await app.evaluate(()=>globalThis.qaComponent160),{action:'networkInstall',args:['2.6.3']});
  for(const language of ['en-US','zh-CN'])for(const theme of ['light','dark'])for(const [width,height]of [[1280,900],[860,640]]){const name=language+'-'+theme+'-'+width;
   await page.evaluate(async({language,theme})=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language,theme});window.dispatchEvent(new Event('amber-settings-changed'));},{language,theme});await page.waitForFunction(lang=>document.documentElement.lang===lang,language);await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);
   await page.locator('.component-choices160:visible').scrollIntoViewIfNeeded();const geometry=await page.locator('.component-choices160:visible').evaluate(e=>({overflow:e.scrollWidth-e.clientWidth,gap:parseFloat(getComputedStyle(e).gap)}));assert.ok(geometry.overflow<=2&&geometry.gap>=8);await page.screenshot({path:join(output,name+'-easytier.png')});report.push({name,geometry});
  }
  await page.getByRole('button',{name:'启动',exact:true}).click();

  await page.getByRole('button',{name:'管理当前实例 →',exact:true}).click();await page.getByRole('button',{name:'端口与数据库',exact:true}).click();
  const database=page.getByRole('combobox',{name:'MySQL 下载版本',exact:true});await database.scrollIntoViewIfNeeded();await page.waitForTimeout(300);await database.click();await page.getByRole('option',{name:'8.4.11',exact:true}).click();await page.getByRole('button',{name:'准备本地数据库',exact:true}).click();assert.deepEqual(await app.evaluate(()=>globalThis.qaComponent160),{action:'mysqlInitialize',args:[id,'8.4.11']});
  for(const language of ['en-US','zh-CN'])for(const theme of ['light','dark'])for(const [width,height]of [[1280,900],[860,640]]){const name=language+'-'+theme+'-'+width;
   await page.evaluate(async({language,theme})=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language,theme});window.dispatchEvent(new Event('amber-settings-changed'));},{language,theme});await page.waitForFunction(lang=>document.documentElement.lang===lang,language);await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);
   await page.locator('.component-choices160:visible').scrollIntoViewIfNeeded();const geometry=await page.locator('.component-choices160:visible').evaluate(e=>({overflow:e.scrollWidth-e.clientWidth,gap:parseFloat(getComputedStyle(e).gap)}));assert.ok(geometry.overflow<=2&&geometry.gap>=8);await page.screenshot({path:join(output,name+'-mysql.png')});report.push({name:name+'-mysql',geometry});
  }
  console.log('COMPONENTS160_UI_OK: 16 layout cases; both selected versions reach installation IPC (mocked).');
  await writeFile(join(output,'result.json'),JSON.stringify(report,null,2));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
