// SPDX-License-Identifier: MPL-2.0
import {useState} from 'react';
import {ControlButton as Button} from './ControlButton.mjs';
import {useLocale} from './Locale';
import {message,translateMessage} from '../desktop/localization.mjs';
const f=key=>message('feedback.'+key);
export function FeedbackPanel(){
 useLocale();const api=window.amberDesktop;
 const [open,setOpen]=useState(false),[fields,setFields]=useState({steps:'',expected:'',actual:''}),[summary,setSummary]=useState(null),[include,setInclude]=useState(false),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false);
 const change=fn=>{fn();setDraft('');setCopied(false);setError('');};
 async function act(fn){setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="privacy-group feedback-panel"><h3>{f('title')}</h3><p>{f('intro')}</p><Button className="button secondary" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{f(open?'hide':'start')}</Button>{open&&<><fieldset disabled={busy}>{['steps','expected','actual'].map(key=><label className="field" key={key}>{f(key)}<textarea rows={3} maxLength={4000} value={fields[key]} onChange={e=>change(()=>setFields({...fields,[key]:e.target.value}))}/></label>)}<Button className="button secondary" onClick={()=>act(async()=>{const data=await api.previewFeedbackDiagnostics();change(()=>{setSummary(data);setInclude(false);});})}>{f('previewDiagnostics')}</Button>{summary&&<><pre className="diagnostic-preview">{JSON.stringify(summary,null,2)}</pre><label><input type="checkbox" checked={include} onChange={e=>change(()=>setInclude(e.target.checked))}/>{f('include')}</label></>}<p>{f('privacy')}</p><Button className="button" disabled={!Object.values(fields).every(v=>v.trim())} onClick={()=>act(async()=>{setDraft(await api.prepareFeedback({...fields,includeDiagnostics:include}));setCopied(false);})}>{f('preview')}</Button></fieldset>{draft&&<div className="diagnostic-box"><p>{f('review')}</p><pre className="diagnostic-preview">{draft}</pre><div className="privacy-actions"><Button className="button" disabled={busy} onClick={()=>act(async()=>{await api.copyErrorDetail(draft);setCopied(true);})}>{f('copy')}</Button><Button className="button secondary" disabled={busy||!copied} onClick={()=>act(()=>api.openFeedback())}>{f('open')}</Button></div>{copied&&<p role="status">{f('copied')}</p>}</div>}</>}{error&&<p className="error" role="alert">{translateMessage(error)}</p>}</section>;
}
