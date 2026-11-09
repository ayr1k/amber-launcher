// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readFile,stat} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
export function normalizeSeed(value){
 const s=String(value??'').trim();if(!s||s.length>256)throw Error('请输入种子 / Enter a seed');
 if(/^[+-]?\d+$/.test(s)){const n=BigInt(s);if(n<-(1n<<63n)||n>=(1n<<63n))throw Error('种子超出 64 位范围 / Seed exceeds signed 64-bit range');return n.toString();}
 let hash=0;for(let i=0;i<s.length;i++)hash=(Math.imul(hash,31)+s.charCodeAt(i))|0;return String(hash);
}
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function mapRequest(p){
 if(!p||!integer(p.version,10,35)||![-1,0,1].includes(p.dimension)||!integer(p.x,-29900000,29900000)||!integer(p.z,-29900000,29900000)||![1,4,16,64,256,1024,4096].includes(p.scale)||!integer(p.width,1,256)||!integer(p.height,1,256)||!integer(p.y,-64,320))throw Error('地图参数无效 / Invalid map parameters');
 return [normalizeSeed(p.seed),p.version,p.dimension,p.x,p.z,p.scale,p.width,p.height,p.y,p.terrain?1:0,p.structures?1:0].map(String);
}
export class SeedMap {
 constructor(){this.cache=new Map();this.child=null;}
 run(args){return new Promise((resolve,reject)=>{const child=execFile(fileURLToPath(new URL(process.platform==='win32'?'./bin/seed-engine.exe':`./bin/seed-engine-${process.platform}-${process.arch}`,import.meta.url)),args,{windowsHide:true,timeout:25000,maxBuffer:4*1024*1024},(e,out)=>{if(this.child===child)this.child=null;if(e)reject(Error(e.killed?'地图计算已取消或超时 / Map calculation cancelled or timed out':'地图计算失败 / Map calculation failed'));else try{resolve(JSON.parse(out))}catch{reject(Error('地图结果无效 / Invalid map result'))}});this.child=child;});}
 async catalog(){if(!this.info){this.info=await this.run(['catalog']);const patches={10:'1.7.10',11:'1.8.9',12:'1.9.4',13:'1.10.2',14:'1.11.2',15:'1.12.2',16:'1.13.2',17:'1.14.4',18:'1.15.2',20:'1.16.5',21:'1.17.1',22:'1.18.2',24:'1.19.4',25:'1.20.6'};this.info.versions=this.info.versions.map(v=>({...v,name:patches[v.id]||v.name}));}return this.info;}
 cancel(){this.child?.kill();this.child=null;}
 async map(p){const args=mapRequest(p),key=args.join(':');this.cancel();if(this.cache.has(key))return this.cache.get(key);const result=await this.run(args);this.cache.set(key,result);if(this.cache.size>8)this.cache.delete(this.cache.keys().next().value);return result;}
}
// Bounded NBT reader: no arbitrary file access from the renderer, no world writes.
export function readWorldNBT(bytes){
 if(bytes.length>8*1024*1024)throw Error('level.dat 过大 / level.dat too large');
 const b=bytes[0]===31&&bytes[1]===139?gunzipSync(bytes,{maxOutputLength:16*1024*1024}):bytes;let at=0,nodes=0;
 const take=n=>{if(n<0||at+n>b.length)throw Error('NBT 数据不完整 / Invalid NBT');const p=at;at+=n;return p;};
 const byte=()=>b.readUInt8(take(1)),int=()=>b.readInt32BE(take(4)),str=()=>{const n=b.readUInt16BE(take(2));return b.toString('utf8',take(n),at);};
 function value(type,depth=0){if(depth>64||++nodes>200000)throw Error('NBT 超出限制 / NBT limit exceeded');switch(type){case 1:return b.readInt8(take(1));case 2:return b.readInt16BE(take(2));case 3:return int();case 4:return b.readBigInt64BE(take(8)).toString();case 5:take(4);return null;case 6:take(8);return null;case 8:return str();case 7:case 11:case 12:{const n=int();take(n*(type===7?1:type===11?4:8));return null;}case 9:{const t=byte(),n=int();if(n<0||n>200000)throw Error('NBT list limit');for(let i=0;i<n;i++)value(t,depth+1);return null;}case 10:{const obj=Object.create(null);for(let t;(t=byte())!==0;){const k=str();obj[k]=value(t,depth+1);}return obj;}default:throw Error('未知 NBT 类型 / Unknown NBT tag');}}
 if(byte()!==10)throw Error('不是 Java level.dat / Not a Java level.dat');str();const root=value(10),d=root.Data||root,seed=d.WorldGenSettings?.seed??d.RandomSeed;if(typeof seed!=='string')throw Error('存档未包含种子 / World contains no seed');const coordinate=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max?v:null;
 const x=coordinate(d.SpawnX,-29899999,29899999),z=coordinate(d.SpawnZ,-29899999,29899999),y=coordinate(d.SpawnY,-64,320);
 return {seed:normalizeSeed(seed),version:typeof d.Version?.Name==='string'?d.Version.Name:'',name:typeof d.LevelName==='string'?d.LevelName:'',x,z,y,spawnKnown:x!==null&&z!==null&&y!==null,dataVersion:Number.isInteger(d.DataVersion)?d.DataVersion:null};
}
export async function readWorldFile(path){if((await stat(path)).size>8*1024*1024)throw Error('level.dat too large');return readWorldNBT(await readFile(path));}
