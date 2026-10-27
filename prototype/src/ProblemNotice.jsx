import { useLocale } from "./Locale";import { t as translateText, translateMessage, getLocale } from "../desktop/localization.mjs";import { useState } from 'react';
// SPDX-License-Identifier: MPL-2.0
import { explainProblem } from '../desktop/problems.mjs';
export function ProblemNotice({ error, crash = false, actions = {}, disabled = false }) {useLocale();
  const [copied, setCopied] = useState('');if (!error) return null;const p = explainProblem(error, { crash });
  const labels = { accounts: translateText("前往账号页"), retry: translateText("重试"), folder: translateText("打开实例目录"), mods: translateText("前往模组管理"), manage: translateText("Java 与版本修复"), memory: translateText("调整启动内存"), logs: translateText("查看运行日志") };
  const keys = [...new Set([p.action, ...(crash ? ['mods', 'logs'] : [])])].filter((k) => actions[k]);
  return <div className="problem-notice" role="alert"><strong>{translateMessage(p.title)}</strong><p>{translateMessage(p.hint)}</p><div className="inline-actions">{keys.map((k) => <button type="button" className="text-button" key={k} disabled={disabled} onClick={actions[k]}>{labels[k]} →</button>)}</div><details><summary>{translateText("详细信息")}</summary><pre>{translateMessage(p.detail)}</pre><button className="text-button" type="button" onClick={async () => {try {if (window.amberDesktop?.copyErrorDetail) await window.amberDesktop.copyErrorDetail(p.detail);else await navigator.clipboard.writeText(p.detail);setCopied(translateText("已复制"));} catch {setCopied(translateText("复制不可用，请选中上方文字手动复制"));}}}>{translateText("复制详细信息")}</button><span role="status">{copied}</span></details></div>;
}
