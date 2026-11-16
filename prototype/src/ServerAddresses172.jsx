// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {ControlButton} from './ControlButton.mjs';
import {t as translateText} from '../desktop/localization.mjs';
import {connectionAddress172,localAddress172} from '../desktop/server-address172.mjs';
import './addresses172.css';
import './server173.css';
const text=(zh,en)=>translateText(zh);
function Address({value,strong=false}) {
 const [result,setResult]=useState(''),[busy,setBusy]=useState(false),pending=useRef(false);
 useEffect(()=>{if(result!=='success')return;const timer=setTimeout(()=>setResult(''),2500);return()=>clearTimeout(timer);},[result]);
 async function copy() {
  if(pending.current)return;
  pending.current=true;setBusy(true);setResult('');
  try {await (window.amberDesktop?.copyServerAddress ? window.amberDesktop.copyServerAddress(value) : navigator.clipboard.writeText(value));setResult('success');}
  catch {setResult('failure');}
  finally {pending.current=false;setBusy(false);}
 }
 const label=text('复制地址','Copy address')+' '+value;
 return <span className="server-address172"><span className="server-address-value172">{strong?<strong>{value}</strong>:value}</span><ControlButton type="button" className="text-button server-address-copy172" disabled={busy||!connectionAddress172(value)} aria-busy={busy} aria-label={label} title={label} onClick={copy}>{busy?translateText("复制中…"):text('复制','Copy')}</ControlButton><span className={'server-address-result172'+(result==='failure'?' error':'')} role="status">{result==='success'?text('已复制','Copied'):result==='failure'?text('复制失败，请选中地址手动复制','Copy failed; select the address and copy manually'):''}</span></span>;
}
export function ServerAddresses172({serverId,port,active}) {
 const [snapshot,setSnapshot]=useState({state:'loading'}),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  if(!active)return;
  let current=true;setSnapshot({state:'loading'});
  window.amberDesktop.server('addressInfo173',serverId).then(value=>{
   if(current)setSnapshot({state:'ready',...value});
  }).catch(()=>{if(current)setSnapshot({state:'failed'});});
  return()=>{current=false;};
 },[serverId,port,active,refresh]);
 const ready=snapshot.state==='ready',addresses=snapshot.addresses||[],local=ready?localAddress172(snapshot.port,addresses):null;
 return <section className="server-addresses173" aria-label={translateText("服务端地址")} aria-busy={snapshot.state==='loading'}><div className="server-address-toolbar173">{ready&&<div className="server-address-group172"><span>{text('本机地址：','Local address: ')}</span><Address key={local} value={local} strong/></div>}<ControlButton type="button" className="text-button" disabled={snapshot.state==='loading'} onClick={()=>{setSnapshot({state:'loading'});setRefresh(v=>v+1);}}>{snapshot.state==='loading'?translateText("正在刷新地址…"):translateText("刷新地址")}</ControlButton><span className={'server-address-status173'+(snapshot.state==='failed'?' error':'')} role="status">{snapshot.state==='failed'?translateText("地址获取失败，请重试刷新。"):ready?translateText("地址已刷新；可达性需实际连接确认。"):''}</span></div>
 {ready&&<div className="server-address-group172"><span>{text('局域网地址：','LAN addresses: ')}</span>{addresses.length?addresses.map(value=><Address key={value} value={value}/>):<span>{translateText("无可用局域网地址，请检查网络后刷新。")}</span>}</div>}
 <p className="server-address-note173">{translateText("本机：这台电脑；局域网：同网其他设备。Wi-Fi、VPN 或网卡变化后刷新；防火墙和监听设置会影响连接。")}</p></section>;
}
