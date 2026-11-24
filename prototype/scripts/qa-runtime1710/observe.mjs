// Runs only inside the benchmark's disposable copy of a local packaged build.
import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
export async function observe({app,window,core,counts,network}){
 const resultPath=process.env.AMBER_BENCH_REPORT;
 const report={samples:[]};
 try{
  assert.ok(app.isPackaged);
  assert.equal(app.getPath('userData'),process.env.AMBER_SMOKE_ROOT);
  const js=expression=>window.webContents.executeJavaScript(expression);
  async function until(test,description,limit=30000){
   const end=Date.now()+limit;
   while(Date.now()<end){if(await test())return;await delay(50);}
   throw Error('Timed out: '+description);
  }
  const ready=()=>window.webContents.getURL()==='amber://app/' && window.isVisible() &&
    js("!!document.querySelector('nav button') && performance.getEntriesByName('amber:startup-committed').length>0");
  await until(ready,'interactive launcher');
  report.startupMs=Date.now()-Number(process.env.AMBER_BENCH_STARTED);
  window.setAlwaysOnTop(true);window.show();window.focus();
  report.instances=(await core.listInstances()).length;
  assert.ok(report.instances>=7);
  await js("window.benchMutations=0;new MutationObserver(()=>window.benchMutations++).observe(document.querySelector('#root'),{subtree:true,childList:true,attributes:true,characterData:true})");
  await js("window.benchVisibility=0;document.addEventListener('visibilitychange',()=>window.benchVisibility++)");
  const readDom=()=>js('window.benchMutations');
  async function sample(scene){
   await delay(3000);
   const hidden=scene==='minimized';
   assert.equal(await js('document.hidden'),hidden,scene+' visibility before sampling');
   const visibilityChanges=await js('window.benchVisibility');
   const domBefore=await readDom(), before={...counts}, start=Date.now();
   await delay(8000);
   const end=Date.now(),after={...counts},domAfter=await readDom();
   assert.equal(await js('document.hidden'),hidden,scene+' visibility after sampling');
   assert.equal(await js('window.benchVisibility'),visibilityChanges,scene+' visibility changed during sampling');
   const calls=Object.fromEntries(Object.keys(after).map(k=>[k,after[k]-(before[k]||0)]).filter(([,v])=>v));
   report.samples.push({scene,start,end,calls,dom:domAfter-domBefore,hidden:await js('document.hidden')});
  }
  await sample('home');
  window.minimize();
  await until(()=>window.isMinimized()&&js('document.hidden'),'minimized');
  await sample('minimized');
  window.restore();window.show();window.focus();window.moveTop();
  await until(()=>!window.isMinimized() && window.isVisible() && js('!document.hidden'),'restored');
  const tasks="Array.from(document.querySelectorAll('nav button')).find(b=>/^(任务|Tasks)$/.test(b.innerText.trim()))";
  assert.ok(await js('!!('+tasks+')'),await js("document.querySelector('nav')?.innerText"));
  await js(tasks+'.click()');
  await until(()=>js("!!document.querySelector('.task-activity160')"),'task center');
  await delay(700); // Let the first task-center snapshot finish before starting the install.
  // Only this QA instance uses fixture metadata. Both the real scheduler and
  // network diagnostics see the same official URL and HTTP response stream.
  const raw=network.raw;
  const base=process.env.AMBER_BENCH_ORIGIN;
  network.raw=(url,options)=>String(url).startsWith('https://piston-data.mojang.com/amber-qa/')?
    fetch(base+new URL(url).pathname,options):raw(url,options);
  const id=process.env.AMBER_BENCH_ID;
  const start=Date.now();
  const initial=await js('window.amberDesktop.install('+JSON.stringify(id)+')');
  const job=core.jobs.find(j=>j.id===initial.id);
  assert.ok(job);
  await until(async()=>{
   if(job.state!=='running')throw Error('Unexpected install state '+job.state+' '+(job.error||''));
   return js(`(() => {
     const target=Array.from(document.querySelectorAll('.task-entry')).find(e=>e.textContent.includes('Controlled download'));
     const details=target?.querySelector('.task-download-details');
     if(details && !details.open)details.querySelector('summary').click();
     return !!details?.querySelector('.task-speed-history svg');
   })()`);
  },'plotted samples');
  await sample('download');
  assert.equal(job.state,'running','fixed window must contain only active transfer');
  await until(()=>job.state!=='running','verified install',70000);
  assert.equal(job.state,'done',job.error);
  report.downloadMs=Date.parse(job.finishedAt)-start;
  report.payloadBytes=Number(process.env.AMBER_BENCH_BYTES);
  report.diagnostics=network.diagnostics.get(job).snapshot();
  assert.equal(report.diagnostics.config.sourceMode,'official');
  assert.deepEqual(report.diagnostics.sources,['piston-data.mojang.com']);
  assert.deepEqual(report.diagnostics.modes,[1]);
  report.installed=JSON.parse(await readFile(join(core.root,'instances',id,'instance.json'))).status;
  assert.equal(report.installed,'installed');
  await until(()=>js("Array.from(document.querySelectorAll('.task-entry')).some(e=>e.textContent.includes('Controlled download') && /已完成|completed/i.test(e.textContent))"),'completion displayed',4000);
 }catch(e){report.error=e.stack;}
 await writeFile(resultPath,JSON.stringify(report,null,2));
 app.exit(report.error?1:0);
}
