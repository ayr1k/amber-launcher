// SPDX-License-Identifier: MPL-2.0
import {createServer} from 'node:http';
import {createHash,generateKeyPairSync,sign,randomBytes} from 'node:crypto';
export function offlineName(value){if(typeof value!=='string'||! /^[A-Za-z0-9_]{3,16}$/.test(value))throw Error('离线名称应为 3–16 个字母、数字或下划线。');return value;}
export function skinDimensions(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<33||bytes.length>1_000_000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')throw Error('请选择有效的 PNG 皮肤 / Select a valid PNG skin');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);if(width!==64||![32,64].includes(height))throw Error('皮肤尺寸应为 64×64 或 64×32 / Skin must be 64×64 or 64×32');return {width,height};
}
// A local texture endpoint only. It never authenticates a user or joins online servers.
export async function startSkinBridge(identity,skin,{onRequest=()=>{}}={}){
 const bytes=Buffer.from(skin.png,'base64');skinDimensions(bytes);
 const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:4096}),secret=randomBytes(24).toString('hex'),hash=createHash('sha256').update(bytes).digest('hex');
 let base;const server=createServer((req,res)=>{
  onRequest(req.method,req.url?.replace(secret,'[session]'));
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  if(req.method!=='GET'||!req.url?.startsWith('/'+secret+'/')){reply(403,{error:'ForbiddenOperationException'});return;}
  const path=req.url.slice(secret.length+2).split('?')[0];
  if(!path){reply(200,{meta:{serverName:'AMBER local skin','feature.non_email_login':true},skinDomains:['127.0.0.1'],signaturePublickey:publicKey.export({type:'spki',format:'pem'})});return;}
  if(path==='discovery'){const endpoints=values=>({endpoints:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,typeof v==='string'?{uri:base+v}:v]))});reply(200,{environment:'amber-local-skin',product:'minecraft',discovery:{product:'minecraft',authentication:endpoints({getPublicKeys:'publickeys'}),session:endpoints({getProfileById:'sessionserver/session/minecraft/profile/{profileId}',join:'denied',verify:'denied'}),profiles:endpoints({getTexture:{uri:base+'textures/{textureId}',validUris:[base+'textures/{textureId}']}}),player:endpoints({}),telemetry:endpoints({})}});return;}
  if(path==='publickeys'){reply(200,{profilePropertyKeys:[{publicKey:publicKey.export({type:'spki',format:'der'}).toString('base64')}],playerCertificateKeys:[]});return;}
  if(path==='textures/'+hash){res.writeHead(200,{'Content-Type':'image/png','Content-Length':bytes.length});res.end(bytes);return;}
  if(path==='sessionserver/session/minecraft/profile/'+identity.uuid){const value=Buffer.from(JSON.stringify({timestamp:Date.now(),profileId:identity.uuid,profileName:identity.name,textures:{SKIN:{url:base+'textures/'+hash,metadata:{model:skin.model}}}})).toString('base64');reply(200,{id:identity.uuid,name:identity.name,properties:[{name:'textures',value,signature:sign('RSA-SHA1',Buffer.from(value),privateKey).toString('base64')}]});return;}
  reply(404,{error:'NotFound'});
 });server.requestTimeout=5000;server.headersTimeout=5000;
 await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
 base=`http://127.0.0.1:${server.address().port}/${secret}/`;server.unref();return {url:base,close:()=>{server.close();server.closeAllConnections();}};
}
