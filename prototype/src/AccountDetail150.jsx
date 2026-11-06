// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {SkinViewer,WalkingAnimation,RunningAnimation,IdleAnimation} from 'skinview3d';
import {disposeSkinPreview150} from './skin-preview150.mjs';
import {t as translateText} from '../desktop/localization.mjs';
import {accountStatistics} from '../desktop/account-statistics150.mjs';
import {OfflineIdentity135} from './OfflineIdentity135';
import {ControlButton as Button} from './ControlButton.mjs';
import {Select} from './Select';
import './workspace150.css';

function SkinPreview({account}) {
 const host=useRef(),canvas=useRef(),viewer=useRef();
 const [error,setError]=useState(''),[motion,setMotion]=useState('none'),[background,setBackground]=useState('theme');
 useEffect(()=>{
  let disposed=false,visible=false,contextLost=false,v;
  setError('');
  try {v=new SkinViewer({canvas:canvas.current,width:320,height:420,zoom:0.8});viewer.current=v;v.renderPaused=true;}
  catch {setError(translateText("无法创建 3D 预览，请检查图形加速支持。"));return;}
  const app=host.current.closest('.app'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>{v.renderPaused=contextLost||document.hidden||!visible;if(v.animation)v.animation.paused=reduced.matches||app?.classList.contains('no-motion');};
  const changes=new MutationObserver(sync);if(app)changes.observe(app,{attributes:true,attributeFilter:['data-theme-motion','data-theme-enabled','class']});reduced.addEventListener('change',sync);
  const observer=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting;sync();});observer.observe(host.current);
  const resize=new ResizeObserver(entries=>{const width=Math.max(1,entries[0].contentRect.width);v.setSize(width,Math.max(260,Math.min(480,width*1.2)));});resize.observe(host.current);
  document.addEventListener('visibilitychange',sync);
  const lost=e=>{e.preventDefault();contextLost=true;v.renderPaused=true;setError(translateText("图形上下文已丢失，请重新进入账号详情。"));};canvas.current.addEventListener('webglcontextlost',lost);
  window.amberDesktop.accountSkin(account.id).then(async src=>{if(disposed)return;if(!src){setError(translateText("此账号暂无可用皮肤。"));return;}const image=new Image();image.src=src;await image.decode();if(disposed)return;await v.loadSkin(image,{model:account.skinModel||'auto-detect'});}).catch(()=>{if(!disposed)setError(translateText("皮肤加载失败，请稍后重试。"));});
  return()=>{disposed=true;changes.disconnect();reduced.removeEventListener('change',sync);observer.disconnect();resize.disconnect();document.removeEventListener('visibilitychange',sync);v.canvas.removeEventListener('webglcontextlost',lost);disposeSkinPreview150(v);viewer.current=null;};
 },[account.id,account.skinRevision]);
 useEffect(()=>{const v=viewer.current;if(!v)return;v.animation=motion==='walk'?new WalkingAnimation():motion==='run'?new RunningAnimation():motion==='idle'?new IdleAnimation():null;if(v.animation)v.animation.paused=matchMedia('(prefers-reduced-motion: reduce)').matches||host.current.closest('.app')?.classList.contains('no-motion');},[motion,account.id,account.skinRevision]);
 return <section className="skin-preview150"><h2>{translateText("3D 皮肤预览")}</h2><div ref={host} className={'skin-stage150 background-'+background}><canvas ref={canvas} aria-label={translateText("拖拽旋转，滚轮缩放")}/></div>{error&&<p role="status">{error}</p>}<p>{translateText("拖拽旋转，滚轮缩放")}</p><div className="form-grid"><label>{translateText("预览背景")}<Select value={background} onChange={e=>setBackground(e.target.value)}>{[['theme','跟随主题'],['light','浅色'],['dark','深色']].map(([key,name])=><option key={key} value={key}>{translateText(name)}</option>)}</Select></label><label>{translateText("预览动作")}<Select value={motion} onChange={e=>setMotion(e.target.value)}>{[['none','静止'],['idle','待机'],['walk','行走'],['run','奔跑']].map(([key,name])=><option key={key} value={key}>{translateText(name)}</option>)}</Select></label></div><p>{translateText("背景和动作仅用于预览，不会更改账号皮肤。")}</p></section>;
}

export function AccountDetail150({account,onBack,busy,act,status}) {
 const [capability,setCapability]=useState(null);
 useEffect(()=>{let live=true;if(account.type==='yggdrasil')window.amberDesktop.providerSkinCapability(account.id).then(c=>live&&setCapability(c)).catch(()=>live&&setCapability({supported:false}));return()=>{live=false;};},[account.id]);
 const [skinModel,setSkinModel]=useState(account.skinModel||'default');
 const [stats,setStats]=useState(null),[error,setError]=useState(''),[names,setNames]=useState({});
 useEffect(()=>{let live=true;const refresh=()=>Promise.all([window.amberDesktop.journal(),window.amberDesktop.listInstances()]).then(([journal,instances])=>{if(live){setStats(accountStatistics(journal,account.id));setNames(Object.fromEntries(instances.map(i=>[i.id,i.name])));}}).catch(e=>live&&setError(e.message));refresh();const timer=setInterval(refresh,30000);return()=>{live=false;clearInterval(timer);};},[account.id]);
 const duration=ms=>translateText("{0} 小时",[Number(ms/3600000).toFixed(2)]);
 return <section className="account-detail150"><Button className="text-button" onClick={onBack}>{translateText("返回账号列表")}</Button><h1>{account.name}</h1><div className="account-columns150"><section><h2>{translateText("账号信息")}</h2><dl><dt>{translateText("账号类型")}</dt><dd>{translateText(account.type==='offline'?'离线账号':account.type==='microsoft'?'微软账号':'第三方账号')}</dd><dt>{translateText("授权状态")}</dt><dd>{status}</dd>{account.server&&<><dt>{translateText("认证 API 根地址")}</dt><dd className="selectable">{account.server}</dd></>}</dl>{account.type==='offline'&&<OfflineIdentity135 account={account} busy={busy} act={act}/>}{account.type==='microsoft'&&<section><label>{translateText("皮肤模型")}<Select value={skinModel} disabled={busy} onChange={e=>setSkinModel(e.target.value)}><option value="default">{translateText("标准手臂")}</option><option value="slim">{translateText("窄手臂")}</option></Select></label><p>{translateText("主动选择后将皮肤上传到此账号的 Minecraft 官方服务。")}</p><Button className="button" disabled={busy} onClick={()=>act(()=>window.amberDesktop.uploadMicrosoftSkin(account.id,skinModel))}>{translateText("选择并上传官方皮肤")}</Button></section>}{account.type==='yggdrasil'&&<section>{capability?.supported?<><label>{translateText("皮肤模型")}<Select value={skinModel} onChange={e=>setSkinModel(e.target.value)}><option value="default">{translateText("标准手臂")}</option><option value="slim">{translateText("窄手臂")}</option></Select></label><p>{capability.origin}</p><Button className="button" disabled={busy} onClick={()=>act(()=>window.amberDesktop.uploadProviderSkin(account.id,skinModel))}>{translateText("选择并上传服务商皮肤")}</Button></>:<p>{translateText("此服务商没有已验证的兼容换肤接口。请前往该服务商站点换肤；不会把登录凭据发送到其他站点。")}</p>}<Button className="button secondary" disabled={busy} onClick={()=>act(()=>window.amberDesktop.accountProviderSite(account.id))}>{translateText("打开此服务商站点")}</Button></section>}<section className="account-statistics150"><h2>{translateText("本机游玩统计")}</h2><p>{translateText("仅包含本机观察到的运行时长，可能包含空闲时间；缺失记录不作推算。")}</p>{error&&<p role="alert">{error}</p>}{stats&&<><p>{translateText("总时长")}：{duration(stats.totalMs)}</p><p>{translateText("最近游玩")}：{stats.lastPlayed?new Date(stats.lastPlayed).toLocaleString():translateText("暂无记录")}</p>{!stats.enabled&&<p>{translateText("游玩记录已关闭。")}</p>}{stats.uncertain&&<p>{translateText("部分记录不完整。")}</p>}<p>{translateText("历史未归属")}：{duration(stats.historicalMs)}</p><details><summary>{translateText("各实例统计")}</summary><ul>{stats.instances.map(i=><li key={i.instanceId}>{names[i.instanceId]||i.instanceId} · {duration(i.totalMs)}</li>)}</ul></details></>}</section></section><SkinPreview account={account}/></div></section>;
}
