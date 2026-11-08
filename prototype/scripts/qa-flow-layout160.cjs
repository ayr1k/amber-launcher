// SPDX-License-Identifier: MPL-2.0
// Only the reviewed settings/connection layout; synthetic server, no services or memory operations.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),output=join(root,'.qa','flow-layout160');
(async()=>{
 await mkdir(output,{recursive:true});const data=await mkdtemp(join(tmpdir(),'amber160-layout-')),library=join(data,'library');await mkdir(library);
 const {Settings}=await import(pathToFileURL(join(root,'desktop/workflows.mjs')));const settings=new Settings(library);
 await settings.save({...await settings.get(),language:'en-US',startup160:{mode:'online',page:'home'}});
 await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const id='a1111111-1111-4111-8111-111111111111',server=join(library,'servers',id);await mkdir(server,{recursive:true});await writeFile(join(server,'server.json'),JSON.stringify({schema:1,id,name:'Synthetic layout fixture / 布局夹具',type:'vanilla',game:'1.21.1',status:'new',memory:2,createdAt:new Date().toISOString()}));await writeFile(join(server,'server.properties'),'server-port=25565\n');
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});const report=[];
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}assert.ok(page);page.setDefaultTimeout(15000);await page.locator('.desktop-app[data-page="server-overview"]').waitFor();assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const language of ['en-US','zh-CN'])for(const theme of ['light','dark'])for(const [width,height]of [[1280,900],[860,640]]){
   const name=`${language}-${theme}-${width}`;
   await page.evaluate(async({language,theme})=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language,theme,uiStyle:theme==='dark'?'rounded':'square'});window.dispatchEvent(new Event('amber-settings-changed'));},{language,theme});
   await page.waitForFunction(lang=>document.documentElement.lang===lang,language);
   await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(...size),[width,height]);
   const en=language==='en-US';await page.getByRole('button',{name:en?'Connection steps & launch services':'联机步骤与启动联动',exact:true}).click();await page.locator('.flow160 .check-setting input').waitFor();
   const geometry=await page.evaluate(()=>{
    const body=document.querySelector('.flow160'),title=document.querySelector('.modal145>header h2'),heading=body.querySelector('h3'),check=body.querySelector('.check-setting'),input=check.querySelector('input'),text=check.querySelector('.check-title');const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};};const css=getComputedStyle(body);
    return {padding:[css.paddingTop,css.paddingRight,css.paddingBottom,css.paddingLeft].map(parseFloat),title:box(title),heading:box(heading),checkDisplay:getComputedStyle(check).display,input:box(input),text:box(text),scrollWidth:body.scrollWidth,clientWidth:body.clientWidth};
   });
   assert.ok(geometry.padding.every(n=>n>=20),name+' body padding');assert.ok(Math.abs(geometry.title.x-geometry.heading.x)<2,name+' title alignment');assert.equal(geometry.checkDisplay,'flex');assert.ok(geometry.text.x>=geometry.input.right+10,name+' checkbox/text same row');assert.ok(Math.abs(geometry.text.y-geometry.input.y)<16,name+' checkbox vertical alignment');assert.ok(geometry.scrollWidth<=geometry.clientWidth+2,name+' no horizontal overflow');
   await page.screenshot({path:join(output,name+'-top.png')});await page.locator('.flow160').evaluate(el=>{el.scrollTop=el.scrollHeight;});
   const footer=await page.evaluate(()=>{const b=document.querySelector('.flow160'),button=b.querySelector('.flow-actions160 button'),r=b.getBoundingClientRect(),a=button.getBoundingClientRect();return {bottomGap:r.bottom-a.bottom,visible:a.top>=r.top&&a.bottom<=r.bottom};});assert.ok(footer.visible&&footer.bottomGap>=20,name+' footer breathing room');await page.screenshot({path:join(output,name+'-bottom.png')});
   await page.locator('.modal145>header button').click();await page.getByRole('button',{name:en?'Settings':'设置',exact:true}).first().click();await page.getByRole('button',{name:en?'Operation & memory':'操作与内存',exact:true}).click();await page.getByRole('heading',{name:en?'Windows memory optimization':'Windows 内存整理',exact:true}).waitFor();
   const settingsGeometry=await page.evaluate(()=>{const content=document.querySelector('.workspace-scroll:not([hidden])'),groups=[...content.querySelectorAll('.native-section')],boxes=groups.map(e=>e.getBoundingClientRect());return {overflow:content.scrollWidth-content.clientWidth,headings:groups.map(e=>e.querySelector('h2')?.tagName),gap:boxes[1].top-boxes[0].bottom};});assert.ok(settingsGeometry.overflow<=2);assert.ok(settingsGeometry.headings.every(t=>t==='H2'));assert.ok(settingsGeometry.gap>=12,name+' settings group spacing');
   await page.getByRole('combobox',{name:en?'Optimization mode':'整理档位',exact:true}).scrollIntoViewIfNeeded();const controls=await page.evaluate(()=>{const row=document.querySelector('.memory-controls160'),button=row.querySelector('button.button').getBoundingClientRect(),select=row.querySelector('.amber-select').getBoundingClientRect();return {height:button.height,baseline:Math.abs(button.bottom-select.bottom)};});assert.ok(controls.height<=48&&controls.baseline<=2,name+' memory control alignment');await page.screenshot({path:join(output,name+'-settings.png')});
   report.push({name,geometry,footer,settingsGeometry});await page.getByRole('button',{name:en?'Launch':'启动',exact:true}).first().click();
  }
  assert.deepEqual(errors,[]);await writeFile(join(output,'result.json'),JSON.stringify({status:'FLOW_LAYOUT160_OK',data,cases:report,errors},null,2));console.log('FLOW_LAYOUT160_OK: '+report.length+' English/Chinese, light/dark, wide/narrow cases');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
