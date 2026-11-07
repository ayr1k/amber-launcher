// SPDX-License-Identifier: MPL-2.0
// Display metadata only. Never send local names, paths or configuration to an API.
export function roomModIcon152(value,source){
 try{const u=new URL(value),host=source==='curseforge'?'media.forgecdn.net':source==='modrinth'?'cdn.modrinth.com':null;return host&&u.protocol==='https:'&&u.hostname===host&&!u.port&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export async function roomModDisplay152(content,saved,sha1,cache){
 const fallback={source:'unknown',icon:null};
 if(saved?.hash!==sha1||typeof saved.projectId!=='string'||!/^(?:cf-\d+|[a-zA-Z0-9]{1,64})$/.test(saved.projectId))return fallback;
 const source=saved.projectId.startsWith('cf-')?'curseforge':'modrinth',result={source,title:typeof saved.title==='string'?saved.title.slice(0,200):undefined,icon:null};
 try{
  let p=cache.get(saved.projectId);if(!p){p=await content.api('project/'+saved.projectId);if(p?.id!==saved.projectId)return result;cache.set(saved.projectId,p);}
  result.title=typeof p.title==='string'?p.title.slice(0,200):result.title;result.icon=roomModIcon152(p.icon_url,source);
  if(p.client_side==='unsupported')result.blocked='server-only';
  else if(source==='curseforge'&&p.distribution===false)result.blocked='restricted';
 }catch{/* Offline metadata and image failures must leave a stable, usable fallback. */}
 return result;
}
