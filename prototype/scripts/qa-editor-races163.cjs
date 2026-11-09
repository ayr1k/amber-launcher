// SPDX-License-Identifier: MPL-2.0
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'../../tmp/qa/node_modules/playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),data=await mkdtemp(join(tmpdir(),'amber163-editor-')),library=join(data,'library'),id='a1111111-1111-4111-8111-111111111111',dir=join(library,'instances',id),out=join(root,'review163');
 await mkdir(join(dir,'config'),{recursive:true});await mkdir(out,{recursive:true});
 await writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'Synthetic editor',game:'1.21.1',loader:'vanilla',status:'installed',createdAt:new Date().toISOString()}));
 await writeFile(join(dir,'version.json'),JSON.stringify({id:'1.21.1'}));await writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);await page.waitForFunction(()=>!!window.amberDesktop);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  await page.evaluate(async()=>window.amberDesktop.saveSettings({...await window.amberDesktop.settings(),language:'en-US'}));
  await app.evaluate(({ipcMain})=>{
   globalThis.editorFixture={pending:new Map()};
   for(const action of ['list','read','history','backup'])ipcMain.removeHandler('amber:editor-'+action);
   ipcMain.handle('amber:editor-list',()=>['config/a.txt','config/b.txt']);
   ipcMain.handle('amber:editor-read',(_,id,name)=>new Promise(resolve=>globalThis.editorFixture.pending.set(name,()=>resolve({name,path:'SYNTHETIC/'+name,text:name+' content',hash:name,encoding:'UTF-8',eol:'None'}))));
   ipcMain.handle('amber:editor-history',()=>[{token:'backup',date:new Date().toISOString(),bytes:12}]);
   ipcMain.handle('amber:editor-backup',()=>new Promise(resolve=>globalThis.editorFixture.backup=()=>resolve({text:'BACKUP A'})));
  });
  await page.reload();await page.getByRole('button',{name:'Tools',exact:true}).first().click();await page.getByRole('button',{name:'File editor',exact:true}).click();
  async function release(name){await app.evaluate((_,name)=>globalThis.editorFixture.pending.get(name)(),name);await page.waitForTimeout(150);}
  await page.getByRole('button',{name:'a.txt',exact:true}).click();await page.getByRole('button',{name:'b.txt',exact:true}).click();await release('config/b.txt');await release('config/a.txt');
  const focused=await page.locator('[role=tab][aria-selected=true]').textContent();
  const baseline=process.argv.includes('--baseline');assert.match(focused,baseline?/a.txt/:/b.txt/);
  // Make both tabs available before the delayed backup experiment.
  await page.locator('.edit-file').filter({hasText:'a.txt'}).click();await release('config/a.txt');
  await page.getByRole('button',{name:'Backups',exact:true}).click();await page.locator('.edit-history button').first().click();
  await page.getByRole('tab',{name:/b.txt/}).click();
  page.on('dialog',d=>d.accept().catch(()=>{}));await app.evaluate(()=>globalThis.editorFixture.backup());await page.waitForTimeout(200);
  const text=await page.locator('.edit-code .cm-content').textContent();assert.equal(text,baseline?'BACKUP A':'config/b.txt content');
  const result={baseline,data,isolated:true,focusedAfterReverseRead:focused,otherTabAfterBackup:text};
  await writeFile(join(out,baseline?'baseline-races.json':'fixed-races.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

