// SPDX-License-Identifier: MPL-2.0
import {isIP} from 'node:net';
import {connectionAddress172} from './server-address172.mjs';
export function collectServerAddresses173(port,interfaces){
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid server port / 无效服务端端口');
 const addresses=[];
 for(const entries of Object.values(interfaces))for(const entry of entries||[]){
  if(entry.internal||!entry.address)continue;
  const host=entry.address.split('%')[0],family=isIP(host);
  if(!family||host==='0.0.0.0'||host==='::'||host==='::1'||host.startsWith('127.'))continue;
  const scope=family===6&&/^fe[89ab]/i.test(host)&&!entry.address.includes('%')&&entry.scopeid?'%'+entry.scopeid:'';
  const value=family===6?`[${entry.address}${scope}]:${port}`:`${host}:${port}`;
  if(connectionAddress172(value)&&!addresses.includes(value))addresses.push(value);
 }
 return addresses;
}
