// SPDX-License-Identifier: MPL-2.0
import {useRef,useState} from 'react';
import {ControlButton} from './ControlButton.mjs';
import {t as translateText} from '../desktop/localization.mjs';
import {connectionAddress172,localAddress172} from '../desktop/server-address172.mjs';
import './addresses172.css';
const text=(zh,en)=>translateText(zh);
function Address({value,strong=false}) {
 const [result,setResult]=useState(''),[busy,setBusy]=useState(false),pending=useRef(false);
 async function copy() {
  if(pending.current)return;
  pending.current=true;setBusy(true);setResult('');
  try {await (window.amberDesktop?.copyServerAddress ? window.amberDesktop.copyServerAddress(value) : navigator.clipboard.writeText(value));setResult('success');}
  catch {setResult('failure');}
  finally {pending.current=false;setBusy(false);}
 }
 const label=text('复制地址','Copy address')+' '+value;
 return <span className="server-address172"><span className="server-address-value172">{strong?<strong>{value}</strong>:value}</span><ControlButton type="button" className="text-button server-address-copy172" disabled={busy||!connectionAddress172(value)} aria-label={label} title={label} onClick={copy}>{text('复制','Copy')}</ControlButton><span className={'server-address-result172'+(result==='failure'?' error':'')} role="status">{result==='success'?text('已复制','Copied'):result==='failure'?text('复制失败，请选中地址手动复制','Copy failed; select the address and copy manually'):''}</span></span>;
}
export function ServerAddresses172({addresses=[],port}) {
 const local=localAddress172(port,addresses);
 return <><div className="server-address-group172"><span>{text('本机地址：','Local address: ')}</span><Address key={local} value={local} strong/></div><div className="server-address-group172"><span>{text('局域网地址：','LAN addresses: ')}</span>{addresses.length?addresses.map((value,index)=><Address key={value+'-'+index} value={value}/>):'—'}</div></>;
}
