// SPDX-License-Identifier: MPL-2.0
import {app,BrowserWindow,ipcMain,nativeTheme,dialog} from 'electron';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,lstat,writeFile,rename} from 'node:fs/promises';
import {PRODUCT_NAME} from './edition.mjs';
import {startupStyle,startupMessages} from './startup-style148.mjs';
const base=dirname(fileURLToPath(import.meta.url));
let splash,phase='modules',style=startupStyle({},nativeTheme.shouldUseDarkColors),labels,slowTimer,watchdog,failed=false,finished=false,exiting=false,cacheQueue=Promise.resolve();
app.on('before-quit',()=>{exiting=true;});
const smoke=process.argv.includes('--smoke-test'),qa=!app.isPackaged&&process.argv.includes('--qa-ui');
const visible=!smoke&&(!qa||process.argv.includes('--qa-visible'));
const marks=[];const started=performance.now();
function mark(stage){marks.push({stage,ms:Math.round(performance.now()-started)});if(smoke||qa)console.log('AMBER_STARTUP',JSON.stringify(marks.at(-1)));}
function state(){const language=style.language==='system'?app.getLocale():style.language,english=!/^zh\b/i.test(language);return {product:PRODUCT_NAME,phase,style,language:english?'en-US':'zh-CN',text:labels?.[phase]||startupMessages[phase]?.[english?1:0],slow:labels?.slow||startupMessages.slow[english?1:0]};}
function send(){if(splash&&!splash.isDestroyed())splash.webContents.send('amber:startup-state',state());}
export const startup={
  marks,
  stage(next){if(finished||failed)return;phase=next;mark(next);send();},
  async preferences(prefs,translate){
    style=startupStyle(prefs,nativeTheme.shouldUseDarkColors);
    labels=translate?Object.fromEntries(Object.entries(startupMessages).map(([key,[zh]])=>[key,translate(zh)])):undefined;
    if(splash&&!splash.isDestroyed())splash.setBackgroundColor(style.background);send();
    // Cosmetic, bounded cache only. It never selects a library or alters data.
    const path=join(app.getPath('userData'),'startup-style.json');
    const appearance=Object.fromEntries(['enabled','mode','accent','background','surface','text','muted','line','radius','fontSize','motion'].filter(k=>prefs.appearance?.[k]!==undefined).map(k=>[k,prefs.appearance[k]]));
    const value=JSON.stringify({prefs:{language:prefs.language,motion:prefs.motion,appearance,theme:prefs.theme,uiStyle:prefs.uiStyle,accent:prefs.accent,fontSize:prefs.fontSize},labels});
    cacheQueue=cacheQueue.catch(()=>{}).then(async()=>{await writeFile(path+'.tmp',value);await rename(path+'.tmp',path);});await cacheQueue.catch(()=>{});
  },
  focus(){if(!finished&&splash&&!splash.isDestroyed()){if(splash.isMinimized())splash.restore();if(visible){splash.show();splash.focus();}return true;}return false;},
  finish(window){if(failed)return;finished=true;clearTimeout(watchdog);clearTimeout(slowTimer);mark('ready');splash?.hide();if(visible)window.show();splash?.destroy();splash=null;},
  async fail(error){if(failed)return;failed=true;phase='error';send();clearTimeout(watchdog);clearTimeout(slowTimer);
    console.error('AMBER_STARTUP_FAILED',error?.message||String(error));
    if(smoke||qa){app.exit(1);return;}
    // Do not replace recovery dialogs or expose paths/account details here.
    await dialog.showMessageBox({type:'error',title:PRODUCT_NAME,message:'启动未完成 / Startup did not finish',detail:'请关闭后重试。原游戏数据会保留；如重复出现，请在问题反馈中附上以下错误。 / Close and retry. Existing game data is retained. If this repeats, include the error below in your report.\n\n'+String(error?.message||error).slice(0,2000),buttons:['退出 / Quit']});app.exit(1);
  },
  watch(){clearTimeout(watchdog);watchdog=setTimeout(()=>startup.fail(Error('Main interface did not become ready')),45000);}
};
export async function showStartup(){
  const path=join(app.getPath('userData'),'startup-style.json');
  try{const s=await lstat(path);if(s.isFile()&&!s.isSymbolicLink()&&s.size<=16384){const v=JSON.parse(await readFile(path,'utf8'));style=startupStyle(v.prefs,nativeTheme.shouldUseDarkColors);if(v.labels&&Object.values(v.labels).every(v=>typeof v==='string'&&v.length<500))labels=v.labels;}}catch{}
  splash=new BrowserWindow({title:PRODUCT_NAME,width:440,height:240,minWidth:320,minHeight:200,resizable:false,maximizable:false,frame:false,show:false,backgroundColor:style.background,webPreferences:{preload:join(base,'startup-preload148.cjs'),contextIsolation:true,sandbox:true,nodeIntegration:false}});
  splash.setMenu(null);splash.webContents.setWindowOpenHandler(()=>({action:'deny'}));splash.webContents.on('will-navigate',event=>event.preventDefault());
  splash.on('close',event=>{if(!finished&&!exiting){event.preventDefault();splash.minimize();}});
  ipcMain.handle('amber:startup-state',event=>{if(event.sender!==splash?.webContents||event.senderFrame!==splash.webContents.mainFrame)throw Error('Untrusted startup frame');return state();});
  splash.webContents.on('render-process-gone',()=>startup.fail(Error('Startup renderer stopped')));
  const painted=new Promise(resolve=>ipcMain.once('amber:startup-painted',event=>{if(event.sender!==splash?.webContents||event.senderFrame!==splash.webContents.mainFrame)return;mark('visible');if(visible)splash.show();resolve();}));
  let paintTimeout;
  try{await Promise.race([(async()=>{await splash.loadFile(join(base,'startup148.html'));await painted;})(),new Promise((_resolve,reject)=>{paintTimeout=setTimeout(()=>reject(Error('Startup page did not paint')),10000);})]);}finally{clearTimeout(paintTimeout);}
  slowTimer=setTimeout(()=>{if(splash&&!splash.isDestroyed())splash.webContents.send('amber:startup-slow');},12000);
}
