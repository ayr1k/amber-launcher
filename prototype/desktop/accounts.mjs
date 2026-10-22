// SPDX-License-Identifier: MPL-2.0
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { atomicJson } from './core.mjs';
import { offlineUUID } from './vanilla.mjs';

import { authStage, authFailure } from './auth-errors.mjs';
import { MICROSOFT_CLIENT_ID } from './microsoft-config.mjs';

const MS='https://login.microsoftonline.com/consumers/oauth2/v2.0/';
export function serverURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('请输入皮肤站提供的 HTTPS API 根地址（不含查询参数）。');return u.href.replace(/\/?$/,'/');}
function profile(p){if(!p||! /^[a-f0-9]{32}$/i.test(p.id)||typeof p.name!=='string'||!p.name||p.name.length>64||/[\x00-\x1f]/.test(p.name))throw Error('认证服务没有返回有效角色。');return {id:p.id,name:p.name};}
function token(value){if(typeof value!=='string'||!value||value.length>32000)throw Error('认证服务没有返回有效令牌。');return value;}
export class Accounts {
 constructor(root,{codec,fetcher=fetch,now=Date.now}={}){this.root=root;this.codec=codec;this.fetcher=fetcher;this.now=now;this.data={clientId:MICROSOFT_CLIENT_ID,accounts:[]};this.device=null;this.busy=false;}
 async init(){try{const encrypted=JSON.parse(await readFile(join(this.root,'accounts.json'),'utf8'));this.data=JSON.parse(this.codec.decryptString(Buffer.from(encrypted.sealed,'base64')));this.data.clientId ||= MICROSOFT_CLIENT_ID;}catch(e){if(e.code!=='ENOENT')throw Error('无法解密账号库；请使用创建账号库的 Windows 用户。');}}
 async save(){if(!this.codec.isEncryptionAvailable())throw Error('系统凭据加密不可用，无法保存账号。');await atomicJson(join(this.root,'accounts.json'),{schema:1,sealed:this.codec.encryptString(JSON.stringify(this.data)).toString('base64')});}
 list(){return {clientId:this.data.clientId,defaultClientId:MICROSOFT_CLIENT_ID,accounts:this.data.accounts.map(a=>({id:a.id,type:a.type,name:a.name,server:a.server,profiles:a.profiles})),device:this.device?{state:this.device.state,code:this.device.code,url:this.device.url,expiresAt:this.device.expiresAt,error:this.device.error}:null};}
 async exclusive(fn){if(this.busy)throw Error('账号操作正在处理中。');this.busy=true;try{return await fn();}finally{this.busy=false;}}
 async request(url,body,{form=false,bearer}={}){
  let r;try{r=await this.fetcher(url,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Accept:'application/json',...(body?{'Content-Type':form?'application/x-www-form-urlencoded':'application/json'}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{}),...(url.includes('xboxlive.com')?{'x-xbl-contract-version':'1'}:{})},body:body?(form?new URLSearchParams(body).toString():JSON.stringify(body)):undefined});}catch{throw Error(authStage(url)+'连接失败，请检查网络与服务器地址。');}
  let data;try{const text=await r.text();if(text.length>1_000_000)throw Error();data=JSON.parse(text);}catch{throw Error(authStage(url)+'返回了无效响应（HTTP '+r.status+'）。');}
  if(!r.ok)throw authFailure(url,r.status,data);return data;
 }
 async configure(clientId){return this.exclusive(async()=>{clientId=clientId?.trim()||MICROSOFT_CLIENT_ID;if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(clientId))throw Error('请输入应用注册页的 Client ID。');this.device=null;this.data.clientId=clientId;await this.save();return this.list();});}
 async addOffline(name){return this.exclusive(async()=>{if(!/^[A-Za-z0-9_]{3,16}$/.test(name))throw Error('离线名称应为 3–16 个字母、数字或下划线。');this.data.accounts.push({id:randomUUID(),type:'offline',name,uuid:offlineUUID(name)});await this.save();return this.list();});}
 async remove(id){return this.exclusive(async()=>{this.data.accounts=this.data.accounts.filter(a=>a.id!==id);await this.save();return this.list();});}
 async startMicrosoft(){return this.exclusive(async()=>{if(!this.data.clientId)throw Error('请先配置 AMBER 的微软 Client ID。');const d=await this.request(MS+'devicecode',{client_id:this.data.clientId,scope:'XboxLive.SignIn XboxLive.offline_access'},{form:true});const url=new URL(d.verification_uri);if(url.protocol!=='https:'||!['microsoft.com','www.microsoft.com','login.microsoftonline.com'].includes(url.hostname))throw Error('微软验证地址无效。');this.device={state:'pending',secret:token(d.device_code),code:d.user_code,url:url.href,clientId:this.data.clientId,expiresAt:this.now()+Math.min(Number(d.expires_in)||900,1800)*1000,interval:Math.max(Number(d.interval)||5,5)*1000,next:0};return this.list();});}
 cancelMicrosoft(){this.device=null;return this.list();}
 async pollMicrosoft(){if(this.busy)return this.list();return this.exclusive(async()=>{const d=this.device;if(!d||d.state!=='pending')return this.list();if(this.now()>=d.expiresAt){d.state='expired';return this.list();}if(this.now()<d.next)return this.list();d.next=this.now()+d.interval;
  try{const t=await this.request(MS+'token',{grant_type:'urn:ietf:params:oauth:grant-type:device_code',client_id:d.clientId,device_code:d.secret},{form:true});if(this.device!==d)return this.list();const identity=await this.microsoftIdentity(t.access_token);if(this.device!==d)return this.list();this.data.accounts=this.data.accounts.filter(a=>!(a.type==='microsoft'&&a.uuid===identity.uuid));this.data.accounts.push({id:randomUUID(),type:'microsoft',...identity,refreshToken:token(t.refresh_token),clientId:d.clientId});await this.save();d.state='done';delete d.secret;}
  catch(e){if(this.device===d){if(e.code==='slow_down'){d.interval+=5000;d.next=this.now()+d.interval;}else if(e.code!=='authorization_pending'){d.state='failed';d.error=e.message;delete d.secret;}}}return this.list();});}
 async microsoftIdentity(access){
  const x=await this.request('https://user.auth.xboxlive.com/user/authenticate',{Properties:{AuthMethod:'RPS',SiteName:'user.auth.xboxlive.com',RpsTicket:'d='+token(access)},RelyingParty:'http://auth.xboxlive.com',TokenType:'JWT'});
  const s=await this.request('https://xsts.auth.xboxlive.com/xsts/authorize',{Properties:{SandboxId:'RETAIL',UserTokens:[token(x.Token)]},RelyingParty:'rp://api.minecraftservices.com/',TokenType:'JWT'});
  const u=s.DisplayClaims?.xui?.[0];if(!u?.uhs)throw Error('Xbox 账号尚未就绪，请检查 Xbox 个人资料或家庭设置。');
  const m=await this.request('https://api.minecraftservices.com/launcher/login',{xtoken:`XBL3.0 x=${u.uhs};${token(s.Token)}`,platform:'PC_LAUNCHER'});
  const accessToken=token(m.access_token);const entitlements=await this.request('https://api.minecraftservices.com/entitlements/mcstore',null,{bearer:accessToken});if(!entitlements.items?.some(i=>['game_minecraft','product_minecraft'].includes(i.name)))throw Error('此账号未返回 Minecraft Java 版所有权。');
  const p=profile(await this.request('https://api.minecraftservices.com/minecraft/profile',null,{bearer:accessToken}));return {name:p.name,uuid:p.id,accessToken,xuid:u.xid||''};
 }
 async addServer({server,username,password}){return this.exclusive(async()=>{server=serverURL(server);if(typeof username!=='string'||!username||typeof password!=='string'||!password)throw Error('请输入皮肤站账号和密码。');const clientToken=randomUUID();const r=await this.request(server+'authserver/authenticate',{agent:{name:'Minecraft',version:1},username,password,clientToken,requestUser:true});const profiles=(r.availableProfiles||[r.selectedProfile]).map(profile);if(!profiles.length)throw Error('请先在皮肤站创建角色。');const p=r.selectedProfile?profile(r.selectedProfile):profiles[0];this.data.accounts.push({id:randomUUID(),type:'yggdrasil',name:p.name,uuid:p.id,server,clientToken:r.clientToken||clientToken,accessToken:token(r.accessToken),profiles});await this.save();return this.list();});}
 async selectProfile(id,profileId){return this.exclusive(async()=>{const a=this.data.accounts.find(a=>a.id===id),p=a?.profiles?.find(p=>p.id===profileId);if(!p)throw Error('找不到角色。');a.uuid=p.id;a.name=p.name;await this.save();return this.list();});}
 async identity(id){return this.exclusive(async()=>{const a=this.data.accounts.find(a=>a.id===id);if(!a)throw Error('请先选择账号。');if(a.type==='offline')return {name:a.name,uuid:a.uuid,accessToken:'0',type:'legacy'};
  if(a.type==='microsoft'){const t=await this.request(MS+'token',{grant_type:'refresh_token',client_id:a.clientId,refresh_token:a.refreshToken},{form:true});a.refreshToken=t.refresh_token?token(t.refresh_token):a.refreshToken;await this.save();const i=await this.microsoftIdentity(t.access_token);if(i.uuid!==a.uuid)throw Error('刷新后的账号身份不一致，请重新登录。');Object.assign(a,i);}
  else{const r=await this.request(serverURL(a.server)+'authserver/refresh',{accessToken:a.accessToken,clientToken:a.clientToken,selectedProfile:{id:a.uuid,name:a.name},requestUser:true});const p=profile(r.selectedProfile);if(p.id!==a.uuid)throw Error('服务器返回了不同角色，请重新登录。');a.accessToken=token(r.accessToken);a.name=p.name;}
  await this.save();return {name:a.name,uuid:a.uuid,accessToken:a.accessToken,type:a.type==='microsoft'?'msa':'mojang',server:a.server,clientId:a.clientId,xuid:a.xuid};});}
}
