import {instanceLoaders,compareContentVersions} from './compatibility.mjs';
// SPDX-License-Identifier: MPL-2.0
import {officialFetch} from './download.mjs';
import {ContentApiSources} from './content-sources176.mjs';
import {confirmCurseForgeFile,confirmCurseForgeProject,curseForgeFileURL} from './curseforge-delivery176.mjs';
const classes={mod:6,resourcepack:12,modpack:4471,shader:6552,plugin:5},loaders={forge:1,fabric:4,quilt:5,neoforge:6};
export const cfProject=id=>/^cf-\d+$/.test(id||'');
export const cfVersion=id=>/^cf-\d+-\d+$/.test(id||'');
const number=v=>{if(!/^\d+$/.test(String(v)))throw Error('Invalid CurseForge ID');return String(v);};
const icon=u=>{try{const a=new URL(u);return a.protocol==='https:'&&a.hostname==='media.forgecdn.net'?a.href:null;}catch{return null;}};
export class CurseForge141{
 constructor(core,sources=new ContentApiSources(core,officialFetch)){Object.assign(this,{core,sources});}
 async request(path,options={}){
  const validate=path.startsWith('categories?')||path.startsWith('mods/search?')||/^mods\/\d+\/files\?/.test(path)
   ?value=>Array.isArray(value?.data):value=>!!value?.data&&typeof value.data==='object'&&!Array.isArray(value.data);
  return this.sources.json('curseforge',path,{...options,validate});
 }
 async project(id,options){
  const projectId=number(id.replace(/^cf-/,''));
  let host;
  const {data:p}=await this.request('mods/'+projectId,{...options,status:row=>{host=row.host;options?.status?.(row);}});
  if(String(p.id)!==projectId)throw Error('CurseForge returned a different project ID / CurseForge 返回了不同的项目 ID');
  const project={id:'cf-'+p.id,title:p.name,description:p.summary,project_type:Object.keys(classes).find(k=>classes[k]===p.classId),icon_url:icon(p.logo?.thumbnailUrl||p.logo?.url),slug:p.slug,website:p.links?.websiteUrl,server_side:'unknown',distribution:p.isAvailable===false?false:p.allowModDistribution};
  if(host==='api.curseforge.com')confirmCurseForgeProject(project,p);
  return project;
 }
 normalize(f){const hash=f.hashes?.find(h=>h.algo===1)?.value?.toLowerCase();return {id:`cf-${f.modId}-${f.id}`,project_id:'cf-'+f.modId,name:f.displayName,version_number:f.displayName,version_type:({1:'release',2:'beta',3:'alpha'})[f.releaseType]||'alpha',date_published:f.fileDate,game_versions:f.gameVersions||[],loaders:(f.gameVersions||[]).map(v=>v.toLowerCase()),files:[{primary:true,filename:f.fileName,url:f.isAvailable===false?null:curseForgeFileURL(f.downloadUrl),size:f.fileLength,hashes:{sha1:hash}}],dependencies:(f.dependencies||[]).filter(d=>[2,3,5].includes(d.relationType)).map(d=>({project_id:'cf-'+d.modId,dependency_type:({2:'optional',3:'required',5:'incompatible'})[d.relationType]}))};}
 async version(id,options){
  if(!cfVersion(id))throw Error('Invalid CurseForge file ID');
  const [,mod,file]=id.split('-');
  let host;
  const {data}=await this.request(`mods/${mod}/files/${file}`,{...options,status:row=>{host=row.host;options?.status?.(row);}});
  if(String(data.modId)!==mod||String(data.id)!==file)throw Error('CurseForge returned a different project or file ID / CurseForge 返回的项目或文件 ID 不匹配');
  const version=this.normalize(data);
  if(host==='api.curseforge.com')confirmCurseForgeFile(version.files[0],data);
  return version;
 }
 async versions(project,{game,loader}={},options){const id=number(project.replace(/^cf-/,'')),p=await this.project(project,options),rows=[];for(const accepted of (p.project_type==='mod'?instanceLoaders({loader}):[loader]))for(let index=0;index<5000;index+=50){const q=new URLSearchParams({pageSize:'50',index:String(index),...(game?{gameVersion:game}:{}),...(loaders[accepted]&&p.project_type==='mod'?{modLoaderType:String(loaders[accepted])}:{})});const r=await this.request(`mods/${id}/files?${q}`,options);rows.push(...r.data.map(f=>this.normalize(f)));if(r.data.length<50||index+50>=r.pagination?.totalCount)break;}return [...new Map(rows.map(v=>[v.id,v])).values()].filter(v=>(!game||v.game_versions.includes(game))&&(p.project_type!=='mod'||!loaders[loader]||instanceLoaders({loader}).some(l=>v.loaders.includes(l)))).sort((a,b)=>compareContentVersions(a,b,loader));}
 async categories(options){const r=await this.request('categories?gameId=432',options);return r.data.filter(c=>Object.values(classes).includes(c.classId)).map(c=>({name:String(c.id),title:c.name,project_type:Object.keys(classes).find(k=>classes[k]===c.classId)}));}
 async search(item,{query='',type='mod',category='',sort='relevance',offset=0}={},options){if(!classes[type])throw Error('Unsupported CurseForge content type');const q=new URLSearchParams({gameId:'432',classId:String(classes[type]),gameVersion:item.game,searchFilter:String(query).slice(0,200),index:String(Math.max(0,Math.min(9980,Number(offset)||0))),pageSize:'20',sortField:String(({relevance:1,downloads:6,follows:2,newest:11,updated:3})[sort]||1),sortOrder:'desc',...(category?{categoryId:number(category)}:{}),...(type==='mod'&&loaders[item.loader]?(item.loader==='quilt'?{modLoaderTypes:JSON.stringify([5,4])}:{modLoaderType:String(loaders[item.loader])}):{})});const r=await this.request('mods/search?'+q,options);return {hits:r.data.map(p=>({id:'cf-'+p.id,type,title:p.name,description:p.summary,author:p.authors?.map(a=>a.name).join(', '),icon:icon(p.logo?.thumbnailUrl||p.logo?.url),downloads:p.downloadCount})),total:Math.min(r.pagination?.totalCount||0,10000)};}
 async route(path,options){const [pathname,query='']=path.split('?'),parts=pathname.split('/');if(parts[0]==='version'&&cfVersion(parts[1]))return this.version(parts[1],options);if(parts[0]==='project'&&cfProject(parts[1])){if(parts[2]==='version'){const q=new URLSearchParams(query);return this.versions(parts[1],{game:JSON.parse(q.get('game_versions')||'[]')[0],loader:JSON.parse(q.get('loaders')||'[]')[0]},options);}return this.project(parts[1],options);}return undefined;}
}
