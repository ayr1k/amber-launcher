// SPDX-License-Identifier: MPL-2.0
// Isolated desktop acceptance; Playwright is an external QA dependency.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,writeFile}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),stage=resolve(process.env.AMBER_QA_STAGE||root),data=await mkdtemp(join(tmpdir(),'amber-tray147-'));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:process.env.AMBER_QA_ELECTRON||join(root,'node_modules/electron/dist/electron.exe'),args:process.env.AMBER_QA_PACKAGED?['--qa-ui']:[stage,'--qa-ui'],env});
 const child=app.process();if(process.env.AMBER_QA_PACKAGED)assert.equal(await app.evaluate(({app})=>app.isPackaged),true);
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),resolve(data));
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}if(!page)throw Error('Main window did not load');page.setDefaultTimeout(20000);
  await page.waitForFunction(()=>!!window.amberDesktop);
  await page.evaluate(async()=>{await window.amberDesktop.completeOnboarding();const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language:'en-US'});});
  await page.reload();
  const server=await page.evaluate(()=>window.amberDesktop.server('create',{name:'Isolated schedule QA',game:'1.21.1',type:'vanilla',port:25565}));
  await page.getByRole('button',{name:'Tasks',exact:true}).click();
  await page.getByRole('button',{name:'Server schedules',exact:true}).click();
  await page.getByRole('button',{name:'Add scheduled task',exact:true}).click();
  await page.getByRole('textbox',{name:'Task name',exact:true}).fill('Daily noon restart');
  await page.getByRole('button',{name:'Save task',exact:true}).click();
  await page.getByText('Daily noon restart',{exact:true}).waitFor();
  let state=await page.evaluate(()=>window.amberDesktop.serverSchedules('list'));
  assert.equal(state.tasks[0].serverId,server.id);assert.equal(state.tasks[0].time,'12:00');assert.equal(state.tasks[0].action,'restart');assert.ok(state.tasks[0].nextRun);
  await page.getByRole('button',{name:'Pause task',exact:true}).click();
  await page.getByRole('button',{name:'Enable task',exact:true}).waitFor();
  assert.equal((await page.evaluate(()=>window.amberDesktop.serverSchedules('list'))).tasks[0].enabled,false);
  await page.reload();await page.getByRole('button',{name:'Tasks',exact:true}).click();await page.getByRole('button',{name:'Server schedules',exact:true}).click();await page.getByText('Daily noon restart',{exact:true}).waitFor();
  const output=resolve(process.env.AMBER_QA_OUTPUT||join(root,'../qa147'));await mkdir(output,{recursive:true});await page.screenshot({path:join(output,'schedules.png'),fullPage:true});
  // IPC validation and the real timer: an offline target is skipped, not started.
  await page.evaluate(async id=>{await window.amberDesktop.serverSchedules('save',{name:'Offline once',serverId:id,enabled:true,action:'command',command:'say fixture',kind:'once',at:new Date(Date.now()+1500).toISOString()});},server.id);
  await page.waitForFunction(async()=>(await window.amberDesktop.serverSchedules('list')).tasks.find(t=>t.name==='Offline once')?.last?.state==='offline');
  await page.evaluate(async()=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,closeBehavior:'tray'});});
  await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.close();});
  await page.waitForTimeout(500);
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
  await app.evaluate(({app})=>app.emit('second-instance'));
  assert.equal(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),true);
  await page.evaluate(async()=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,closeBehavior:'server'});});
  const exited=new Promise(resolve=>child.once('exit',resolve));
  await page.evaluate(()=>window.amberDesktop.windowAction('close')).catch(()=>{});
  await Promise.race([exited,new Promise((_,reject)=>setTimeout(()=>reject(Error('Default idle close did not exit')),10000))]);
  await writeFile(join(output,'result.json'),JSON.stringify({stage,isolatedData:data,checks:['UI create/pause/persist','one-shot offline skip','tray hide','second-instance restore','default idle exit'],result:'passed'},null,2));
  console.log('TRAY_AND_SCHEDULE_DESKTOP_OK',stage);
 }finally{if(child.exitCode===null)await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
