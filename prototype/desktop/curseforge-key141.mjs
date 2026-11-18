// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
export async function curseKey141(){const env=process.env.AMBER_CURSEFORGE_API_KEY;if(env)return env;try{return JSON.parse(await readFile(new URL('./curseforge-build-key.json',import.meta.url),'utf8')).key||'';}catch{return '';}}
export async function curseHeaders141(url,{authorizedEdgeFile=false}={}){
 const target=new URL(url);
 if(target.origin!=='https://api.curseforge.com'&&!(authorizedEdgeFile&&target.origin==='https://edge.forgecdn.net'&&/^\/files\/\d+\/\d+\/[^/]+$/.test(target.pathname)))return {};
 const key=await curseKey141();
 if(typeof key!=='string'||!key.trim())throw Object.assign(Error('CurseForge access is missing from this build. Install the official package if you need CurseForge. / 此构建未配置 CurseForge 访问，请使用官方安装包后重试。'),{code:'CURSEFORGE_CONFIG'});
 return {'x-api-key':key};
}
