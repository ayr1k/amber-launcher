import {searchCommands} from './search133.mjs';
import {th} from './ThemeCanvas';
import {ControlButton} from './ControlButton.mjs';
// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {useLocale} from './Locale';
import {wb} from './Workbench';
import {InstanceIcon} from './InstanceIcon';
export function QuickSearch({instances,current,onClose,onChoose,onNavigate,onCreate,mode='local',onMode}){useLocale();const dialog=useRef(null),input=useRef(null),[query,setQuery]=useState(''),[index,setIndex]=useState(0);
 const scope=mode==='online'?th('联机','Online'):th('本地','Local');
 const commands=searchCommands(mode,!!current).map(([id,zh,en,keywords])=>({id:'cmd-'+id,label:th(zh,en),detail:scope,keywords,run:id==='create'?onCreate:()=>onNavigate(id)}));
 commands.push({id:'cmd-mode',label:mode==='online'?th('切换到本地模式','Switch to local mode'):th('切换到联机模式','Switch to online mode'),detail:th('工作模式','Workspace mode'),keywords:'switch local online 切换 本地 联机',run:()=>onMode?.(mode==='online'?'local':'online')});
 const rows=[...instances.map(i=>({id:i.id,label:i.name,detail:scope+' · '+i.game+' · '+(i.type||i.loader),keywords:'instance 实例 '+(mode==='online'?'server 服务端':'local 本地'),icon:i.icon||'grass',run:()=>onChoose(i.id)})),...commands].filter(r=>(r.label+' '+r.detail+' '+r.keywords).toLowerCase().includes(query.toLowerCase().trim())).slice(0,30);
 useEffect(()=>{const previous=document.activeElement;dialog.current.showModal();input.current.focus();return()=>previous?.focus();},[]);
 useEffect(()=>{setIndex(0);},[query]);
 useEffect(()=>{dialog.current?.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'});},[index]);
 function choose(r){if(!r)return;onClose();r.run();}
 return <dialog className="quick-search workbench-dialog" ref={dialog} aria-labelledby="quick-title" onCancel={e=>{e.preventDefault();onClose();}}><header><h2 id="quick-title">{wb('search')}</h2><ControlButton className="text-button" onClick={onClose} aria-label={wb('close')}>×</ControlButton></header><input ref={input} value={query} placeholder={wb('searchHint')} aria-label={wb('search')} role="combobox" aria-expanded="true" aria-controls="quick-results" aria-activedescendant={rows[index]?'quick-'+rows[index].id:undefined} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setIndex(n=>Math.max(0,Math.min(rows.length-1,n+(e.key==='ArrowDown'?1:-1))));}if(e.key==='Enter'){e.preventDefault();choose(rows[index]);}}}/><div className="quick-results" role="listbox" id="quick-results">{rows.map((r,n)=><ControlButton role="option" id={'quick-'+r.id} aria-selected={n===index} key={r.id} onMouseEnter={()=>setIndex(n)} onClick={()=>choose(r)}>{r.icon&&<InstanceIcon icon={r.icon}/>}<span><strong>{r.label}</strong><small>{r.detail}</small></span><span aria-hidden="true">↗</span></ControlButton>)}{!rows.length&&<p>{wb('noResults')}</p>}</div></dialog>;
}
