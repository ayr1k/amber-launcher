// SPDX-License-Identifier: MPL-2.0
import { officialFetch, safePath } from './download.mjs';

export async function fabricVersions(game,fetcher=fetch){
 const r=await officialFetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(game)}`,{fetcher,signal:AbortSignal.timeout(30000)});
 return (await r.json()).map(v=>({version:v.loader.version,stable:!!v.loader.stable}));
}
export async function fabricProfile(game,version,fetcher=fetch,signal){
 if(!(await fabricVersions(game,fetcher)).some(v=>v.version===version))throw Error('此 Fabric 版本不支持所选游戏。');
 const r=await officialFetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(game)}/${encodeURIComponent(version)}/profile/json`,{fetcher,signal});
 const p=await r.json();
 if(p.inheritsFrom!==game||p.mainClass!=='net.fabricmc.loader.impl.launch.knot.KnotClient')throw Error('Fabric 配置不受支持。');
 for(const lib of p.libraries){
  if(!/^[\w.\-]+:[\w.\-]+:[\w.+\-]+$/.test(lib.name)||lib.url!=='https://maven.fabricmc.net/')throw Error('Fabric 依赖地址不受支持。');
  const [group,name,v]=lib.name.split(':');lib.path=`${group.replaceAll('.','/')}/${name}/${v}/${name}-${v}.jar`;
  lib.sha1 ||= (await (await officialFetch(lib.url+lib.path+'.sha1',{fetcher,signal})).text()).trim();
  if(!/^[a-f0-9]{40}$/.test(lib.sha1))throw Error('Fabric 依赖缺少有效校验值。');
 }
 return p;
}
export function withFabric(meta,profile){
 if(!profile)return meta;
 const replaced=new Set(profile.libraries.map(l=>l.name.split(':').slice(0,2).join(':')));
 const libraries=(meta.libraries||[]).filter(l=>!replaced.has(l.name.split(':').slice(0,2).join(':')));
 for(const l of profile.libraries)libraries.push({name:l.name,downloads:{artifact:{path:l.path,url:l.url+l.path,sha1:l.sha1,size:l.size}}});
 // Keep the base id and client descriptor: Fabric inherits the official client/assets.
 return {...meta,libraries,mainClass:profile.mainClass,arguments:{jvm:[...(meta.arguments?.jvm||['-Djava.library.path=${natives_directory}','-cp','${classpath}']),...(profile.arguments?.jvm||[])],game:[...(meta.arguments?.game||meta.minecraftArguments?.split(' ')||[]),...(profile.arguments?.game||[])]}};
}
