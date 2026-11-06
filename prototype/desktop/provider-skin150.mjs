// SPDX-License-Identifier: MPL-2.0
import {randomUUID} from 'node:crypto';
import {serverURL} from './accounts.mjs';
import {skinDimensions} from './offline135.mjs';
import {responseText} from './bounded-io.mjs';
export async function providerSkinCapability150(accounts,id){
 const a=accounts.data.accounts.find(a=>a.id===id&&a.type==='yggdrasil');if(!a)throw Error('Third-party account not found / 找不到第三方账号');
 const base=serverURL(a.server);if(!/^[a-f0-9]{32}$/i.test(a.uuid))throw Error('Invalid profile / 角色无效');
 const profile=await accounts.request(base+'sessionserver/session/minecraft/profile/'+a.uuid+'?unsigned=false');
 const types=profile.properties?.find(p=>p.name==='uploadableTextures')?.value;
 return {supported:profile.id===a.uuid&&typeof types==='string'&&types.split(',').map(t=>t.trim()).includes('skin'),origin:new URL(base).origin};
}
export async function uploadProviderSkin150(accounts,id,png,model){
 if(!['default','slim'].includes(model)||!Buffer.isBuffer(png)||png.length>1_000_000)throw Error('Invalid skin / 皮肤无效');const d=skinDimensions(png);if(model==='slim'&&d.height!==64)throw Error('窄手臂皮肤需要 64×64');
 return accounts.exclusive(async()=>{
  const a=accounts.data.accounts.find(a=>a.id===id&&a.type==='yggdrasil');if(!a)throw Error('Third-party account not found / 找不到第三方账号');
  if(!(await providerSkinCapability150(accounts,id)).supported)throw Error('服务商未声明支持此角色的皮肤上传。');
  const base=serverURL(a.server),refreshed=await accounts.request(base+'authserver/refresh',{accessToken:a.accessToken,clientToken:a.clientToken,selectedProfile:{id:a.uuid,name:a.name},requestUser:true});if(refreshed.selectedProfile?.id!==a.uuid||typeof refreshed.accessToken!=='string'||!refreshed.accessToken||refreshed.accessToken.length>32000)throw Error('Invalid provider refresh / 服务商返回的身份刷新结果无效');a.accessToken=refreshed.accessToken;await accounts.save();
  const form=new FormData();form.set('model',model==='slim'?'slim':'');form.set('file',new Blob([png],{type:'image/png'}),'skin.png');let r;try{r=await accounts.fetcher(base+'api/user/profile/'+a.uuid+'/skin',{method:'PUT',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+a.accessToken},body:form});}catch{throw Error('皮肤上传结果未确认，请刷新服务商资料后再重试。');}await responseText(r,1_000_000);if(r.status!==204)throw Error('服务商皮肤上传失败（HTTP {0}）。'.replace('{0}',r.status));a.skinRevision=randomUUID();a.onlineSkinModel=model;await accounts.save();return accounts.list();
 });
}
