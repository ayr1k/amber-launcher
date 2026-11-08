// SPDX-License-Identifier: MPL-2.0
// Synthetic, isolated editor sizing checks. No personal instance is opened.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),data=await mkdtemp(join(tmpdir(),'amber161-editor-')),library=join(data,'library'),id='a1111111-1111-4111-8111-111111111111',dir=join(library,'instances',id),out=join(root,'review161');
 await mkdir(join(dir,'config'),{recursive:true});await mkdir(out,{recursive:true});
 await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'Synthetic editor',game:'1.21.1',loader:'vanilla',status:'installed',createdAt:new Date().toISOString()}));
 await writeFile(join(dir,'version.json'),JSON.stringify({id:'1.21.1'}));
 await writeFile(join(dir,'config','layout.json'),JSON.stringify({fixture:true,lines:Array.from({length:200},(_,i)=>i)},null,2));
 await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);await page.waitForFunction(()=>!!window.amberDesktop);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  const results=[];
  for(const [language,theme,width,height] of (process.env.AMBER_QA_MAP_ONLY?[]:[['en-US','light',1280,900],['zh-CN','dark',1600,1000],['en-US','dark',1024,768],['zh-CN','light',800,900]])){
   await page.evaluate(async ({language,theme})=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language,theme});},{language,theme});
   await page.reload();await page.waitForFunction(()=>!!window.amberDesktop);
   await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).setSize(...size),[width,height]);
   await page.getByRole('button',{name:language==='en-US'?'Tools':'实用工具',exact:true}).first().click();await page.getByRole('button',{name:language==='en-US'?'File editor':'文件编辑器',exact:true}).click();
   await page.locator('.edit-file').filter({hasText:'layout.json'}).click();await page.waitForTimeout(500);
   const sizes=await page.locator('.edit-layout').evaluate(el=>{const r=el.getBoundingClientRect(),code=el.querySelector('.edit-code').getBoundingClientRect(),side=el.querySelector('.edit-sidebar').getBoundingClientRect();return {bottom:r.bottom,height:r.height,width:r.width,viewport:innerHeight,codeHeight:code.height,sideX:side.x,codeX:code.x,overflow:el.scrollWidth>el.clientWidth+1};});
   assert.ok(!sizes.overflow);assert.ok(sizes.codeX>sizes.sideX);assert.ok(sizes.codeHeight>=160);
   if(width>=1280)assert.ok(sizes.bottom<=sizes.viewport-40,JSON.stringify(sizes));
   await page.screenshot({path:join(out,`editor-${language}-${theme}-${width}.png`)});results.push({language,theme,windowWidth:width,windowHeight:height,...sizes});
  }
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).setSize(1280,900));
  await page.getByRole('button',{name:'实用工具',exact:true}).first().click();await page.getByRole('button',{name:'种子地图',exact:true}).click();
  await page.locator('.seed-results161 summary').click();
  await page.waitForFunction(()=>document.querySelectorAll('.seed-results161 .seed-marker').length>0,{},{timeout:30000});
  const match=page.locator('.seed-results161 .seed-marker button').first();
  const selected=await match.textContent(),coords=/X (-?\d+) Z (-?\d+)/.exec(selected);assert.ok(coords);
  await match.click();
  await page.waitForFunction(([x,z])=>{const p=JSON.parse(localStorage.getItem('amber-seed-map'));return p.x===x&&p.z===z;},coords.slice(1).map(Number));
  await page.locator('.seed-structures summary').click();await page.getByRole('button',{name:'隐藏全部结构',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.seed-results161 .seed-marker').length===0);
  assert.ok((await page.locator('.seed-results161').textContent()).includes('没有启用当前版本和维度支持的结构'));
  await writeFile(join(out,process.env.AMBER_QA_MAP_ONLY?'map-checks.json':'editor-checks.json'),JSON.stringify({data,library,isolated:true,results,mapChecks:{selected,focus:true,hideAll:true}},null,2));
  // Capture the actual Electron surface after explicit scrolling. Do not rely on
  // locator.screenshot's animation-frame stability wait in a hidden QA window.
  async function captureMap(name,selector){
   await page.locator(selector).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
   const samples=[];for(let i=0;i<4;i++){await page.waitForTimeout(250);samples.push(await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,visibility:document.visibilityState,scrollTop:el.closest('.workspace-scroll')?.scrollTop};}));}
   const capture=await app.evaluate(async({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/'));const image=await w.webContents.capturePage();return {visible:w.isVisible(),minimized:w.isMinimized(),size:image.getSize(),png:image.toPNG().toString('base64')};});
   assert.ok(capture.size.width>0&&capture.size.height>0);await writeFile(join(out,name+'.png'),Buffer.from(capture.png,'base64'));
   const {png,...window}=capture;return {name,window,samples};
  }
  const captures=[await captureMap('seed-results-hidden','.seed-results161')];
  await page.getByRole('button',{name:'显示全部结构',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('.seed-results161 .seed-marker').length>0,{},{timeout:30000});
  await page.locator('.seed-structures summary').click();
  captures.push(await captureMap('seed-results-visible','.seed-results161'));
  captures.push(await captureMap('seed-map-native','.seed-map-wrap'));
  await page.evaluate(async()=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language:'en-US',theme:'dark'});});
  await page.reload();await page.waitForFunction(()=>!!window.amberDesktop);
  await page.getByRole('button',{name:'Tools',exact:true}).first().click();await page.getByRole('button',{name:'Seed map',exact:true}).click();
  await page.getByLabel('Estimated relief',{exact:true}).check();
  await page.waitForFunction(()=>document.querySelector('.seed-toolbar [role="status"]')?.textContent==='Offline map',{},{timeout:30000});
  captures.push(await captureMap('seed-relief-en-dark','.seed-map-wrap'));
  await page.locator('.seed-structures summary').click();
  assert.ok(await page.getByLabel('Nether fortress · Unsupported',{exact:true}).isDisabled());
  captures.push(await captureMap('seed-capabilities-en-dark','.seed-structures'));
  await writeFile(join(out,'map-capture-diagnostics.json'),JSON.stringify({data,library,isolated:true,captures},null,2));
  console.log('EDITOR161_UI_AND_MAP_RESULT_ASSERTIONS_OK');
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
