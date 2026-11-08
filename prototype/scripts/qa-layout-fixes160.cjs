// SPDX-License-Identifier: MPL-2.0
// Only two reported layout defects; synthetic profile; no install/service/memory operations.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),output=join(root,'.qa','layout-fixes160');
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


  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const language of ['en-US','zh-CN'])for(const theme of ['light','dark'])for(const [width,height]of [[1280,900],[860,640]]){const name=language+'-'+theme+'-'+width,en=language==='en-US';
   await page.evaluate(async({language,theme})=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language,theme});window.dispatchEvent(new Event('amber-settings-changed'));},{language,theme});await page.waitForFunction(lang=>document.documentElement.lang===lang,language);await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);
   await page.getByRole('button',{name:en?'Connections':'联机连接',exact:true}).click();const actions=page.locator('.component-actions160:visible');await actions.scrollIntoViewIfNeeded();await page.waitForTimeout(150);const buttons=await actions.evaluate(e=>{const b=[...e.querySelectorAll('button')].map(x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,center:r.y+r.height/2};});return {buttons:b,overflow:e.scrollWidth-e.clientWidth};});assert.equal(buttons.buttons.length,2);assert.ok(Math.abs(buttons.buttons[0].height-buttons.buttons[1].height)<=1);if(Math.abs(buttons.buttons[0].y-buttons.buttons[1].y)<2)assert.ok(Math.abs(buttons.buttons[0].center-buttons.buttons[1].center)<=1);assert.ok(buttons.overflow<=1);await page.screenshot({path:join(output,name+'-easytier.png')});
   await page.getByRole('button',{name:en?'Tasks':'任务',exact:true}).click();const heading=page.locator('.task-heading160:visible');await heading.scrollIntoViewIfNeeded();await page.waitForTimeout(150);const task=await page.locator('.task-activity160:visible').evaluate(e=>{const box=s=>{const r=e.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,bottom:r.bottom,width:r.width};};return {eyebrow:box('.task-heading160>small'),title:box('.task-heading160>h1'),heading:box('.task-heading160'),toolbar:box('.task-toolbar160'),search:box('.task-toolbar160>input'),overflow:e.scrollWidth-e.clientWidth};});assert.ok(task.title.y>=task.eyebrow.bottom+7);assert.ok(task.toolbar.y>=task.heading.bottom+16);assert.ok(Math.abs(task.title.x-task.search.x)<=1);assert.ok(task.overflow<=1);await page.screenshot({path:join(output,name+'-tasks.png')});report.push({name,buttons,task});
  }
  assert.deepEqual(errors,[]);await writeFile(join(output,'result.json'),JSON.stringify({scope:'Only EasyTier button alignment and task-center heading/search layout',cases:report},null,2));console.log('LAYOUT_FIXES160_OK: two areas, 8 language/theme/width combinations each; 16 screenshots; no functional operations.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
