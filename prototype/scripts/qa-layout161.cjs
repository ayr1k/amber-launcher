// SPDX-License-Identifier: MPL-2.0
// Synthetic, isolated editor sizing checks. No personal instance is opened.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),stage=resolve(process.env.AMBER_QA_STAGE||root),data=await mkdtemp(join(tmpdir(),'amber161-editor-')),library=join(data,'library'),id='a1111111-1111-4111-8111-111111111111',dir=join(library,'instances',id),out=join(root,'review161');
 await mkdir(join(dir,'config'),{recursive:true});await mkdir(out,{recursive:true});
 await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'Synthetic editor',game:'1.21.1',loader:'vanilla',status:'installed',createdAt:new Date().toISOString()}));
 await writeFile(join(dir,'version.json'),JSON.stringify({id:'1.21.1'}));
 await writeFile(join(dir,'config','layout.json'),JSON.stringify({fixture:true,lines:Array.from({length:200},(_,i)=>i)},null,2));
 await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[stage,'--qa-ui','--qa-visible','--disable-gpu'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);await page.waitForFunction(()=>!!window.amberDesktop);await page.locator('.desktop-app').waitFor();await page.waitForTimeout(500);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);

  const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  const cases=process.env.AMBER_QA_QUICK?[['en-US','dark',1280,900]]:[['zh-CN','light',1280,900],['en-US','dark',1440,900],['zh-CN','dark',1600,1000],['en-US','light',1024,768],['zh-CN','light',860,700],['en-US','dark',900,1100]];
  async function capture(name){const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).webContents.capturePage()).toPNG().toString('base64'));await writeFile(join(out,name+'.png'),Buffer.from(png,'base64'));}
  for(const [language,theme,width,height] of cases){
   const zh=language==='zh-CN';await page.evaluate(async s=>{await window.amberDesktop.saveSettings({...await window.amberDesktop.settings(),...s});},{language,theme});await page.reload().catch(e=>{if(!e.message.includes('ERR_ABORTED'))throw e;});await page.waitForLoadState('domcontentloaded');await page.waitForFunction(()=>!!window.amberDesktop);
   await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).setSize(...size),[width,height]);
   await page.getByRole('button',{name:zh?'实用工具':'Tools',exact:true}).first().click();
   for(const tool of ['map','gradient','editor']){
    await page.getByRole('button',{name:tool==='map'?(zh?'种子地图':'Seed map'):tool==='gradient'?(zh?'渐变文字':'Gradient text'):(zh?'文件编辑器':'File editor'),exact:true}).click();await page.waitForTimeout(700);
    if(tool==='map'){
     await page.waitForFunction(()=>document.querySelector('.seed-toolbar [role="status"]')?.textContent.match(/Offline map|离线地图/),{},{timeout:30000});
     const sizes=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};};return {canvas:rect('.seed-map-wrap canvas'),settings:rect('.seed-settings161'),basic:rect('.seed-basics161'),body:rect('.seed-body161')};});
     assert.ok(Math.abs(sizes.canvas.w/sizes.canvas.h-5/3)<.02);assert.ok(sizes.basic.bottom<=sizes.body.y+2);if(width>=1280)assert.ok(sizes.settings.x>sizes.canvas.x);
     await page.getByRole('button',{name:zh?'添加标记':'Add marker',exact:true}).click();await page.locator('.seed-map-wrap canvas').click({position:{x:60,y:60}});assert.ok(await page.locator('.seed-saved-markers summary').textContent());
    }else if(tool==='editor'){
     await page.locator('.edit-file').filter({hasText:'layout.json'}).click();await page.waitForTimeout(300);
     const sizes=await page.locator('.edit-layout').evaluate(el=>{const code=el.querySelector('.edit-code').getBoundingClientRect(),side=el.querySelector('.edit-sidebar').getBoundingClientRect();return {codeHeight:code.height,sideX:side.x,codeX:code.x,overflow:el.scrollWidth>el.clientWidth+1};});
     assert.ok(!sizes.overflow);assert.ok(sizes.codeX>sizes.sideX);assert.ok(sizes.codeHeight>=160);
    }else{
     assert.equal(await page.locator('.gradient-format-host161 [role="combobox"]').count(),1);
     const content=page.locator('.gradient-editor .cm-content');await content.fill('AMBER 1.6.1 测试');await page.getByLabel(zh?'应用到全文':'Apply to all text',{exact:true}).check();await page.getByRole('button',{name:zh?'粗体':'Bold',exact:true}).click();
     const output=JSON.parse(await page.getByRole('textbox',{name:zh?'输出':'Output',exact:true}).inputValue());assert.ok(output.extra.some(x=>x.bold));
     await page.getByRole('button',{name:zh?'应用纯色':'Apply solid color',exact:true}).click();
     const boxes=await page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,y:b.y,bottom:b.bottom};};return {title:r('.tool-intro h2'),format:r('.gradient-format-host161'),input:r('.gradient-input'),preview:r('.gradient-preview161'),local:r('.selection-color'),palette:r('.gradient-palette134'),output:r('.gradient-output')};});
     if(width>=1280){assert.ok(boxes.format.x>boxes.title.x);assert.ok(Math.abs(boxes.format.y-boxes.title.y)<60);assert.ok(boxes.preview.y>=boxes.input.bottom-1);assert.ok(boxes.local.y>=boxes.preview.bottom-1);assert.ok(boxes.output.x>boxes.preview.x);assert.ok(boxes.output.y>=boxes.palette.bottom-1);}
    }
    if(width>=1280&&tool!=='editor'){
     if(tool==='gradient'){await page.locator('.gradient-position134 summary').click();await page.locator('.gradient-position134').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));}
     else{await page.locator('.seed-structures summary').click();await page.locator('.seed-structures').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));}
     await page.waitForTimeout(200);await capture(`${process.env.AMBER_QA_NAME||'AMBER'}-${tool}-${language}-${theme}-${width}x${height}-expanded`);
     if(tool==='gradient'){await page.locator('.gradient-position134 summary').click();await page.locator('.gradient-palette134').evaluate(el=>el.scrollTop=0);}
     else await page.locator('.seed-structures summary').click();
    }
    await page.evaluate(()=>{document.querySelector('.tools-page').closest('.workspace-scroll').scrollTop=0;document.querySelector('.seed-settings161')?.scrollTo(0,0);});await page.waitForTimeout(250);
    const overflow=await page.evaluate(()=>{const el=document.querySelector('.tools-page').closest('.workspace-scroll');return {height:el.clientHeight,scrollHeight:el.scrollHeight,width:el.clientWidth,scrollWidth:el.scrollWidth};});assert.ok(overflow.width>0&&overflow.height>0);assert.ok(overflow.scrollWidth<=overflow.width+2,JSON.stringify(overflow));if(width>=1280)assert.ok(overflow.scrollHeight<=overflow.height+2,tool+': '+JSON.stringify(overflow));
    if(width<1280){await page.locator(tool==='map'?'.seed-settings161':tool==='gradient'?'.gradient-output':'.edit-toolbar').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(200);await capture(`${process.env.AMBER_QA_NAME||'AMBER'}-${tool}-${language}-${theme}-${width}x${height}-details`);await page.evaluate(()=>document.querySelector('.tools-page').closest('.workspace-scroll').scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);}
    const name=`${process.env.AMBER_QA_NAME||'AMBER'}-${tool}-${language}-${theme}-${width}x${height}`;await capture(name);results.push({tool,language,theme,width,height,overflow,name});
   }
  }
  assert.deepEqual(errors,[]);await writeFile(join(out,(process.env.AMBER_QA_NAME||'AMBER')+'-layout-checks.json'),JSON.stringify({data,library,stage,isolated:true,results,errors},null,2));console.log('LAYOUT161_OK');
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
