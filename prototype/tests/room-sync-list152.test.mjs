// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {roomModIcon152,roomModDisplay152} from '../desktop/room-sync-display152.mjs';
import {selectAllRoomMods152,toggleRoomFile152,retainRoomSelection152,ROOM_SYNC_MAX_FILES152} from '../src/room-sync-selection152.mjs';

test('icons retain original platform boundaries',()=>{
 assert.equal(roomModIcon152('https://cdn.modrinth.com/a.png','modrinth'),'https://cdn.modrinth.com/a.png');
 assert.equal(roomModIcon152('https://media.forgecdn.net/a.png','curseforge'),'https://media.forgecdn.net/a.png');
 for(const url of ['file:///C:/private.png','data:image/png;base64,abc','http://cdn.modrinth.com/a.png','https://cdn.modrinth.com.evil.test/a.png','https://user:pass@cdn.modrinth.com/a.png','https://cdn.modrinth.com:444/a.png','https://media.forgecdn.net/a.png'])assert.equal(roomModIcon152(url,'modrinth'),null);
});
test('display requests use verified project IDs only and reuse metadata',async()=>{
 const calls=[],cache=new Map(),content={api:async path=>{calls.push(path);return {id:'Project1',title:'Verified mod',icon_url:'https://cdn.modrinth.com/icon.png'};}};
 const saved={hash:'digest',projectId:'Project1',title:'Old name',relative:'mods/private-local-name.jar'};
 assert.equal((await roomModDisplay152(content,saved,'digest',cache)).title,'Verified mod');await roomModDisplay152(content,saved,'digest',cache);assert.deepEqual(calls,['project/Project1']);
 for(const invalid of [undefined,{...saved,hash:'different'},{...saved,projectId:'../private'},{...saved,projectId:'https://evil.test'}])assert.equal((await roomModDisplay152(content,invalid,'digest',cache)).source,'unknown');
 assert.deepEqual(calls,['project/Project1']);
});
test('metadata failures and untrusted icons fall back without changing file eligibility',async()=>{
 const saved={hash:'digest',projectId:'Project1',title:'Recorded name'};
 const offline=await roomModDisplay152({api:async()=>{throw Error('offline');}},saved,'digest',new Map());assert.equal(offline.title,'Recorded name');assert.equal(offline.icon,null);
 const bad=await roomModDisplay152({api:async()=>({id:'Project1',icon_url:'https://evil.test/icon.png'})},saved,'digest',new Map());assert.equal(bad.icon,null);
});
test('known server-only and restricted mods are unavailable',async()=>{
 for(const [projectId,metadata,blocked] of [['Project1',{client_side:'unsupported'},'server-only'],['cf-123',{distribution:false},'restricted']])assert.equal((await roomModDisplay152({api:async()=>({id:projectId,...metadata})},{projectId,hash:'digest'},'digest',new Map())).blocked,blocked);
});
test('select all appends eligible mods without selecting configuration or forbidden rows',()=>{
 const files=[{path:'mods/a.jar'},{path:'mods/b.jar'},{path:'mods/server.jar',blocked:'server-only'},{path:'mods/restricted.jar',blocked:'restricted'},{path:'config/display.json'},{path:'config/other.json'}];
 assert.deepEqual(selectAllRoomMods152(['config/display.json','mods/b.jar'],files).paths,['config/display.json','mods/b.jar','mods/a.jar']);assert.deepEqual(selectAllRoomMods152([],files).paths,['mods/a.jar','mods/b.jar']);
});
const mods=count=>Array.from({length:count},(_,i)=>({path:'mods/m'+i+'.jar'}));
for(const count of [2000,2001])for(const config of [false,true])test('select all '+count+' mods, '+(config?'with':'without')+' selected configuration respects total file limit',()=>{
 const before=config?['config/display.json']:[],files=mods(count),result=selectAllRoomMods152(before,files),limited=count+before.length>ROOM_SYNC_MAX_FILES152;
 assert.equal(ROOM_SYNC_MAX_FILES152,2000);assert.equal(result.limited,limited);assert.equal(result.pending,count);assert.deepEqual(result.paths,limited?before:files.map(f=>f.path));assert.deepEqual(before,config?['config/display.json']:[]);
 const again=selectAllRoomMods152(result.paths,files);assert.deepEqual(again.paths,result.paths);assert.equal(again.limited,limited);assert.equal(again.pending,limited?count:0);
});
test('select all preserves existing partial choices instead of truncating to remaining capacity',()=>{
 const files=mods(2001),before=['config/display.json',files[4].path,files[8].path],result=selectAllRoomMods152(before,files);
 assert.equal(result.limited,true);assert.equal(result.pending,1999);assert.deepEqual(result.paths,before);
 const fits=selectAllRoomMods152(['config/display.json'],mods(1999));assert.equal(fits.limited,false);assert.equal(fits.paths.length,2000);assert.equal(fits.paths[0],'config/display.json');
});
test('single add/remove and repeated all-selection keep the 2000-file total including configuration',()=>{
 const files=mods(2001);let selected=selectAllRoomMods152([],files.slice(0,2000)).paths;
 for(const file of [files[2000],{path:'config/display.json'}]){const result=toggleRoomFile152(selected,file,true);assert.equal(result.limited,true);assert.deepEqual(result.paths,selected);}
 assert.deepEqual(toggleRoomFile152(selected,files[0],true).paths,selected);
 selected=toggleRoomFile152(selected,files[0],false).paths;assert.equal(selected.length,1999);
 selected=toggleRoomFile152(selected,{path:'config/display.json'},true).paths;assert.equal(selected.length,2000);assert.ok(selected.includes('config/display.json'));
 assert.equal(selectAllRoomMods152(selected,files).limited,true);assert.deepEqual(selectAllRoomMods152(selected,files).paths,selected);
 selected=toggleRoomFile152(selected,{path:'config/display.json'},false).paths;selected=toggleRoomFile152(selected,files[2000],true).paths;assert.equal(selected.length,2000);
 const blocked={path:'mods/restricted.jar',blocked:'restricted'};assert.equal(toggleRoomFile152([],blocked,true).blocked,true);assert.deepEqual(toggleRoomFile152([],blocked,true).paths,[]);
});
test('inspection retains only unchanged eligible selections in the same instance',()=>{
 const before={id:'one',files:['a','b','c','d'].map(n=>({path:'mods/'+n+'.jar',sha256:n}))};const after={id:'one',files:[before.files[0],{...before.files[1],sha256:'new'},{...before.files[2],blocked:'restricted'}]};const selected=before.files.map(f=>f.path);
 assert.deepEqual(retainRoomSelection152(selected,before,after),['mods/a.jar']);assert.deepEqual(retainRoomSelection152(selected,before,{...after,id:'two'}),[]);
});
