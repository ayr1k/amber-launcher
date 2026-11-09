import {memoryResultLabel160} from './Preferences160';
// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {th} from './ThemeCanvas';
import {useLocale} from './Locale';
import {CheckSetting} from './SettingRow';
import {ControlButton as Button} from './ControlButton.mjs';
export function PrelaunchSettings164({value,busy,change}){
 return <section className="native-section"><h2>{th('启动前内存整理','Prelaunch memory trimming')}</h2><CheckSetting title={th('启动 Minecraft 前自动保守整理','Trim conservatively before Minecraft starts')} description={th('默认关闭，保存后对下次启动生效。只整理当前启动器主进程的 Windows 工作集，不触及游戏、服务端、其他应用或系统缓存；不改变 Java 堆。','Off by default; saved for the next launch. Trims only this launcher main process’s Windows working set, excluding games, servers, other apps and system caches. Does not change the Java heap.')} checked={value.prelaunchMemory164===true} disabled={busy||!window.amberDesktop?.prelaunch164} onChange={e=>change('prelaunchMemory164',e.target.checked)}/><p>{th('每次启动最多一次，冷却 30 秒，最多等待 3 秒。失败或不支持时继续启动；可跳过整理，也可取消整个启动。工作集可能立即回弹，可能增加缺页和磁盘读取，尚无游戏帧率收益证据。激进档仍须手动确认。','At most once per launch, with a 30-second cooldown and a 3-second wait limit. Failure or unsupported platforms do not block launch. Skip trimming or cancel the whole launch separately. Working sets can rebound immediately; page faults and disk reads may increase. No game FPS benefit has been established. Aggressive mode still requires manual confirmation.')}</p></section>;
}
export function prelaunchLabel164(status){
 const labels={disabled:['未开启','Disabled'],unsupported:['当前平台不支持，继续启动','Unsupported platform; continuing'],busy:['已有整理正在执行，跳过','Another trim is active; skipped'],cooldown:['30 秒冷却中，跳过','30-second cooldown; skipped'],'settings-unavailable':['无法读取设置，跳过','Settings unavailable; skipped'],trimmed:['已请求整理；不代表永久释放或性能提升','Trim requested; not permanent reclamation or a performance gain'],'not-trimmed':['未能整理，继续启动','Unable to trim; continuing'],failed:['整理失败，继续启动','Trim failed; continuing'],timeout:['整理超时，继续启动','Trim timed out; continuing'],cancelled:['已跳过整理，继续启动','Trimming skipped; continuing'],'launch-cancelled':['整个启动已取消','Whole launch cancelled']};
 return th(...(labels[status]||['等待结果','Waiting for result']));
}
export function PrelaunchStatus164(){
 useLocale();const [state,setState]=useState(null),[dismissed,setDismissed]=useState(null),[error,setError]=useState('');
 useEffect(()=>{if(!window.amberDesktop?.prelaunch164)return;let live=true,timer;const poll=async()=>{try{const next=await window.amberDesktop.prelaunch164('state');if(live)setState(next);}catch{}finally{if(live)timer=setTimeout(poll,150);}};poll();return()=>{live=false;clearTimeout(timer);};},[]);
 const active=state?.active?.phase==='launched'?null:state?.active,last=state?.last;
 if(!active&&(!last||last.status==='disabled'||last.id===dismissed))return null;
 async function cancel(kind){try{await window.amberDesktop.prelaunch164('cancel',active.id,kind);setError('');}catch(e){setError(e.message);}}
 return <aside className="prelaunch164" aria-label={th('游戏启动状态','Game launch status')}><div role="status">{active?<strong>{active.phase==='memory'?th('正在整理启动器内存…','Trimming launcher memory…'):th('正在准备游戏启动…','Preparing game launch…')}</strong>:null}{last&&(!active||last.id===active.id)&&<p>{prelaunchLabel164(last.status)} · {last.elapsedMs} ms{last.rows?.map(row=><span key={row.pid}> · PID {row.pid}: {memoryResultLabel160(row)}</span>)}</p>}</div><div className="prelaunch164-actions">{active?<><Button className="button secondary" disabled={active.phase!=='memory'} onClick={()=>cancel('memory')}>{th('跳过整理，继续启动','Skip trim, continue launch')}</Button><Button className="button secondary" onClick={()=>cancel('launch')}>{th('取消整个启动','Cancel entire launch')}</Button></>:<Button className="text-button" onClick={()=>setDismissed(last.id)}>{th('关闭','Dismiss')}</Button>}</div>{error&&<p role="alert">{error}</p>}</aside>;
}
