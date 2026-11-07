// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {ControlButton as B} from './ControlButton.mjs';
import {Select} from './Select';
import {t as translateText,translateMessage} from '../desktop/localization.mjs';
export function MinecraftImportDialog({onClose,onImported}){
 const ref=useRef(null),[scan,setScan]=useState(null),[key,setKey]=useState(''),[name,setName]=useState(''),[groups,setGroups]=useState(['saves','mods','config','resourcepacks','shaderpacks','screenshots','options.txt','servers.dat']),[summary,setSummary]=useState(null),[busy,setBusy]=useState(false),[reading,setReading]=useState(false),[error,setError]=useState(''),[closed,setClosed]=useState(false),[allowEmpty,setAllowEmpty]=useState(false),[progress,setProgress]=useState(null),[gameDir,setGameDir]=useState(''),[game,setGame]=useState(''),[versions,setVersions]=useState([]),[retry,setRetry]=useState(0),api=window.amberDesktop;
 const row=scan?.rows.find(p=>p.key===key),request=JSON.stringify([scan?.id,key,groups,gameDir,game,retry]);
 const current=summary?.request===request?summary:null;
 useEffect(()=>{const old=document.activeElement;ref.current.showModal();return()=>old?.focus?.()},[]);
 useEffect(()=>{
  if(!scan||!key)return;let live=true;setReading(true);setSummary(null);setAllowEmpty(false);setError('');
  api.minecraftImport('preview',scan.id,key,groups,{gameDir,game}).then(v=>{if(live){setSummary({...v,request});if(v.validation.versions)setVersions(v.validation.versions)}}).catch(e=>live&&setError(e.message)).finally(()=>live&&setReading(false));
  return()=>{live=false};
 },[request]);
 useEffect(()=>{if(!busy)return;const timer=setInterval(()=>api.minecraftImport('status').then(setProgress).catch(()=>{}),300);return()=>clearInterval(timer)},[busy]);
 function select(p){setKey(p?.key||'');setName((p?.name||'').slice(0,60));setGameDir(p?.gameDir||'');setGame('');setVersions([]);setClosed(false);setError('');}
 async function pick(){setBusy(true);setError('');try{const s=await api.minecraftImport('pick');if(s){setScan(s);select(s.rows.find(p=>p.supported))}}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function pickData(){setBusy(true);setError('');try{const d=await api.minecraftImport('pick-data',scan.id,key);if(d){setScan(s=>({...s,rows:s.rows.map(p=>p.key===key?{...p,directories:[...p.directories.filter(x=>x.path!==d.path),d]}:p)}));setGameDir(d.path);setClosed(false);setRetry(n=>n+1)}}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function create(){setBusy(true);setProgress(null);setError('');try{const r=await api.minecraftImport('create',scan.id,key,{name,groups,previewId:current.id,allowEmpty});await onImported(r.instance);onClose()}catch(e){setError(e.message);setSummary(null)}finally{setBusy(false)}}
 const directoryLabel=d=>translateText(d.kind==='shared'?'共享游戏目录':d.kind==='isolated'?'版本隔离目录':d.kind==='configured'?'配置指定目录':'手动选择目录');
 return <dialog ref={ref} className="dialog minecraft-import134" aria-labelledby="minecraft-import-title" onCancel={e=>{if(busy)e.preventDefault();else onClose()}}>
  <div className="dialog-head"><h2 id="minecraft-import-title">{translateText("导入已有 .minecraft")}</h2></div>
  <div className="dialog-body">
   <p>{translateText("复制所选游戏数据到新实例，保留原目录。账号、登录凭据和自定义启动命令不会导入。")}</p>
   <B className="button secondary" disabled={busy} onClick={pick}>{translateText("选择 .minecraft 文件夹…")}</B>
   {scan&&<>
    <p className="import-path134">{scan.root}</p>
    <label className="field">{translateText("版本 / 启动配置")}<Select disabled={busy} value={key} onChange={e=>select(scan.rows.find(p=>p.key===e.target.value))}>
     {!key&&<option value="">{translateText("无可识别配置")}</option>}{scan.rows.map(p=><option key={p.key} value={p.key} disabled={!p.supported}>{p.name} · {p.versionId}</option>)}
    </Select></label>
    {scan.rows.some(p=>!p.supported)&&<details><summary>{translateText("无法识别的配置")}</summary>{scan.rows.filter(p=>!p.supported).map(p=><p className="import-path134" key={p.key}>{p.name}: {translateMessage(p.reason)}</p>)}</details>}
    {row&&<>
     <p className="import-path134">{translateText("来源版本标识：")}{row.versionId}<br/>{translateText("加载器：")}{row.loader} {row.version}</p>
     <label className="field">{translateText("游戏数据来源")}<Select disabled={busy} value={gameDir} onChange={e=>{setGameDir(e.target.value);setClosed(false)}}>
      <option value="">{translateText("请选择实际游戏目录")}</option>{row.directories.map(d=><option key={d.path} value={d.path}>{directoryLabel(d)} · {d.path}</option>)}
     </Select></label>
     <B className="text-button" disabled={busy} onClick={pickData}>{translateText("选择其他游戏数据目录…")}</B>
     <p className="muted">{translateText("共享目录可能由多个启动配置共用。请核对来源和所选内容；不确定时选择实际使用的隔离目录。")}</p>
     {!!versions.length&&<label className="field">{translateText("确认 Minecraft 基础版本")}<Select disabled={busy} value={game} onChange={e=>setGame(e.target.value)}><option value="">{translateText("请根据原启动器确认版本")}</option>{versions.map(v=><option key={v} value={v}>{v}</option>)}</Select></label>}
     <label className="field">{translateText("新实例名称")}<input disabled={busy} maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label>
     <fieldset disabled={busy} className="import-groups134"><legend>{translateText("复制的内容")}</legend>{scan.groups.map(g=><label className="check131" key={g}><input type="checkbox" checked={groups.includes(g)} onChange={e=>setGroups(e.target.checked?[...groups,g]:groups.filter(x=>x!==g))}/><span>{g}</span></label>)}</fieldset>
     {reading&&<p role="status">{translateText("正在检查版本与所选文件…")}</p>}
     {current&&<div className="import-summary151" aria-live="polite">
      {current.gameDir&&<><p className="import-path134">{translateText("实际复制来源：")}{current.gameDir}</p><p>{current.files} {translateText("个文件")} · {(current.bytes/1048576).toFixed(1)} MB ({current.bytes.toLocaleString()} B)</p></>}
      {current.validation.state==='ready'?<p>Minecraft {current.validation.game} · {row.loader} {row.version}</p>:<p role="status">{translateMessage(current.validation.reason)}</p>}
      {current.needsDirectory&&<p>{translateText("检测到多个可能目录，请先选择实际游戏目录。")}</p>}
      {current.files===0&&<><p>{translateText("所选内容中没有文件：可能未选择内容、目录尚未使用，或实际数据在其他位置。这不代表数据已完整迁移。")}</p><label className="check131"><input type="checkbox" disabled={busy} checked={allowEmpty} onChange={e=>setAllowEmpty(e.target.checked)}/><span>{translateText("确认不复制游戏数据，仅创建运行环境")}</span></label></>}
     </div>}
     <label className="check131"><input type="checkbox" disabled={busy} checked={closed} onChange={e=>setClosed(e.target.checked)}/><span>{translateText("已核对数据来源，原游戏已退出，导入期间不修改源文件。")}</span></label>
    </>}
   </>}
   {busy&&<div role="status"><p>{translateMessage(progress?.job?.phase||translateText("正在读取…"))} {progress?.job?.total>0&&`${progress.job.completed} / ${progress.job.total}`}</p>{progress?.busy&&<B className="button secondary" onClick={()=>api.minecraftImport('cancel').catch(e=>setError(e.message))}>{translateText("取消导入")}</B>}</div>}
   {error&&<p className="error" role="alert">{translateMessage(error)}</p>}
  </div>
  <div className="dialog-actions"><B className="button secondary" disabled={busy} onClick={onClose}>{translateText("关闭")}</B>{key&&<B className="button secondary" disabled={busy||reading} onClick={()=>setRetry(n=>n+1)}>{translateText("重新预览")}</B>}<B className="button" disabled={busy||reading||!current?.id||current.validation.state!=='ready'||!key||!name.trim()||!closed||current.files===0&&!allowEmpty} onClick={create}>{current?.files===0?translateText("仅创建运行环境"):translateText("复制并安装")}</B></div>
 </dialog>;
}
