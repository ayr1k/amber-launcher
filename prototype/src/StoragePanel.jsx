// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState,useRef} from 'react';
export function StoragePanel({onBusy}){
 const api=window.amberDesktop,[info,setInfo]=useState(null),[target,setTarget]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{api.storageInfo().then(setInfo).catch(e=>setError(e.message));},[]);
 async function choose(){setError('');try{setTarget(await api.pickStorage());}catch(e){setError(e.message);}}
 async function move(){setBusy(true);onBusy?.(true);setError('');try{await api.moveStorage(target.token);}catch(e){setError(e.message);setBusy(false);onBusy?.(false);}}
 return <section className="native-section storage-panel"><h2>游戏数据位置</h2><p>实例、存档、Java、下载缓存和备份集中保存在这里。</p>{info&&<><code>{info.path}</code><p>所在磁盘可用空间：{(info.freeBytes/1073741824).toFixed(1)} GB</p></>}<button className="button secondary" disabled={busy} onClick={choose}>选择新的空文件夹…</button>{target&&<div className="content-feedback"><p>新位置：<code>{target.path}</code></p><p>复制并校验成功后自动重启。旧目录保留，不覆盖目标文件。请先退出所有游戏；迁移期间请勿修改数据目录。</p><button className="button" disabled={busy} onClick={move}>{busy?'正在复制并校验，请勿退出…':'迁移数据并重启 AMBER'}</button><button className="text-button" disabled={busy} onClick={()=>setTarget(null)}>取消</button></div>}{error&&<p className="error" role="alert">{error}</p>}</section>;
}
export function Onboarding({onDone}){
 const modal=useRef(null);useEffect(()=>{modal.current?.showModal();},[]);
 const [step,setStep]=useState(0),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function finish(destination){setBusy(true);try{await window.amberDesktop.completeOnboarding();onDone(destination);}catch(e){setError(e.message);setBusy(false);}}
 async function account(){setBusy(true);try{await window.amberDesktop.addOffline(name);localStorage.setItem('amber.offline-name',name);setStep(2);}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{modal.current?.querySelector('#welcome-title')?.focus();},[step]);
 const validName=/^[A-Za-z0-9_]{1,16}$/.test(name);
 return <dialog ref={modal} className="setup-overlay onboarding" aria-labelledby="welcome-title" onCancel={e=>e.preventDefault()}><section className="setup-v6">
  <header className="welcome-heading"><small>WELCOME TO AMBER · {step+1} / 3</small><h1 id="welcome-title" tabIndex={-1}>{['先为游戏安个家','选择你的游戏身份','准备好创建第一个实例'][step]}</h1></header>
  <div className="welcome-body">
   {step===0?<><StoragePanel onBusy={setBusy}/><p>默认目录可以直接使用，也可以迁移到其他磁盘。</p></>:step===1?<><p>可以先创建离线账号体验单人游戏。微软与第三方账号在“账号”页面添加。</p><label className="welcome-name">离线玩家名称<input maxLength={16} disabled={busy} value={name} onChange={e=>setName(e.target.value)} placeholder="例如 AmberPlayer" aria-describedby="welcome-name-help" aria-invalid={!!name&&!validName}/></label><small id="welcome-name-help" className={name&&!validName?'error':'muted'}>使用 1–16 位英文字母、数字或下划线。也可以稍后添加账号。</small></>:<p>选择 Minecraft 版本和加载器，AMBER 会准备 Java 并下载游戏。中途退出后可以在任务中心继续。</p>}
   {error&&<p role="alert" className="error">{error}</p>}
  </div>
  <footer className="welcome-footer">
   {step>0&&<button className="text-button welcome-back" disabled={busy} onClick={()=>{setStep(n=>n-1);setError('');}}>← 上一步</button>}
   <div className="welcome-actions">{step===0?<button className="button" disabled={busy} onClick={()=>setStep(1)}>使用当前位置，下一步 →</button>:step===1?<><button className="text-button" disabled={busy} onClick={()=>finish('accounts')}>前往添加其他账号</button><button className="text-button" disabled={busy} onClick={()=>{setError('');setStep(2);}}>稍后添加账号</button><button className="button" disabled={busy||!validName} onClick={account}>保存离线账号并继续</button></>:<><button className="text-button" disabled={busy} onClick={()=>finish('home')}>先进入启动器</button><button className="button" disabled={busy} onClick={()=>finish('create')}>创建实例 →</button></>}</div>
  </footer>
 </section></dialog>;
}
