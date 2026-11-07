// SPDX-License-Identifier: MPL-2.0
// Two real EasyTier processes on ONE machine. Not cross-network or gameplay QA.
import {createServer} from 'node:http';
import {createServer as netServer} from 'node:net';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import assert from 'node:assert/strict';
import {RoomSync152} from '../desktop/room-sync152.mjs';
import {digest} from '../desktop/download.mjs';
const exe=resolve(process.env.AMBER_EASYTIER_EXE||'missing');
assert.equal(await digest(exe,'sha256'),'da7eb2d24b5416f3d3407636949e964a0750e3f9dc53a828cb6799a57ead445d');
const port=()=>new Promise((ok,no)=>{const s=netServer();s.once('error',no);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>ok(p));});});
const root=await mkdtemp(join(tmpdir(),'amber-easytier152-'));const dir=join(root,'client');await mkdir(join(dir,'config'),{recursive:true});await mkdir(join(dir,'mods'));await writeFile(join(dir,'config/display.json'),'{"distance":8}');
const core={root,metadata:async()=>({dir,item:{id:'source',name:'synthetic',game:'1.21.1',loader:'vanilla'}}),requireStopped:async()=>{}},rooms={servers:{list:async()=>[{id:'server',game:'1.21.1',type:'vanilla'}]}},host=new RoomSync152(core,rooms,{}, {manifest:async()=>({files:[]})});const invite={v:1,name:'amber-'+randomBytes(12).toString('hex'),secret:randomBytes(32).toString('base64url'),expires:Date.now()+120000};await host.prepareHost(invite);rooms.current={role:'host',state:'running',serverId:'server',invite};const guestRooms={current:{role:'guest',state:'running',invite,syncLocalPort:await port(),localPort:await port()}},guest=new RoomSync152(core,guestRooms,{},{}),children=[];const game=createServer((req,res)=>res.end('synthetic-game-port'));
await new Promise(ok=>game.listen(0,'127.0.0.1',ok));const gamePort=game.address().port,peerPort=await port();
function start(ip,extra){const p=spawn(exe,['--bind-device','false','--no-tun','--ipv4',ip,'--network-name',invite.name,'--private-mode','true','--console-log-level','warn',...extra],{cwd:root,windowsHide:true,env:{...process.env,ET_NETWORK_SECRET:invite.secret}});children.push(p);let output='';p.stdout.on('data',b=>output+=b);p.stderr.on('data',b=>output+=b);p.on('exit',code=>{if(code)console.error(output);});return p;}
try{
 start('10.144.0.1',['--listeners',`tcp://127.0.0.1:${peerPort}`,'--rpc-portal',`127.0.0.1:${await port()}`,'--tcp-whitelist',String(gamePort),String(invite.sync.port),'--udp-whitelist']);
 start('10.144.0.2',['--no-listener','--peers',`tcp://127.0.0.1:${peerPort}`,'--rpc-portal',`127.0.0.1:${await port()}`,'--tcp-whitelist','--udp-whitelist','--port-forward',`tcp://127.0.0.1:${guestRooms.current.localPort}/10.144.0.1:${gamePort}`,'--port-forward',`tcp://127.0.0.1:${guestRooms.current.syncLocalPort}/10.144.0.1:${invite.sync.port}`]);
 const c=await host.candidates('source');await host.publish({id:'source',token:c.token,paths:['config/display.json'],reviewed:true,redistribution:true});let preview,last;
 for(let i=0;i<20;i++){try{preview=await guest.preview();break;}catch(e){last=e;await new Promise(r=>setTimeout(r,500));}}if(!preview)throw last;
 const f=preview.manifest.files[0],bytes=await guest.request('/file/'+preview.manifest.revision+'/'+f.sha256,f.size);assert.equal(bytes.toString(),'{"distance":8}');
 host.disable();await assert.rejects(guest.preview());assert.equal(await (await fetch(`http://127.0.0.1:${guestRooms.current.localPort}`,{signal:AbortSignal.timeout(5000)})).text(),'synthetic-game-port');console.log('EASYTIER152_LOCAL_DUAL_PROCESS_SIGNED_FILE_AND_GAME_CONTINUITY_OK');
}finally{await host.close();await guest.close();for(const p of children){p.kill();await new Promise(ok=>{p.once('exit',ok);setTimeout(ok,2000).unref();});}game.closeAllConnections();game.close();await rm(root,{recursive:true,force:true});}
