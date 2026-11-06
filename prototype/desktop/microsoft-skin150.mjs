// SPDX-License-Identifier: MPL-2.0
import {randomUUID} from 'node:crypto';
import {skinDimensions} from './offline135.mjs';
import {responseText} from './bounded-io.mjs';
export async function uploadMicrosoftSkin150(accounts,id,png,model){
 accounts.requireMicrosoft();
 if(!['default','slim'].includes(model))throw Error('Invalid skin model / 皮肤模型无效');
 if(!Buffer.isBuffer(png)||png.length>1_000_000)throw Error('Invalid skin file / 皮肤文件无效');
 const dimensions=skinDimensions(png);if(model==='slim'&&dimensions.height!==64)throw Error('窄手臂皮肤需要 64×64');
 return accounts.exclusive(async()=>{
  const account=accounts.data.accounts.find(a=>a.id===id&&a.type==='microsoft');if(!account)throw Error('Microsoft account not found / 找不到微软账号');
  await accounts.refreshMicrosoft(account);
  const form=new FormData();form.set('variant',model==='slim'?'slim':'classic');form.set('file',new Blob([png],{type:'image/png'}),'skin.png');
  let response;try{response=await accounts.fetcher('https://api.minecraftservices.com/minecraft/profile/skins',{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+account.accessToken},body:form});}catch{throw Error('皮肤上传结果未确认，请刷新官方资料后再重试。');}
  const text=await responseText(response,1_000_000);
  if(!response.ok)throw Error('官方皮肤上传失败（HTTP {0}）。'.replace('{0}',response.status));
  let profile;try{profile=JSON.parse(text);}catch{throw Error('官方响应无法确认，请刷新账号皮肤。');}
  if(profile.id!==account.uuid||!Array.isArray(profile.skins)||!profile.skins.some(s=>s.state==='ACTIVE'))throw Error('官方响应无法确认，请刷新账号皮肤。');
  account.skinRevision=randomUUID();account.onlineSkinModel=model;
  await accounts.save();return accounts.list();
 });
}
