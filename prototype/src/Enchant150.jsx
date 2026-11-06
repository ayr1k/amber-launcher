// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import data from './vendor/enchant-order/data.mjs';
import names from './vendor/enchant-order/names.json';
import {t as translateText} from '../desktop/localization.mjs';
import {Select} from './Select';
import {ControlButton as Button} from './ControlButton.mjs';
import {validateEnchantSelection} from './enchant150.mjs';

export function Enchant150(){
 const [item,setItem]=useState('sword'),[selection,setSelection]=useState({}),[result,setResult]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const worker=useRef(),timer=useRef();
 const stop=()=>{worker.current?.terminate();worker.current=null;clearTimeout(timer.current);};
 useEffect(()=>stop,[]);
 const name=id=>translateText(names[id]||id);
 const describe=node=>node.I!==undefined?name(node.I)+(selection[node.I]?' '+selection[node.I]:''):'('+describe(node.L)+' + '+describe(node.R)+')';
 function calculate(){stop();setResult(null);setError('');try{const enchants=validateEnchantSelection(item,selection);setBusy(true);const w=new Worker(new URL('./vendor/enchant-order/work.js',import.meta.url));worker.current=w;const fail=()=>{stop();setBusy(false);setError(translateText("未能计算可用顺序，请减少附魔数量或检查组合。"));};w.onerror=fail;w.onmessage=event=>{if(event.data.msg!=='complete')return;stop();setBusy(false);if(!event.data.instructions?.length){fail();return;}setResult(event.data);};timer.current=setTimeout(fail,30000);w.postMessage({msg:'set_data',data});w.postMessage({msg:'process',item,enchants,mode:'levels'});}catch(e){setBusy(false);setError(translateText(e.message));}}
 return <section><p>{translateText("离线计算 Java 版铁砧顺序。装备与每本附魔书必须没有既有铁砧惩罚；不支持修理、重命名、已有附魔或合并低等级书。")}</p><p>{translateText("规则采用所附上游数据快照，包含重锤与矛；不代表所有历史版本、基岩版或模组规则。每步最多 39 级。")}</p><label className="field">{translateText("装备")}<Select value={item} disabled={busy} onChange={e=>{setItem(e.target.value);setSelection({});setResult(null);setError('');}}>{data.items.filter(id=>id!=='book').map(id=><option key={id} value={id}>{name(id)}</option>)}</Select></label><div className="form-grid">{Object.entries(data.enchants).filter(([,e])=>e.items.includes(item)).map(([id,e])=><label key={id}>{name(id)}<Select value={selection[id]||0} disabled={busy} onChange={event=>{setSelection(s=>({...s,[id]:Number(event.target.value)}));setResult(null);}}><option value={0}>{translateText("不添加")}</option>{Array.from({length:Number(e.levelMax)},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</Select></label>)}</div><div className="inline-actions"><Button className="button" disabled={busy} onClick={calculate}>{translateText("计算附魔顺序")}</Button>{busy&&<Button className="button secondary" onClick={()=>{stop();setBusy(false);}}>{translateText("取消")}</Button>}</div>{busy&&<p role="status">{translateText("正在处理，请稍候…")}</p>}{error&&<p role="alert" className="error">{error}</p>}{result&&<section aria-live="polite"><h3>{translateText("铁砧合并步骤")}</h3><p>{translateText("总等级费用：{0}；逐步从零级获取经验时合计 {1} XP。",[result.extra[0],result.item_obj.x])}</p><ol>{result.instructions.map(([left,right,cost,xp,penalty],i)=><li key={i}><p className="selectable">{describe(left)} + {describe(right)}</p><p>{translateText("左侧为目标，右侧为材料。费用 {0} 级（{1} XP），结果惩罚 {2}。",[cost,xp,penalty])}</p></li>)}</ol></section>}<p>iamcal/enchant-order · MIT · 9345bd0</p></section>;
}
