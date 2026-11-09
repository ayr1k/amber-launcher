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
 const app=await electron.launch({executablePath:process.env.AMBER_QA_ELECTRON||join(root,'node_modules/electron/dist/electron.exe'),args:[...(process.env.AMBER_QA_ELECTRON?[]:[stage]),'--qa-ui','--qa-visible','--disable-gpu'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);await page.waitForFunction(()=>!!window.amberDesktop);await page.locator('.desktop-app').waitFor();await page.waitForTimeout(500);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);

  const results=[];
  await page.evaluate(async()=>{await window.amberDesktop.saveSettings({...await window.amberDesktop.settings(),language:'en-US'});localStorage.setItem('amber-seed-map',JSON.stringify({seed:'1',version:35,dimension:0,x:0,z:0,y:64,scale:16}));});
  await page.reload();await page.locator('.desktop-app').waitFor();await page.getByRole('button',{name:'Tools',exact:true}).first().click();await page.getByRole('button',{name:'Seed map',exact:true}).click();
  const canvas=page.locator('.seed-map-wrap canvas');
  async function done(){await page.waitForFunction(()=>document.querySelector('.seed-toolbar [role="status"]')?.textContent==='Offline map',{}, {timeout:30000});await page.waitForTimeout(200);assert.equal(await page.locator('.seed-display161 .error').count(),0);}
  async function state(){return page.evaluate(()=>({camera:JSON.parse(localStorage.getItem('amber-seed-map')),inputs:[...document.querySelectorAll('.seed-coordinates161 input')].map(e=>({value:e.value,valid:e.validity.valid,stepMismatch:e.validity.stepMismatch})),valid:document.querySelector('#seed-view161').checkValidity()}));}
  async function fingerprint(){return canvas.evaluate(el=>{let h=0;for(const c of el.toDataURL())h=(Math.imul(h,31)+c.charCodeAt(0))|0;return h;});}
  await done();await canvas.evaluate(el=>el.addEventListener('wheel',e=>window.qaWheel={x:e.clientX,y:e.clientY},{once:true}));const bounds=await canvas.boundingBox();await page.mouse.move(bounds.x+bounds.width/2+1,bounds.y+bounds.height/2+1);await page.mouse.wheel(0,-100);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('amber-seed-map')).scale===4);await done();const zoom=await state();assert.ok(!Number.isInteger(zoom.camera.x)&&!Number.isInteger(zoom.camera.z));
  const event=await page.evaluate(()=>window.qaWheel);assert.ok(Math.abs(zoom.camera.x-(event.x-bounds.x-bounds.width/2)/bounds.width*192*12)<.01);assert.ok(Math.abs(zoom.camera.z-(event.y-bounds.y-bounds.height/2)/bounds.height*115.2*12)<.01);
  const before=await fingerprint();await page.locator('.seed-input input').fill('2');await page.getByRole('button',{name:'View map',exact:true}).click();await page.waitForTimeout(300);
  if(process.env.AMBER_QA_EXPECT_BLOCKED){const blocked=await state();assert.equal(zoom.valid,false);assert.ok(zoom.inputs.some(i=>i.stepMismatch));assert.equal(blocked.camera.seed,'1');await writeFile(join(out,'zoom-form-before.json'),JSON.stringify({isolated:true,data,zoom,blocked},null,2));console.log('ZOOM_FORM_BUG_REPRODUCED');return;}
  assert.equal(zoom.valid,true);assert.ok(zoom.inputs.every(i=>i.valid&&Number.isInteger(Number(i.value))));await page.waitForFunction(()=>JSON.parse(localStorage.getItem('amber-seed-map')).seed==='2');await done();assert.notEqual(await fingerprint(),before);results.push({action:'zoom then change seed',state:await state(),nativePixelsChanged:true});
  // A saved fractional camera must also restore an integer-valid edit draft.
  await page.evaluate(p=>localStorage.setItem('amber-seed-map',JSON.stringify({...p,seed:'2'})),zoom.camera);await page.reload();await page.locator('.desktop-app').waitFor();await page.getByRole('button',{name:'Tools',exact:true}).first().click();await page.getByRole('button',{name:'Seed map',exact:true}).click();await done();assert.equal((await state()).valid,true);const restoredBounds=await canvas.boundingBox();await page.mouse.move(restoredBounds.x+restoredBounds.width/2+13,restoredBounds.y+restoredBounds.height/2+7);await page.mouse.wheel(0,-100);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('amber-seed-map')).scale===1);await done();const secondZoom=await state();assert.equal(secondZoom.valid,true);assert.ok(!Number.isInteger(secondZoom.camera.x));const prior=await fingerprint();
  const legacyName=await page.evaluate(async()=>(await window.amberDesktop.seedMap('catalog')).versions.find(v=>v.id===10).name);await page.getByRole('combobox',{name:'Java generation version',exact:true}).click();await page.getByRole('option',{name:legacyName,exact:true}).click();await page.getByRole('button',{name:'View map',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('amber-seed-map')).version===10);await done();assert.notEqual(await fingerprint(),prior);results.push({action:'restore fractional camera then change version',state:await state(),nativePixelsChanged:true});
  // Integer-only manual coordinates remain enforced.
  await page.locator('.seed-coordinates161 input').first().fill('1.5');assert.equal((await state()).valid,false);await page.locator('.seed-coordinates161 input').first().fill('3');assert.equal((await state()).valid,true);
  const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).webContents.capturePage()).toPNG().toString('base64'));await writeFile(join(out,(process.env.AMBER_QA_NAME||'AMBER')+'-zoom-form.png'),Buffer.from(png,'base64'));
  await writeFile(join(out,(process.env.AMBER_QA_NAME||'AMBER')+'-zoom-form-checks.json'),JSON.stringify({data,library,isolated:true,packaged:await app.evaluate(({app})=>app.isPackaged),zoom,results,manualFractionRejected:true},null,2));console.log('ZOOM_FORM161_OK');
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
