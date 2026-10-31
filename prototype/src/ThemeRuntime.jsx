// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {th} from './ThemeCanvas';
export function ThemeRecovery({onChange}){
 const [pending,setPending]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 const api=window.amberDesktop;
 useEffect(()=>{let live=true;const update=async()=>{try{const p=await api.themeState?.();if(live)setPending(p);}catch{}};update();const timer=setInterval(update,500);const off=api.onThemeChanged?.(()=>api.settings().then(s=>{if(live)onChange(s);}));const key=e=>{if(e.ctrlKey&&e.shift&&e.key==='F12'){e.preventDefault();setOpen(true);}};window.addEventListener('keydown',key);return()=>{live=false;clearInterval(timer);off?.();window.removeEventListener('keydown',key);};},[]);
 async function act(fn){setBusy(true);try{onChange(await fn());setPending(await api.themeState?.());setOpen(false);setError('');}catch(e){setError(e.message);}finally{setBusy(false);}}
 if(!pending&&!open)return null;
 return createPortal(<div className="theme-recovery" role="region" aria-label={th('主题恢复','Theme recovery')}><strong>{pending?th('保留这个外观？','Keep this appearance?'):th('恢复经典外观','Restore classic appearance')}</strong><p>{pending?th('未确认将自动恢复，剩余 ','Reverts automatically in ')+Math.max(0,Math.ceil((pending.expires-Date.now())/1000))+th(' 秒',' seconds'):th('仅恢复外观，不影响账号或实例。','Only appearance changes. Accounts and instances are untouched.')}</p><div>{pending&&<button disabled={busy} onClick={()=>act(()=>api.themeConfirm(pending.id))}>{th('保留','Keep')}</button>}<button disabled={busy} onClick={()=>act(()=>pending?api.themeRevert():api.themeReset())}>{pending?th('恢复原样','Revert'):th('恢复默认','Restore defaults')}</button>{!pending&&<button onClick={()=>setOpen(false)}>{th('取消','Cancel')}</button>}</div>{error&&<p role="alert">{error}</p>}</div>,document.body);
}
