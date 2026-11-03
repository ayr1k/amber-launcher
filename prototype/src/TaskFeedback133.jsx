// SPDX-License-Identifier: MPL-2.0
import {useCallback,useEffect,useRef,useState} from 'react';
import {ControlButton as Button} from './ControlButton.mjs';
import {ProblemNotice} from './ProblemNotice';
import {jobStage} from './job-stage.mjs';
import {th} from './ThemeCanvas';
import {useLocale} from './Locale';
import {activeTask,observeTasks,mayDismissTasks} from './task-feedback133.mjs';
export function TaskFeedback({instances,hidden,onTasks,onInstance}) {
 useLocale();const [jobs,setJobs]=useState([]),[expanded,setExpanded]=useState(false),[revision,setRevision]=useState(0),[error,setError]=useState(''),[held,setHeld]=useState(false);
 const seen=useRef(null),tracked=useRef(new Set());
 const [closing,setClosing]=useState(false);
 const dismiss=useCallback(()=>setClosing(true),[]);
 useEffect(()=>{if(!closing)return;const timer=setTimeout(()=>{tracked.current.clear();setJobs([]);setExpanded(false);setHeld(false);setError('');setClosing(false);},180);return()=>clearTimeout(timer);},[closing]);
 useEffect(()=>{let live=true,busy=false;const tick=async()=>{if(busy)return;busy=true;try{const status=await window.amberDesktop.status();if(!live)return;const next=observeTasks(seen.current,status.jobs||[]);seen.current=next.seen;if(next.changed.length){setClosing(false);next.changed.forEach(j=>tracked.current.add(j.id));setExpanded(true);setRevision(v=>v+1);}setJobs((status.jobs||[]).filter(j=>tracked.current.has(j.id)).slice().reverse());}catch{}finally{busy=false;}};tick();const timer=setInterval(tick,700);return()=>{live=false;clearInterval(timer);};},[]);
 const dismissible=mayDismissTasks(jobs);
 useEffect(()=>{if(!expanded)setHeld(false);},[expanded]);
 useEffect(()=>{if(!dismissible||held)return;const timer=setTimeout(dismiss,5000);return()=>clearTimeout(timer);},[dismissible,held,revision,dismiss]);
 async function cancel(id){try{await window.amberDesktop.cancel(id);setError('');}catch(e){setError(e.message);}}
 if(!jobs.length)return null;
 const running=jobs.filter(activeTask).length,issues=jobs.filter(j=>['failed','cancelled'].includes(j.state)).length;
 return <aside className={'task-feedback133'+(closing?' is-closing':'')} hidden={hidden} aria-label={th('下载任务','Download tasks')}>
 <div className="task-feedback-head133"><Button className="text-button" aria-expanded={expanded} aria-controls="task-feedback-body133" onClick={()=>setExpanded(v=>!v)}>{running?th('进行中','In progress')+' · '+running:issues?th('需要处理','Needs attention')+' · '+issues:th('已完成','Completed')+' · '+jobs.length} {expanded?'▾':'▴'}</Button><div className="task-feedback-head-actions133"><Button className="text-button" onClick={onTasks}>{th('任务中心 →','Task center →')}</Button><Button className="text-button" onClick={dismiss} aria-label={th('关闭','Close')} title={th('关闭','Close')}>×</Button></div></div>
 {expanded&&<div id="task-feedback-body133" className="task-feedback-body133" onMouseEnter={()=>setHeld(true)} onMouseLeave={()=>setHeld(false)} onFocusCapture={()=>setHeld(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHeld(false);}}><ProblemNotice error={error}/>{jobs.slice(0,30).map(j=>{const instance=instances.find(i=>i.id===j.instanceId);return <article key={j.id}><strong>{instance?.name||j.instanceId||th('下载任务','Download task')}</strong><p role="status">{jobStage(j)}</p>{activeTask(j)&&j.total>0&&<progress max={j.total} value={j.completed||0}/>}<ProblemNotice error={j.error}/><div className="task-feedback-actions133">{activeTask(j)?<Button className="text-button" disabled={j.cancellationRequested} onClick={()=>cancel(j.id)}>{th('取消操作','Cancel')}</Button>:instance&&<Button className="text-button" onClick={()=>onInstance(instance,'mods')}>{th('查看已安装内容','View installed content')}</Button>}{instance&&j.state==='done'&&<Button className="text-button" onClick={()=>onInstance(instance,'home')}>{instance.server?th('前往服务端','Go to server'):th('前往启动游戏 →','Go to launch →')}</Button>}{['failed','cancelled'].includes(j.state)&&<Button className="text-button" onClick={onTasks}>{th('查看并处理','Review task')}</Button>}</div></article>;})}</div>}
 </aside>;
}
