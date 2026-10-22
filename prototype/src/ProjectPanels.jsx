// SPDX-License-Identifier: MPL-2.0
import {AppUpdatePanel} from './AppUpdatePanel';
import { useEffect, useState } from 'react';
import { ArrowRight, FolderOpen, ArrowClockwise, Info } from '@phosphor-icons/react';

export function AboutProject() {
  const [diagnosticMessage,setDiagnosticMessage]=useState(''),[exporting,setExporting]=useState(false);
  const [license,setLicense]=useState('正在读取许可证…');
  useEffect(()=>{ fetch('/licenses/MPL-2.0.txt').then(r=>{if(!r.ok)throw Error();return r.text();}).then(setLicense).catch(()=>setLicense('许可证读取失败；完整文件随项目 LICENSE 提供。')); },[]);
  return <section className="about-project">
    <img className="about-wordmark" src="/brand/amber-lockup.svg" alt="AMBER"/>
    <p className="about-version">1.0.0-beta.2 · 本地测试版</p>
    <p>为每一次冒险，保留自由选择的空间。</p>
    <dl className="detail-list"><div><dt>项目许可</dt><dd>Mozilla Public License 2.0</dd></div><div><dt>开发阶段</dt><dd>多加载器 · Modrinth 内容商城 · 账号与 Java 管理</dd></div></dl>
    {window.amberDesktop&&<section className="native-section"><h2>帮助与诊断</h2><p>遇到问题时可导出诊断摘要。不包含账号、令牌、实例名称、本机路径或原始日志；不会自动上传。</p><button className="button secondary" disabled={exporting} onClick={async()=>{setExporting(true);try{if(await window.amberDesktop.exportDiagnostics())setDiagnosticMessage('诊断摘要已保存。你可以检查内容后自行附在反馈中。');}catch(e){setDiagnosticMessage(e.message);}finally{setExporting(false);}}}>导出诊断摘要</button>{diagnosticMessage&&<p role="status">{diagnosticMessage}</p>}</section>}
    <AppUpdatePanel/><div className="pop-initiative"><div className="pop-art"><img src="/brand/pop-initiative.png" alt="POP — Progressively Open Platform"/></div><div><h3>支持 POP 倡议</h3><p>渐进开放，保留选择。以完整的默认体验为起点，逐步开放扩展接口、数据迁移和可替换的服务。</p><p className="muted">倡议标识由项目发起者提供。此标识表达项目方向，不表示已完成全部原则的实现或通过第三方认证。</p></div></div>
    <details className="license-details"><summary>阅读 MPL-2.0 许可证</summary><pre>{license}</pre></details>
    <details className="license-details"><summary>第三方素材与许可</summary><p>项目自有源码采用 MPL-2.0。更纱黑体使用 SIL Open Font License 1.1；React、Phosphor 与 Electron 等依赖保留各自许可。POP 标识、模组图标及其他第三方标识不因随项目分发而自动转为 MPL-2.0。完整说明见 THIRD_PARTY_NOTICES.md。</p></details>
    <div className="demo-note"><Info size={18}/><span>Beta 1.1 本地测试：安装与升级保护、验证码自动复制、模组更新与恢复。微软重新申请已提交，尚未获批；真实登录验收延后。</span></div>
  </section>;
}

export { LocalLibrary } from './NativeLibrary';
