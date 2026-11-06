// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {t as translateText} from '../desktop/localization.mjs';
import {ControlButton as Button} from './ControlButton.mjs';
const call=(...args)=>window.amberDesktop.server(...args);
export function MySQLBackupLibrary150({active,onOpen,onRecovered}){
 const [open,setOpen]=useState(false),[state,setState]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function refresh(){setBusy(true);setError('');try{setState(await call('mysqlBackupLibrary'));}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{if(open&&active)refresh();},[open,active]);
 async function recover(row){if(!confirm(translateText("仅恢复数据库到空的恢复实例，不恢复世界、插件或原服务端文件。原备份保留，不自动启动。继续？")))return;setBusy(true);setError('');try{const item=await call('mysqlRecoverOrphan',row.ownerId,row.id);await onRecovered(item.id);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <details className="native-section" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{translateText("独立数据库备份库")}</summary><p>{translateText("数据库备份存放在实例目录之外，回收或永久删除实例均保留。恢复需要原系统用户的凭据密钥；备份不包含世界和插件文件。")}</p><Button className="button secondary" disabled={busy} onClick={refresh}>{translateText("刷新备份库")}</Button>{busy&&<p role="status">{translateText("正在检查数据库备份…")}</p>}{error&&<p role="alert">{error}</p>}{state?.issues.map((row,i)=><p role="alert" key={i}>{row.ownerId} · {row.error}</p>)}{state&&!state.backups.length&&<p>{translateText("暂无独立数据库备份。")}</p>}{state?.backups.map(row=><article className="native-section" key={row.ownerId+row.id}><h3>{row.name}</h3><p>{new Date(row.createdAt).toLocaleString()}</p><p>{translateText(row.status==='active'?"原实例仍在使用中，请在实例内恢复备份。":row.status==='recycled'?"原实例在回收站，请先恢复该实例。":"原实例已不存在，可仅恢复数据库。")}</p>{row.status==='active'?<Button className="button secondary" disabled={busy} onClick={()=>onOpen(row.ownerId)}>{translateText("打开原实例")}</Button>:row.status==='orphan'&&<Button className="button" disabled={busy} onClick={()=>recover(row)}>{translateText("恢复数据库实例")}</Button>}</article>)}</details>;
}
