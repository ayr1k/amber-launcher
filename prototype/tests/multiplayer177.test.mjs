// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {Rooms,validateInvite} from '../desktop/rooms132.mjs';
import {RoomSync152} from '../desktop/room-sync152.mjs';
import {DEFAULT_ROOM_PEER,minecraftStatus} from '../desktop/room-readiness177.mjs';

test('new and empty peer use the built-in; explicit old and custom peers survive invitations',async()=>{
  const rooms = new Rooms({root:tmpdir()}, {properties:async()=>({values:{}}),runs:new Map([['id',{state:'running',port:25565}]])});
  rooms.start=async r=>r;
  for(const [input, expected] of [[undefined,DEFAULT_ROOM_PEER],['',DEFAULT_ROOM_PEER],
      ['tcp://public.easytier.top:11010','tcp://public.easytier.top:11010'],['udp://example.test:1111','udp://example.test:1111']]){
    const room=await rooms.host('id',input);
    assert.equal(room.invite.peer,expected);
    const code='amber-room:'+Buffer.from(JSON.stringify(room.invite)).toString('base64url');
    assert.equal(validateInvite(code).peer,expected);
  }
});

test('room health authenticates the host while file sharing is disabled',async t=>{
  const hostRooms={}, core={root:tmpdir()}, host=new RoomSync152(core,hostRooms,{},{});
  const invite={name:'amber-'+'a'.repeat(24),expires:Date.now()+60000};
  await host.prepareHost(invite);
  t.after(()=>host.close());
  hostRooms.current={role:'host',state:'running',invite};
  const guestRooms={current:{role:'guest',state:'running',invite,syncLocalPort:invite.sync.port}};
  const guest=new RoomSync152(core,guestRooms,{},{});
  assert.equal(await guest.checkHost(),true);
  await assert.rejects(guest.remote());
  guestRooms.current.invite={...invite,sync:{...invite.sync,token:'wrong'}};
  await assert.rejects(guest.checkHost());
});

test('only a framed Minecraft status response reports ready; TCP alone and malformed data fail',async t=>{
  const json=Buffer.from(JSON.stringify({version:{name:'fixture',protocol:765},description:'Fixture'}));
  const packet=Buffer.concat([Buffer.from([json.length+2,0,json.length]),json]);
  let response=null;
  const server=createServer(s=>s.once('data',()=>{if (response) {s.write(response.subarray(0,1));setImmediate(()=>s.end(response.subarray(1)));}else s.end();}));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(()=>server.close());
  const port=server.address().port;
  assert.equal(await minecraftStatus(port),false);
  response=Buffer.from('Not Minecraft');
  assert.equal(await minecraftStatus(port),false);
  response=packet;
  assert.equal(await minecraftStatus(port),true);
});

test('failed session whose child already closed can return to setup',async()=>{
  const rooms=new Rooms({root:tmpdir()},{});
  rooms.current={state:'failed',closed:true,child:{exitCode:null,signalCode:'SIGTERM',kill(){assert.fail('closed process');}}};
  await rooms.leave();
  assert.equal(rooms.current.state,'stopped');
});
