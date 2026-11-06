// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createSocket} from 'node:dgram';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
import {portAvailable} from './servers132.mjs';

export function validatePort150(input){
 if(!input||!['tcp','udp'].includes(input.protocol)||!Number.isInteger(input.port)||input.port<1024||input.port>65535||typeof input.name!=='string'||!input.name.trim()||input.name.length>80)throw Error('Invalid port record / 端口记录无效');
 return {name:input.name.trim(),protocol:input.protocol,port:input.port};
}
export async function probePort150(port,protocol){
 if(protocol==='tcp')return portAvailable(port,'0.0.0.0');
 return new Promise((resolve,reject)=>{const socket=createSocket('udp4');socket.once('error',e=>{socket.close();reject(e);});socket.bind({port,address:'0.0.0.0',exclusive:true},()=>socket.close(()=>resolve(true)));});
}
export class Ports150 {
 constructor(servers){this.servers=servers;this.queue=Promise.resolve();}
 async file(id){const dir=await this.servers.dir(id),file=join(dir,'amber-ports.json');await ensureParents(this.servers.root,file);return file;}
 async list(id){const file=await this.file(id);let rows=[];try{const data=JSON.parse(await readFile(file,'utf8'));if(data.schema!==1||!Array.isArray(data.ports)||data.ports.length>64)throw Error('Invalid port configuration / 端口配置无效');rows=data.ports.map(p=>{if(!/^[a-f0-9-]{36}$/.test(p.id))throw Error('Invalid port identity / 端口标识无效');return {...validatePort150(p),id:p.id};});}catch(e){if(e.code!=='ENOENT')throw e;}
  const props=await this.servers.properties(id);return [{id:'main',name:'Minecraft',protocol:'tcp',port:Number(props.values['server-port']||25565),main:true},...rows];
 }
 async conflicts(id,record,except){const found=[];for(const instance of await this.servers.list())for(const p of await this.list(instance.id))if(!(instance.id===id&&p.id===except)&&p.protocol===record.protocol&&p.port===record.port)found.push({serverId:instance.id,portId:p.id,name:instance.name});for(const r of await this.reserved?.()||[])if(r.protocol===record.protocol&&r.port===record.port)found.push(r);return found;}
 change(fn){const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
 exclusive(id,fn){return this.servers.locks.run(id,()=>this.allocation?this.allocation(fn):fn());}
 save(id,input){return this.change(()=>this.exclusive(id,async()=>{const value=validatePort150(input),rows=await this.list(id),existing=rows.find(p=>p.id===input.id);if(input.id&&!existing)throw Error('Port no longer exists / 端口已失效');if(existing?.main)throw Error('Edit the game port in server settings / 请在服务端设置中修改主端口');if(await this.inUse?.(id,input.id))throw Error('Stop linked tunnels first / 请先停止关联隧道');if((await this.conflicts(id,value,input.id)).length)throw Error('Port is assigned to another record / 端口与已有记录冲突');await probePort150(value.port,value.protocol);const port={...value,id:existing?.id||randomUUID()};const next=rows.filter(p=>!p.main&&p.id!==port.id);if(next.length>=64)throw Error('Too many ports / 端口记录过多');next.push(port);await atomicJson(await this.file(id),{schema:1,ports:next});return this.list(id);}));}
 remove(id,portId){return this.change(()=>this.exclusive(id,async()=>{if(portId==='main')throw Error('Cannot remove game port / 不能移除游戏主端口');if(await this.inUse?.(id,portId))throw Error('Stop linked tunnels first / 请先停止关联隧道');const rows=await this.list(id);await atomicJson(await this.file(id),{schema:1,ports:rows.filter(p=>!p.main&&p.id!==portId)});return this.list(id);}));}
 async resolve(id,portId){const port=(await this.list(id)).find(p=>p.id===portId);if(!port)throw Error('Port association no longer exists / 关联端口已失效');return port;}
}
