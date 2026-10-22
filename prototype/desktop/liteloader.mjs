// SPDX-License-Identifier: MPL-2.0
import { officialFetch, safePath, ensureParents } from './download.mjs';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const {unzipSync}=createRequire(import.meta.url)('./vendor/fflate.cjs');
const identity=v=>v.build||v.version;
const ivyInstallers={'1.7.10':{version:'1.7.10_04',file:'liteloader-1.7.10.jar',url:'https://dl.liteloader.com/redist/1.7.10/liteloader-installer-1.7.10-04.jar'},'1.8':{version:'1.8',file:'liteloader-1.8.jar',url:'https://dl.liteloader.com/redist/1.8.0/liteloader-installer-1.8.0-00.jar'}};
const indexURL='https://dl.liteloader.com/versions/versions.json';
async function data(game,fetcher){const r=await officialFetch(indexURL,{fetcher,signal:AbortSignal.timeout(30000)});return (await r.json()).versions?.[game];}
export async function liteVersions(game,fetcher){const entry=await data(game,fetcher);if(!entry||entry.repo.type==='ivy'&&!ivyInstallers[game])return [];return ['artefacts','snapshots'].flatMap(stream=>[entry[stream]?.['com.mumfrey:liteloader']?.latest].filter(Boolean)).filter((v,i,a)=>identity(v)&&a.findIndex(x=>identity(x)===identity(v))===i).map(v=>({version:identity(v),stable:v.stream!=='SNAPSHOT'}));}
async function library(name,base,fetcher,signal){
 base=base.replace('https://dl.liteloader.com/repo/','https://repo.mumfrey.com/content/repositories/liteloader/');
 const [group,artifact,version,classifier]=name.split(':'),dir=`${group.replaceAll('.','/')}/${artifact}/${version}/`;let fileVersion=version;
 if(version.endsWith('-SNAPSHOT')){const xml=await (await officialFetch(base+dir+'maven-metadata.xml',{fetcher,signal})).text();const timestamp=xml.match(/<timestamp>([^<]+)<\/timestamp>/)?.[1],build=xml.match(/<buildNumber>([^<]+)<\/buildNumber>/)?.[1];if(timestamp&&build)fileVersion=version.replace('SNAPSHOT',timestamp+'-'+build);}
 const url=base+dir+artifact+'-'+fileVersion+(classifier?'-'+classifier:'')+'.jar',sha1=(await(await officialFetch(url+'.sha1',{fetcher,signal})).text()).trim().split(/\s/)[0];if(!/^[a-f0-9]{40}$/.test(sha1))throw Error('LiteLoader 依赖缺少 SHA-1 校验。');return {name,downloads:{artifact:{path:dir+artifact+'-'+version+(classifier?'-'+classifier:'')+'.jar',url,sha1}}};
}
export async function liteProfile(game,version,fetcher,signal,root){
 const entry=await data(game,fetcher);let selected,stream;
 for(const key of ['artefacts','snapshots'])for(const v of Object.values(entry?.[key]?.['com.mumfrey:liteloader']||{}))if(identity(v)===version){selected=v;stream=entry[key];}
 if(!selected)throw Error('没有适配此游戏版本的 LiteLoader。');
 const libs=new Map();for(const l of [...(stream.libraries||[]),...(selected.libraries||[])])libs.set(l.name.split(':').slice(0,2).join(':'),l);
 const libraries=[];for(const l of libs.values())libraries.push(await library(l.name,(l.url||(l.name.startsWith('org.ow2.asm:')?'https://repo.maven.apache.org/maven2/':'https://libraries.minecraft.net/')).replace(/^http:/,'https:'),fetcher,signal));
 if(entry.repo.type==='ivy'){
  const source=ivyInstallers[game];if(!source||selected.version!==source.version||!root)throw Error('此历史 LiteLoader 发行版暂不支持自动安装');
  // The retired Ivy binary URLs no longer resolve. The official installer still
  // embeds the release JAR; validate it against the official manifest before caching.
  const response=await officialFetch(source.url,{fetcher,signal});
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length>20000000)throw Error('LiteLoader 安装器过大');
  const file=unzipSync(bytes,{filter:f=>f.name===source.file&&f.originalSize<20000000})[source.file];
  if(!file||createHash('md5').update(file).digest('hex')!==selected.md5)throw Error('LiteLoader 历史发行文件校验失败');
  const sha1=createHash('sha1').update(file).digest('hex'),cache=safePath(root,'loader-cache/'+sha1);await ensureParents(root,cache);await writeFile(cache,file);
  libraries.push({name:'com.mumfrey:liteloader:'+selected.version,downloads:{artifact:{path:`com/mumfrey/liteloader/${selected.version}/liteloader-${selected.version}.jar`,sha1,url:'amber-cache:'+sha1}}});
 }else libraries.push(await library('com.mumfrey:liteloader:'+selected.version+':release',entry.repo.url.replace(/^http:/,'https:'),fetcher,signal));
 return {amberFormat:1,mainClass:'net.minecraft.launchwrapper.Launch',libraries,arguments:{game:['--tweakClass',selected.tweakClass]}};
}
