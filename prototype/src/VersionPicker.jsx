// SPDX-License-Identifier: MPL-2.0
import {useState} from 'react';
import {InstanceIcon} from './InstanceIcon';
export function groupVersions(versions){return [{key:'release',label:'正式版'},{key:'snapshot',label:'快照 / 预览版'},{key:'historical',label:'远古版本'}].map(g=>({...g,versions:versions.filter(v=>g.key==='historical'?!['release','snapshot'].includes(v.type):v.type===g.key)}));}
function VersionRows({versions,value,onSelect}){const [limit,setLimit]=useState(40);return <><div className="version-picker-list">{versions.slice(0,limit).map(v=><button type="button" key={v.id} aria-pressed={value===v.id} onClick={()=>onSelect(v.id)}><strong>{v.id}</strong><small>{v.releaseTime?.slice(0,10)}</small><span>{value===v.id?'✓ 已选择':'选择 →'}</span></button>)}</div>{versions.length>limit&&<button type="button" className="text-button" onClick={()=>setLimit(n=>n+80)}>再显示 {Math.min(80,versions.length-limit)} 个版本</button>}</>;}
export function VersionPicker({versions,value,onSelect,loading,error,onRetry}){
 const [query,setQuery]=useState('');const found=versions.filter(v=>v.id.toLowerCase().includes(query.trim().toLowerCase()));
 const latest=['release','snapshot'].map(type=>versions.find(v=>v.type===type)).filter(Boolean);
 return <div className="version-catalog"><label className="catalog-search">搜索 Minecraft 版本<input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="输入版本号，例如 1.21.4 或 1.12.2"/></label>{!query&&latest.length>0&&<section className="latest-versions"><h3>快速选择</h3>{latest.map(v=><button type="button" key={v.id} aria-pressed={value===v.id} onClick={()=>onSelect(v.id)}><InstanceIcon icon={v.type==='release'?'grass':'anvil'}/><span><strong>{v.id}</strong><small>{v.type==='release'?'最新正式版':'最新快照'}{v.releaseTime?' · '+v.releaseTime.slice(0,10):''}</small></span><span>{value===v.id?'✓':'→'}</span></button>)}</section>}
 {groupVersions(found).map(g=>g.versions.length>0&&<details className="version-group" key={g.key+'-'+!!query} open={query?true:undefined}><summary>{g.label}<span>{g.versions.length}</span></summary><VersionRows key={g.key+query} versions={g.versions} value={value} onSelect={onSelect}/></details>)}
 {!found.length&&<p role="status">{loading?'正在读取 Mojang 官方版本目录…':error?'版本目录暂时无法读取。':query?'没有匹配的版本，请缩短关键词。':'目录中暂时没有版本。'}</p>}{error&&<button type="button" className="button secondary" onClick={onRetry}>重新读取版本目录</button>}
 </div>;
}
