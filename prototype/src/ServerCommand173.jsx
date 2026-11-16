// SPDX-License-Identifier: MPL-2.0
import {useEffect,useId,useRef,useState} from 'react';
import {ControlButton as Button} from './ControlButton.mjs';
import {t as translateText,translateMessage} from '../desktop/localization.mjs';
import {ConsoleHistory173} from './console-history173.mjs';
import {Modal145} from './Modal145';
import './server173.css';

export function ServerCommand173({serverId,running,busy}){
 const history=useRef(new ConsoleHistory173()),pending=useRef(false),hint=useId();
 const [command,setCommand]=useState(''),[state,setState]=useState(''),[error,setError]=useState(''),[showError,setShowError]=useState(false);
 useEffect(()=>{if(!['sent','cleared'].includes(state))return;const timer=setTimeout(()=>setState(''),2500);return()=>clearTimeout(timer);},[state]);
 async function send(e){
  e.preventDefault();if(pending.current||busy||!running||!command.trim())return;
  pending.current=true;setState('sending');setError('');setShowError(false);
  try{await window.amberDesktop.server('command',serverId,command);setCommand(history.current.sent(command));setState('sent');}
  catch(e){setError(translateMessage(e.message));setState('failed');}
  finally{pending.current=false;}
 }
 function browse(e){
  if(pending.current||e.isComposing||e.nativeEvent.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||!['ArrowUp','ArrowDown'].includes(e.key))return;
  const value=history.current.browse(e.key==='ArrowUp'?'up':'down',command);
  if(value!==null){e.preventDefault();setCommand(value);}
 }
 return <div className="server-command173"><form className="server-command132" onSubmit={send} aria-busy={state==='sending'}>
  <input aria-label={translateText("服务端指令")} aria-describedby={hint} placeholder={translateText("输入指令，例如 list / whitelist add 玩家名")} value={command} maxLength={2000} readOnly={state==='sending'} onChange={e=>setCommand(e.target.value)} onKeyDown={browse}/>
  <Button className="button" disabled={busy||state==='sending'||!running||!command.trim()} type="submit">{state==='sending'?translateText("发送中…"):translateText("发送")}</Button>
 </form><div className="server-command-tools173"><small id={hint} title={translateText("↑ / ↓ 浏览本次会话最近 100 条已发送指令；仅存于内存。") }><span className="server-command-result173" role="status">{state==='sent'?translateText("指令已发送，请在控制台确认执行结果。"):state==='failed'?<Button type="button" className="text-button error" onClick={()=>setShowError(true)}>{translateText("发送失败，输入已保留。查看详情")}</Button>:state==='cleared'?translateText("指令历史已清空。"):translateText("↑ / ↓ 历史 · 仅存本次会话")}</span></small><Button type="button" className="text-button" disabled={state==='sending'||!history.current.entries.length} onClick={()=>{setCommand(history.current.clear(command));setError('');setState('cleared');}}>{translateText("清空指令历史")}</Button></div>
 {showError&&<Modal145 title={translateText("指令发送失败")} onClose={()=>setShowError(false)}><div className="modal-body145 error" role="alert">{error}</div></Modal145>}</div>;
}
