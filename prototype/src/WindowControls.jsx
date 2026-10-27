import {IS_AMBERE,PRODUCT_NAME} from '../desktop/edition.mjs';
// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {useLocale} from './Locale';
import {t as translateText,translateMessage} from '../desktop/localization.mjs';
export function WindowControls() {
  useLocale();const api=window.amberDesktop;
  const [state,setState]=useState({maximized:false,focused:true}),[error,setError]=useState('');
  useEffect(()=>{let live=true;const update=s=>{if(live)setState(s);};api.windowState?.().then(update).catch(e=>setError(e.message));const off=api.onWindowState?.(update);return()=>{live=false;off?.();};},[]);
  async function act(action){try{await api.windowAction?.(action);setError('');}catch(e){setError(e.message);}}
  if(!api.windowAction)return null;
  return <div className="window-controls" data-focused={state.focused} role="group" aria-label={translateText("窗口操作")}>
    <button type="button" aria-label={translateText("最小化")} title={translateText("最小化")} onClick={()=>act('minimize')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5h10"/></svg></button>
    <button type="button" aria-label={state.maximized?translateText("还原窗口"):translateText("最大化")} title={state.maximized?translateText("还原窗口"):translateText("最大化")} onClick={()=>act('maximize')}><svg viewBox="0 0 16 16" aria-hidden="true">{state.maximized?<><path d="M6 5V3h7v7h-2"/><path d="M3 6h7v7H3z"/></>:<path d="M3 3h10v10H3z"/>}</svg></button>
    <button type="button" className="window-close" aria-label={translateText("关闭窗口")} title={translateText("关闭窗口")} onClick={()=>act('close')}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13"/></svg></button>
    {error&&<div className="window-error" role="alert">{translateMessage(error)}<button onClick={()=>setError('')}>{translateText("关闭提示")}</button></div>}
  </div>;
}
export function DialogWindowBar(){
  if(!window.amberDesktop?.windowAction)return null;
  return <div className="modal-windowbar"><span>{PRODUCT_NAME}</span><WindowControls/></div>;
}
