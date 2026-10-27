import {IS_AMBERE,PRODUCT_NAME} from '../desktop/edition.mjs';
// SPDX-License-Identifier: MPL-2.0
import { createContext, useContext, useEffect, useState } from 'react';
import { setLocale, getLocale, t as translateText, translateMessage } from '../desktop/localization.mjs';
const Context = createContext(null);
export function LocaleProvider({ children }) {
  const [state, setState] = useState({ language: 'system', pack: null }),[ready, setReady] = useState(!window.amberDesktop?.languageState);
  async function reload() {const value = await window.amberDesktop.languageState();setLocale(value.language, value.pack, navigator.language);document.documentElement.lang = getLocale();setState(value);return value;}
  useEffect(() => {if (window.amberDesktop?.languageState) reload().catch(() => {setLocale('system', null, navigator.language);document.documentElement.lang = getLocale();}).finally(() => setReady(true));else {setLocale('system', null, navigator.language);document.documentElement.lang = getLocale();}}, []);
  useEffect(() => {const update = () => reload().catch(() => {});window.addEventListener('amber-settings-changed', update);return () => window.removeEventListener('amber-settings-changed', update);}, []);
  async function choose(language) {const saved = await window.amberDesktop.settings();await window.amberDesktop.saveSettings({ ...saved, language });await reload();window.dispatchEvent(new Event('amber-settings-changed'));}
  return <Context.Provider value={{ ...state, locale: getLocale(), choose, reload }}>{ready ? children : <p>{PRODUCT_NAME}…</p>}</Context.Provider>;
}
export function useLocale() {return useContext(Context);}
export function LanguageControl() {const state = useLocale(),[error, setError] = useState(''),[busy, setBusy] = useState(false);if (!state) return null;async function action(fn) {setBusy(true);setError('');try {await fn();} catch (e) {setError(e.message);} finally {setBusy(false);}}
  return <div className="language-control"><label>{translateText('语言 / Language')}<LanguageSelect value={state.language} disabled={busy} onChange={(e) => action(() => state.choose(e.target.value))}><option value="system">{translateText('跟随系统语言')}</option><option value="zh-CN">简体中文</option><option value="en-US">English</option>{state.pack && <option value={state.pack.locale}>{state.pack.name}</option>}</LanguageSelect></label><div className="inline-actions"><button className="text-button" disabled={busy} onClick={() => action(async () => {if (await window.amberDesktop.importLanguage()) await state.reload();})}>{translateText('导入语言包…')}</button><button className="text-button" disabled={busy} onClick={() => action(() => window.amberDesktop.exportLanguage())}>{translateText('导出语言包模板')}</button>{state.pack && <button className="text-button" disabled={busy} onClick={() => action(async () => {await window.amberDesktop.removeLanguage();await state.reload();window.dispatchEvent(new Event('amber-settings-changed'));})}>{translateText('移除自定义语言包')}</button>}</div><small>{translateText('语言包只包含文本，不执行代码。缺失条目使用英文。请仅导入可信来源的语言包。')}</small>{error && <p role="alert">{translateMessage(error)}</p>}</div>;
}
import { Select as LanguageSelect } from './Select';
