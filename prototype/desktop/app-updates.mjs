// SPDX-License-Identifier: MPL-2.0
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
export function releaseCandidate(releases,current,product=PRODUCT_NAME){
  const repository=repositories[product];if(!repository)return null;
  return releases.filter(r=>!r.draft).filter(r=>{try{return compareVersions(r.tag_name,current)>0;}catch{return false;}})
    .sort((a,b)=>compareVersions(b.tag_name,a.tag_name)).map(r=>{
      const version=r.tag_name.replace(/^v/,'');
      const name=`${product}-${version}-Setup-x64.exe`;
      const asset=r.assets?.find(a=>a.name===name&&a.state==='uploaded');
      if(!asset||!Number.isSafeInteger(asset.size)||asset.size<1||asset.size>800_000_000||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))return null;
      if(asset.browser_download_url!==`${repository}/releases/download/${r.tag_name}/${name}`)return null;
      return {version,name,url:asset.browser_download_url,size:asset.size,hash:asset.digest.slice(7),notes:String(r.body||'').slice(0,60000),page:`${repository}/releases/tag/${r.tag_name}`};
    }).find(Boolean)||null;
}
export class AppUpdates{
  constructor(userData,current,{fetcher=fetch}={}){this.root=join(userData,'updates');this.current=current;this.fetcher=fetcher;this.state={phase:'idle'};this.candidate=null;}
  async check(){
    if(['checking','downloading'].includes(this.state.phase))throw Error('正在检查或下载安装包，请稍候。');
    this.candidate=null;this.state={phase:'checking'};
    try{const r=await this.fetcher(`https://api.github.com/repos/${REPOSITORY_NAME}/releases?per_page=30`,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/vnd.github+json','User-Agent':PRODUCT_NAME+'/'+this.current}});
      if(!r.ok)throw Error(r.status===403||r.status===429?'更新服务暂时限流，请稍后再试。':'无法读取更新目录，请检查网络后重试。');
      const text=await responseText(r,2_000_000);if(text.length>2_000_000)throw Error('更新目录过大。');const data=JSON.parse(text);if(!Array.isArray(data))throw Error('更新目录格式无效。');
      this.candidate=releaseCandidate(data,this.current);this.state={phase:this.candidate?'available':'current',release:this.candidate};return this.state;
    }catch(e){this.state={phase:'failed',error:e.message};throw e;}
  }
  async download(){
    if(!this.candidate||['checking','downloading'].includes(this.state.phase))throw Error('请先检查更新，或等待当前下载结束。');
    const file=this.candidate;
    this.controller=new AbortController();this.state={phase:'downloading',release:file,transferred:0};
    try{await mkdir(this.root,{recursive:true});await requireSpace(this.root,file.size*2);this.controller.signal.throwIfAborted();await download({...file,algorithm:'sha256',path:join(this.root,file.name)},{root:this.root,fetcher:this.fetcher,signal:this.controller.signal,onBytes:n=>{this.state.transferred+=n;}});this.state={phase:'ready',release:file};}
    catch(e){this.state={phase:this.controller.signal.aborted?'cancelled':'failed',release:file,error:e.message};throw e;}
    finally{this.controller=null;}return this.state;
  }
  cancel(){this.controller?.abort(Error('已取消更新下载，当前版本不受影响。'));}
  async installer(){const f=this.candidate;if(this.state.phase!=='ready'||!f||!await verified({...f,algorithm:'sha256',path:join(this.root,f.name)}))throw Error('安装包尚未准备好或校验失败，请重新下载。');return join(this.root,f.name);}
}
// A pre-upgrade copy is local-only. Do not migrate the data schema in this version.
export async function backupUpgradeConfig(userData,library,version){
  const dir=join(userData,'upgrade-backups',version+'-'+Date.now());await mkdir(dir,{recursive:true});
  const records=[];
  for(const [root,names,prefix] of [[userData,['storage.json'],'bootstrap'],[library,['accounts.json','preferences.json','library-state.json'],'library']])for(const name of names){
    const from=join(root,name);try{const st=await lstat(from);if(!st.isFile()||st.isSymbolicLink()||st.size>8_000_000)throw Error('设置文件异常，已停止升级：'+name);
      const bytes=await readFile(from),to=join(dir,prefix,name);await ensureParents(dir,to);await copyFile(from,to);if(!bytes.equals(await readFile(to)))throw Error('升级备份校验失败。');records.push({name:prefix+'/'+name,sha256:createHash('sha256').update(bytes).digest('hex')});
    }catch(e){if(e.code!=='ENOENT')throw e;}}
  await writeFile(join(dir,'manifest.json'),JSON.stringify({version,records},null,2));return dir;
}
