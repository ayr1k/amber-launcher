// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {mkdtemp,readFile,access,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {Sakura142,sakuraEnvironment} from '../desktop/sakura142.mjs';

const secret='qa-test-secret-only';
const config='[common]\nserver_addr = qa.example\nserver_port = 7000\nuser = '+secret+'\n[qa-tunnel]\ntype = tcp\nlocal_ip = 127.0.0.1\nlocal_port = 25565\nremote_port = 32000\n';
class Child extends EventEmitter{
 constructor(){super();this.stdout=new PassThrough();this.stderr=new PassThrough();this.exitCode=null;this.signalCode=null;this.kills=0;this.autoClose=true;}
 kill(){this.kills++;if(this.autoClose)queueMicrotask(()=>this.finish());return true;}
 finish(code=0){if(this.exitCode!==null)return;this.exitCode=code;this.emit('close',code);}
}
async function fixture(t,{startTimeout=1000,onConfig}={}){
 const root=await mkdtemp(join(tmpdir(),'amber-sakura142-')),calls=[],spawned=[];
 const core={root,fetcher:async(url,options={})=>{options.signal?.throwIfAborted();calls.push({url,options});const path=new URL(url).pathname;
  if(path==='/v4/tunnels')return Response.json([{id:123,node:2,type:'tcp',status:0,local_ip:'127.0.0.1',local_port:25565,remote:32000}]);
  if(path==='/v4/nodes')return Response.json({2:{host:'qa.example'}});
  if(path==='/v4/tunnel/config')return onConfig?onConfig(options):new Response(config,{headers:{'Content-Type':'text/plain'}});
  throw Error('Unexpected API request '+path);
 }};
 const servers={runs:new Map([['qa',{state:'running'}]]),properties:async()=>({values:{'server-port':'25565'}})};
 const manager=new Sakura142(core,servers,{decryptString:async()=>secret},{startTimeout,spawnProcess:(path,args,options)=>{const child=new Child();spawned.push({path,args,options:{...options,env:{...options.env}},child});return child;}});
 manager.config=async()=>({secret:Buffer.from('encrypted-fixture').toString('base64'),bindings:{qa:{tunnel:'123'}}});
 manager.state=async()=>({installed:true,run:manager.current});
 t.after(async()=>{for(const s of spawned){s.child.autoClose=true;if(s.child.exitCode===null)s.child.finish();}await manager.current?.cleanupDone;await rm(root,{recursive:true,force:true});});
 return {root,calls,spawned,manager};
}

test('Sakura fetches official config and starts a secret-free template without legacy fetch variables',async t=>{
 const {manager,calls,spawned}=await fixture(t);await manager.start('qa');assert.equal(spawned.length,1);
 const req=calls.find(c=>c.url.endsWith('/tunnel/config'));assert.ok(req);assert.equal(req.url,'https://api.natfrp.com/v4/tunnel/config');assert.equal(req.options.method,'POST');assert.equal(req.options.redirect,'error');assert.equal(req.options.headers.Authorization,'Bearer '+secret);assert.equal(new URLSearchParams(req.options.body).get('query'),'123');assert.equal(new URLSearchParams(req.options.body).get('frpc'),manager.component.version);
 const {args,options}=spawned[0],file=args[args.indexOf('--config')+1];assert.ok(args.includes('--no_check_update'));assert.equal(options.env.AMBER_SAKURA_CONFIG,config);assert.equal(Object.keys(options.env).some(k=>/^NATFRP_(TOKEN|TARGET)$/i.test(k)),false);assert.equal(await readFile(file,'utf8'),'{{ .Envs.AMBER_SAKURA_CONFIG }}\n');assert.deepEqual(await readdir(dirname(file)),['frpc.ini']);
 spawned[0].child.stderr.write('token = '+secret+'\n');assert.equal(manager.current.tail.includes(secret),false);
 await manager.stop();assert.equal(manager.current.state,'stopped');assert.equal(manager.active,false);await assert.rejects(access(file),{code:'ENOENT'});await assert.rejects(access(dirname(file)),{code:'ENOENT'});
});

test('Sakura strips inherited credential targets case-insensitively and rejects malformed config',()=>{
 const env=sakuraEnvironment(config,{Path:'qa',natfrp_token:'stale',NATFRP_TARGET:'old',Amber_Sakura_Config:'old'});assert.deepEqual(Object.keys(env).sort(),['AMBER_SAKURA_CONFIG','Path']);assert.equal(env.AMBER_SAKURA_CONFIG,config);
 for(const value of ['{}','<html>failure</html>',config+'\0',config+'a'.repeat(16001)])assert.throws(()=>sakuraEnvironment(value,{}),/Invalid or oversized/);
});

test('Sakura can connect before target startup without claiming target readiness',async t=>{
 const {manager,spawned}=await fixture(t);manager.servers.runs.clear();await manager.start('qa');assert.equal(spawned.length,1);spawned[0].child.stdout.write('start proxy success\n');
 const state=await Sakura142.prototype.state.call(manager,'qa');assert.equal(state.run.connected,true);assert.equal(state.run.targetRunning,false);manager.servers.runs.set('qa',{state:'starting'});assert.equal((await Sakura142.prototype.state.call(manager,'qa')).run.targetRunning,false);
});

test('Sakura recognizes fragmented UTF-8 Chinese success and later disconnect/reconnect without stale success',async t=>{
 const {manager,spawned}=await fixture(t);await manager.start('qa');const child=spawned[0].child;
 child.stdout.write('[I] 连接节点成功, 运行 ID [qa]\n');assert.equal(manager.current.connected,false);
 const line=Buffer.from('[I] 隧道启动成功\n');child.stdout.write(line.subarray(0,5));assert.equal(manager.current.connected,false);child.stdout.write(line.subarray(5));assert.equal(manager.current.connected,true);assert.equal(manager.current.state,'running');
 child.stderr.write('[W] 控制连接读取失败: EOF\n');assert.equal(manager.current.connected,false);assert.equal(manager.current.state,'starting');
 child.stdout.write('[I] 等待重试\n');assert.equal(manager.current.connected,false);
 child.stdout.write('[I] start pro');assert.equal(manager.current.connected,false);child.stdout.write('xy success\n');assert.equal(manager.current.connected,true);assert.equal(manager.current.state,'running');
 child.stderr.write('[W] 重试连接节点失败: timeout\n');assert.equal(manager.current.connected,false);
 await manager.stop();
});

test('Sakura stop cancels config retrieval and cannot spawn afterwards',async t=>{
 let entered;const ready=new Promise(resolve=>entered=resolve);
 const {manager,spawned}=await fixture(t,{onConfig:options=>new Promise((resolve,reject)=>{entered();options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});})});
 const started=manager.start('qa').catch(e=>e);await ready;assert.equal(manager.active,true);await manager.stop();const error=await started;assert.match(error.message,/cancelled|取消/);assert.equal(spawned.length,0);assert.equal(manager.current.state,'stopped');assert.equal(manager.active,false);
});

test('Sakura timeout remains active until the child closes and cleans the template',async t=>{
 const {manager,spawned}=await fixture(t,{startTimeout:15});await manager.start('qa');const child=spawned[0].child;child.autoClose=false;const file=spawned[0].args[1];await delay(45);
 assert.equal(manager.current.state,'failed');assert.match(manager.current.error,/timed out/);assert.equal(child.kills,1);assert.equal(manager.active,true);await assert.rejects(manager.start('qa'),/Stop the current tunnel/);
 child.finish(1);await manager.current.cleanupDone;assert.equal(manager.active,false);await assert.rejects(access(file),{code:'ENOENT'});
});

test('Sakura config API failure never launches a process or stores a config',async t=>{
 const {manager,spawned,root}=await fixture(t,{onConfig:async()=>new Response('unavailable',{status:503})});await assert.rejects(manager.start('qa'),/503/);assert.equal(spawned.length,0);assert.equal(manager.current.state,'failed');assert.equal(manager.active,false);assert.deepEqual(await readdir(root),[]);
});
