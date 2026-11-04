// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {analyzeCrash} from '../desktop/crash136.mjs';
import {getLocale} from '../desktop/localization.mjs';
import {ControlButton as Button} from './ControlButton.mjs';
const label=(zh,en)=>getLocale().startsWith('en')?en:zh;
export function CrashReport({text}){const report=analyzeCrash(text,getLocale());return <section className="crash136"><h3>{label('崩溃原因分析','Crash analysis')}</h3><p>{report.summary}</p>{report.findings.map(f=><article key={f.id}><strong>{f.title}</strong><small> · {f.certainty==='possible'?label('可能原因','Possible cause'):label('日志明确报告','Reported by the log')}</small><p>{f.hint}</p><details><summary>{label('日志依据','Log evidence')}</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:240,overflow:'auto'}}>{f.evidence}</pre></details></article>)}</section>}
export function CrashAnalysis({instanceId,server=false}){
 const [result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setResult(null);setError('');},[instanceId,server]);
 async function read(importFile){setBusy(true);setError('');try{const r=await window.amberDesktop.analyzeLogs({id:instanceId,server,importFile});if(r)setResult(r);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section><div className="inline-actions"><Button className="button secondary" disabled={busy||!instanceId} onClick={()=>read(false)}>{label('分析最近一次运行','Analyze latest run')}</Button><Button className="button secondary" disabled={busy} onClick={()=>read(true)}>{label('选择日志分析…','Analyze a log file…')}</Button></div><p>{label('在本机分析，不上传日志。','Logs are analyzed locally and are not uploaded.')}</p>{busy&&<p role="status">{label('正在分析…','Analyzing…')}</p>}{error&&<p role="alert">{error}</p>}{result&&<><p>{result.sources.join(' · ')}</p><CrashReport text={result.text}/></>}</section>;
}
