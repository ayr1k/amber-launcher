// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {t as translateText} from '../desktop/localization.mjs';
import {Modal145} from './Modal145';
import {Select} from './Select';
import {ControlButton as Button} from './ControlButton.mjs';
import {SakuraRemoteCreate150} from './SakuraRemote150';
import {status150} from './status150.mjs';

const call = (...args) => window.amberDesktop.server(...args);

function NodeDialog({dialog,current,ports,state,onClose,onSaved}) {
  const [catalog,setCatalog]=useState(null), [retry,setRetry]=useState(0);
  const [choice,setChoice]=useState(''), [name,setName]=useState(''), [port,setPort]=useState('main');
  const [error,setError]=useState(''), [busy,setBusy]=useState(false), lock=useRef(false);
  const {kind,node}=dialog;
  const title = kind==='node'?translateText("新建节点"):kind==='remote'?translateText("新建 Sakura 远端隧道"):translateText("关联隧道…");
  const needsCatalog = kind==='node' || (kind==='link' && !!node);
  useEffect(()=>{
    if(!needsCatalog)return;
    let live=true;
    setError('');
    call('sakuraCatalog').then(c=>{if(live)setCatalog(c);}).catch(e=>{if(live)setError(e.message);});
    return ()=>{live=false;};
  },[needsCatalog,retry]);
  const available = kind==='node' ? catalog?.nodes.filter(n=>!state.nodes.some(saved=>saved.id===n.id)) :
    catalog?.tunnels.filter(t=>Number(t.node)===node?.id && !state.tunnels.some(saved=>saved.tunnel===String(t.id)));
  async function submit(e) {
    e.preventDefault();
    if(lock.current)return;
    lock.current=true;setBusy(true);setError('');
    try {
      if(kind==='node')await call('sakuraAddNode',Number(choice));
      else await call('sakuraSave',current.id,{name,tunnel:choice,portId:port,node:node?.id});
      onSaved();
    } catch(e) { setError(e.message); }
    finally { lock.current=false;setBusy(false); }
  }
  return <Modal145 title={title} onClose={()=>{if(!lock.current)onClose();}}><div className="modal-body145">
    {kind==='remote' ? <SakuraRemoteCreate150 current={current} ports={ports} nodeId={node.id}
      hasToken={state.hasToken} pending={!!state.remoteOperation} onBusy={v=>{lock.current=v;setBusy(v);}} onChanged={onSaved} onCancel={onClose}/> :
      <form onSubmit={submit}>
        {needsCatalog ? <label>{kind==='node'?translateText("Sakura 节点"):translateText("选择已有隧道")}
          <Select required disabled={busy||!catalog} value={choice} onChange={e=>{
            setChoice(e.target.value);
            if(kind==='link')setName(available?.find(t=>String(t.id)===e.target.value)?.name||'');
          }}><option value="">{translateText("请选择")}</option>
            {available?.map(row=><option key={row.id} value={row.id}>{row.name} · #{row.id}</option>)}</Select>
          {catalog && !available?.length && <small>{translateText("没有可供选择的记录。")}</small>}
        </label> : <label>{translateText("隧道 ID")}<input required pattern="[0-9]{1,12}" value={choice} onChange={e=>setChoice(e.target.value)}/></label>}
        {kind==='link' && <><p>{current.name} · {node?.name||translateText("手动关联")}</p>
          <label>{translateText("名称／用途")}<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)}/></label>
          <label>{translateText("实例端口")}<Select value={port} onChange={e=>setPort(e.target.value)}>
            {ports.map(p=><option key={p.id} value={p.id}>{p.name} · {p.protocol.toUpperCase()} · {p.port}</option>)}</Select></label>
        </>}
        <div className="dialog-actions"><Button className="button secondary" type="button" disabled={busy} onClick={onClose}>{translateText("取消")}</Button>
          <Button className="button" disabled={busy||!choice||(kind==='link'&&!ports.some(p=>p.id===port))}>{title}</Button></div>
      </form>}
    {error && <p role="alert" className="error">{error} {needsCatalog && <Button className="text-button" onClick={()=>setRetry(n=>n+1)}>{translateText("重新读取")}</Button>}</p>}
  </div></Modal145>;
}

export function SakuraNodes177({state,current,ports,manage,act,busy,refresh}) {
  const [dialog,setDialog]=useState(null);
  if (!state) return null;
  const groups=(state.nodes||[]).map(node=>({node,tunnels:state.tunnels.filter(t=>t.node===node.id)}));
  const other=state.tunnels.filter(t=>!groups.some(g=>g.node.id===t.node));
  if(other.length)groups.push({node:null,tunnels:other});
  return <>
    <div className="inline-actions"><Button className="button" disabled={busy||!state.hasToken} onClick={()=>setDialog({kind:'node'})}>{translateText("新建节点")}</Button>
      <Button className="button secondary" disabled={busy||!current||!!state.remoteOperation} onClick={()=>setDialog({kind:'link'})}>{translateText("手动关联")}</Button></div>
    {!state.hasToken && <p>{translateText("保存 Sakura 访问密钥后即可选择服务商节点。")}</p>}
    {!current && <p>{translateText("选择服务端实例后即可关联隧道。")}</p>}
    <div className="instance-cards">{groups.map(({node,tunnels})=><article className="instance-card" key={node?.id??'legacy'}>
      <h3>{node?.name||translateText("节点待确认")}</h3>
      <p>{translateText("已关联隧道")} · {tunnels.length}　{translateText("已连接")} · {tunnels.filter(t=>t.run?.connected).length}</p>
      {tunnels.map(t=><div className="inline-actions" key={t.id}><Button className="text-button" onClick={()=>manage(t.id)}>{t.name}</Button>
        <small>#{t.tunnel||'—'} · {t.serverName} · {t.error || (t.run?status150(t.run.state):translateText("未启动"))}</small></div>)}
      {node && <div className="inline-actions">
        <Button className="button secondary" disabled={!current||busy||!!state.remoteOperation} onClick={()=>setDialog({kind:'link',node})}>{translateText("关联隧道…")}</Button>
        <Button className="text-button" disabled={!current||busy||!!state.remoteOperation} onClick={()=>setDialog({kind:'remote',node})}>{translateText("新建 Sakura 远端隧道")}</Button>
        {!tunnels.length && <Button className="text-button" disabled={busy||!!state.remoteOperation} onClick={()=>act(()=>call('sakuraRemoveNode',node.id))}>{translateText("移除本地节点")}</Button>}
      </div>}
    </article>)}</div>
    {dialog && <NodeDialog dialog={dialog} current={current} state={state} ports={ports} onClose={()=>setDialog(null)}
      onSaved={result=>{setDialog(null);refresh(result);}}/>}
  </>;
}
