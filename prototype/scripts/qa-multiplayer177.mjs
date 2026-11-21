// SPDX-License-Identifier: MPL-2.0
// Real renderer controls, disposable provider and desktop fixtures.
import {createServer} from 'vite';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const entry='/qa-room-guide177.jsx';
const jsx=`
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {RoomGuide177} from '/src/RoomGuide177.jsx';
import {SakuraNodes177} from '/src/SakuraNodes177.jsx';
function App(){
 const [state,update]=useState({hasToken:true,nodes:[],tunnels:[]});
 const [network,refresh]=useState({installed:true,defaultPeer:'tcp://easytier.weiai.org.cn:11010'});
 const current={id:'server',name:'Fixture',run:{state:'running'}};
 const ports=[{id:'main',port:25565,protocol:'tcp',name:'Game'}];
 window.calls??=[];
 window.amberDesktop={server:async(action,...args)=>{
   window.calls.push(action);
   if(action==='sakuraCatalog')return {nodes:[{id:1,name:'Test node'}],tunnels:[{id:42,node:1,name:'Test tunnel'}]};
   if(action==='sakuraAddNode')update(s=>({...s,nodes:[{id:1,name:'Test node'}]}));
   if(action==='sakuraSave'){if(!window.retried){window.retried=true;throw Error('fixture failure');}
     update(s=>({...s,tunnels:[{...args[1],id:'link',serverName:'Fixture'}]}));}
   if(action==='host'){refresh(n=>({...n,room:{state:'running',role:'host',code:'fixture-invite',expires:Date.now()+50000}}));}
   if(action==='roomCheck177')return {linked:true,ready:true};
   if(action==='join' && args[0]==='ready'){refresh(n=>({...n,room:{state:'running',role:'guest',expires:Date.now()+60000,address:'127.0.0.1:25567'}}));return;}
   if(action==='join'){refresh(n=>({...n,room:{state:'failed',role:'guest',expires:Date.now()+50000}}));}
   if(action==='leave')refresh(n=>({...n,room:null}));
 }};
 window.amberDesktop.listInstances=async()=>[];
 window.amberDesktop.accounts=async()=>({accounts:[]});
 return <><RoomGuide177 visible network={network} current={current} instances={[current]} onRefresh={()=>{}}/>
 <SakuraNodes177 state={state} current={current} ports={ports} manage={()=>{}} act={fn=>fn()} refresh={()=>{}}/></>;
}
createRoot(document.getElementById('root')).render(<App/>);`;
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{
  name:'multiplayer177-fixture',enforce:'pre',
  resolveId(id){if(id===entry)return entry;},
  load(id){if(id===entry)return jsx;}
}]});
await server.listen();
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.AMBER_CHROMIUM||undefined,headless:true});
 const page=await browser.newPage();page.setDefaultTimeout(6000);
 await page.route('**/qa-room177.html',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div><script type="module" src="'+entry+'"></script>'}));
 // The isolated HTML does not use Vite's index.html React refresh preamble.
 await page.addInitScript(()=>{window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>x=>x;window.__vite_plugin_react_preamble_installed__=true;});
 await page.goto('http://127.0.0.1:'+server.httpServer.address().port+'/qa-room177.html');
 const button=(name,root=page)=>root.getByRole('button',{name,exact:true});
 const dialog=()=>page.getByRole('dialog');
 await button('我要开房').click();
 await page.getByText('高级设置',{exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'发现／中继节点'}).inputValue(),'tcp://easytier.weiai.org.cn:11010');
 await button('返回').click();
 await button('我要开房').click();await button('创建房间并获取邀请').click();
 assert.equal(await page.getByLabel('房间邀请码').inputValue(),'fixture-invite');
 await button('复制邀请码').click();await button('离开房间').click();
 await button('我要加入').click();
 await page.getByLabel('粘贴房主的邀请码').fill('fixture');
 await button('加入房间').click();await button('返回设置并重试').click();
 assert.equal(await page.getByLabel('粘贴房主的邀请码').inputValue(),'fixture');
 await page.getByLabel('粘贴房主的邀请码').fill('ready');
 await button('加入房间').click();await page.getByText('可进服',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Minecraft 直接连接地址').inputValue(),'127.0.0.1:25567');
 await button('离开房间').click();
 await button('新建节点').click();
 await dialog().getByRole('combobox').click();
 await page.getByRole('option',{name:/Test node/}).click();
 await button('取消',dialog()).click();
 assert.equal(await page.evaluate(()=>window.calls.includes('sakuraAddNode')),false);
 await button('新建节点').click();await dialog().getByRole('combobox').click();
 await page.getByRole('option',{name:/Test node/}).click();
 await button('新建节点',dialog()).evaluate(b=>{b.click();b.click();});
 await page.getByRole('heading',{name:'Test node'}).waitFor();
 await button('关联隧道…').click();await dialog().getByRole('combobox').first().click();
 await page.getByRole('option',{name:/Test tunnel/}).click();
 await button('关联隧道…',dialog()).click();
 await dialog().getByRole('alert').waitFor();
 await button('关联隧道…',dialog()).evaluate(b=>{b.click();b.click();});
 await button('Test tunnel').waitFor();
 const calls=await page.evaluate(()=>window.calls);
 assert.equal(calls.filter(x=>x==='sakuraAddNode').length,1);
 assert.equal(calls.filter(x=>x==='sakuraSave').length,2);
 console.log('ROOM_AND_SAKURA_RENDERER_OK');
}finally{await browser?.close();await server.close();}
