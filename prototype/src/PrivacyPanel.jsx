import {IS_AMBERE,PRODUCT_NAME} from '../desktop/edition.mjs';
// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {useLocale} from './Locale';
import {t as translateText,translateMessage} from '../desktop/localization.mjs';
import {SettingRow} from './SettingRow';
export function PrivacyPanel(){
  useLocale();const api=window.amberDesktop;
  const [info,setInfo]=useState(null),[summary,setSummary]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
  useEffect(()=>{let live=true;api.privacyInfo?.().then(v=>live&&setInfo(v)).catch(e=>live&&setError(e.message));return()=>{live=false;};},[]);
  async function action(fn){setBusy(true);setError('');setFeedback('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}}
  const locations=[['accounts',translateText("账号库")],['data',translateText("实例、日志与缓存")],['upgrades',translateText("升级前配置备份")]];
  return <section className="native-section privacy-panel"><h2>{translateText("隐私与数据")}</h2><p className="privacy-intro">{IS_AMBERE?translateText("账号令牌由当前 Windows 用户的系统加密保护。第三方账号密码只发送至你填写的认证地址，不会保存。"):translateText("账号令牌由当前 Windows 用户的系统加密保护。微软密码不经过 AMBER；第三方账号密码只发送至你填写的认证地址。")}</p>
    <section className="privacy-group"><h3>{translateText("数据位置")}</h3>{info?<dl className="privacy-locations">{locations.map(([key,label])=><div key={key}><dt>{label}</dt><dd><code>{info[key]}</code><button className="button secondary" disabled={busy} aria-label={translateText("复制路径：{0}",[label])} onClick={()=>action(async()=>{await api.copyPrivacyPath(key);setFeedback('路径已复制。');})}>{translateText("复制路径")}</button></dd></div>)}</dl>:!error&&<p>{translateText("正在读取数据位置…")}</p>}</section>
    <section className="privacy-group"><h3>{translateText("诊断与分享")}</h3><p>{translateText("游戏和模组可能在原始日志中写入个人信息。AMBER 不自动上传日志；复制错误时会尽量脱敏，分享前仍请自行检查。不要公开原始账号库或完整日志。")}</p><div className="privacy-actions"><button className="button secondary" disabled={busy} onClick={()=>action(async()=>{setSummary(await api.previewDiagnostics());})}>{translateText("预览诊断摘要")}</button></div>
    {summary&&<div className="diagnostic-box"><p>{translateText("以下是将导出的全部字段。不含账号、令牌、实例名称、个人路径或原始日志。")}</p><pre className="diagnostic-preview">{JSON.stringify(summary,null,2)}</pre><div className="privacy-actions"><button className="button secondary" disabled={busy} onClick={()=>action(async()=>{if(await api.exportDiagnostics())setFeedback('诊断摘要已保存，不会自动上传。');else setFeedback('已取消导出。');})}>{translateText("选择位置并导出")}</button><button className="text-button" disabled={busy} onClick={()=>setSummary(null)}>{translateText("关闭预览")}</button></div></div>}</section>
    <section className="privacy-group"><h3>{translateText("清理与维护")}</h3><p>{translateText("在“账号”页移除此设备的账号。旧升级备份可能仍含加密账号库，必要时也应清理；本地移除不会撤销服务端授权。")}</p>
    <SettingRow title={translateText("程序更新下载")} description={translateText("删除已下载的 AMBER 更新包，需要时可重新下载；不影响游戏内容。")}><button className="button secondary" disabled={busy} onClick={()=>action(async()=>setFeedback(await api.cleanupPrivateCopies('updates')?'程序更新下载已清理。':'已取消清理。'))}>{translateText("清理程序更新下载")}</button></SettingRow>
    <SettingRow title={translateText("旧配置备份")} description={translateText("删除升级前保留的配置副本，可能包含加密的历史账号库。不会删除实例备份或游戏存档。")}><button className="button secondary danger" disabled={busy} onClick={()=>action(async()=>setFeedback(await api.cleanupPrivateCopies('upgrade-backups')?'旧配置备份已清理。':'已取消清理。'))}>{translateText("清理旧配置备份")}</button></SettingRow></section>
    {busy&&<p role="status">{translateText("正在处理，请稍候…")}</p>}{feedback&&<p className="settings-feedback" role="status">{translateMessage(feedback)}</p>}{error&&<p role="alert" className="error">{translateMessage(error)}</p>}
  </section>;
}
