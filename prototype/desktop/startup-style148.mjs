// SPDX-License-Identifier: MPL-2.0
import {themeVariables,editableAppearance,contrast,readableInk,luminance} from './theme-schema.mjs';
export const startupMessages={
  modules:['正在加载程序…','Loading application…'],
  storage:['正在检查游戏数据位置…','Checking game data location…'],
  recovery:['正在检查未完成的操作…','Checking unfinished operations…'],
  accounts:['正在读取账号配置…','Reading account settings…'],
  settings:['正在应用语言和外观…','Applying language and appearance…'],
  library:['正在恢复实例状态…','Restoring instance state…'],
  interface:['正在准备主界面…','Preparing the main window…'],
  slow:['仍在处理，请稍候。','Still working. Please wait.'],
  error:['启动未完成，请查看错误提示。','Startup did not finish. Please check the error message.']
};
export function startupStyle(prefs={},systemDark=false){
  let a;try{a=editableAppearance(prefs);a.enabled=true;}catch{a=editableAppearance({});a.enabled=true;}
  let vars;try{vars=themeVariables(a,systemDark);}catch{a=editableAppearance({});a.enabled=true;vars=themeVariables(a,systemDark);}
  const bg=vars['--bg'],ink=vars['--text'];
  // A user theme may intentionally contain low-contrast colors. The loading
  // status must remain readable even before theme recovery becomes available.
  if(contrast(ink,bg)<4.5)vars['--text']=readableInk(bg);
  if(contrast(vars['--muted'],bg)<4.5)vars['--muted']=vars['--text'];
  return {background:bg,text:vars['--text'],muted:vars['--muted'],accent:vars['--accent'],radius:a.radius,fontSize:a.fontSize,dark:luminance(bg)<.2,
    motion:prefs.motion!==false&&a.motion!=='none',language:prefs.language||'system'};
}
