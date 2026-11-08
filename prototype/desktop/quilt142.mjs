import {join,delimiter} from 'node:path';
import {readFile} from 'node:fs/promises';
import {atomicJson} from './core.mjs';
import {download,safePath,ensureParents,digest} from './download.mjs';
// SPDX-License-Identifier: MPL-2.0
import {officialFetch} from './download.mjs';
export async function quiltVersions(game,fetcher=fetch){const r=await officialFetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(game)}`,{fetcher,signal:AbortSignal.timeout(30000)});return (await r.json()).map(v=>({version:v.loader.version,stable:!/-/.test(v.loader.version)})).sort((a,b)=>Number(b.stable)-Number(a.stable)||b.version.localeCompare(a.version,undefined,{numeric:true}));}
export async function quiltProfile(game,version,fetcher=fetch,signal,side='client'){
 if(!(await quiltVersions(game,fetcher)).some(v=>v.version===version))throw Error('Quilt version unavailable / 此 Quilt 版本不可用');
 const r=await officialFetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(game)}/${encodeURIComponent(version)}/${side==='server'?'server':'profile'}/json`,{fetcher,signal});const p=await r.json();
 if(p.inheritsFrom!==game||!['org.quiltmc.loader.impl.launch.knot.KnotClient','org.quiltmc.loader.impl.launch.knot.KnotServer'].includes(p.mainClass))throw Error('Unsupported Quilt profile');
 for(const lib of p.libraries){if(!/^[\w.\-]+:[\w.\-]+:[\w.+\-]+$/.test(lib.name)||!['https://maven.quiltmc.org/repository/release/','https://maven.fabricmc.net/','https://libraries.minecraft.net/'].includes(lib.url))throw Error('Unsupported Quilt library');const [g,n,v]=lib.name.split(':');lib.path=`${g.replaceAll('.','/')}/${n}/${v}/${n}-${v}.jar`;lib.sha1||=(await(await officialFetch(lib.url+lib.path+'.sha1',{fetcher,signal})).text()).trim();if(!/^[a-f0-9]{40}$/i.test(lib.sha1))throw Error('Quilt library checksum missing');}return p;
}

export async function installQuiltServer(core,dir,game,signal,selected){
 const choices=await quiltVersions(game,core.fetcher),version=selected||(choices.find(v=>v.stable)||choices[0])?.version;if(!choices.some(v=>v.version===version))throw Error('Selected Quilt loader unavailable / 所选 Quilt 版本不可用');
 const profile=await quiltProfile(game,version,core.fetcher,signal,'server');const files=[];
 for(const lib of profile.libraries){const relative='.quilt142/libraries/'+lib.path,path=safePath(dir,relative);await download({url:lib.url+lib.path,hash:lib.sha1,algorithm:'sha1',path,label:lib.name},{root:core.root,fetcher:core.fetcher,signal});files.push({relative,hash:lib.sha1});}
 await atomicJson(join(dir,'.quilt142','launch.json'),{version,files});return version;
}
export async function quiltServerArguments(dir){const p=safePath(dir,'.quilt142/launch.json');await ensureParents(dir,p);const data=JSON.parse(await readFile(p,'utf8'));if(!Array.isArray(data.files)||!data.files.length||data.files.length>100)throw Error('Repair Quilt server / 请修复 Quilt 核心');const paths=[];for(const f of data.files){if(!f.relative.startsWith('.quilt142/libraries/'))throw Error('Invalid Quilt path');const path=safePath(dir,f.relative);await ensureParents(dir,path);if(await digest(path)!==f.hash)throw Error('Quilt library changed; repair core / Quilt 库已改变，请修复核心');paths.push(path);}return ['-cp',paths.join(delimiter),'org.quiltmc.loader.impl.launch.server.QuiltServerLauncher','nogui'];}
