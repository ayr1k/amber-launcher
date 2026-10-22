import {StoragePanel,Onboarding} from './StoragePanel';
import {BackupPanel} from './BackupPanel';
// SPDX-License-Identifier: MPL-2.0
import {Play,Stack,DownloadSimple,UserCircle,Gear,ClockCounterClockwise} from '@phosphor-icons/react';
import {TaskCenter} from './TaskCenter';
import {useState,useEffect,useRef} from 'react';
import {LocalLibrary} from './NativeLibrary';
import {AboutProject} from './ProjectPanels';
import {ContentStore} from './ContentStore';
import {SetupDialog} from './SetupDialog';
import {Preferences,defaultPreferences} from './Preferences';
import {MigrationPanel} from './MigrationPanel';
import {AccountsPanel} from './Accounts';
import {InstanceManager} from './InstanceManager';
import {InstanceIcon} from './InstanceIcon';
import {LaunchHome} from './LaunchHome';
import {componentLabel} from '../desktop/compatibility.mjs';
const navIcons={home:Play,instances:Stack,content:DownloadSimple,accounts:UserCircle,settings:Gear,tasks:ClockCounterClockwise};
const nav=[['home','启动'],['instances','实例'],['content','内容下载'],['accounts','账号'],['settings','设置'],['tasks','任务']];
export function DesktopApp(){
 const [welcome,setWelcome]=useState(false);const scroller=useRef(null);const [focusLogs,setFocusLogs]=useState(false);function navigate(key){setFocusLogs(key==='logs');setPage(key==='logs'?'manage':key);}
 const api=window.amberDesktop,[creating,setCreating]=useState(false),[settings,setSettings]=useState(defaultPreferences),[systemDark,setSystemDark]=useState(matchMedia('(prefers-color-scheme: dark)').matches),[page,setPage]=useState('home'),[instances,setInstances]=useState([]),[active,setActive]=useState(()=>localStorage.getItem('amber.active')||''),[error,setError]=useState('');
 useEffect(()=>{if(scroller.current)scroller.current.scrollTop=0;},[page]);
 async function refresh(){const v=await api.listInstances();setInstances(v);}
 useEffect(()=>{api.info().catch(e=>setError(e.message));api.storageInfo?.().then(i=>setWelcome(!i.onboarded)).catch(e=>setError(e.message));api.settings?.().then(setSettings).catch(e=>setError(e.message));const mq=matchMedia('(prefers-color-scheme: dark)'),change=e=>setSystemDark(e.matches);mq.addEventListener('change',change);return()=>mq.removeEventListener('change',change);},[]);
 useEffect(()=>{let disposed=false;const tick=()=>api.listInstances().then(v=>!disposed&&setInstances(v)).catch(e=>!disposed&&setError(e.message));tick();const timer=setInterval(tick,1500);return()=>{disposed=true;clearInterval(timer);};},[]);
 function select(id,home=false){setActive(id);localStorage.setItem('amber.active',id);if(home)setPage('home');}
 const current=instances.find(i=>i.id===active)||instances[0],layout=settings.layout;
 const primary=<nav className="primary-nav" aria-label="主要导航">{nav.map(([key,label])=><button key={key} aria-current={(page===key||key==='instances'&&['manage','mods','migration','backups'].includes(page))?'page':undefined} onClick={()=>setPage(key)}>{(()=>{const Icon=navIcons[key];return <Icon size={20}/>;})()}<span>{label}</span></button>)}</nav>;
 function created(item,destination='home'){setInstances(items=>[item,...items.filter(i=>i.id!==item.id)]);select(item.id);setPage(destination);setCreating(false);refresh().catch(e=>setError(e.message));}
 return <div className={'app desktop-app shell-v6 nav-'+layout.navigation+' '+(settings.theme==='dark'||settings.theme==='system'&&systemDark?'dark ':'')+(settings.density==='compact'?'compact ':'')+(!settings.motion?'no-motion':'')} data-ui-style={settings.uiStyle||'square'} data-accent={settings.accent} data-content-width={layout.contentWidth} style={{fontSize:settings.fontSize,'--panel-opacity':(settings.panelOpacity??100)+'%','--sidebar-width':layout.sidebarWidth+'px'}}>
 <header className="topbar"><a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('home');}}><img src="/brand/amber-lockup.svg" alt="AMBER"/></a>{layout.navigation==='top'?primary:<span className="prototype-badge">{api.preview?'UI 样例 · 无真实安装':'BETA 1.1 · 桌面开发版'}</span>}<label className="header-instance"><span>当前实例</span><select aria-label="当前实例" value={current?.id||''} onChange={e=>select(e.target.value)}>{!instances.length&&<option value="">尚未创建</option>}{instances.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select></label></header>
 <aside className="sidebar">{primary}<div className="sidebar-heading"><h2>快速切换</h2><button className="text-button" onClick={()=>setCreating(true)}>＋ 创建</button></div><nav className="instance-list" aria-label="实例快捷列表">{instances.map(i=><button key={i.id} className={'instance-row '+(current?.id===i.id?'selected':'')} onClick={()=>select(i.id)}><InstanceIcon icon={i.icon}/><span><strong>{i.name}</strong><small>{i.game} · {i.loader}{i.liteVersion?' + LiteLoader':''}</small></span></button>)}{!instances.length&&<p className="desktop-empty">创建第一个实例，开始冒险。</p>}</nav><div className="sidebar-bottom"><button onClick={()=>setPage('about')}>关于 AMBER</button></div></aside>
 <main className="workspace"><div className="workspace-scroll" ref={scroller}><div className="main-content desktop-content page-enter" key={page}>{error&&<p className="error" role="alert">{error}</p>}
 {page==='home'?<LaunchHome instance={current} settings={settings} onCreate={()=>setCreating(true)} onNavigate={navigate}/>:page==='instances'?<InstanceManager onBackups={()=>setPage('backups')} instances={instances} settings={settings} onCreate={()=>setCreating(true)} onSelect={select} onManage={id=>{select(id);setPage('manage');}} onRefresh={refresh}/>:['manage','mods','migration','backups'].includes(page)?<><div className="page-heading"><div><button className="text-button" onClick={()=>setPage('instances')}>← 全部实例</button><h1>{current?.name||'实例管理'}</h1><p>{current?`Minecraft ${current.game} · ${componentLabel(current)}`:'请先创建或选择实例'}</p></div><button className="button secondary" onClick={()=>setPage('home')}>返回启动</button></div><nav className="store-tabs" aria-label="实例管理"><button aria-pressed={page==='manage'} onClick={()=>setPage('manage')}>版本设置与修复</button><button aria-pressed={page==='mods'} onClick={()=>setPage('mods')}>模组与内容管理</button><button aria-pressed={page==='migration'} onClick={()=>setPage('migration')}>跨版本迁移</button><button aria-pressed={page==='backups'} onClick={()=>setPage('backups')}>备份与恢复</button></nav>{page==='backups'?<BackupPanel instance={current} onRestored={i=>created(i,'tasks')}/>:page==='manage'?<LocalLibrary onNavigate={navigate} focusLogs={focusLogs} selected={current?.id} onSelect={select} settings={settings} managementOnly/>:page==='mods'?<ContentStore onTasks={()=>setPage('tasks')} onCreate={()=>setCreating(true)} onLaunch={()=>setPage('home')} key={current?.id} initialTab="local" embedded instance={current} onCreated={created}/>:<MigrationPanel key={current?.id} instance={current}/>}</>:page==='content'?<><ContentStore onTasks={()=>setPage('tasks')} onCreate={()=>setCreating(true)} onLaunch={()=>setPage('home')} key={current?.id} onCreated={created} instance={current}/></>:page==='tasks'?<TaskCenter instances={instances} settings={settings} onOpen={(id,destination)=>{select(id);navigate(destination);}}/>:page==='accounts'?<AccountsPanel/>:page==='settings'?<><Preferences value={settings} onChange={setSettings}/><StoragePanel/><button className="text-button" onClick={()=>setWelcome(true)}>重新查看入门引导</button></>:<AboutProject/>}
 {layout.navigation==='top'&&<footer className="workspace-footer"><button className="text-button" onClick={()=>setPage('about')}>关于 AMBER</button><span>BETA 1.1 · MPL-2.0</span></footer>}
 </div></div></main>{welcome&&<Onboarding onDone={destination=>{setWelcome(false);if(destination==='create')setCreating(true);else setPage(destination);}}/>}{creating&&<SetupDialog settings={settings} onClose={()=>setCreating(false)} onCreated={created}/>}</div>;
}


