// SPDX-License-Identifier: MPL-2.0
// Narrow regression: missing-record single removal and filtered preview invalidation.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile,readFile}=require('node:fs/promises');
const {tmpdir}=require('node:os');const {join,resolve}=require('node:path');const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),appRoot=resolve(process.env.AMBER_QA_APP||root),data=await mkdtemp(join(tmpdir(),'amber154-missing-')),library=join(data,'library');
 const id='a1111111-1111-4111-8111-111111111111',dir=join(library,'instances',id);
 for(const folder of ['mods','resourcepacks','shaderpacks','saves','config'])await mkdir(join(dir,folder),{recursive:true});
 await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'Synthetic missing-record regression',game:'1.21.1',loader:'vanilla',status:'installed',createdAt:new Date().toISOString()}));
 await writeFile(join(dir,'version.json'),JSON.stringify({id:'1.21.1'}));
 const missing=name=>({relative:'mods/'+name+'.jar',title:name,type:'mod',enabled:false,hash:'0'.repeat(40),size:20});
 await writeFile(join(dir,'content.json'),JSON.stringify({schema:1,files:[{...missing('missing-A'),enabled:true},missing('missing-B')]}));
 await writeFile(join(dir,'mods','present.jar'),'retain present bytes');
 await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[appRoot,'--qa-ui','--qa-visible','--disable-gpu'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}assert.ok(page);page.setDefaultTimeout(8000);
  await page.waitForFunction(()=>!!window.amberDesktop);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  await page.evaluate(async()=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language:'zh-CN'});});
  console.log('OPEN_CONTENT');await page.getByRole('button',{name:/管理模组/}).click();await page.waitForFunction(()=>document.querySelectorAll('.content-installed-row').length===3);
  const row=name=>page.locator('.content-installed-row').filter({hasText:name}),confirm=page.getByRole('button',{name:'确认移除所选内容',exact:true}),search=page.getByPlaceholder('名称、版本或文件名');
  assert.equal(await row('missing-A').locator('.bulk-check input').isDisabled(),true);
  await page.getByRole('checkbox',{name:'选择当前筛选结果'}).check();assert.equal(await page.locator('.bulk-check input:checked').count(),1);
  await row('missing-A').getByRole('button',{name:'移除…',exact:true}).click();await confirm.waitFor();console.log('PREVIEW_READY');
  await page.waitForTimeout(1500);assert.equal(await confirm.isVisible(),true);assert.equal(await confirm.isEnabled(),true);
  assert.equal(JSON.parse(await readFile(join(dir,'content.json'),'utf8')).files.length,2);
  console.log('CONFIRM_REMOVE');await confirm.click();let removal;for(let i=0;i<200;i++){removal=(await page.evaluate(()=>window.amberDesktop.status())).jobs.filter(j=>j.kind==='content-bulk').at(-1);if(removal&&removal.state!=='running')break;await page.waitForTimeout(50);}assert.equal(removal?.state,'done',JSON.stringify(removal));await page.waitForFunction(()=>document.querySelectorAll('.content-installed-row').length===2);
  const after=JSON.parse(await readFile(join(dir,'content.json'),'utf8'));assert.deepEqual(after.files,[missing('missing-B')]);assert.equal(await readFile(join(dir,'mods','present.jar'),'utf8'),'retain present bytes');
  await row('missing-B').getByRole('button',{name:'移除…',exact:true}).click();await confirm.waitFor();await search.fill('present');assert.equal(await confirm.count(),0);await search.fill('missing-B');assert.equal(await confirm.count(),0);
  // Hold a real backend preview response until the user has changed the filter.
  await app.evaluate(async(_,url)=>{const vm=process.getBuiltinModule('node:vm');const {BulkContent}=await vm.runInThisContext('import('+JSON.stringify(url)+')',{importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER});const original=BulkContent.prototype.preview;BulkContent.prototype.preview=async function(...args){const value=await original.apply(this,args);await new Promise(resolve=>{globalThis.releasePreview154=resolve;});return value;};},pathToFileURL(join(appRoot,'desktop/bulk-content.mjs')).href);
  await row('missing-B').getByRole('button',{name:'移除…',exact:true}).click();
  for(let i=0;i<100&&!await app.evaluate(()=>!!globalThis.releasePreview154);i++)await page.waitForTimeout(20);
  assert.equal(await app.evaluate(()=>!!globalThis.releasePreview154),true);await search.fill('present');await app.evaluate(()=>globalThis.releasePreview154());await page.waitForTimeout(250);assert.equal(await confirm.count(),0);await search.fill('missing-B');assert.equal(await confirm.count(),0);
  assert.deepEqual(JSON.parse(await readFile(join(dir,'content.json'),'utf8')).files,[missing('missing-B')]);assert.equal(await readFile(join(dir,'mods','present.jar'),'utf8'),'retain present bytes');
  await search.fill('present');await page.getByRole('checkbox',{name:'选择当前筛选结果'}).check();await search.fill('no-match');assert.equal(await page.locator('.bulk-check input:checked').count(),0);assert.equal(await page.getByRole('button',{name:'批量移除…',exact:true}).isDisabled(),true);
  console.log('MISSING154_REGRESSION_OK: missing-only removal preview/confirmation; select-all excludes missing; refresh retains preview; filter invalidates completed and delayed previews; unrelated files/records preserved');
 }finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});await app.close().catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
