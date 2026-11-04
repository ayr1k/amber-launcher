// SPDX-License-Identifier: MPL-2.0
import {useState,useEffect} from 'react';
import {t as translateText} from '../desktop/localization.mjs';
import {Select} from './Select';
import {ControlButton} from './ControlButton.mjs';
export function OfflineIdentity135({account,busy,act}){
 const [open,setOpen]=useState(false),[name,setName]=useState(account.name),[model,setModel]=useState(account.skinModel||'default'),[src,setSrc]=useState(null);
 useEffect(()=>{setName(account.name);setModel(account.skinModel||'default');let live=true;window.amberDesktop.accountSkin(account.id).then(v=>live&&setSrc(v)).catch(()=>{});return()=>{live=false}},[account.id,account.name,account.skinRevision]);
 return <div className="offline135"><ControlButton className="text-button" aria-expanded={open} onClick={()=>setOpen(!open)}>{translateText("编辑用户名与皮肤")}</ControlButton>{open&&<div className="offline135-editor">
 <form onSubmit={e=>{e.preventDefault();act(()=>window.amberDesktop.editOffline(account.id,{name}));}}><label className="field">{translateText("玩家名称")}<input value={name} required pattern="[A-Za-z0-9_]{3,16}" maxLength={16} onChange={e=>setName(e.target.value)}/></label><ControlButton className="button secondary" disabled={busy||name===account.name}>{translateText("保存名称")}</ControlButton></form>
 <p>{translateText("改名保留此账号的 UUID。部分服务器按名称识别玩家，改名前请确认服务端规则。")}</p>
 <div className="offline135-skin">{src&&<img src={src} alt={translateText("皮肤贴图预览")}/>}<div><label className="field">{translateText("皮肤模型")}<Select value={model} disabled={busy} onChange={e=>{setModel(e.target.value);if(account.hasCustomSkin)act(()=>window.amberDesktop.editOffline(account.id,{model:e.target.value}));}}><option value="default">{translateText("标准手臂")}</option><option value="slim">{translateText("窄手臂")}</option></Select></label><div className="inline-actions"><ControlButton className="button secondary" disabled={busy} onClick={()=>act(()=>window.amberDesktop.pickOfflineSkin(account.id,model))}>{translateText("选择 PNG 皮肤")}</ControlButton><ControlButton className="text-button" disabled={busy||!account.hasCustomSkin} onClick={()=>act(()=>window.amberDesktop.editOffline(account.id,{skin:null}))}>{translateText("恢复默认皮肤")}</ControlButton></div></div></div>
 <p>{translateText("支持 64×64、64×32 PNG。自定义皮肤用于本机离线游戏；首次使用需要下载皮肤兼容组件，游戏期间请保持启动器运行。其他玩家不一定能看到此皮肤。")}</p>
 </div>}</div>;
}
