// Runs in the disposable packaged process only. Both native tunnels terminate
// on this Windows host. No provider account, public relay or game is involved.
import {createServer} from 'node:http';
import {createServer as tcpServer} from 'node:net';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
async function port(){
 const s=tcpServer();await new Promise(ok=>s.listen(0,'127.0.0.1',ok));
 const p=s.address().port;await new Promise(ok=>s.close(ok));return p;
}
export async function links({app,window,core,rooms,sakura,network}){
 const root=app.getPath('userData'),report={},children=[],logs=[];
 const echo=createServer((req,res)=>res.end('amber-qa-'+req.url));
 const js=expr=>window.webContents.executeJavaScript(expr);
 async function until(fn,label,ms=22000){
  const end=Date.now()+ms;let error;
  while(Date.now()<end){try{if(await fn())return;}catch(e){error=e;}await delay(120);}
  throw Error(label+' '+(error?.message||'')+' '+(error?.cause?.message||''));
 }
 function start(file,args,env={}){
  const p=spawn(file,args,{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,...env}});
  const trace={name:file.split(/[\\/]/).at(-1),tail:''};logs.push(trace);
  for(const stream of [p.stdout,p.stderr])stream.on('data',b=>{trace.tail=(trace.tail+b).slice(-1400);});
  p.on('exit',code=>trace.code=code);
  children.push(p);return p;
 }
 try{
  assert.ok(app.isPackaged);assert.equal(root,process.env.AMBER_SMOKE_ROOT);
  await until(()=>window.webContents.getURL()==='amber://app/'&&window.isVisible()&&js("!!document.querySelector('.primary-nav')"),'launcher');
  const tasks="document.querySelector('.primary-nav button:nth-child(6)')";
  const home="document.querySelector('.primary-nav button:first-child')";
  for(let i=0;i<5;i++){
   await js(tasks+'.click()');await until(()=>js("!!document.querySelector('.task-activity160')"),'tasks');
   await js(home+'.click()');await until(()=>js("!document.querySelector('.task-activity160')"),'home');
  }
  // Single poll per second in the activity tab, none after unmount.
  const count=()=>globalThis.benchCounts['amber:transfer-status144']||0;
  const countHome=count();await delay(2200);assert.equal(count(),countHome);
  await js(tasks+'.click()');await delay(600);const countTasks=count();await delay(3200);
  assert.ok(count()-countTasks>=2&&count()-countTasks<=4);
  report.taskPageCycles=5;
  await new Promise(ok=>echo.listen(0,'127.0.0.1',ok));
  const [peer,guestPort,control,remote,rpc]=await Promise.all(Array.from({length:5},port));
  const gamePort=echo.address().port,secret=randomBytes(32).toString('base64url');
  const invite={v:1,name:'amber-'+randomBytes(12).toString('hex'),secret,port:gamePort,peer:'tcp://127.0.0.1:'+peer,expires:Date.now()+180000};
  await mkdir(rooms.root,{recursive:true});
  const easy=join(rooms.root,'easytier-core.exe');
  await copyFile(process.env.AMBER_EASYTIER_EXE,easy);
  const hash=async file=>createHash('sha256').update(await readFile(file)).digest('hex');
  assert.equal(await hash(easy),rooms.component.binaryHash);
  // The stock Windows package imports Packet.dll even with --no-tun.
  const packet=join(rooms.root,'Packet.dll');
  await copyFile(join(dirname(process.env.AMBER_EASYTIER_EXE),'Packet.dll'),packet);
  assert.equal(await hash(packet),'c7c03a87eac7243ccbe331554624b18803010b740e311fc8cfddb573096eacac');
  start(easy,['--bind-device','false','--no-tun','--ipv4','10.144.0.1','--network-name',invite.name,'--private-mode','true','--listeners',invite.peer,'--rpc-portal','127.0.0.1:'+rpc,'--tcp-whitelist',String(gamePort),'--udp-whitelist','--console-log-level','warn'],{ET_NETWORK_SECRET:secret});
  await rooms.join('amber-room:'+Buffer.from(JSON.stringify(invite)).toString('base64url'),guestPort);
  const frps=process.env.AMBER_QA_FRPS;
  assert.equal(await hash(frps),'93c75da7f58154201b9b9b99e628ec9e210a16a9ada93f75d88b2e838c8637fa');
  const cfg=join(root,'frps.ini');
  await writeFile(cfg,'[common]\nbind_addr = 127.0.0.1\nproxy_bind_addr = 127.0.0.1\nbind_port = '+control+'\nallow_ports = '+remote+'\n');
  start(frps,['-c',cfg]);
  await mkdir(dirname(sakura.base.path()),{recursive:true});
  await copyFile(process.env.AMBER_QA_FRPC,sakura.base.path());
  const binding={id:'local-qa',serverId:'qa-server',portId:'main',name:'Loopback',tunnel:'1'};
  sakura.config=async()=>({schema:2,secret:'cWE=',tunnels:[binding]});
  sakura.ports.resolve=async()=>({id:'main',port:gamePort,protocol:'tcp'});
  sakura.ports.conflicts=async()=>[];
  const factory=sakura.workerFactory;
  sakura.workerFactory=()=>{
   const worker=factory();
   worker.codec={decryptString:async()=>'local-fixture'};
   worker.servers={properties:async()=>({values:{'server-port':String(gamePort)}}),runs:new Map()};
   worker.api=async path=>path==='nodes'?{1:{host:'127.0.0.1'}}:[{id:1,node:1,type:'tcp',status:0,local_ip:'127.0.0.1',local_port:gamePort,remote}];
   worker.tunnelConfig=async()=>'[common]\nserver_addr = 127.0.0.1\nserver_port = '+control+'\nlogin_fail_exit = false\n[qa]\ntype = tcp\nlocal_ip = 127.0.0.1\nlocal_port = '+gamePort+'\nremote_port = '+remote+'\n';
   return worker;
  };
  await sakura.start(binding.id);
  async function proveBoth(label){
   for(const [kind,p] of [['Sakura',remote],['EasyTier',guestPort]]){
    await until(async()=>{
     const response=await fetch('http://127.0.0.1:'+p+'/'+label,{signal:AbortSignal.timeout(1600)});
     return (await response.text())==='amber-qa-/'+label;
    },kind+' '+label);
   }
   assert.ok(rooms.active&&sakura.active);
   report[label]=[rooms.current.child.pid,sakura.workers.get(binding.id).current.child.pid];
  }
  await proveBoth('visible');
  const raw=network.raw;
  network.raw=(url,opts)=>String(url).startsWith('https://piston-data.mojang.com/amber-qa/')?fetch(process.env.AMBER_BENCH_ORIGIN+new URL(url).pathname,opts):raw(url,opts);
  const id=process.env.AMBER_BENCH_ID,install=()=>js('window.amberDesktop.install('+JSON.stringify(id)+')');
  const initial=await install(),job=core.jobs.find(j=>j.id===initial.id);
  await until(()=>job.transferred>0,'first bytes');
  const pause=value=>js('window.amberDesktop.pauseDownload('+JSON.stringify(job.id)+','+value+')');
  await pause(true);assert.equal(job.networkPaused,true);
  await pause(false);
  window.minimize();await until(()=>window.isMinimized()&&js('document.hidden'),'hidden');
  const hiddenBytes=job.transferred;
  await proveBoth('minimized');await until(()=>job.transferred>hiddenBytes,'background bytes');
  window.restore();window.show();await until(()=>js('!document.hidden'),'visible');
  await proveBoth('restored');
  assert.deepEqual(report.visible,report.minimized);assert.deepEqual(report.visible,report.restored);
  // A second real install fails on its own controlled URL while the first one continues.
  const sourceDir=join(core.root,'instances',id), failedId='b0000000-0000-4000-8000-000000000008';
  const badDir=join(core.root,'instances',failedId),badMeta=JSON.parse(await readFile(join(sourceDir,'version.json')));
  badMeta.id='qa-failure';badMeta.downloads.client.url+='-missing';
  await mkdir(badDir);
  const encoded=JSON.stringify(badMeta);
  await writeFile(join(badDir,'version.json'),encoded);
  const original=JSON.parse(await readFile(join(sourceDir,'instance.json')));
  await writeFile(join(badDir,'instance.json'),JSON.stringify({...original,id:failedId,name:'QA failure',game:badMeta.id,metadataSha1:createHash('sha1').update(encoded).digest('hex')}));
  const failed=await js('window.amberDesktop.install('+JSON.stringify(failedId)+')');
  assert.equal(job.state,'running');
  await until(()=>core.jobs.find(row=>row.id===failed.id)?.state==='failed','independent failure');
  await until(()=>js("Array.from(document.querySelectorAll('.setup-task')).some(e=>e.textContent.includes('QA failure') && /安装需要处理|needs attention/i.test(e.textContent))"),'failure displayed',4000);
  assert.equal(job.state,'running');
  report.concurrentFailure=true;
  await js('window.amberDesktop.cancel('+JSON.stringify(job.id)+')');
  await until(()=>job.state==='cancelled','cancelled');
  await until(()=>js("Array.from(document.querySelectorAll('.setup-task')).some(e=>e.textContent.includes('Controlled download') && /安装尚未完成|incomplete/i.test(e.textContent))"),'cancel displayed',4000);
  report.pauseResumeCancel=true;
 }catch(e){report.error=[e.stack,JSON.stringify(logs),rooms.current?.tail?.slice(-900),sakura.workers.get('local-qa')?.current?.tail?.slice(-900)].join('\n');}
 finally{
  await sakura.stop().catch(()=>{});await rooms.leave().catch(()=>{});
  for(const p of children){if(p.exitCode===null&&p.signalCode===null)p.kill();}
  echo.closeAllConnections();echo.close();
  await writeFile(process.env.AMBER_BENCH_REPORT,JSON.stringify(report,null,2));app.exit(report.error?1:0);
 }
}
