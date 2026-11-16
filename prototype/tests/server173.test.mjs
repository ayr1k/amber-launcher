// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {ConsoleHistory173} from '../src/console-history173.mjs';
import {collectServerAddresses173} from '../desktop/server-address173.mjs';
import {connectionAddress172,copyServerAddress172} from '../desktop/server-address172.mjs';
import {Servers} from '../desktop/servers132.mjs';
import {Writable} from 'node:stream';

test('console history browses without sending and restores the original draft at both boundaries',()=>{
 const h=new ConsoleHistory173();assert.equal(h.browse('up','draft'),null);h.sent(' list ');h.sent('say hello');
 assert.equal(h.browse('up','unfinished draft'),'say hello');assert.equal(h.browse('up','say hello'),'list');
 assert.equal(h.browse('up','list'),'list');assert.equal(h.browse('down','list'),'say hello');
 assert.equal(h.browse('down','say hello'),'unfinished draft');assert.equal(h.browse('down','unfinished draft'),null);
});
test('sending a recalled command and clearing history preserve an unsent draft; consoles are isolated',()=>{
 const a=new ConsoleHistory173(),b=new ConsoleHistory173();a.sent('list');a.browse('up','secret draft');
 assert.equal(a.sent('list'),'secret draft');a.browse('up','second draft');assert.equal(a.clear('edited recalled command'),'second draft');
 assert.deepEqual(a.entries,[]);assert.equal(a.clear('typed draft'),'typed draft');assert.equal(b.browse('up',''),null);
 assert.equal(new ConsoleHistory173().browse('up',''),null);
});
test('console history keeps at most 100 commands in order, including explicit repeated sends',()=>{
 const h=new ConsoleHistory173();for(let n=0;n<105;n++)h.sent('say '+n);assert.equal(h.entries.length,100);assert.equal(h.entries[0],'say 5');
 h.sent('say 104');assert.equal(h.entries.at(-2),'say 104');assert.equal(h.entries.at(-1),'say 104');
});
test('address refresh retains every IPv4 and IPv6 candidate, scopes link-local endpoints and removes duplicates',()=>{
 const ip=(address,scopeid)=>({address,scopeid,internal:false});
 const rows=collectServerAddresses173(25567,{wifi:[ip('192.168.5.11'),ip('2001:db8:1234:5678:abcd:1234:5678:abcd'),ip('fe80::1234',17)],vpn:[ip('10.2.3.4'),ip('192.168.5.11')],loop:[{address:'127.0.0.1',internal:true},ip('::'),ip('invalid'),ip('127.9.0.1')],empty:undefined});
 assert.deepEqual(rows,['192.168.5.11:25567','[2001:db8:1234:5678:abcd:1234:5678:abcd]:25567','[fe80::1234%17]:25567','10.2.3.4:25567']);
 for(const address of rows){assert.equal(connectionAddress172(address),true);let copied;copyServerAddress172(address,{writeText(value){copied=value;}});assert.equal(copied,address);}
 assert.deepEqual(collectServerAddresses173(25565,{}),[]);assert.throws(()=>collectServerAddresses173(NaN,{}));
 for(const invalid of ['[fe80::1%17\nlist]:25565','[::::%17]:25565','[fe80::1%17]:99999'])assert.equal(connectionAddress172(invalid),false);
});
test('refresh uses the live server port until stopped, returns local port even without LAN and propagates failures',async()=>{
 const servers=new Servers({root:'.'});servers.properties=async()=>({values:{'server-port':'25566'}});servers.addresses=port=>{assert.ok([25565,25566].includes(port));return [];};
 servers.runs.set('fixture',{state:'running',port:25565,pendingRestart:true});assert.deepEqual(await servers.addressInfo173('fixture'),{port:25565,addresses:[]});
 servers.runs.set('fixture',{state:'stopped',port:25565});assert.deepEqual(await servers.addressInfo173('fixture'),{port:25566,addresses:[]});
 servers.addresses=()=>{throw Error('Adapter query failed');};await assert.rejects(servers.addressInfo173('fixture'),/Adapter query failed/);
 servers.properties=async()=>{throw Error('Configuration unavailable');};await assert.rejects(servers.addressInfo173('fixture'),/Configuration unavailable/);
});
test('manual command submission preserves one-line validation and writes only after explicit submission',()=>{
 const servers=new Servers({root:'.'}),sent=[];
 servers.runs.set('fixture',{state:'running',child:{stdin:new Writable({write(chunk,encoding,done){sent.push(chunk.toString());done();}})}});
 const history=new ConsoleHistory173();history.sent('list');history.browse('up','draft');assert.deepEqual(sent,[]);
 assert.equal(servers.command('fixture',' /list '),true);assert.deepEqual(sent,['list\n']);
 for(const command of ['', 'list\nstop', 'list\rstop', 'list\0', 'x'.repeat(2001)])assert.throws(()=>servers.command('fixture',command));
 assert.equal(sent.length,1);servers.runs.get('fixture').state='stopped';assert.throws(()=>servers.command('fixture','list'),/Server not running/);
});
