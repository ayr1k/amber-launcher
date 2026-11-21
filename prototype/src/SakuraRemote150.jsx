// SPDX-License-Identifier: MPL-2.0
import {useId,useRef,useState} from 'react';
import {t as translateText,translateMessage} from '../desktop/localization.mjs';
import {readSakuraCatalog177,sakuraCreateOptions177,sakuraCreateReadiness177,sakuraNext177,switchSakuraNode177,withSakuraCreateLock177} from './sakura-create177.mjs';
import {Select} from './Select';
import {ControlButton as Button} from './ControlButton.mjs';

const call=(...args)=>window.amberDesktop.server(...args);

export function SakuraRemoteCreate150({current,ports,hasToken,pending,onChanged,nodeId,onBusy,onCancel}){
  const [catalog,setCatalog]=useState(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const [draft,setDraft]=useState({name:'',portId:'main',node:nodeId??'',remote:'',scope:''});
  const [portReset,setPortReset]=useState(false), [pendingResult,setPendingResult]=useState(false);
  const reasonId=useId(), lock=useRef(false);
  const {name,portId,node,remote,scope}=draft;
  const port=ports.find(p=>p.id===portId);
  const options=sakuraCreateOptions177(catalog,port,scope);
  const readiness=sakuraCreateReadiness177({hasToken,pending:pending||pendingResult,catalog,current,port,scope,node,name,remote});
  const update=(field,value)=>setDraft(previous=>({...previous,[field]:value}));

  async function act(fn){
    return withSakuraCreateLock177(lock,async()=>{
      setError('');
      try{await fn();}catch(e){setError(translateMessage(e.message));}
    },value=>{setBusy(value);onBusy?.(value);});
  }

  function loadCatalog(){
    if(!hasToken||pending||pendingResult)return;
    return act(async()=>{
      setCatalog(null);
      const result=readSakuraCatalog177(await call('sakuraCatalog'));
      if(!result)throw Error('无法确认 Sakura 账号权限或额度。');
      setCatalog(result);
    });
  }

  function submit(event){
    event.preventDefault();
    if(!readiness.payload)return;
    return act(async()=>{
      let result;
      try{
        result=await call('sakuraRemoteCreate',current.id,readiness.payload);
      }catch(error){
        // Re-read local operation state before enabling retries. A failed read
        // cannot confirm that a previous remote creation did not take effect.
        try{
          const state=await call('sakuraState');
          setPendingResult(!state||!Object.hasOwn(state,'remoteOperation')||!!state.remoteOperation);
        }
        catch{setPendingResult(true);}
        throw error;
      }
      // The native confirmation was cancelled. Keep the form intact.
      if(result)await onChanged(result);
    });
  }

  return <section className="native-section sakura-create150">
    <p>{translateText("使用已保存密钥向 Sakura 创建隧道，占用账号额度。不会自动启动，也不会购买套餐。")}</p>
    <Button type="button" className="button secondary" disabled={busy||!hasToken||pending||pendingResult} onClick={loadCatalog}>{translateText("读取节点与账号额度")}</Button>
    {catalog&&<p>{translateText("已使用 {0}／{1} 条隧道",[catalog.used,catalog.limit])}</p>}
    <form onSubmit={submit}>
      <div className="form-grid">
        <label>{translateText("远端隧道名称")}<input required maxLength={80} disabled={busy} value={name} onChange={e=>update('name',e.target.value)}/></label>
        <label>{translateText("实例端口")}<Select value={portId} disabled={busy} onChange={e=>update('portId',e.target.value)}>
          {ports.map(p=><option key={p.id} value={p.id}>{p.name} · {p.protocol.toUpperCase()} · {p.port}</option>)}
        </Select></label>
        <label>{translateText("服务器使用范围")}<Select value={scope} disabled={busy} onChange={e=>update('scope',e.target.value)}>
          <option value="">{translateText("请选择")}</option>
          <option value="private">{translateText("仅熟人私下联机")}</option>
          <option value="public">{translateText("公开宣传或公开招募玩家")}</option>
        </Select></label>
        <label>{translateText("Sakura 节点")}<Select value={node} disabled={busy||!catalog} onChange={e=>{
          const next=switchSakuraNode177(draft,e.target.value,options);
          setPortReset(next!==draft && remote!=='');
          setDraft(next);
        }}>
          <option value="">{translateText("请选择")}</option>
          {node!==''&&!options.some(n=>String(n.id)===String(node))&&<option disabled value={node}>#{node}</option>}
          {options.map(n=><option key={n.id} value={n.id} disabled={!!n.reason}>{n.name}{n.reason?` · ${translateMessage(n.reason)}`:''}</option>)}
        </Select></label>
        <label>{translateText("远端端口（留空自动分配）")}<input type="number" min={1} max={65535} step={1} value={remote} disabled={busy}
          onChange={e=>{setPortReset(false);update('remote',e.target.value);}}/></label>
      </div>
      {portReset&&<p role="status">{translateText("节点已更换，远端端口已重置为自动分配。可根据新节点的规则重新填写。")}</p>}
      <p>{translateText("公开游戏服务器只能使用 Sakura 允许的专用节点。最终端口、节点权限及额度以服务商响应为准。")}</p>
      {readiness.reason&&<p id={reasonId} aria-live="polite">
        {translateMessage(readiness.reason)} {sakuraNext177[readiness.code]!==readiness.reason&&translateMessage(sakuraNext177[readiness.code])}
      </p>}
      {error&&<p role="alert" className="error">{error}</p>}
      <div className="dialog-actions">
        <Button type="button" className="button secondary" disabled={busy} onClick={()=>{if(!lock.current)onCancel();}}>{translateText("取消")}</Button>
        <Button type="submit" className="button" disabled={busy||!readiness.payload} aria-describedby={readiness.reason?reasonId:undefined}>{translateText("创建远端隧道并关联")}</Button>
      </div>
    </form>
  </section>;
}
