// SPDX-License-Identifier: MPL-2.0
// Production UI/IPC with explicitly synthetic servers/accounts in isolated userData.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT),fs=require('node:fs/promises'),{join,resolve}=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),out=resolve(process.env.AMBER_QA_OUTPUT),data=join(out,'userData');
 await fs.mkdir(join(data,'library'),{recursive:true});await fs.writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:join(data,'library'),onboarded:true}));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});let page;const results=[],errors=[];
 async function capture(name){await page.waitForTimeout(600);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const png=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).webContents.capturePage()).toPNG().toString('base64'));await fs.writeFile(join(out,name+'.png'),Buffer.from(png,'base64'));}
 const fixture=async value=>app.evaluate((_,value)=>Object.assign(globalThis.qa173,value),value);
 const count=async()=>app.evaluate(()=>globalThis.qa173.commands.length);
 try{
  for(let n=0;n<300;n++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);page.setDefaultTimeout(15000);await page.waitForFunction(()=>!!window.amberDesktop);await page.locator('.mode132').waitFor();assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  page.on('pageerror',e=>errors.push(e.message));
  await page.evaluate(async()=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language:'en-US'});});
  const server=await page.evaluate(()=>window.amberDesktop.server('create',{name:'Synthetic console QA 173',game:'1.21.1',type:'paper',port:25565}));
  await app.evaluate(({ipcMain},server)=>{
   globalThis.qa173={server,commands:[],attempts:0,copyMode:'ok',copyCount:0,addressMode:'ok',addressDelay:0,commandMode:'ok',commandDelay:0};
   const row=()=>({...server,status:'ready',run:{state:'running',port:25565,tail:'QA fixture ready\nVisible filtered marker\nOther output',startedAt:new Date().toISOString()}});
   ipcMain.removeHandler('amber:server');ipcMain.handle('amber:server',async(_,action,...args)=>{
    const q=globalThis.qa173;
    if(action==='status')return {instances:[row()],network:{installed:false,room:null}};
    if(action==='addressInfo173'){const mode=q.addressMode;await new Promise(r=>setTimeout(r,q.addressDelay));if(mode==='fail')throw Error('Synthetic adapter failure');return {port:25565,addresses:mode==='empty'?[]:['192.168.1.77:25565','10.20.30.40:25565','[2001:db8:1234:5678:abcd:1234:5678:abcd]:25565','[fe80::abcd:1234%17]:25565']};}
    if(action==='command'){q.attempts++;await new Promise(r=>setTimeout(r,q.commandDelay));if(q.commandMode==='fail')throw Error('Synthetic send failure');q.commands.push({server:args[0],command:args[1]});return true;}
    if(action==='properties')return {values:{'server-port':'25565'},text:'server-port=25565',hash:'fixture'};
    if(action==='content')return [];
    throw Error('Unimplemented QA action '+action);
   });
   ipcMain.removeHandler('amber:server-address-copy');ipcMain.handle('amber:server-address-copy',async(_,value)=>{const q=globalThis.qa173;q.copyCount++;await new Promise(r=>setTimeout(r,300));if(q.copyMode==='fail')throw Error('Synthetic clipboard failure');q.copied=value;return true;});
   const qAccounts=[{id:'offline-qa-173',type:'offline',name:'Offline_QA',uuid:'11111111111111111111111111111111',ownerId:'microsoft-qa-173'},{id:'microsoft-qa-173',type:'microsoft',name:'Microsoft_QA',uuid:'22222222222222222222222222222222',ownership:{state:'verified',expiresAt:Date.now()+86400000}}];
   ipcMain.removeHandler('amber:accounts');ipcMain.handle('amber:accounts',()=>({accounts:qAccounts,licenseAccountId:'microsoft-qa-173',clientId:'synthetic'}));
   ipcMain.removeHandler('amber:account-skin');ipcMain.handle('amber:account-skin',()=>null);
   ipcMain.removeHandler('amber:offline-edit');ipcMain.handle('amber:offline-edit',(_,id,input)=>{const a=qAccounts.find(a=>a.id===id);Object.assign(a,input);return {accounts:qAccounts};});
  },server);
  await page.reload();await page.locator('.mode132 button').nth(1).click();
  const launch=page.locator('.launch145:visible'),command=launch.getByRole('textbox',{name:'Server command',exact:true}),send=launch.locator('form.server-command132 button'),history=launch.getByRole('button',{name:'Clear command history',exact:true}),refresh=launch.getByRole('button',{name:'Refresh addresses',exact:true});
  await launch.locator('.server-address172').first().waitFor();assert.equal(await launch.locator('.server-address172').count(),5);
  await command.fill('list');await send.click();await page.waitForFunction(()=>document.querySelector('.server-command-result173')?.textContent.includes('Command sent'));
  await command.fill('say fixture');await command.press('Enter');await page.waitForFunction(()=>document.querySelector('.server-command132 input')?.value==='');
  await command.fill('unsent original draft');await command.press('ArrowUp');assert.equal(await command.inputValue(),'say fixture');await command.press('ArrowUp');assert.equal(await command.inputValue(),'list');await command.press('ArrowUp');assert.equal(await command.inputValue(),'list');
  await command.press('ArrowDown');await command.press('ArrowDown');assert.equal(await command.inputValue(),'unsent original draft');assert.equal(await count(),2);
  await command.dispatchEvent('keydown',{key:'ArrowUp',code:'ArrowUp',isComposing:true});assert.equal(await command.inputValue(),'unsent original draft');
  await command.press('ArrowUp');await send.click();await page.waitForFunction(()=>document.querySelector('.server-command132 input')?.value==='unsent original draft');assert.equal(await count(),3);
  await command.press('ArrowUp');await history.click();assert.equal(await command.inputValue(),'unsent original draft');assert.equal(await history.isDisabled(),true);await command.press('ArrowUp');assert.equal(await command.inputValue(),'unsent original draft');
  await fixture({commandMode:'fail'});await command.fill('retained after failure');await send.click();await page.waitForFunction(()=>document.querySelector('.server-command-result173')?.textContent.includes('Send failed'));assert.equal(await command.inputValue(),'retained after failure');assert.equal(await history.isDisabled(),true);await launch.getByRole('button',{name:'Send failed; input kept. View details',exact:true}).click();await page.getByRole('dialog').getByText('Synthetic send failure',{exact:false}).waitFor();await page.getByRole('dialog').press('Escape');
  await fixture({commandMode:'ok',commandDelay:700});await command.fill('single submission');const attempts=await app.evaluate(()=>globalThis.qa173.attempts);await command.press('Enter');assert.equal(await command.getAttribute('readonly'),'');assert.equal(await send.isDisabled(),true);await launch.locator('form.server-command132').dispatchEvent('submit');await page.waitForFunction(()=>!document.querySelector('.server-command132 input')?.readOnly);assert.equal(await app.evaluate(()=>globalThis.qa173.attempts),attempts+1);assert.equal(await command.evaluate(e=>e===document.activeElement),true);await fixture({commandDelay:0});
  const filter=launch.getByRole('textbox',{name:'Filter logs',exact:true});await filter.fill('filtered marker');assert.equal(await launch.locator('pre.server-console132').innerText(),'Visible filtered marker');await filter.fill('');const follow=launch.getByRole('checkbox',{name:'Follow output',exact:true});await follow.uncheck();assert.equal(await follow.isChecked(),false);await follow.check();
  const firstCopy=launch.locator('.server-address-copy172').first();await firstCopy.click();assert.equal(await firstCopy.isDisabled(),true);await page.waitForFunction(()=>document.querySelector('.server-address-result172')?.textContent==='Copied');assert.equal(await app.evaluate(()=>globalThis.qa173.copied),'127.0.0.1:25565');await page.waitForFunction(()=>document.querySelector('.server-address-result172')?.textContent==='');
  await fixture({copyMode:'fail'});await firstCopy.click();await page.waitForFunction(()=>document.querySelector('.server-address-result172')?.textContent.includes('Copy failed'));await fixture({copyMode:'ok'});
  await fixture({addressMode:'fail',addressDelay:500});await refresh.click();assert.equal(await launch.locator('.server-address172').count(),0);assert.equal(await launch.getByRole('button',{name:'Refreshing addresses…',exact:true}).isDisabled(),true);await page.waitForFunction(()=>document.querySelector('.server-address-status173')?.textContent.includes('Could not get addresses'));assert.equal(await launch.locator('.server-address172').count(),0);
  await fixture({addressMode:'empty',addressDelay:0});await refresh.click();await page.waitForFunction(()=>document.querySelector('.server-address-group172')?.textContent.includes('Local address'));assert.equal(await launch.locator('.server-address172').count(),1);assert.ok((await launch.innerText()).includes('No LAN address available'));
  await fixture({addressMode:'ok'});await refresh.click();await launch.locator('.server-address172').nth(4).waitFor();
  await command.fill('memory-only sentinel');await send.click();await page.waitForFunction(()=>document.querySelector('.server-command132 input')?.value==='');await command.fill('draft-only sentinel');
  assert.ok(!(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).includes('sentinel'));
  await page.reload();await page.locator('.mode132 button').nth(1).click();await launch.locator('.server-command132').waitFor();assert.equal(await command.inputValue(),'');assert.equal(await history.isDisabled(),true);
  results.push({interaction:'history/send/filter/follow/copy/refresh/reload',status:'passed',synthetic:true});
  for(const language of ['en-US','zh-CN'])for(const theme of ['light','dark','custom'])for(const [width,height,scale]of [[1366,768,1],[1920,1080,1],[1000,720,1.25],[1366,768,1.5]]){
   const name=[language,theme,width,scale].join('-'),en=language==='en-US';
   await page.evaluate(async v=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language:v.language,theme:v.theme==='custom'?'dark':v.theme,appearance:{...s.appearance,enabled:v.theme==='custom',mode:'custom',background:'#111b2e',surface:'#18243d',text:'#eef3ff',muted:'#b7c6e2',line:'#53637f',accent:'#d6a7ff'}});},{language,theme});await page.reload();await app.evaluate(({BrowserWindow},v)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/'));w.setSize(v.width,v.height);w.webContents.setZoomFactor(v.scale);},{width,height,scale});
   await page.locator('.mode132 button').nth(1).click();await launch.locator('.server-address172').nth(4).waitFor();await capture(name+'-server');
   const logHeight=await launch.locator('pre.server-console132').evaluate(e=>e.getBoundingClientRect().height);assert.ok(logHeight>=90,name+' console height '+logHeight);const overflow=await page.evaluate(()=>[...document.querySelectorAll('.server-scroll132,.launch145,.launch-address145,.server-command173')].filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+1).map(e=>e.className));assert.deepEqual(overflow,[],name);
   await page.locator('.mode132 button').nth(0).click();await page.getByRole('button',{name:en?'Accounts':'账号',exact:true}).first().click();const panel=page.locator('.account-panel:visible');await panel.locator('.account-entry').nth(1).waitFor();assert.equal(await panel.locator('.offline135').count(),0);
   const rows=await panel.locator('.account-entry').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,width:r.width,overflow:e.scrollWidth-e.clientWidth};}));assert.equal(rows[0].x,rows[1].x);assert.equal(rows[0].width,rows[1].width);assert.ok(rows.every(r=>r.overflow<=1),name);await panel.locator('.account-entry').last().scrollIntoViewIfNeeded();await capture(name+'-accounts');results.push({name,overflow,rows});
  }
  await page.locator('.account-entry').first().getByRole('button',{name:'账号详情',exact:true}).click();await page.getByRole('button',{name:'编辑用户名与皮肤',exact:true}).click();await page.getByRole('textbox',{name:'玩家名称',exact:true}).fill('Edited_QA');await page.getByRole('button',{name:'保存名称',exact:true}).click();await page.getByRole('heading',{name:'Edited_QA',exact:true}).waitFor();await capture('offline-detail-edit');assert.equal(await page.getByRole('button',{name:'选择 PNG 皮肤',exact:true}).count(),1);
  if(process.env.AMBER_QA_THEMES){
   for(const file of ['AMBER-Alloy-1.2.1.ambtheme','AMBER-Nocturne-1.2.1.ambtheme','AMBER-Harvest-1.2.1.ambtheme','AMBER-Verdant-1.2.1.ambtheme','AMBER-Bloom-1.5.3.ambtheme','AMBER-Sky-1.5.3.ambtheme','AMBER-Woodland-1.6.1-v2.ambtheme']){
    await app.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]});},join(process.env.AMBER_QA_THEMES,file));
    await page.evaluate(async()=>{const theme=await window.amberDesktop.themeImport();await window.amberDesktop.themeApplyEntry(theme.id);const state=await window.amberDesktop.themeState();if(state)await window.amberDesktop.themeConfirm(state.id);});
    for(const [width,height,scale]of [[1366,768,1],[1000,720,1.25]]){
     const name=file.replace('.ambtheme','')+'-'+width+'-'+scale;await page.reload();await app.evaluate(({BrowserWindow},v)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/'));w.setSize(v.width,v.height);w.webContents.setZoomFactor(v.scale);},{width,height,scale});await page.locator('.mode132 button').nth(1).click();await launch.locator('.server-address172').nth(4).waitFor();await capture(name+'-server');
     const overflow=await page.evaluate(()=>[...document.querySelectorAll('.server-scroll132,.launch145,.launch-address145,.server-command173')].filter(e=>e.clientWidth&&e.scrollWidth>e.clientWidth+1).map(e=>e.className));assert.deepEqual(overflow,[],name);await page.locator('.mode132 button').nth(0).click();await page.getByRole('button',{name:'账号',exact:true}).first().click();const panel=page.locator('.account-panel:visible');await panel.locator('.account-entry').nth(1).waitFor();const widths=await panel.locator('.account-entry').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));assert.equal(widths[0],widths[1]);await panel.locator('.account-entry').last().scrollIntoViewIfNeeded();await capture(name+'-accounts');results.push({name,overflow,widths});
    }
   }
  }
  assert.deepEqual(errors,[]);await fs.writeFile(join(out,'result.json'),JSON.stringify({results,errors,limits:'Synthetic server/account/clipboard IPC; not gameplay, login or physical DPI acceptance'},null,2));console.log('SERVER173_UI_OK '+results.length+' checks/configurations');
 }catch(e){console.error('QA_FAILURE',e);if(page){await capture('failure').catch(()=>{});await fs.writeFile(join(out,'failure.txt'),await page.locator('body').innerText().catch(()=>''));}throw e;}finally{await app.evaluate(({app})=>app.exit(0)).catch(()=>{});}
})().catch(e=>{console.error(e);process.exitCode=1;});
