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

  const results=[];
  await page.evaluate(async()=>window.amberDesktop.saveSettings({...await window.amberDesktop.settings(),language:'en-US'}));
  for(const [key,reverse,axis,sign] of [['ArrowLeft','ArrowRight','x',-1],['ArrowRight','ArrowLeft','x',1],['ArrowUp','ArrowDown','z',-1],['ArrowDown','ArrowUp','z',1]]){
   await page.evaluate(({axis,sign})=>localStorage.setItem('amber-seed-map',JSON.stringify({seed:'1',version:35,dimension:0,y:64,x:0,z:0,scale:4096,[axis]:sign*29899998})),{axis,sign});
   await page.reload().catch(e=>{if(!e.message.includes('ERR_ABORTED'))throw e;});await page.waitForFunction(()=>!!window.amberDesktop);
   await page.getByRole('button',{name:'Tools',exact:true}).first().click();await page.getByRole('button',{name:'Seed map',exact:true}).click();
   const canvas=page.locator('.seed-map-wrap canvas');await canvas.focus();for(let i=0;i<20;i++)await page.keyboard.press(key);
   await page.waitForFunction(()=>document.querySelector('.seed-toolbar [role="status"]')?.textContent==='Offline map',{}, {timeout:30000});
   let camera=await page.evaluate(()=>JSON.parse(localStorage.getItem('amber-seed-map')));assert.equal(camera[axis],sign*29899999);assert.equal(await page.locator('.seed-display161 .error').count(),0);
   await page.keyboard.press(reverse);await page.waitForTimeout(300);camera=await page.evaluate(()=>JSON.parse(localStorage.getItem('amber-seed-map')));assert.equal(camera[axis],sign*(29899999-4096*40));
   await page.waitForFunction(()=>document.querySelector('.seed-toolbar [role="status"]')?.textContent==='Offline map',{}, {timeout:30000});assert.equal(await page.locator('.seed-display161 .error').count(),0);results.push({key,axis,sign,repeats:20,scale:4096,recovered:camera[axis],nativeMapCompleted:true});
  }
  await writeFile(join(out,'keyboard-boundary-checks.json'),JSON.stringify({data,library,isolated:true,results},null,2));console.log('KEYBOARD_BOUNDARY161_OK');
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
