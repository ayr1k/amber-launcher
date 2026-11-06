// SPDX-License-Identifier: MPL-2.0
import components from './sakura142.json' with {type:'json'};
import {join} from 'node:path';
import {readFile,chmod,mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {StringDecoder} from 'node:string_decoder';
import {atomicJson} from './core.mjs';
import {download,digest,ensureParents} from './download.mjs';
const API='https://api.natfrp.com/v4/';
export function sakuraComponent(platform=process.platform,arch=process.arch){return components[platform+'-'+arch]||null;}
export function validateSakura(input){if(!input||!/^\d{1,12}$/.test(String(input.tunnel))||Number(input.tunnel)<1)throw Error('请输入有效隧道 ID / Invalid tunnel ID');if(input.token&&(!/^[\x21-\x7e]{8,256}$/.test(input.token)))throw Error('访问密钥格式无效 / Invalid access token');return {tunnel:String(input.tunnel)};}
export function sakuraEnvironment(config,parent=process.env){
 if(typeof config!=='string'||Buffer.byteLength(config)>16000||config.includes('\0')||!/^\s*\[common\]/m.test(config)||!/^\s*\[(?!common\])[^\]\r\n]+\]/m.test(config))throw Error('Sakura 返回的配置无效或过大 / Invalid or oversized Sakura configuration');
 const env=Object.fromEntries(Object.entries(parent).filter(([k,v])=>v!==undefined&&!/^(NATFRP_TOKEN|NATFRP_TARGET|AMBER_SAKURA_CONFIG)$/i.test(k)));
 env.AMBER_SAKURA_CONFIG=config;
 // Keep headroom for Windows CreateProcess and the single environment variable limit.
 if(process.platform==='win32'&&Object.entries(env).reduce((n,[k,v])=>n+k.length+String(v).length+2,1)>30000)throw Error('进程环境过大，请关闭后重试 / Process environment too large');
 return env;
}
export function sakuraFailure(text){
 if(/first record.*TLS|wrong version number|EPROTO/i.test(text))return 'Sakura 配置或节点的安全连接失败，请检查代理分流或点击“检查连接” / Sakura secure connection failed; check proxy routing or run connection checks';
 if(/x509|certificate|CERT_/i.test(text))return 'Sakura 证书验证失败，请检查网络代理和系统时间 / Sakura certificate validation failed; check proxy and system time';
 if(/401|403|密钥|token.*invalid|unauthorized/i.test(text))return 'Sakura 拒绝访问，请检查密钥、账号权限和隧道状态 / Sakura denied access; check token, permissions and tunnel status';
 return 'Sakura 连接未建立，请检查连接日志或点击“检查连接” / Sakura connection was not established; check the log or run connection checks';
}
export class Sakura142{
 constructor(core,servers,codec,{spawnProcess=spawn,startTimeout=45000}={}){this.core=core;this.servers=servers;this.codec=codec;this.root=join(core.root,'network-components','sakura142');this.component=sakuraComponent();this.current=null;this.busy=false;this.spawnProcess=spawnProcess;this.startTimeout=startTimeout;}
 get active(){return this.busy||this.stopping||!!this.current&&(!!this.current.child&&!this.current.exited||['starting','running','stopping'].includes(this.current.state));}
 path(){return join(this.root,'frpc'+(process.platform==='win32'?'.exe':''));}
 async config(){const p=join(this.root,'settings.json');await ensureParents(this.core.root,p);try{return JSON.parse(await readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return {bindings:{}};throw e;}}
 async state(id){const c=await this.config();let installed=false;try{await ensureParents(this.core.root,this.path());installed=(await digest(this.path(),'sha256'))===this.component?.hash;}catch{}const r=this.current;return {active:!!this.active,supported:!!this.component,installed,version:this.component?.version,hasToken:!!c.secret,binding:c.bindings?.[id]||null,run:r?{serverId:r.serverId,state:r.state,connected:r.connected,address:r.address,tail:r.tail,error:r.error||'',phase:r.phase,targetRunning:['running','starting'].includes(this.servers.runs.get(r.serverId)?.state)}:null};}
 async save(id,input){if(this.active)throw Error('请先停止 Sakura 隧道 / Stop the tunnel first');await this.servers.read(id);const binding=validateSakura(input),c=await this.config();if(input.clearToken)delete c.secret;else if(input.token){if(!await this.codec.isEncryptionAvailable())throw Error('系统安全存储不可用，无法保存密钥 / Secure storage unavailable');c.secret=(await this.codec.encryptString(input.token)).toString('base64');}c.bindings||={};c.bindings[id]=binding;await atomicJson(join(this.root,'settings.json'),c);return this.state(id);}
 async install(){if(!this.component)throw Error('此系统或架构暂无官方 Sakura 组件 / Unsupported platform');if(this.active||this.installing)throw Error('请等待或停止隧道 / Busy');this.installing=true;try{return this.core.startJob('sakura-component','network-component',async(job,signal)=>{try{await download({...this.component,path:this.path(),algorithm:'sha256',label:'Sakura Frp'},{root:this.core.root,fetcher:this.core.fetcher,signal,onBytes:n=>job.transferred+=n});if(process.platform!=='win32')await chmod(this.path(),0o755);}finally{this.installing=false;}});}catch(e){this.installing=false;throw e;}}
 async request(path,token,options={}){
  const r=await this.core.fetcher(API+path,{...options,redirect:'error',signal:AbortSignal.any([AbortSignal.timeout(20000),...(options.signal?[options.signal]:[])]),headers:{'User-Agent':'AMBER/1.4.2',...(token?{'Authorization':'Bearer '+token}:{}),...options.headers}});
  if(!r.ok)throw Error('Sakura 请求失败 / Request failed: '+r.status);
  const text=await r.text();if(text.length>2000000)throw Error('Sakura response too large');return text;
 }
 async api(path,token,signal){return JSON.parse(await this.request(path,token,{signal}));}
 async tunnelConfig(tunnel,token,signal){
  // Use the documented public API, not frpc's separate built-in API origin.
  const text=await this.request('tunnel/config',token,{signal,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({query:tunnel,frpc:this.component.version}).toString()});
  sakuraEnvironment(text);return text;
 }
 async diagnose(id){
  const checks=[];const check=async(name,fn)=>{try{await fn();checks.push({name,ok:true,message:'正常 / OK'});}catch(e){checks.push({name,ok:false,message:e.displayMessage||sakuraFailure(e.message)});}};
  await check('官方 API / Official API',async()=>{await this.api('system/clients');});
  await check('本机组件 / Native component',async()=>{const state=await this.state(id);if(!state.supported)throw Object.assign(Error('Unsupported platform'),{displayMessage:'当前系统暂无官方组件 / No official component for this platform'});if(!state.installed)throw Object.assign(Error('Component missing'),{displayMessage:'请先下载官方 Sakura 组件 / Download the official Sakura component first'});});
  await check('隧道配置 / Tunnel configuration',async()=>{const c=await this.config(),binding=c.bindings?.[id];if(!c.secret||!binding)throw Object.assign(Error('Missing token or tunnel'),{displayMessage:'请先保存访问密钥和当前实例的隧道 ID / Save an access token and this instance’s tunnel ID first'});await this.tunnelConfig(binding.tunnel,await this.codec.decryptString(Buffer.from(c.secret,'base64')));});
  return {ok:checks.every(c=>c.ok),checks};
 }
 async start(id){
  if(this.active||this.installing)throw Error('请先停止当前隧道 / Stop the current tunnel');this.busy=true;const controller=new AbortController(),signal=controller.signal;this.startController=controller;let done;this.startDone=new Promise(resolve=>done=resolve);let r,cleanup=async()=>{};
  try{
   if(!(await this.state(id)).installed)throw Error('请先下载官方组件 / Install the component first');
   signal.throwIfAborted();const c=await this.config(),binding=c.bindings?.[id];if(!c.secret||!binding)throw Error('请先保存访问密钥和隧道 ID / Save token and tunnel first');
   const token=await this.codec.decryptString(Buffer.from(c.secret,'base64'));
   const tunnels=await this.api('tunnels',token,signal),t=tunnels.find(x=>String(x.id)===binding.tunnel);const props=await this.servers.properties(id);
   if(!t||t.type!==(binding.protocol||'tcp')||t.status!==0||!['127.0.0.1','localhost','::1'].includes(t.local_ip)||Number(t.local_port)!==Number(binding.port||props.values['server-port']||25565))throw Error('请在 Sakura 官网核对隧道协议及本机目标端口 / Check the tunnel protocol and loopback target on Sakura');
   if(!['running','starting'].includes(this.servers.runs.get(id)?.state))throw Error('请先启动服务端 / Start the server first');
   const nodes=await this.api('nodes',token,signal),host=nodes[t.node]?.host;if(!host||!/^[\w.-]+$/.test(host)||!/^\d{1,5}$/.test(String(t.remote)))throw Error('无法确认公网地址 / Cannot confirm public endpoint');
   r={serverId:id,state:'starting',phase:'config',connected:false,address:host+':'+t.remote,tail:'',error:''};this.current=r;
   const config=await this.tunnelConfig(binding.tunnel,token,signal),env=sakuraEnvironment(config);signal.throwIfAborted();
   await ensureParents(this.core.root,join(this.root,'run-probe'));const runDir=await mkdtemp(join(this.root,'run-')),file=join(runDir,'frpc.ini');
   cleanup=async()=>{await unlink(file).catch(()=>{});await rmdir(runDir).catch(()=>{});};
   // The template contains no secret. Config and credentials exist only in child env.
   await writeFile(file,'{{ .Envs.AMBER_SAKURA_CONFIG }}\n',{flag:'wx',mode:0o600});
   signal.throwIfAborted();r.phase='connect';const child=this.spawnProcess(this.path(),['--config',file,'--disable_log_color','--no_check_update'],{cwd:runDir,windowsHide:true,stdio:['ignore','pipe','pipe'],env});delete env.AMBER_SAKURA_CONFIG;r.child=child;
   let raw='';const pending={out:'',err:''},decoders={out:new StringDecoder('utf8'),err:new StringDecoder('utf8')};const timer=setTimeout(()=>{if(!r.connected&&!['stopped','failed','stopping'].includes(r.state)){r.state='failed';r.error='Sakura 连接超时，请检查连接日志 / Sakura connection timed out; check the log';child.kill();}},this.startTimeout);timer.unref?.();
   const append=(b,source,flush=false)=>{const text=flush?decoders[source].end():decoders[source].write(b);raw=(raw+text).slice(-16000);r.tail=raw.replaceAll(token,'[secret]').replaceAll(config,'[configuration]').replace(/((?:user|token|password|secret|authorization)\s*[=:]\s*)[^\s;,\r\n]+/gi,'$1[secret]').slice(-6000);pending[source]=(pending[source]+text).slice(-16000);const lines=pending[source].split(/\r?\n/);pending[source]=flush?'':lines.pop();for(const line of lines){if(r.state==='stopping'||r.state==='failed')continue;if(/start proxy success|隧道启动成功|Your .+ proxy is available now/i.test(line)){r.connected=true;r.state='running';r.error='';clearTimeout(timer);}else if(/login.*fail|reconnect.*error|ctl connection read error|proxy.*closed|start error|隧道启动失败|连接节点失败|登录节点失败|控制连接读取失败/i.test(line)){r.connected=false;r.state='starting';}}};
   child.stdout.on('data',b=>append(b,'out'));child.stderr.on('data',b=>append(b,'err'));
   child.once('error',()=>{clearTimeout(timer);r.state='failed';r.error='无法启动 Sakura 组件，请重新下载 / Cannot start Sakura component; download it again';void cleanup();});
   child.once('close',()=>{append(null,'out',true);append(null,'err',true);clearTimeout(timer);child.stdout.removeAllListeners('data');child.stderr.removeAllListeners('data');r.exited=true;r.child=null;r.connected=false;const stopped=r.state==='stopping';r.state=stopped?'stopped':'failed';if(!stopped&&!r.error)r.error=sakuraFailure(r.tail);r.cleanupDone=cleanup();});
   return this.state(id);
  }catch(e){await cleanup();if(r){r.state=signal.aborted?'stopped':'failed';r.connected=false;r.error=signal.aborted?'':sakuraFailure(e.message);}throw e;}finally{this.busy=false;this.startController=null;done();}
 }
 async stop(){this.stopping=true;try{if(this.busy){this.startController?.abort(Error('Sakura 启动已取消 / Sakura startup cancelled'));await this.startDone;}const r=this.current;if(!r?.child||r.exited){await r?.cleanupDone;return;}r.state='stopping';await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error('组件仍在停止，请稍后重试 / Component is still stopping')),5000);r.child.once('close',()=>{clearTimeout(timer);ok();});r.child.kill();});await r.cleanupDone;}finally{this.stopping=false;}}
}
