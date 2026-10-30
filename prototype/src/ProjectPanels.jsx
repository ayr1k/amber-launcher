import {IS_AMBERE,PRODUCT_NAME} from '../desktop/edition.mjs';
import { useLocale } from "./Locale";import { t as translateText, translateMessage, getLocale } from "../desktop/localization.mjs";import { VERSION, DISPLAY_VERSION, MICROSOFT_REVIEW } from '../desktop/product.mjs';
// SPDX-License-Identifier: MPL-2.0
import { PrivacyPanel } from './PrivacyPanel';
import { AppUpdatePanel } from './AppUpdatePanel';
import { useEffect, useState } from 'react';
import { ArrowRight, FolderOpen, ArrowClockwise, Info } from '@phosphor-icons/react';

export function AboutProject() {useLocale();
  const [diagnosticMessage, setDiagnosticMessage] = useState(''),[exporting, setExporting] = useState(false);
  const [license, setLicense] = useState(translateText("正在读取许可证…"));
  useEffect(() => {fetch('/licenses/MPL-2.0.txt').then((r) => {if (!r.ok) throw Error();return r.text();}).then(setLicense).catch(() => setLicense(translateText("许可证读取失败；完整文件随项目 LICENSE 提供。")));}, []);
  return <section className="about-project">
    <img className="about-wordmark" src="/brand/amber-lockup.svg" alt={PRODUCT_NAME} />
    <p className="about-version">{VERSION}</p>
    <p>{translateText("为每一次冒险，保留自由选择的空间。")}</p>
    <dl className="detail-list"><div><dt>{translateText("项目许可")}</dt><dd>Mozilla Public License 2.0</dd></div><div><dt>{translateText("主要功能")}</dt><dd>{translateText("多加载器 · Modrinth 内容商城 · 账号与 Java 管理")}</dd></div></dl>
    {window.amberDesktop && <PrivacyPanel />}
    <AppUpdatePanel /><div className="pop-initiative"><div className="pop-art"><img src="/brand/pop-initiative.png" alt="POP — Progressively Open Platform" /></div><div><h3>{translateText("支持 POP 倡议")}</h3><p>{translateText("渐进开放，保留选择。以完整的默认体验为起点，逐步开放扩展接口、数据迁移和可替换的服务。")}</p><p className="muted">{translateText("倡议标识由项目发起者提供。此标识表达项目方向，不表示已完成全部原则的实现或通过第三方认证。")}</p></div></div>
    <details className="license-details"><summary>{translateText("阅读 MPL-2.0 许可证")}</summary><pre>{translateMessage(license)}</pre></details>
    <details className="license-details"><summary>{translateText("第三方素材与许可")}</summary><p>{translateText("项目自有源码采用 MPL-2.0。更纱黑体使用 SIL Open Font License 1.1；React、Phosphor 与 Electron 等依赖保留各自许可。POP 标识、模组图标及其他第三方标识不因随项目分发而自动转为 MPL-2.0。完整说明见 THIRD_PARTY_NOTICES.md。")}</p></details>
    <div className="demo-note"><Info size={18} /><span>{DISPLAY_VERSION}{translateText("：实例管理与检查、本地模组导入、统一内容操作记录、收藏与最近启动。")}{IS_AMBERE?translateText("AmberE 保留离线和第三方账号，不提供微软登录；与 AMBER 共用功能核心。"):translateMessage(MICROSOFT_REVIEW)}</span></div>
  </section>;
}

export { LocalLibrary } from './NativeLibrary';
