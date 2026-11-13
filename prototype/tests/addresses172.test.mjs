// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionAddress172,localAddress172,copyServerAddress172} from '../desktop/server-address172.mjs';
test('copy targets are individual endpoints, never joined addresses or unavailable placeholders',()=>{
 for(const value of ['127.0.0.1:25565','192.168.1.77:25565','172.19.96.1:25565','[2001:db8::1]:25565'])assert.equal(connectionAddress172(value),true,value);
 for(const value of ['192.168.1.77:25565 / 172.19.96.1:25565','127.0.0.1:—','1.2.3.999:25565','1.2.3.4:65536','1.2.3.4:0',null,'https://example.com'])assert.equal(connectionAddress172(value),false,String(value));
});
test('local address uses live port, then configured address port, and disables unknown ports',()=>{
 assert.equal(localAddress172(25570,['192.168.1.77:25565']),'127.0.0.1:25570');
 assert.equal(localAddress172(undefined,['192.168.1.77:25566']),'127.0.0.1:25566');
 assert.equal(localAddress172(undefined,[]),'127.0.0.1:—');
 assert.equal(localAddress172(70000,[]),'127.0.0.1:—');
});

test('desktop clipboard accepts one validated endpoint and propagates failures',()=>{
 const copied=[],clipboard={writeText:value=>copied.push(value)};
 assert.equal(copyServerAddress172('172.19.96.1:25565',clipboard),true);
 assert.deepEqual(copied,['172.19.96.1:25565']);
 for(const value of ['172.19.96.1:25565 / 192.168.1.1:25565','[::::]:25565','127.0.0.1:—',null])assert.throws(()=>copyServerAddress172(value,clipboard));
 assert.equal(copied.length,1);
 assert.throws(()=>copyServerAddress172('127.0.0.1:25565',{writeText(){throw Error('Clipboard unavailable');}}),/Clipboard unavailable/);
});
