import {BulkContent} from './bulk-content.mjs';
import {LaunchPreferences} from './launch-preferences.mjs';
// SPDX-License-Identifier: MPL-2.0
import { app, BrowserWindow, ipcMain, protocol, net, shell, session, dialog, safeStorage, nativeImage, clipboard } from 'electron';
import {spawn} from 'node:child_process';
import {beginMicrosoftLogin,copyMicrosoftCode,pendingCode} from './login-actions.mjs';
import {AppUpdates,backupUpgradeConfig} from './app-updates.mjs';
import {ModUpdates,recoverModUpdate} from './mod-updates.mjs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {Storage} from './storage.mjs';
import {Backups} from './backups.mjs';
import {statfs} from 'node:fs/promises';
import {diagnosticSummary} from './diagnostics.mjs';
import {InstanceManagement} from './instance-management.mjs';
import {configureLiteOverlay} from './legacy-combinations.mjs';
import {validateLayout} from './layout-schema.mjs';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import {recoverTransactions} from './recovery.mjs';
import { Workflows, Settings, validateManifest } from './workflows.mjs';
import { installOptifine } from './optifine.mjs';
import { importOptifine, importWorld } from './local-content.mjs';
import { Modpacks } from './modpacks.mjs';
import { Modrinth } from './modrinth.mjs';
import { Accounts } from './accounts.mjs';
import { authAgent } from './auth-agent.mjs';
import { VanillaLauncher } from './launcher.mjs';

import {importBackground,backgroundPattern} from './backgrounds.mjs';
const base = dirname(fileURLToPath(import.meta.url));
const assets = resolve(base, '../dist/client');
const smoke = process.argv.includes('--smoke-test');
app.setPath('userData', join(app.getPath('appData'), 'AMBER'));
if (smoke) app.setPath('userData', process.env.AMBER_SMOKE_ROOT ? resolve(process.env.AMBER_SMOKE_ROOT) : resolve(base, '../.smoke-data'));
app.setName('AMBER');
if(!app.requestSingleInstanceLock()) app.exit(0);
protocol.registerSchemesAsPrivileged([{ scheme: 'amber', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let window,activatePending=false;
let loaded=false;
const smokeChannels=new Set();
function finishSmoke(){if(smoke&&loaded&&['amber:info','amber:instances','amber:status','amber:settings'].every(c=>smokeChannels.has(c))){console.log('AMBER_DESKTOP_AND_IPC_OK');setTimeout(()=>app.quit(),250);}}
app.on('second-instance',()=>{activatePending=true;if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
if(smoke) setTimeout(()=>{ console.error('AMBER_SMOKE_TIMEOUT'); app.exit(2); },20000).unref();
app.whenReady().then(async () => {
protocol.handle('amber', async request => {
  const url = new URL(request.url);
  if (url.hostname !== 'app') return new Response('Forbidden', { status: 403 });
  if(url.pathname.startsWith('/user-background/')){const name=url.pathname.slice('/user-background/'.length);if(!backgroundPattern.test(name))return new Response('Forbidden',{status:403});try{return new Response(await readFile(join(core.root,'backgrounds',name)),{headers:{'Content-Type':'image/png','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}}
  let path;
  try { path = resolve(assets, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)); }
  catch { return new Response('Bad request', { status: 400 }); }
  if (!path.startsWith(assets + sep)) return new Response('Forbidden', { status: 403 });
  const response = await net.fetch(pathToFileURL(path).href);
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.modrinth.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'");
  return new Response(response.body, { status: response.status, headers });
});
session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
session.defaultSession.setPermissionCheckHandler(()=>false);
const storage=new Storage(app.getPath('userData'));const storageConfig=await storage.get();let storageBusy=false;
const core = new VanillaLauncher(storageConfig.path);
await core.init();
const recovery=await recoverTransactions(core);
if(smoke){const name=await importBackground(core.root,join(assets,'assets/forest-banner.png'),bytes=>nativeImage.createFromBuffer(bytes));const response=await net.fetch('amber://app/user-background/'+name);if(response.status!==200||response.headers.get('Content-Type')!=='image/png'||(await response.arrayBuffer()).byteLength===0)throw Error('Background round-trip failed');console.log('AMBER_BACKGROUND_OK');}
if(smoke){const sample="amber-credential-codec-check";if(!safeStorage.isEncryptionAvailable()||safeStorage.decryptString(safeStorage.encryptString(sample))!==sample)throw Error("Credential encryption unavailable");console.log("AMBER_SYSTEM_ENCRYPTION_OK");}
const accounts=new Accounts(core.root,{codec:safeStorage});await accounts.init();
const appUpdates=new AppUpdates(app.getPath('userData'),app.getVersion());let upgradeBusy=false;
function handle(channel, fn) {
  ipcMain.handle(channel, async (event,...args) => {
    const source = new URL(event.senderFrame.url);
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame || source.protocol !== 'amber:' || source.host !== 'app') throw new Error('请求来源不受信任。');
    if(storageBusy&&!['amber:info','amber:status','amber:setup-cancel'].includes(channel))throw Error('数据目录正在迁移，请等待完成。');
    if(upgradeBusy&&!['amber:info','amber:status','amber:app-update-state'].includes(channel))throw Error('正在准备升级，请稍候。');
    const result=await fn(...args);if(smoke){smokeChannels.add(channel);finishSmoke();}return result;
  });
}
handle('amber:info', ()=>({ version: app.getVersion(), dataPath: core.root, platform: process.platform, recovery }));
handle('amber:instances', async()=>{const pending=await workflows.pending();return (await core.listInstances()).map(i=>({...i,setup:pending.find(p=>p.instanceId===i.id)||null}));});
handle('amber:versions', ()=>core.versions());
handle('amber:create', input=>{core.workflowGuard?.();return core.createInstance(input);});
handle('amber:status', async()=>({...await core.runtimeStatus(),setups:await workflows.pending(),operation:core.operation||null,workflowActive:workflows.active}));
handle('amber:install', (id,options)=>core.install(id,options));
handle('amber:cancel', id=>{if(workflows.active)return workflows.cancel();return core.cancel(id);});
handle('amber:java-scan', ()=>core.scanJava());
handle('amber:java-prepare', id=>core.prepareJava(id));
handle('amber:java-select', (id,path)=>core.selectJava(id,path));
handle('amber:java-browse', async ()=>{const result=await dialog.showOpenDialog(window,{title:'选择 Java 可执行文件',properties:['openFile'],filters:[{name:'Java',extensions:['exe']}]});return result.canceled?null:core.addJava(result.filePaths[0]);});
const content=new Modrinth(core);
const packs=new Modpacks(core,content);
const workflows=new Workflows(core,content),settings=new Settings(core.root),selections=new Map();
const management=new InstanceManagement(core,workflows),backups=new Backups(core,workflows);
const modUpdates=new ModUpdates(core,content);
const bulkContent=new BulkContent(core,content,modUpdates),launchPreferences=new LaunchPreferences(core);
async function readyForModUpdate(id){if((await workflows.pending()).some(p=>p.instanceId===id))throw Error('此实例安装尚未完成，请先到任务中心继续安装。');}
handle('amber:mod-update-scan',(id,pre)=>modUpdates.scan(id,pre===true));
handle('amber:mod-update-lock',async(id,p,value)=>{await readyForModUpdate(id);return modUpdates.lock(id,p,value);});
handle('amber:mod-update-preview',(id,choices,optional,excluded)=>modUpdates.preview(id,choices,optional,excluded));
handle('amber:mod-update-install',async(id,plan)=>{await readyForModUpdate(id);return modUpdates.install(id,plan);});
handle('amber:mod-update-history',id=>modUpdates.history(id));
handle('amber:mod-update-restore',async(id,record)=>{await readyForModUpdate(id);return modUpdates.restore(id,record);});
handle('amber:app-update-state',()=>appUpdates.state);
handle('amber:app-update-check',()=>appUpdates.check());
handle('amber:app-update-download',()=>appUpdates.download());
handle('amber:app-update-cancel',()=>appUpdates.cancel());
handle('amber:app-update-install',async()=>{
  if(launching||storageBusy||workflows.active||core.jobs.some(j=>j.state==='running'))throw Error('请等待游戏准备、安装或数据迁移结束后再升级。');
  upgradeBusy=true;
  try{for(const item of await core.listInstances())await core.requireStopped(await core.instancePath(item.id));
    if(launching||storageBusy||workflows.active||core.jobs.some(j=>j.state==='running'))throw Error('有新任务开始，请等待结束后再升级。');
    const file=await appUpdates.installer();const answer=await dialog.showMessageBox(window,{type:'question',title:'安装 AMBER 更新',message:'安装包已校验，是否退出 AMBER 并打开安装程序？',detail:'将保留游戏数据，并先备份账号和设置。请在安装向导中确认安装位置。',buttons:['取消','退出并安装'],defaultId:0,cancelId:0,noLink:true});if(answer.response!==1)return false;
    await backupUpgradeConfig(app.getPath('userData'),core.root,app.getVersion());
    await new Promise((resolve,reject)=>{const child=spawn(file,[],{detached:true,stdio:'ignore',windowsHide:false});child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});});
    app.quit();return true;
  }finally{upgradeBusy=false;}
});
workflows.installPack=async(id,version)=>{try{const r=JSON.parse(await readFile(join(await core.instancePath(id),'modpack.json'),'utf8'));if(r.versionId===version)return;}catch(e){if(e.code!=='ENOENT')throw e;}const p=await packs.preview(id,version);return workflows.wait(await packs.install(id,p.id));};
handle('amber:backups',id=>backups.list(id));
handle('amber:backup-create',(id,mode)=>backups.create(id,mode));
handle('amber:backup-restore',id=>backups.restore(id));
handle('amber:storage-info',async()=>{const r=await storage.get(),disk=await statfs(core.root);return {path:core.root,freeBytes:disk.bavail*disk.bsize,onboarded:r.onboarded||(!smoke&&(await core.listInstances()).length>0)};});
handle('amber:onboarding-complete',()=>storage.complete());
handle('amber:storage-pick',async()=>{const r=await dialog.showOpenDialog(window,{title:'选择新的空数据文件夹',properties:['openDirectory','createDirectory']});if(r.canceled)return null;const token=randomUUID();selections.set(token,{kind:'storage',value:r.filePaths[0]});return {token,path:r.filePaths[0]};});
handle('amber:storage-move',async token=>{const target=selection(token,'storage');if(!target)throw Error('请先选择目标目录');return workflows.exclusive(async()=>{for(const item of await core.listInstances())await core.requireStopped(await core.instancePath(item.id));storageBusy=true;core.operation={title:'复制并校验数据目录',state:'running'};try{await storage.migrate(core,target);app.relaunch();app.exit(0);return true;}catch(e){storageBusy=false;throw e;}finally{core.operation=null;}});});
handle('amber:instance-icon',(id,icon)=>management.setIcon(id,icon));
handle('amber:instance-rename',(id,name)=>management.rename(id,name));
handle('amber:instance-remove',id=>management.remove(id));
handle('amber:instance-trash',()=>management.list());
handle('amber:trash-details',id=>management.trashDetails(id));
handle('amber:trash-purge',(id,confirmation)=>management.purge(id,confirmation));
handle('amber:diagnostics-export',async()=>{const result=await dialog.showSaveDialog(window,{title:'保存不含账号和日志的诊断摘要',defaultPath:'amber-diagnostics.json',filters:[{name:'JSON',extensions:['json']}]});if(result.canceled)return false;const summary=diagnosticSummary({version:app.getVersion(),platform:process.platform,arch:process.arch,instances:await core.listInstances(),status:await core.runtimeStatus()});await writeFile(result.filePath,JSON.stringify(summary,null,2));return true;});
handle('amber:instance-restore',id=>management.restore(id));
handle('amber:lite-overlay',(id,v)=>configureLiteOverlay(core,id,v));
handle('amber:layout-export',async()=>{const value={format:'amber-layout',schema:1,layout:(await settings.get()).layout};const result=await dialog.showSaveDialog(window,{title:'导出布局',defaultPath:'amber-layout.json',filters:[{name:'AMBER layout',extensions:['json']}]});if(result.canceled)return false;await writeFile(result.filePath,JSON.stringify(value,null,2));return true;});
handle('amber:layout-import',async()=>{const result=await dialog.showOpenDialog(window,{title:'导入布局',properties:['openFile'],filters:[{name:'AMBER layout',extensions:['json']}]});if(result.canceled)return null;const path=result.filePaths[0];if((await stat(path)).size>64000)throw Error('布局文件过大');const data=JSON.parse(await readFile(path,'utf8'));if(data.format!=='amber-layout'||data.schema!==1)throw Error('不是 AMBER 布局文件');return settings.save({...await settings.get(),layout:validateLayout(data.layout)});});
core.downloadThreads=(await settings.get()).threads;
handle('amber:background-pick',async()=>{const r=await dialog.showOpenDialog(window,{title:'选择启动背景（20 MB 以内）',properties:['openFile'],filters:[{name:'图片',extensions:['png','jpg','jpeg','webp']}]});if(r.canceled)return null;const background=await importBackground(core.root,r.filePaths[0],bytes=>nativeImage.createFromBuffer(bytes));return settings.save({...await settings.get(),background});});
handle('amber:settings',()=>settings.get());
handle('amber:settings-save',async v=>{const saved=await settings.save(v);core.downloadThreads=saved.threads;return saved;});
handle('amber:setup-state',()=>workflows.state());
handle('amber:setup-cancel',()=>workflows.cancel());
handle('amber:setup-repair',id=>workflows.repairSetup(id));
handle('amber:setup-retry',id=>workflows.retry(id));
handle('amber:setup-choices',(game,type)=>workflows.choices(game,type));
handle('amber:setup-file',async kind=>{if(!['manifest','optifine'].includes(kind))throw Error('无效文件类型');const result=await dialog.showOpenDialog(window,{title:kind==='manifest'?'选择 AMBER 模组迁移清单':'选择 OptiFine 官方 JAR',properties:['openFile'],filters:[{name:kind,extensions:[kind==='manifest'?'json':'jar']}]});if(result.canceled)return null;const path=result.filePaths[0];if((await stat(path)).size>(kind==='manifest'?2000000:100000000))throw Error('文件过大');const value=kind==='manifest'?validateManifest(JSON.parse(await readFile(path,'utf8'))):path;const token=randomUUID();selections.set(token,{kind,value});return {token,name:path.split(/[\\/]/).at(-1)};});
function selection(token,kind){if(!token)return null;const entry=selections.get(token);if(!entry||entry.kind!==kind)throw Error('请选择文件');return entry.value;}
handle('amber:setup',input=>workflows.create(input,selection(input.optifineToken,'optifine'),selection(input.manifestToken,'manifest')));
handle('amber:migration-export',async id=>{const manifest=await workflows.export(id);const result=await dialog.showSaveDialog(window,{title:'导出模组清单',defaultPath:'amber-mods.json',filters:[{name:'AMBER 模组清单',extensions:['json']}]});if(result.canceled)return null;await writeFile(result.filePath,JSON.stringify(manifest,null,2),'utf8');return {count:manifest.mods.length,identified:manifest.mods.filter(m=>m.projectId).length};});
handle('amber:migration-run',(id,token)=>workflows.migrate(id,selection(token,'manifest')));
handle('amber:migration-report',id=>workflows.report(id));
handle('amber:project-open',async id=>{if(typeof id!=='string'||!/^[-\w]{1,100}$/.test(id))throw Error('无效项目');const p=await content.api('project/'+id);if(!['mod','modpack','shader','resourcepack'].includes(p.project_type))throw Error('未知项目类型');return shell.openExternal('https://modrinth.com/'+p.project_type+'/'+encodeURIComponent(id));});

handle('amber:pack-create',async planId=>{const plan=packs.plans.get(planId);if(!plan||plan.expiresAt<Date.now())throw Error('整合包预览已过期');const prefs=await settings.get();const version=plan.loader==='forge'?plan.game+'-'+plan.loaderVersion:plan.loaderVersion;return workflows.create({name:plan.title.slice(0,60),game:plan.game,loader:plan.loader,version,threads:prefs.threads,packVersion:plan.versionId});});
handle('amber:pack-preview' ,(id,v)=>packs.preview(id,v));
handle('amber:pack-install',(id,p)=>{const plan=packs.plans.get(p);if(!plan||plan.instanceId!==id||plan.expiresAt<Date.now())throw Error('预览已过期，请重新检查');return workflows.startContent(id,plan,'pack');});
handle('amber:content-categories',()=>content.categories());
handle('amber:content-search',(id,options)=>content.search(id,options));
handle('amber:content-versions',(id,p)=>content.versions(id,p));
handle('amber:content-preview',(id,v,optional,excluded)=>content.preview(id,v,optional,excluded,true));
handle('amber:content-dismiss',id=>workflows.dismissContent(id));
handle('amber:content-install',(id,p)=>{const plan=content.plans.get(p);if(!plan||plan.instanceId!==id||plan.expiresAt<Date.now())throw Error('预览已过期，请重新检查');return workflows.startContent(id,plan);});
handle('amber:content-list',id=>content.list(id));
handle('amber:content-remove',(id,p)=>content.remove(id,p));
handle('amber:bulk-preview',(id,paths,action)=>bulkContent.preview(id,paths,action));
handle('amber:bulk-apply',(id,key)=>bulkContent.apply(id,key));
handle('amber:launch-preferences',id=>launchPreferences.get(id));
handle('amber:launch-preferences-save',(id,value)=>launchPreferences.save(id,value));
handle('amber:content-toggle',(id,p)=>content.toggle(id,p));
handle('amber:world-import',async id=>{const result=await dialog.showOpenDialog(window,{title:'导入地图 ZIP（保留原文件，创建独立存档）',properties:['openFile'],filters:[{name:'Minecraft world ZIP',extensions:['zip']}]});return result.canceled?null:importWorld(core,id,result.filePaths[0]);});
handle('amber:optifine-import',async id=>{const result=await dialog.showOpenDialog(window,{title:'选择与当前 Minecraft 和 Forge 兼容的 OptiFine 官方 JAR',properties:['openFile'],filters:[{name:'OptiFine',extensions:['jar']}]});return result.canceled?null:importOptifine(core,id,result.filePaths[0]);});
handle('amber:optifine-install',async id=>{const result=await dialog.showOpenDialog(window,{title:'选择 OptiFine 官方安装器 JAR（独立安装，替换当前加载器）',properties:['openFile'],filters:[{name:'OptiFine',extensions:['jar']}]});return result.canceled?null:installOptifine(core,id,result.filePaths[0]);});
handle('amber:optifine-site',()=>shell.openExternal('https://optifine.net/downloads'));
handle('amber:loader-versions',(id,type)=>core.loaderVersions(id,type));
handle('amber:loader-configure',(id,type,v)=>core.configureLoader(id,type,v));
handle('amber:fabric-versions',id=>core.fabricVersions(id));
handle('amber:fabric-configure',(id,version)=>core.configureFabric(id,version));
handle('amber:accounts',()=>accounts.list());
handle('amber:account-configure',id=>accounts.configure(id));
handle('amber:account-offline',name=>accounts.addOffline(name));
handle('amber:account-server',input=>accounts.addServer(input));
handle('amber:account-remove',id=>accounts.remove(id));
handle('amber:account-profile',(id,p)=>accounts.selectProfile(id,p));
handle('amber:ms-start',()=>beginMicrosoftLogin(accounts,clipboard,url=>shell.openExternal(url)));
handle('amber:ms-copy',()=>copyMicrosoftCode(accounts,clipboard));
handle('amber:ms-poll',()=>accounts.pollMicrosoft());
handle('amber:ms-cancel',()=>accounts.cancelMicrosoft());
handle('amber:ms-open',()=>shell.openExternal(pendingCode(accounts).url));
let launching=false;
handle('amber:launch',async(id,options)=>{if(launching)throw Error('正在准备启动。');launching=true;try{core.workflowGuard?.();if(core.jobs.some(j=>j.state==='running'))throw Error('请等待安装或更新结束后启动游戏。');await recoverModUpdate(await core.instancePath(id));if((await workflows.pending()).some(p=>p.instanceId===id))throw Error('实例安装尚未完成，请先在任务中心继续安装。');await content.validateLaunch(id);const launchPrefs=await launchPreferences.get(id);options={...options,accountId:launchPrefs.accountId??options.accountId,memory:launchPrefs.memory??options.memory};const identity=options.accountId?await accounts.identity(options.accountId):null;const extraJvm=identity?.server?[`-javaagent:${await authAgent(core.root)}=${identity.server}`]:[];return await core.launch(id,{username:options.username,memory:options.memory,identity,extraJvm});}finally{launching=false;}});
handle('amber:open-instance', async id=>{ const error = await shell.openPath(await core.instancePath(id)); if(error) throw new Error(error); });
function createWindow() {
  window = new BrowserWindow({ title: 'AMBER', width: 1440, height: 1000, minWidth: 860, minHeight: 640, show: !smoke, autoHideMenuBar: true, backgroundColor: '#fafbf8', webPreferences: { preload: join(base,'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
  let closeAllowed=false,closePrompt=false;
  window.on('close',async event=>{if(smoke||closeAllowed||(!workflows.active&&!core.jobs.some(j=>j.state==='running')&&appUpdates.state.phase!=='downloading'))return;event.preventDefault();if(closePrompt)return;closePrompt=true;try{const r=await dialog.showMessageBox(window,{type:'warning',title:'安装还未结束',message:'退出会中断当前下载或实例配置。',detail:'已完成的文件会保留，建议等待任务结束。实例安装可在任务中心继续；程序更新可在关于页重新下载。',buttons:['继续等待','取消任务并退出'],defaultId:0,cancelId:0,noLink:true});if(r.response===1){appUpdates.cancel();workflows.cancel();for(const j of core.jobs.filter(j=>j.state==='running'))core.controllers.get(j.id)?.abort(Error('用户取消任务并退出。'));while(workflows.active||core.jobs.some(j=>j.state==='running')||appUpdates.state.phase==='downloading')await new Promise(r=>setTimeout(r,150));closeAllowed=true;window.close();}}finally{closePrompt=false;}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{ if(url!=='amber://app/') event.preventDefault(); });
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  window.webContents.on('did-fail-load',(_event,code,description)=>{ console.error('LOAD_FAILED',code,description); if(smoke) app.exit(1); });
  window.webContents.on('did-finish-load',()=>{ loaded=true;if(activatePending&&!smoke){window.show();window.focus();activatePending=false;}finishSmoke(); });
  window.loadURL('amber://app/');
}
createWindow();
app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
app.on('activate',()=>{ if(!BrowserWindow.getAllWindows().length) createWindow(); });
}).catch(error=>{ console.error(error); app.exit(1); });
