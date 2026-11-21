// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {t as translateText} from '../desktop/localization.mjs';
import {ControlButton as Button} from './ControlButton.mjs';
import {EasyTierChoices160} from './ComponentChoices160';
import {RoomSync152} from './RoomSync152';
import {Select} from './Select';
import {hostRecentActivity177} from './room-guide-view177.mjs';

const call = (...args) => window.amberDesktop.server(...args);

function GuestCheck({room,visible}) {
  const [result,setResult] = useState(null);
  const [revision,retry] = useState(0);
  const [pending,setPending] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let active = true, timer;
    async function check() {
      if (document.hidden) { timer = setTimeout(check, 10000); return; }
      setPending(true);
      try {
        const next = await call('roomCheck177',room.expires);
        if (active) setResult(next);
      } catch { if (active) setResult({}); }
      finally {
        if (active) { setPending(false); timer = setTimeout(check, 10000); }
      }
    }
    check();
    return () => { active = false; clearTimeout(timer); };
  },[room.expires,visible,revision]);
  return <section aria-live="polite">
    <strong>{result?.ready ? translateText("可进服") : result?.linked ? translateText("已组网") : !result ? translateText("正在连接") : translateText("尚未确认连接")}</strong>
    <p>{result?.ready ? translateText("Minecraft 服务端已响应。打开多人游戏，选择直接连接，输入下方地址。") :
      result?.linked ? translateText("已联系到房主。请房主确认游戏服务端已就绪，并检查服务器列表状态查询设置。") :
      translateText("请房主保持房间和服务端运行，确认双方使用同一份有效邀请后重试。")}</p>
    <label>{translateText("Minecraft 直接连接地址")} <input readOnly value={room.address} onFocus={e=>e.target.select()}/></label>
    <Button className="button secondary" disabled={pending} onClick={()=>retry(n=>n+1)}>{translateText("重新检查连接")}</Button>
  </section>;
}

export function RoomGuide177({network,current,instances,onSelect,onPage,onRefresh,visible}) {
  const [task,setTask] = useState(null), [peer,setPeer] = useState(null);
  const [code,setCode] = useState(''), [port,setPort] = useState('25567');
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  const lock = useRef(false);
  const room = network?.room;
  const existing = room && room.state !== 'stopped';
  async function act(fn) {
    if (lock.current) return;
    lock.current=true; setBusy(true); setError('');
    try { await fn(); await onRefresh(); }
    catch(e) { setError(e.message); }
    finally { lock.current=false; setBusy(false); }
  }
  function reset() { setTask(null); setPeer(null); setCode(''); setPort('25567'); setError(''); }
  const component = <EasyTierChoices160 network={network} busy={busy} act={act}/>;
  return <section className="room-guide177 workspace150">
    <p className="room-intro177">{translateText("选择开房或加入房间，与朋友一起游玩。")}</p>
    {error && <p role="alert" className="error">{error} {!existing && (task==='guest' ?
      translateText("请核对邀请是否过期，并在高级设置检查本机端口后重试。") :
      translateText("请检查服务端状态与高级设置中的节点，再次创建房间。"))}</p>}
    {existing ? <section className="server-review132">
      {room.state === 'failed' ? <p role="alert">{translateText("连接失败。请查看连接日志，返回设置后核对节点、邀请和本地端口，再试一次。")}</p> :
        room.state !== 'running' ? <p role="status">{room.state==='stopping'?translateText("正在断开"):translateText("正在连接")}</p> :
        room.role === 'host' ? <>
          <strong role="status">{hostRecentActivity177(room.guestSeen)}</strong>
          <p>{translateText("把邀请码私发给朋友。邀请码含房间密钥，请保持服务端和房间运行。")}</p>
          <textarea className="server-invite132" readOnly aria-label={translateText("房间邀请码")} value={room.code}/>
          <Button className="button" disabled={busy} onClick={()=>act(()=>call('copyInvite'))}>{translateText("复制邀请码")}</Button>
        </> : <GuestCheck key={room.expires} room={room} visible={visible}/>}
      <details><summary>{translateText("连接详情")}</summary><p>{room.peer} · {new Date(room.expires).toLocaleString()}</p>
        {room.tail&&<pre className="server-console132">{room.tail}</pre>}
      </details>
      {room.state==='running' && <RoomSync152 key={room.expires} room={room}/>}
      <Button className="button secondary" disabled={busy || room.state==='stopping'} onClick={()=>act(async()=>{
        await call('leave'); if(room.state==='failed')setTask(room.role); else reset();
      })}>{room.state==='failed'?translateText("返回设置并重试"):translateText("离开房间")}</Button>
    </section> : !task ? <>
      <div className="room-task-cards177">
        <section className="room-task-card177">
          <h3>{translateText("我要开房")}</h3>
          <p>{translateText("为已启动的服务端创建房间，然后把邀请码发给朋友。")}</p>
          <Button className="button" onClick={()=>setTask('host')}>{translateText("我要开房")}</Button>
        </section>
        <section className="room-task-card177">
          <h3>{translateText("我要加入")}</h3>
          <p>{translateText("使用房主的邀请码连接，不需要创建服务端。")}</p>
          <Button className="button secondary" onClick={()=>setTask('guest')}>{translateText("我要加入")}</Button>
        </section>
      </div>
      <details><summary>{translateText("在同一局域网内游玩")}</summary><p>{translateText("启动服务端后，将启动页的局域网地址分享给同一网络内的玩家。")}</p></details>
    </> : <>
      <h3>{task==='host'?translateText("我要开房"):translateText("我要加入")}</h3>
      {!network?.installed ? <><p>{translateText("先安装 EasyTier 组件，安装完成后继续。")}</p>{component}</> :
        <form className="room-form177" onSubmit={e=>{e.preventDefault();act(()=>task==='host'?call('host',current.id,peer??network.defaultPeer):call('join',code.trim(),Number(port)));}}>
          {task==='host' ? <>
            {instances.length>0 && <label>{translateText("选择服务端实例")}<Select value={current?.id||''} onChange={e=>onSelect(e.target.value)}>{instances.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</Select></label>}
            {!current ? <Button type="button" className="button secondary" onClick={()=>onPage('create')}>{translateText("创建服务端实例")}</Button> :
              current.run?.state!=='running' ? <Button type="button" className="button secondary" onClick={()=>onPage('overview')}>{translateText("前往启动服务端")}</Button> : null}
          </> : <label>{translateText("粘贴房主的邀请码")}<textarea className="server-invite132" required maxLength={3000} value={code} onChange={e=>setCode(e.target.value)}/></label>}
          <details><summary>{translateText("高级设置")}</summary>{task==='host' ?
            <label>{translateText("发现／中继节点")}<input value={peer??network.defaultPeer} placeholder={network.defaultPeer} onChange={e=>setPeer(e.target.value)}/></label> :
            <label>{translateText("本机接入端口")}<input type="number" required min="1024" max="65535" value={port} onChange={e=>setPort(e.target.value)}/></label>}
          </details>
          <Button className="button" disabled={busy || (task==='host'?current?.run?.state!=='running':!code.trim())}>{task==='host'?translateText("创建房间并获取邀请"):translateText("加入房间")}</Button>
        </form>}
      {network?.installed && <details><summary>{translateText("EasyTier 组件版本")}</summary>{component}</details>}
      <Button className="text-button" disabled={busy} onClick={reset}>{translateText("返回")}</Button>
    </>}
  </section>;
}
