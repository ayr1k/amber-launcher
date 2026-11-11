// SPDX-License-Identifier: MPL-2.0
import {join} from 'node:path';
import {ordinary170,inside170} from './library-paths170.mjs';
import {verified,download} from './download.mjs';
const configs=new Map([
 ['bd65e7d2e3c237be76cfbef4c2405033d7f91521',{id:'client-1.12.xml',size:888}],
 ['50c9cc4af6d853d9fc137c84bcd153e2bd3a9a82',{id:'client-1.7.xml',size:966}]
]);
export async function loggingFile170(root,client,{loggingRoot,fetcher=fetch,signal}={}){
 const f=client?.file,pinned=configs.get(f?.sha1);
 if(client?.argument!=='-Dlog4j.configurationFile=${path}'||client.type!=='log4j2-xml'||!pinned||f.id!==pinned.id||f.size!==pinned.size)throw Error('Unsupported logging configuration / 不支持的日志安全配置');
 const existing=join(root,'assets','log_configs',pinned.id),descriptor={hash:f.sha1,size:pinned.size};
 async function present(path){try{await ordinary170(path);if(!await verified({...descriptor,path}))throw Error('Logging configuration checksum mismatch / 日志安全配置校验不匹配');return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
 // Never adopt a per-version custom XML, arbitrary metadata URL or linked file.
 if(await present(existing))return existing;
 if(!loggingRoot)throw Error('Safe logging configuration is missing; launch through AMBER to prepare its private cache / 缺少安全日志配置，请通过 AMBER 启动以准备私有缓存');
 if(inside170(root,loggingRoot)||inside170(loggingRoot,root))throw Error('Private logging cache overlaps the game library');
 await ordinary170(loggingRoot,{missing:true});const path=join(loggingRoot,f.sha1+'-'+pinned.id);
 if(await present(path))return path;
 const combined=AbortSignal.any([AbortSignal.timeout(30000),...(signal?[signal]:[])]);
 try{await download({...descriptor,path,url:'https://piston-data.mojang.com/v1/objects/'+f.sha1+'/'+pinned.id},{root:loggingRoot,fetcher,signal:combined,threads:1,segments:false});}catch(cause){throw Error('Cannot prepare verified logging configuration; check the network or private data directory and retry / 无法准备已校验的日志安全配置，请检查网络或私有数据目录后重试',{cause});}
 await ordinary170(path);if(!await verified({...descriptor,path}))throw Error('Logging configuration checksum mismatch / 日志安全配置校验不匹配');return path;
}
