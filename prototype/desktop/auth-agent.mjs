// SPDX-License-Identifier: MPL-2.0
import { join } from 'node:path';
import { download, officialFetch } from './download.mjs';
export async function authAgent(root,fetcher=fetch){
 const r=await officialFetch('https://authlib-injector.yushi.moe/artifact/latest.json',{fetcher,signal:AbortSignal.timeout(30000)}),m=await r.json();
 if(!/^[a-f0-9]{64}$/.test(m.checksums?.sha256)||new URL(m.download_url).hostname!=='authlib-injector.yushi.moe')throw Error('authlib-injector 发布信息校验失败。');
 const path=join(root,'authlib',m.checksums.sha256+'.jar');await download({path,url:m.download_url,hash:m.checksums.sha256,algorithm:'sha256',label:'authlib-injector'},{root,fetcher});return path;
}
