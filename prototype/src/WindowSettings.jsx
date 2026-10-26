// SPDX-License-Identifier: MPL-2.0
import {useEffect,useState} from 'react';
import {useLocale} from './Locale';
import {t as translateText} from '../desktop/localization.mjs';
import {SettingRow} from './SettingRow';
import {Select} from './Select';
export function WindowSettings({value,busy,change}) {
  useLocale();const [state,setState]=useState(null);
  useEffect(()=>{window.amberDesktop.windowState?.().then(setState).catch(()=>{});},[]);
  return <section className="native-section window-settings"><h2>{translateText("窗口")}</h2>
    <SettingRow title={translateText("窗口边框")} description={translateText("与按钮和面板的圆角独立设置，下次启动 AMBER 时生效。")}><Select aria-label={translateText("窗口边框")} disabled={busy} value={value.windowCorners||'system'} onChange={e=>change('windowCorners',e.target.value)}><option value="square">{translateText("直角")}</option><option value="system">{translateText("系统圆角")}</option></Select></SettingRow>
    {state?.cornersSupported===false&&<p className="setting-note">{translateText("当前系统不支持窗口圆角，将使用直角边框。Windows 11 可使用系统圆角。")}</p>}
    {state&&state.corners!==(value.windowCorners||'system')&&<p role="status" className="setting-note">{translateText("窗口边框设置已保存，下次启动生效。")}</p>}
    <SettingRow title={translateText("标题栏配色")} description={translateText("标题栏融入应用外观，颜色即时生效。")}><Select aria-label={translateText("标题栏配色")} disabled={busy} value={value.titlebarColor||'theme'} onChange={e=>change('titlebarColor',e.target.value)}><option value="theme">{translateText("跟随主题")}</option><option value="accent">{translateText("使用强调色")}</option></Select></SettingRow>
    <p className="setting-note">{translateText("拖动标题栏空白处移动窗口，双击可最大化或还原。支持 Win + 方向键分屏；窗口位置和大小会自动保存。")}</p>
  </section>;
}
