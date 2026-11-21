// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {sakuraCreateOptions177,sakuraCreateReadiness177,sakuraNext177,switchSakuraNode177,withSakuraCreateLock177} from '../src/sakura-create177.mjs';
import {nodeRestriction150} from '../desktop/sakura-rules150.mjs';
import {setLocale,translateMessage} from '../desktop/localization.mjs';

const catalog={used:0,limit:2,level:1,nodes:[
  {id:11,name:'Offline',flag:512|4,vip:0},
  {id:12,name:'Closed',flag:0,vip:0},
  {id:13,name:'Tier-limited',flag:4,vip:2},
  {id:14,name:'Requires access authentication',flag:4|256,vip:0},
  {id:15,name:'TCP',flag:4,vip:0},
  {id:16,name:'TCP and UDP dedicated',flag:4|32|2048,vip:0},
]};
const base={hasToken:true,pending:false,catalog,current:{id:'fixture'},port:{id:'main',protocol:'tcp',port:25565},
  node:11,scope:'private',name:'Example',remote:''};

test('Sakura explains the exact shared node restriction beside the disabled create action',()=>{
  const expected=['节点离线。','节点暂不接受新隧道。','账号等级不满足节点要求。','此节点强制访问认证，当前创建面板不支持此能力。'];
  for(const [i,reason] of expected.entries()){
    const row=catalog.nodes[i];
    assert.equal(nodeRestriction150(row,'tcp',false,catalog.level),reason);
    assert.deepEqual(sakuraCreateReadiness177({...base,node:row.id}),{code:'node',reason});
    assert.equal(sakuraCreateOptions177(catalog,base.port,base.scope)[i].reason,reason);
  }
  assert.equal(sakuraCreateReadiness177({...base,node:15,port:{id:'plugin',protocol:'udp'}}).reason,'节点不支持 UDP。');
  assert.equal(sakuraCreateReadiness177({...base,node:15,scope:'public'}).reason,'公开游戏服务器需要服务商允许的专用节点。');
});

test('Sakura distinguishes credentials, pending result, missing catalog and exhausted quota with bilingual next steps',()=>{
  assert.equal(sakuraCreateReadiness177({...base,catalog:{...catalog,nodes:{}}}).reason,'无法确认 Sakura 账号权限或额度。');
  assert.deepEqual(sakuraCreateOptions177({nodes:null},base.port,base.scope),[]);
  setLocale('en-US');
  try{
    for(const [changes,code] of [[{hasToken:false},'credentials'],[{pending:true},'pending'],
      [{catalog:null},'catalog'],[{catalog:{...catalog,used:2}},'quota']]){
      const status=sakuraCreateReadiness177({...base,...changes});
      assert.equal(status.code,code);
      assert.ok(!status.payload);
      assert.notEqual(translateMessage(status.reason),status.reason);
      assert.notEqual(translateMessage(sakuraNext177[code]),sakuraNext177[code]);
    }
  }finally{setLocale('zh-CN');}
});

test('switching to an eligible node preserves name, instance port and audience; resets and revalidates explicit remote port',()=>{
  const port={id:'plugin',protocol:'udp',port:25570};
  const draft={name:'Keep me',node:11,portId:port.id,scope:'public',remote:'25555'};
  const options=sakuraCreateOptions177(catalog,port,draft.scope);
  assert.equal(switchSakuraNode177(draft,15,options),draft);
  assert.equal(switchSakuraNode177(draft,999,options),draft);
  const switched=switchSakuraNode177(draft,'16',options);
  assert.deepEqual(switched,{...draft,node:'16',remote:''});
  const input={...base,...switched,port};
  assert.deepEqual(sakuraCreateReadiness177(input).payload,{name:draft.name,node:16,portId:'plugin',remote:'',publicGame:true});
  for(const remote of ['0','65536','1.5','1e4']) assert.equal(sakuraCreateReadiness177({...input,remote}).code,'remote');
  assert.equal(sakuraCreateReadiness177({...input,remote:'26000'}).payload.remote,26000);
});

test('Sakura creation lock covers confirmation cancellation, duplicate clicks, and failure before retry',async()=>{
  const lock={current:false}, busy=[];
  let remoteCalls=0, confirmations=0, answer;
  const submit=()=>withSakuraCreateLock177(lock,async()=>{
    confirmations++;
    const confirmed=await new Promise(resolve=>{answer=resolve;});
    if(confirmed)remoteCalls++;
  },v=>busy.push(v));
  const first=submit();
  await submit();
  answer(false);
  await first;
  assert.equal(confirmations,1);
  assert.equal(remoteCalls,0);
  await assert.rejects(withSakuraCreateLock177(lock,async()=>{throw Error('fixture failure');},v=>busy.push(v)),/fixture failure/);
  const retry=submit();
  await submit();
  answer(true);
  await retry;
  assert.equal(confirmations,2);
  assert.equal(remoteCalls,1);
  assert.equal(lock.current,false);
  assert.deepEqual(busy,[true,false,true,false,true,false]);
});
