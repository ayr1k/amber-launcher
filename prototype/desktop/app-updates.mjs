// SPDX-License-Identifier: MPL-2.0
import {updateAssetName} from './platform135.mjs';
import {atomicJson} from './core.mjs';
import {PRODUCT_NAME,REPOSITORY_NAME} from './edition.mjs';
import {mkdir,readFile,writeFile,copyFile,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {responseText} from './bounded-io.mjs';
import {download,verified,ensureParents} from './download.mjs';
import {requireSpace} from './safe-copy.mjs';
const repositories=Object.freeze({AMBER:'https://github.com/ayr1k/amber-launcher',AmberE:'https://github.com/ayr1k/AmberE'});
export function compareVersions(a,b){
  const parse=v=>{const m=/^v?(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/.exec(v);if(!m)throw Error('不支持的版本号。');return [+m[1],+m[2],+m[3],m[4]?{alpha:0,beta:1,rc:2}[m[4]]:3,+(m[5]||0)];};
  const x=parse(a),y=parse(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;
}
export function releaseCandidate(releases,current,product=PRODUCT_NAME,channel=current.includes('-')?'preview':'stable',platform=process.platform,arch=process.arch){
  const repository=repositories[product];if(!repository)return null;
  if(!['stable','preview'].includes(channel))throw Error('更新通道无效。');
  return releases.filter(r=>!r.draft&&(channel==='preview'||!r.prerelease&&/^v?\d+\.\d+\.\d+$/.test(r.tag_name))).filter(r=>{try{return compareVersions(r.tag_name,current)>0;}catch{return false;}})
    .sort((a,b)=>compareVersions(b.tag_name,a.tag_name)).map(r=>{
      const version=r.tag_name.replace(/^v/,'');
      const name=updateAssetName(product,version,platform,arch);if(!name)return null;
      const asset=r.assets?.find(a=>a.name===name&&a.state==='uploaded');
      if(!asset||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>800_000_000||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))return null;
      if(asset.browser_download_url!==`${repository}/releases/download/${r.tag_name}/${name}`)return null;
      return {version,name,url:asset.browser_download_url,size:asset.size,hash:asset.digest.slice(7),notes:String(r.body||'').slice(0,60000),page:`${repository}/releases/tag/${r.tag_name}`};
    }).find(Boolean)||null;
}
// Protocol 1: GitHub authorizes metadata; the selected source supplies bytes.
// The public mirror index is deliberately NOT an update authority.
export const MIRROR_ORIGIN='https://amber.ayuki-ayr1k.com';
const sources=['github','official-hk'],channels=['stable','preview'];
const supported=(p,a)=>p==='win32'&&a==='x64'||p==='darwin'&&['x64','arm64'].includes(a)||p==='linux'&&a==='x64';
const identity=['version','name','url','size','hash','source'];
export function mirrorURL(f,product=PRODUCT_NAME,platform=process.platform,arch=process.arch){
  if(!Object.hasOwn(repositories,product)||!/^\d+\.\d+\.\d+$/.test(f.version)||f.name!==updateAssetName(product,f.version,platform,arch)||!supported(platform,arch))throw Error('镜像不支持此产品、版本或平台。');
  return `${MIRROR_ORIGIN}/mirror/v1/${product.toLowerCase()}/${f.version}/${f.name}`;
}
export class AppUpdates{
  constructor(userData,current,{fetcher=fetch,platform=process.platform,arch=process.arch,now=Date.now}={}){
    this.root=join(userData,'updates');this.channelFile=join(userData,'update-channel.json');
    this.channel=current.includes('-')?'preview':'stable';this.source='github';this.current=current;
    this.fetcher=fetcher;this.platform=platform;this.arch=arch;this.now=now;this.state={phase:'idle'};this.candidate=null;this.locked=false;
  }
  async init(){try{const v=JSON.parse(await readFile(this.channelFile,'utf8'));
    if(!channels.includes(v.channel)||v.source!==undefined&&!sources.includes(v.source))throw Error('更新设置无效。');
    this.channel=v.channel;this.source=v.source??'github';
  }catch(e){if(e.code!=='ENOENT')this.state={phase:'failed',error:'更新设置无效。'};}return this;}
  snapshot(){return {...this.state,channel:this.channel,source:this.source};}
  async setChannel(channel){if(!channels.includes(channel))throw Error('更新通道无效。');return this.configure({channel});}
  async setSource(source){if(!sources.includes(source))throw Error('更新源无效。');return this.configure({source});}
  async configure(change){
    if(this.locked||['checking','downloading'].includes(this.state.phase))throw Error('请先等待检查或取消下载。');
    this.locked=true;
    try{const next={schema:2,channel:this.channel,source:this.source,...change};await atomicJson(this.channelFile,next);
      this.channel=next.channel;this.source=next.source;this.candidate=null;this.state={phase:'idle'};return this.snapshot();
    }finally{this.locked=false;}
  }
  async metadataFetch(url,options={},signal){
    signal?.throwIfAborted();
    const combined=AbortSignal.any([AbortSignal.timeout(20000),...(signal?[signal]:[])]);
    const response=await this.fetcher(url,{...options,signal:combined});
    combined.throwIfAborted();
    return response;
  }
  async catalogue(signal){
    const read=async suffix=>{const r=await this.metadataFetch(`https://api.github.com/repos/${REPOSITORY_NAME}/releases${suffix}`,{redirect:'error',cache:'no-store',headers:{Accept:'application/vnd.github+json','User-Agent':PRODUCT_NAME+'/'+this.current}},signal);
      if(!r.ok)throw Error('无法从 GitHub 获取可信更新信息，请重试；镜像不能替代版本与摘要验证。');
      const body=await responseText(r,2_000_000);signal?.throwIfAborted();return JSON.parse(body);};
    const data=await read('?per_page=30');if(!Array.isArray(data))throw Error('更新目录格式无效。');
    if(this.channel==='stable'){
      const r=await this.metadataFetch(`https://api.github.com/repos/${REPOSITORY_NAME}/releases/latest`,{redirect:'error',cache:'no-store',headers:{Accept:'application/vnd.github+json'}},signal);
      if(r.ok)data.unshift(JSON.parse(await responseText(r,2_000_000)));else if(r.status!==404)throw Error('无法从 GitHub 获取可信更新信息，请重试；镜像不能替代版本与摘要验证。');
    }
    signal?.throwIfAborted();return data;
  }
  async resolve(signal){
    const data=await this.catalogue(signal);signal?.throwIfAborted();
    // A newer release with missing assets/digests is not permission to use an older one.
    const eligible=data.filter(r=>r&&typeof r.tag_name==='string'&&!r.draft&&(this.channel==='preview'||!r.prerelease&&/^v?\d+\.\d+\.\d+$/.test(r.tag_name))).filter(r=>{try{return compareVersions(r.tag_name,this.current)>0;}catch{return false;}}).sort((a,b)=>compareVersions(b.tag_name,a.tag_name));
    if(!eligible.length)return null;
    const file=releaseCandidate([eligible[0]],this.current,PRODUCT_NAME,this.channel,this.platform,this.arch);
    if(!file)throw Error('新版本缺少兼容安装包或可信摘要，请重试或查看 Release。');
    if(this.source==='official-hk'){
      file.url=mirrorURL(file,PRODUCT_NAME,this.platform,this.arch);
      const r=await this.metadataFetch(file.url,{method:'HEAD',redirect:'error',cache:'no-store',headers:{'Accept-Encoding':'identity'}},signal);
      if(r.status!==200||r.headers.get('content-length')!==String(file.size))throw Error('镜像尚未同步或暂不可用，请重试或手动切换 GitHub 源。');
    }
    return {...file,source:this.source,checkedAt:this.now()};
  }
  async check(){
    if(this.locked||['checking','downloading'].includes(this.state.phase))throw Error('正在检查或下载安装包，请稍候。');
    this.candidate=null;this.state={phase:'checking'};
    try{
      if(!supported(this.platform,this.arch))throw Error('此平台或架构暂不支持软件内更新，请使用官网下载。');
      if(this.source==='official-hk'&&this.channel!=='stable')throw Error('香港镜像仅支持稳定版；请切换通道或更新源。');
      this.candidate=await this.resolve();this.state={phase:this.candidate?'available':'current',release:this.candidate};return this.snapshot();
    }catch(e){this.state={phase:'failed',error:e.message};throw e;}
  }
  async download(){
    if(this.locked||!this.candidate||['checking','downloading'].includes(this.state.phase))throw Error('请先检查更新，或等待当前下载结束。');
    const file=this.candidate,controller=new AbortController();this.controller=controller;this.state={phase:'downloading',release:file,transferred:0};
    try{
      const fresh=await this.resolve(controller.signal);controller.signal.throwIfAborted();
      if(!fresh||identity.some(k=>fresh[k]!==file[k])){this.candidate=null;throw Error('更新信息已变化，请重新检查更新。');}
      await mkdir(this.root,{recursive:true});await requireSpace(this.root,file.size*2);controller.signal.throwIfAborted();
      const fetcher=async(url,options)=>{
        if(file.source==='official-hk'&&url!==file.url)throw Error('镜像更新不允许重定向或切换地址。');
        const r=await this.fetcher(url,options);
        if(file.source==='official-hk'&&r.status>=300&&r.status<400){await r.body?.cancel();throw Error('镜像更新不允许重定向或切换地址。');}return r;
      };
      await download({...file,algorithm:'sha256',path:join(this.root,file.name)},{root:this.root,fetcher,signal:controller.signal,onBytes:n=>{this.state.transferred+=n;}});
      controller.signal.throwIfAborted();
      await atomicJson(join(this.root,file.name+'.receipt.json'),{schema:2,product:PRODUCT_NAME,name:file.name,version:file.version,size:file.size,hash:file.hash,source:file.source,authority:'github'});
      controller.signal.throwIfAborted();this.candidate={...fresh,checkedAt:this.now()};this.state={phase:'ready',release:this.candidate};
    }catch(e){this.state={phase:controller.signal.aborted?'cancelled':'failed',release:this.candidate,error:e.message};throw e;}
    finally{this.controller=null;}return this.snapshot();
  }
  cancel(){this.controller?.abort(Error('已取消更新下载，当前版本不受影响。'));}
  async installer(){
    const f=this.candidate;
    if(this.locked||this.state.phase!=='ready'||!f)throw Error('安装包尚未准备好或校验失败，请重新下载。');
    this.locked=true;
    try{
      if(this.now()-f.checkedAt>15*60*1000||this.now()<f.checkedAt)throw Error('更新信息已过期，请重新检查并下载。');
      const fresh=await this.resolve();
      if(!fresh||identity.some(k=>fresh[k]!==f[k]))throw Error('更新信息已变化，请重新检查更新。');
      if(!await verified({...f,algorithm:'sha256',path:join(this.root,f.name)}))throw Error('安装包尚未准备好或校验失败，请重新下载。');
      return join(this.root,f.name);
    }finally{this.locked=false;}
  }
}
// A pre-upgrade copy is local-only. Do not migrate the data schema in this version.
export async function backupUpgradeConfig(userData,library,version){
  const dir=join(userData,'upgrade-backups',version+'-'+Date.now());await mkdir(dir,{recursive:true});
  const records=[];
  for(const [root,names,prefix] of [[userData,['storage.json','update-channel.json','window-state.json'],'bootstrap'],[library,['accounts.json','preferences.json','library-state.json'],'library']])for(const name of names){
    const from=join(root,name);try{const st=await lstat(from);if(!st.isFile()||st.isSymbolicLink()||st.size>8_000_000)throw Error('设置文件异常，已停止升级：'+name);
      const bytes=await readFile(from),to=join(dir,prefix,name);await ensureParents(dir,to);await copyFile(from,to);if(!bytes.equals(await readFile(to)))throw Error('升级备份校验失败。');records.push({name:prefix+'/'+name,sha256:createHash('sha256').update(bytes).digest('hex')});
    }catch(e){if(e.code!=='ENOENT')throw e;}}
  await writeFile(join(dir,'manifest.json'),JSON.stringify({version,records},null,2));return dir;
}
