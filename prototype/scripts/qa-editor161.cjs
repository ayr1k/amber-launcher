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
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--disable-gpu'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);await page.waitForFunction(()=>!!window.amberDesktop);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  const results=[];
  for(const [language,theme,width,height] of [['en-US','light',1280,900],['zh-CN','dark',1600,1000],['en-US','dark',1024,768],['zh-CN','light',800,900]]){
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
  await writeFile(join(out,'editor-checks.json'),JSON.stringify({data,library,isolated:true,results},null,2));console.log('EDITOR161_UI_OK');
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
