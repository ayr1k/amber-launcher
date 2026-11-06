import {ServerSchedules} from './server-schedules147.mjs';
import {shouldHideToTray} from './tray147.mjs';
import {feedbackDraft,feedbackUrl} from './feedback.mjs';
import {ServerUpdates144} from './server-updates144.mjs';
import {Performance144} from './performance144.mjs';
import {ServerTrash143} from './server-trash143.mjs';
import {Sakura142} from './sakura142.mjs';
import {ServerManagement140} from './server-management140.mjs';
import {Environment140} from './environment140.mjs';
import {PackUpgrade140} from './pack-upgrade140.mjs';
import {Protection140} from './protection140.mjs';
import {collectCrashLogs} from './crash-files136.mjs';
import {redact as redactCrashLog} from './privacy.mjs';
import {readBoundedFile} from './bounded-io.mjs';
import {configureTransferBudget} from './task-queue132.mjs';
import {SeedMap,readWorldFile} from './seed134.mjs';
import {MinecraftImport} from './minecraft134.mjs';
import {Servers} from './servers132.mjs';
import {Rooms} from './rooms132.mjs';
import {DependencyMetadata} from './dependency130.mjs';
import {InstanceEditor} from './editor130.mjs';
import {skinDimensions,startSkinBridge} from './offline135.mjs';
import {accountSkin} from './skins130.mjs';
import {PlayJournal,NewsFeed,HomePreferences,Screenshots} from './home-services.mjs';
import {StorageSurvey} from './maintenance.mjs';
import {Themes} from './themes.mjs';
import {assetId,appearanceDefaults} from './theme-schema.mjs';
import {EDITION,IS_AMBERE,PRODUCT_NAME} from './edition.mjs';
import {BUILD_CHANNEL as awaitBuildChannel} from './build-channel.mjs';
import {InstanceWorkbench} from './instance-workbench.mjs';
import {GuidedCreation} from './guided.mjs';
import {GraphicsPreferences,graphicsAdapters} from './graphics.mjs';
import {WindowStateStore,fitWindow,supportsWindowCorners,runWindowAction,editingCommand} from './window-state.mjs';
import {release as osRelease} from 'node:os';
import {ensureParents} from './download.mjs';
import {storageUsage,measureDirectory} from './maintenance.mjs';
import {cleanupPrivateCopies} from './privacy-cleanup.mjs';
import {credentialCodec} from './credential-codec.mjs';
import { redact, redactFields } from './privacy.mjs';
import { setLocale, translateMessage, localizeFields, languageTemplate, errorDescriptor } from './localization.mjs';
import { LanguagePacks } from './language-packs.mjs';
import { LibraryState } from './library-state.mjs';
import { InstanceHealth } from './instance-health.mjs';
import { ModImport } from './mod-import.mjs';
import { BulkContent } from './bulk-content.mjs';
import { LaunchPreferences } from './launch-preferences.mjs';
// SPDX-License-Identifier: MPL-2.0
import { app, powerMonitor, Tray, Menu, screen, BrowserWindow, ipcMain, protocol, net, shell, session, dialog, safeStorage, nativeImage, clipboard } from 'electron';
import { spawn } from 'node:child_process';
import { beginMicrosoftLogin, copyMicrosoftCode, pendingCode, clearCopiedCode } from './login-actions.mjs';
import { AppUpdates, backupUpgradeConfig } from './app-updates.mjs';
import { ModUpdates, recoverModUpdate } from './mod-updates.mjs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Storage } from './storage.mjs';
import { Backups } from './backups.mjs';
import { statfs } from 'node:fs/promises';
import { diagnosticSummary } from './diagnostics.mjs';
import { InstanceManagement } from './instance-management.mjs';
import { configureLiteOverlay } from './legacy-combinations.mjs';
import { validateLayout } from './layout-schema.mjs';
import { readFile, writeFile, stat, lstat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { recoverTransactions } from './recovery.mjs';
import { Workflows, Settings, validateSettings, validateManifest } from './workflows.mjs';
import { installOptifine } from './optifine.mjs';
import { importOptifine, importWorld } from './local-content.mjs';
import { Modpacks } from './modpacks.mjs';
import {LocalPacks} from './local-packs.mjs';
import { Modrinth } from './modrinth.mjs';
import {DownloadNetwork} from './network.mjs';
import { Accounts } from './accounts.mjs';
import { authAgent } from './auth-agent.mjs';
import { VanillaLauncher } from './launcher.mjs';

import { importBackground, backgroundPattern } from './backgrounds.mjs';
const base = dirname(fileURLToPath(import.meta.url));
const assets = resolve(base, '../dist/client');
const smoke = process.argv.includes('--smoke-test');
const qaUI = !app.isPackaged && process.argv.includes('--qa-ui');
app.setPath('userData', join(app.getPath('appData'), PRODUCT_NAME));
if (smoke || qaUI) app.setPath('userData', process.env.AMBER_SMOKE_ROOT ? resolve(process.env.AMBER_SMOKE_ROOT) : resolve(base, '../.smoke-data'));
app.setName(PRODUCT_NAME);
if (!app.requestSingleInstanceLock()) app.exit(0);
protocol.registerSchemesAsPrivileged([{ scheme: 'amber', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
let window,activatePending = false;
let loaded = false;
const smokeChannels = new Set();
function finishSmoke() {if (smoke && loaded && ['amber:info', 'amber:instances', 'amber:status', 'amber:settings', 'amber:window-state'].every((c) => smokeChannels.has(c))) {console.log('AMBER_DESKTOP_AND_IPC_OK');setTimeout(() => app.quit(), 250);}}
app.on('second-instance', () => {activatePending = true;if (window) {if (window.isMinimized()) window.restore();window.show();window.focus();}});
if (smoke) setTimeout(() => {console.error('AMBER_SMOKE_TIMEOUT');app.exit(2);}, 20000).unref();
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  protocol.handle('amber', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'app') return new Response('Forbidden', { status: 403 });
    if(url.pathname.startsWith('/theme-assets/')){const name=url.pathname.slice('/theme-assets/'.length);if(!assetId.test(name))return new Response('Forbidden',{status:403});try{return new Response(await themes.asset(name),{headers:{'Content-Type':'image/png','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Not found',{status:404});}}
    if (url.pathname.startsWith('/user-background/')) {const name = url.pathname.slice('/user-background/'.length);if (!backgroundPattern.test(name)) return new Response('Forbidden', { status: 403 });try {return new Response(await readFile(join(core.root, 'backgrounds', name)), { headers: { 'Content-Type': 'image/png', 'X-Content-Type-Options': 'nosniff' } });} catch {return new Response('Not found', { status: 404 });}}
    let path;
    try {path = resolve(assets, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));}
    catch {return new Response('Bad request', { status: 400 });}
    if (!path.startsWith(assets + sep)) return new Response('Forbidden', { status: 403 });
    const response = await net.fetch(pathToFileURL(path).href);
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.modrinth.com https://media.forgecdn.net https://launchercontent.mojang.com; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'none'");
    return new Response(response.body, { status: response.status, headers });
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  const storage = new Storage(app.getPath('userData'));let storageConfig;let storageBusy=false;
  while(!storageConfig){try{storageConfig=await storage.validateExisting();}catch(e){if(smoke||qaUI)throw e;const answer=await dialog.showMessageBox({type:'error',title:'游戏数据位置不可用 / Game data unavailable',message:'原数据位置无法读取，未创建空库。请连接原磁盘后重试，或重新选择原数据目录。 / Reconnect the original drive or locate your existing library. No empty library was created.',detail:redact(e.message),buttons:['重试 / Retry','选择原目录 / Locate library','退出 / Quit'],defaultId:0,cancelId:2});if(answer.response===2){app.quit();return;}if(answer.response===1){const pick=await dialog.showOpenDialog({properties:['openDirectory']});if(!pick.canceled)try{await storage.reconnect(pick.filePaths[0]);}catch(err){await dialog.showMessageBox({type:'error',message:redact(err.message)});}}}}

  const core = new VanillaLauncher(storageConfig.path);
  await core.init();
  const seedMap=new SeedMap();
  app.on('before-quit',()=>seedMap.cancel());
  handle('amber:seed-map',async(action,input)=>{
   if(action==='catalog')return seedMap.catalog();
   if(action==='map')return seedMap.map(input);
   if(action==='cancel'){seedMap.cancel();return true;}
   if(action==='world'){const r=await dialog.showOpenDialog(window,{title:'读取世界种子 / Read world seed',properties:['openFile'],filters:[{name:'Java level.dat',extensions:['dat']}]});return r.canceled?null:readWorldFile(r.filePaths[0]);}
   throw Error('Unknown map action');
  });
  const recovery = await recoverTransactions(core);
  if (smoke) {const name = await importBackground(core.root, join(assets, 'assets/forest-banner.png'), (bytes) => nativeImage.createFromBuffer(bytes));const response = await net.fetch('amber://app/user-background/' + name);if (response.status !== 200 || response.headers.get('Content-Type') !== 'image/png' || (await response.arrayBuffer()).byteLength === 0) throw Error('Background round-trip failed');console.log('AMBER_BACKGROUND_OK');}
  if (smoke) {const sample = "amber-credential-codec-check";if (!safeStorage.isEncryptionAvailable() || (await safeStorage.decryptStringAsync(safeStorage.encryptString(sample))).result !== sample || (await safeStorage.decryptStringAsync(await safeStorage.encryptStringAsync(sample))).result !== sample) throw Error("Credential encryption unavailable");console.log("AMBER_SYSTEM_ENCRYPTION_OK");}
  const accounts = new Accounts(core.root, { codec: credentialCodec(safeStorage) });await accounts.init();
  const appUpdates = await new AppUpdates(app.getPath('userData'), app.getVersion()).init();let upgradeBusy = false;
  function handle(channel, fn) {
    ipcMain.handle(channel, async (event, ...args) => {
      const source = new URL(event.senderFrame.url);
      if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame || source.protocol !== 'amber:' || source.host !== 'app') throw new Error('请求来源不受信任。');
      if (storageBusy && !['amber:info', 'amber:status', 'amber:setup-cancel', 'amber:window-action', 'amber:window-state'].includes(channel)) throw Error('数据目录正在迁移，请等待完成。');
      if (upgradeBusy && !['amber:info', 'amber:status', 'amber:app-update-state', 'amber:window-action', 'amber:window-state'].includes(channel)) throw Error('正在准备升级，请稍候。');
      let result;try {if(IS_AMBERE&&(channel.startsWith('amber:ms-')||channel.startsWith('amber:ownership-')||channel==='amber:account-configure'))accounts.requireMicrosoft();result = await fn(...args);} catch (e) {const problem=errorDescriptor(redact(e.message,accounts.secrets()));throw Error('[AMBER '+problem.code+'] '+problem.text);}result = redactFields(result, accounts.secrets());if (smoke) {smokeChannels.add(channel);finishSmoke();}return result;
    });
  }
  handle('amber:info', () => ({ version: app.getVersion(), buildChannel: (awaitBuildChannel), edition:EDITION, productName:PRODUCT_NAME, dataPath: core.root, platform: process.platform, recovery, themeRecovery:settings.recovery||themes.recovery||null }));
  handle('amber:instances', async () => {const pending = await workflows.pending();return (await core.listInstances()).map((i) => ({ ...i, setup: pending.find((p) => p.instanceId === i.id) || null }));});
  handle('amber:versions', () => core.versions());
  handle('amber:create', (input) => {core.workflowGuard?.();return core.createInstance(input);});
  handle('amber:status', async () => ({ ...(await core.runtimeStatus()), setups: await workflows.pending(), operation: core.operation || null, workflowActive: workflows.active, cancelling: workflows.active && workflows.cancelled }));
  handle('amber:install', (id, options) => core.install(id, options));
  handle('amber:cancel', (id) => {const job=core.jobs.find(j=>j.id===id);if(job&&[...workflows.scopes].some(s=>s.instanceId===job.instanceId))return workflows.cancel(job.instanceId);return core.cancel(id);});
  handle('amber:java-scan', () => core.scanJava());
  handle('amber:java-copy-detected',async path=>{const rows=await core.scanJava();if(!rows.some(r=>r.path===path))throw Error('Java not found / 未找到此 Java，请重新检测');clipboard.writeText(path);return true;});
  handle('amber:analyze-logs',async input=>{
   if(input?.importFile===true){const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Logs',extensions:['log','txt']}]});if(r.canceled)return null;return {text:redactCrashLog(await readBoundedFile(r.filePaths[0],2_000_000)),sources:['Imported log / 导入的日志']};}
   const server=input?.server===true,id=input?.id;
   const dir=server?await servers.dir(id):await core.instancePath(id);
   const run=server?servers.runs.get(id):(await core.runtimeStatus()).processes.filter(r=>r.instanceId===id).at(-1);
   const result=await collectCrashLogs(dir,{...run,server});return {...result,text:redactCrashLog(result.text)};
  });
  handle('amber:logs-folder',async id=>{const dir=await core.instancePath(id);const path=join(dir,'logs');await ensureParents(dir,join(path,'probe'));const error=await shell.openPath(path);if(error)throw Error(error);return true;});
  handle('amber:java-prepare', (id) => core.prepareJava(id));
  handle('amber:java-select', (id, path) => core.selectJava(id, path));
  handle('amber:java-browse', async () => {const result = await dialog.showOpenDialog(window, { title: translateMessage('选择 Java 可执行文件'), properties: ['openFile'], ...(process.platform==='win32'?{filters:[{name:'Java',extensions:['exe']}]}:{}) });return result.canceled ? null : core.addJava(result.filePaths[0]);});
  const servers=await new Servers(core).init(),rooms=new Rooms(core,servers),sakura=new Sakura142(core,servers,credentialCodec(safeStorage));
  let schedules;
  const serverUpdates144=new ServerUpdates144(servers);
  const serverTrash=new ServerTrash143(servers,{connected:id=>rooms.starting||sakura.busy||rooms.active&&rooms.current?.serverId===id||sakura.active&&sakura.current?.serverId===id});
  const serverEditor=new InstanceEditor({instancePath:id=>servers.dir(id)},{directories:['config','defaultconfigs','plugins','kubejs','scripts'],files:['server.properties','bukkit.yml','spigot.yml','paper.yml','permissions.yml']});
  const resourceTimer=setInterval(()=>servers.sample(),3000);resourceTimer.unref();
  handle('amber:server',async(action,...args)=>{
   const updateMethods={updateScan:'scan',updateLock:'lock',updatePreview:'preview',updateInstall:'install',updateHistory:'history',updateRestore:'restore'};if(Object.hasOwn(updateMethods,action))return serverUpdates144[updateMethods[action]](...args);
   const trashMethods={trashList:'list',trashDetails:'details',trashRemove:'remove',trashRestore:'restore',trashPurge:'purge'};if(Object.hasOwn(trashMethods,action))return serverTrash[trashMethods[action]](...args);
   const methods=['versions','create','install','launchSettings','properties','saveProperties','backups','restoreConfig','start','stop','command','copy','content','toggleContent','removeContent','contentHistory','restoreContent','search','categories','contentVersions','previewContent','installContent'];
   if(methods.includes(action))return servers[action](...args);
   if(['editorList','editorRead','editorHistory','editorBackup'].includes(action))return serverEditor[action.slice(6).toLowerCase()](...args);
   if(action==='editorSave')return servers.locks.run(args[0],async()=>{await servers.stopped(args[0]);return serverEditor.save(...args);});
   if(action==='openLogs'){const dir=await servers.dir(args[0]);const logs=join(dir,'logs');await ensureParents(dir,join(logs,'.check'));return shell.openPath(logs);}
   if(action==='status')return {instances:await servers.list(),network:await rooms.state()};
   if(action==='addresses'){const p=await servers.properties(args[0]);return servers.addresses(Number(p.values['server-port']||25565));}
   if(action==='open'){const dir=await servers.dir(args[0]);return shell.openPath(dir);}
   if(action==='pickJava'){const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Java',extensions:['exe']}]});return r.canceled?null:(await core.addJava(r.filePaths[0]));}
   if(action==='importJar'||action==='importContent'){const r=await dialog.showOpenDialog(window,{properties:action==='importContent'?['openFile','multiSelections']:['openFile'],filters:[{name:'Java archive',extensions:['jar']}]});if(r.canceled)return null;return action==='importJar'?servers.importJar(args[0],r.filePaths[0]):servers.importContent(args[0],r.filePaths);}
   if(action==='sakuraState')return sakura.state(...args);
   if(action==='sakuraDiagnose')return sakura.diagnose(...args);
   if(action==='sakuraSave')return sakura.save(...args);
   if(action==='sakuraInstall')return sakura.install();
   if(action==='sakuraStart')return servers.locks.run(args[0],()=>sakura.start(...args));
   if(action==='sakuraStop')return sakura.stop();
   if(action==='sakuraWebsite')return shell.openExternal('https://www.natfrp.com/tunnel/');
   if(action==='sakuraCopy'){const run=(await sakura.state()).run,address=run?.address;if(!address||!run.connected||!run.targetRunning)throw Error('隧道尚未连通 / Tunnel is not connected');clipboard.writeText(address);return true;}
   if(action==='networkInstall')return rooms.install();
   if(action==='host')return servers.locks.run(args[0],()=>rooms.host(...args));
   if(action==='join')return rooms.join(...args);
   if(action==='leave')return rooms.leave();
   if(action==='copyInvite'){const code=(await rooms.state()).room?.code;if(!code)throw Error('No hosted room');clipboard.writeText(code);return true;}
   if(action==='eula')return shell.openExternal('https://www.minecraft.net/eula');
   if(action==='buildtools')return shell.openExternal('https://www.spigotmc.org/wiki/buildtools/');
   throw Error('Unknown server action');
  });
  const content = new Modrinth(core);
  const packs = new Modpacks(core, content);
  const workflows = new Workflows(core, content),settings = new Settings(core.root),selections = new Map();
  const localPacks=new LocalPacks(core,packs,workflows);workflows.localPacks=localPacks;
  const packUpgrade140=new PackUpgrade140(core,packs,localPacks,workflows);
  handle('amber:pack-upgrade',async(action,id,input)=>{if(action==='versions')return packUpgrade140.versions(id);if(action==='diff')return packUpgrade140.diff(id,input);if(action==='apply')return packUpgrade140.apply(id,input);if(action==='preview'){if(input)return packUpgrade140.preview(id,{version:input});const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Modrinth pack',extensions:['mrpack']}]});return r.canceled?null:packUpgrade140.preview(id,{path:r.filePaths[0]});}throw Error('Invalid action');});
  const minecraftImport=new MinecraftImport(core);
  handle('amber:minecraft-import',async(action,...args)=>{
   if(action==='pick'){const r=await dialog.showOpenDialog(window,{title:'选择原版 .minecraft / Select original .minecraft',properties:['openDirectory']});return r.canceled?null:minecraftImport.scan(r.filePaths[0]);}
   if(action==='preview')return minecraftImport.preview(...args);
   if(action==='create')return minecraftImport.create(...args);
   if(action==='status')return minecraftImport.status();
   if(action==='cancel'){minecraftImport.cancel();return true;}
   throw Error('Unknown Minecraft import action');
  });
  handle('amber:local-pack-pick',async()=>{const r=await dialog.showOpenDialog(window,{title:'Import modpack / 导入整合包',properties:['openFile'],filters:[{name:'Modpack / 整合包与清单',extensions:['mrpack','zip','json']}]});return r.canceled?null:localPacks.preview(r.filePaths[0]);});
  handle('amber:local-pack-create',(id,input)=>localPacks.create(id,input));
  handle('amber:local-pack-forget',id=>localPacks.forget(id));
  handle('amber:pack-report',id=>localPacks.report(id));
  const themes=await new Themes(core.root,settings).init();
  const network=await new DownloadNetwork(core.root,{fetcher:core.fetcher}).init();network.configure((await settings.get()).network);core.fetcher=network.request;core.network=network;
  handle('amber:network-diagnose',()=>network.diagnose());
  handle('amber:transfer-status144',()=>network.transferStatus());
  handle('amber:transfer-priority144',id=>{const job=core.jobs.find(j=>j.id===id&&j.state==='running');if(!job)throw Error('Task has ended / 任务已结束');for(const j of core.jobs)j.downloadPriority=j.id===id;core.jobQueue.waiting.sort((a,b)=>Number(b.key===job.instanceId)-Number(a.key===job.instanceId));if(network.jobs.has(id))network.prioritize(id);return true;});
  handle('amber:network-pause',(id,value)=>network.pause(id,value));
  if(smoke){const a=(await settings.get()).appearance;for(const key of ['backgroundAsset','heroAsset','artworkAsset'])if(a[key]){const response=await net.fetch('amber://app/theme-assets/'+a[key]);const bytes=Buffer.from(await response.arrayBuffer());if(response.status!==200||response.headers.get('Content-Type')!=='image/png'||nativeImage.createFromBuffer(bytes).isEmpty())throw Error('Theme image protocol failed');}console.log('AMBER_THEME_ASSETS_OK');}

  function applyAppearance(v){if(window&&!window.isDestroyed()){window.setOpacity(v.appearance?.enabled?(v.appearance.windowOpacity/100):1);window.webContents.setZoomFactor(v.appearance?.enabled?v.appearance.scale/100:1);window.webContents.send('amber:theme-changed');}}
  themes.onChanged=applyAppearance;

  const guided=new GuidedCreation(core,content,workflows);
  const workbench=new InstanceWorkbench(core,workflows);core.workbench=workbench;
  for(const i of await core.listInstances()){try{const dir=await core.instancePath(i.id);await core.requireStopped(dir);await workbench.recover(dir);}catch(e){recovery.push({name:i.name,error:e.message});}}
  handle('amber:workbench',id=>workbench.inspect(id));
  handle('amber:workbench-good',id=>workbench.markGood(id));
  handle('amber:workbench-restore',(id,record)=>workbench.restore(id,record));
  handle('amber:workbench-evidence',id=>workbench.evidence(id));
  handle('amber:trial-preview',(id,saves)=>workbench.trialPreview(id,saves));
  handle('amber:trial-create',(id,options)=>workbench.createTrial(id,options));
  handle('amber:trial-review',id=>workbench.previewApply(id));
  handle('amber:trial-apply',(key,selected)=>workbench.applyTrial(key,selected));
  handle('amber:trial-keep',id=>workbench.keepTrial(id));
  handle('amber:guided-workspace',(scope,v)=>guided.preferences.draft(scope,v));
  handle('amber:guided-templates',(action,v)=>guided.preferences.templates(action,v));
  handle('amber:template-export',async id=>{const value=await guided.preferences.exportTemplate(id);const r=await dialog.showSaveDialog(window,{title:translateMessage('导出所选模板…'),defaultPath:'recommendation-template.json',filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return false;await writeFile(r.filePath,JSON.stringify(value,null,2));return true;});
  handle('amber:template-import',async()=>{const r=await dialog.showOpenDialog(window,{title:translateMessage('导入模板…'),properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return null;const value=await guided.preferences.previewTemplate(r.filePaths[0]);const a=await dialog.showMessageBox(window,{type:'question',message:value.name,detail:translateMessage('仅导入问卷偏好。不会安装内容，应用后需要重新生成并检查方案。'),buttons:[translateMessage('取消'),translateMessage('导入模板…')],defaultId:0,cancelId:0,noLink:true});if(a.response!==1)return null;return guided.preferences.importTemplate(value);});
  handle('amber:guided-generation',()=>guided.generationStatus());
  handle('amber:guided-cancel-generation',()=>guided.cancelGeneration());
  handle('amber:guided-hardware',()=>guided.hardware());
  handle('amber:guided-draft',v=>guided.draft(v));
  handle('amber:guided-search',(query,type)=>guided.search(query,type));
  handle('amber:guided-pack-versions',async id=>{if(typeof id!=='string'||!/^[-\w]{1,100}$/.test(id))throw Error('无效项目');const p=await content.api('project/'+id);if(p.project_type!=='modpack')throw Error('请选择 Modrinth 整合包。');return (await content.api('project/'+id+'/version?include_changelog=false')).map(v=>({id:v.id,title:v.name,version:v.version_number,type:v.version_type}));});
  handle('amber:guided-addon-recommend',(id,v)=>guided.recommendAddon(id,v));
  handle('amber:guided-addon-install',(id,ack)=>guided.installAddon(id,ack));
  handle('amber:guided-recommend',v=>guided.recommend(v));
  handle('amber:guided-edit',(id,v)=>guided.edit(id,v));
  handle('amber:guided-create',(id,v)=>guided.create(id,v));
  handle('amber:guided-report',id=>guided.report(id));
  handle('amber:guided-skip',id=>guided.skipVisuals(id));
  const graphics=new GraphicsPreferences(app.getPath('userData'));
  core.beforeJavaLaunch=async path=>{const mode=(await settings.get()).graphicsMode;try{return await graphics.apply(path,mode);}catch{return {state:'failed',mode};}};
  let adapterCache=null;
  handle('amber:graphics-info',async id=>{const info={supported:graphics.supported,adapters:[],javaPath:null,sharedNames:[]};try{adapterCache??=await graphicsAdapters();info.adapters=adapterCache;}catch(e){info.adapterError=e.message;}if(id){try{info.javaPath=(await core.resolveGameJava(id)).path;info.sharedNames=(await core.listInstances()).filter(i=>i.id!==id&&i.javaPath?.toLowerCase()===info.javaPath.toLowerCase()).map(i=>i.name);}catch(e){info.javaError=e.message;}}return info;});
  handle('amber:graphics-open',()=>shell.openExternal('ms-settings:display-advancedgraphics'));
  handle('amber:graphics-copy-java',async id=>{clipboard.writeText((await core.resolveGameJava(id)).path);return true;});
  handle('amber:graphics-restore',async()=>{if(launching)throw Error('正在准备启动。');await graphics.restoreAll();await settings.save({...await settings.get(),graphicsMode:'system'});return true;});
  const languages = new LanguagePacks(app.getPath('userData'));
  async function refreshLocale() {const value = await settings.get(),pack = await languages.get();setLocale(value.language, pack, app.getLocale());return { language: value.language, pack };}
  await refreshLocale();
  handle('amber:language-state', refreshLocale);
  handle('amber:language-import', async () => {const r = await dialog.showOpenDialog(window, { title: translateMessage('导入语言包'), properties: ['openFile'], filters: [{ name: 'AMBER JSON', extensions: ['json'] }] });if (r.canceled) return false;const pack = await languages.preview(r.filePaths[0]);const answer = await dialog.showMessageBox(window, { type: 'question', title: translateMessage('导入语言包'), message: pack.name, detail: translateMessage('将替换当前自定义语言包。只导入可信来源；文字可能改变提示的含义。'), buttons: [translateMessage('取消'), translateMessage('导入')], defaultId: 0, cancelId: 0, noLink: true });if (answer.response !== 1) return false;await languages.save(pack);await refreshLocale();return true;});
  handle('amber:language-export', async () => {const r = await dialog.showSaveDialog(window, { title: translateMessage('导出语言包模板'), defaultPath: 'amber-language.json', filters: [{ name: 'JSON', extensions: ['json'] }] });if (r.canceled) return false;await writeFile(r.filePath, JSON.stringify(languageTemplate(), null, 2));return true;});
  handle('amber:language-remove', async () => {await languages.remove();const value = await settings.get();if (value.language.startsWith('x-')) await settings.save({ ...value, language: 'en-US' });return refreshLocale();});
  const management = new InstanceManagement(core, workflows),backups = new Backups(core, workflows);
  const serverManagement140=new ServerManagement140(core,servers),environment140=new Environment140(core,servers,content,workflows);
  const performance144=new Performance144(servers);const performanceTimer=setInterval(()=>performance144.sample().catch(()=>{}),3000);performanceTimer.unref();
  handle('amber:performance144',async(action,id)=>{if(action==='state')return performance144.state(id);if(action==='collect')return performance144.collect(id);if(action==='export'){const state=await performance144.state(id);if(!state.report)throw Error('Collect a report first / 请先采集报告');const out=await dialog.showSaveDialog(window,{defaultPath:'server-performance.json',filters:[{name:'JSON',extensions:['json']}]});if(out.canceled)return null;await writeFile(out.filePath,JSON.stringify(state.report,null,2));return true;}throw Error('Invalid action');});
  handle('amber:server-management',async(action,id,input)=>{if(['roster','skin','installBridge','players','player','commands','backups','backup','restore','policy','savePolicy','pinBackup'].includes(action))return serverManagement140[action](id,input);if(action==='command')return serverManagement140.consoleResult(id,input);if(action==='link')return environment140.links(id,input);if(action==='compare')return environment140.compare(id,input);if(action==='previewInstall')return environment140.previewInstall(id,input.localId,input.versionId);if(action==='install')return environment140.install(id);if(action==='export'){const r=await environment140.requirements(id);const out=await dialog.showSaveDialog(window,{defaultPath:'server-environment.json',filters:[{name:'Environment',extensions:['json']}]});if(out.canceled)return null;await writeFile(out.filePath,JSON.stringify(r.manifest,null,2));return {unknown:r.unknown,optional:r.optional};}if(action==='import'){const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Environment',extensions:['json']}]});if(r.canceled)return null;const st=await lstat(r.filePaths[0]);if(!st.isFile()||st.size>2000000)throw Error('Invalid environment file');return environment140.previewImport(JSON.parse(await readFile(r.filePaths[0],'utf8')));}if(action==='create')return environment140.create(id,input);throw Error('Invalid action');});
  const protection140=new Protection140(core,backups);
  handle('amber:protection', (action,id,value)=>{if(action==='state')return protection140.state(id);if(action==='save')return protection140.save(id,value);if(action==='pin')return backups.pin(id,value);throw Error('Invalid action');});
  const modUpdates = new ModUpdates(core, content);
  const bulkContent = new BulkContent(core, content, modUpdates),launchPreferences = new LaunchPreferences(core);
  content.updates = modUpdates;
  const libraryState = new LibraryState(core),modImport = new ModImport(core, content, modUpdates),health = new InstanceHealth(core, content, workflows, accounts, launchPreferences, settings);
  handle('amber:copy-error', (text) => {if (typeof text !== 'string' || text.length > 100000) throw Error('错误详情过长，请手动选择文字复制。');clipboard.writeText(redact(text, accounts.secrets()));return true;});
  const journal=new PlayJournal(core.root),news=new NewsFeed(core.root),homePrefs=new HomePreferences(core.root),screenshots=new Screenshots(core),survey=new StorageSurvey(core,app.getPath('userData'));
  try{await journal.migrate((await libraryState.get()).history);await journal.recover();}catch{/* Preserve an unreadable journal; it must never prevent launching the application. */}
  await survey.init().catch(()=>{});
  let journalObservation=null;const observe=()=>{if(storageBusy||upgradeBusy)return Promise.resolve();if(journalObservation)return journalObservation;journalObservation=(async()=>{try{const processes=(await core.runtimeStatus()).processes;if(!storageBusy&&!upgradeBusy){await journal.observe(processes);await protection140.observe(processes);}}catch{}})().finally(()=>journalObservation=null);return journalObservation;};
  core.onSessionChanged=observe;await observe();const journalTimer=setInterval(observe,30000);journalTimer.unref();
  powerMonitor.on('suspend',()=>{if(!storageBusy)journal.suspend().catch(()=>{});});powerMonitor.on('resume',()=>{journal.resume();observe();});
  handle('amber:journal',()=>journal.get());
  handle('amber:journal-enable',v=>journal.enable(v));
  handle('amber:journal-clear',async()=>{const r=await dialog.showMessageBox(window,{type:'question',message:'清除本地游玩记录？ / Clear local play history?',buttons:['取消 / Cancel','清除 / Clear'],defaultId:0,cancelId:0});return r.response===1?journal.clear():journal.get();});
  handle('amber:journal-export',async()=>{const r=await dialog.showSaveDialog(window,{defaultPath:'play-history.json',filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return false;await writeFile(r.filePath,JSON.stringify(await journal.get(),null,2));return true;});
  handle('amber:news',()=>news.get());handle('amber:news-refresh',()=>news.refresh());handle('amber:news-cancel',()=>news.cancel());
  handle('amber:news-open',async id=>shell.openExternal(await news.link(id)));handle('amber:news-detail',id=>news.detail(id));
  handle('amber:home-prefs',()=>homePrefs.get());handle('amber:home-prefs-save',v=>homePrefs.save(v));
  handle('amber:survey',()=>survey.get());handle('amber:survey-start',()=>survey.start());handle('amber:survey-cancel',()=>survey.cancel());
  const dependency130=new DependencyMetadata(core);
  handle('amber:dependency-metadata',async id=>dependency130.read(id,await content.list(id)));
  const editor130=new InstanceEditor(core);
  handle('amber:editor-history',(id,name)=>editor130.history(id,name));
  handle('amber:editor-backup',(id,name,token)=>editor130.backup(id,name,token));
  handle('amber:editor-list',id=>editor130.list(id));
  handle('amber:editor-read',(id,name)=>editor130.read(id,name));
  handle('amber:editor-save',(id,input)=>editor130.save(id,input));
  handle('amber:account-skin',(id,refresh)=>accountSkin(accounts,id,refresh));
  handle('amber:screenshot-thumbnail',async token=>{const img=nativeImage.createFromBuffer((await screenshots.read(token)).bytes);if(img.isEmpty())throw Error('Image unavailable');return img.resize({width:360}).toDataURL();});
  handle('amber:screenshots',id=>screenshots.list(id));
  handle('amber:screenshot-read',async token=>(await screenshots.read(token)).bytes.toString('base64'));
  handle('amber:screenshot-copy',async token=>{const image=nativeImage.createFromBuffer((await screenshots.read(token)).bytes);if(image.isEmpty())throw Error('Image unavailable');clipboard.writeImage(image);return true;});
  handle('amber:screenshot-delete',token=>screenshots.trash(token,path=>shell.trashItem(path)));
  handle('amber:screenshot-folder',async token=>shell.showItemInFolder((await screenshots.read(token)).path));
  handle('amber:library-state', () => libraryState.get());
  handle('amber:library-favorite', (id, value) => libraryState.favorite(id, value));
  handle('amber:library-sort', (value) => libraryState.sort(value));
  handle('amber:instance-health', (id) => health.scan(id));
  handle('amber:mod-import-pick', async (id, lookup) => {await readyForModUpdate(id);const r = await dialog.showOpenDialog(window, { title: translateMessage('选择本地模组（每批最多 50 个）'), properties: ['openFile', 'multiSelections'], filters: [{ name: 'Minecraft 模组', extensions: ['jar', 'litemod'] }] });return r.canceled ? null : modImport.preview(id, r.filePaths, lookup !== false);});
  handle('amber:mod-import-validate', (id, key, keys, enabled) => modImport.validate(id, key, keys, enabled));
  handle('amber:mod-import-apply', async (id, key, keys, enabled) => {await readyForModUpdate(id);return modImport.apply(id, key, keys, enabled);});
  async function readyForModUpdate(id) {if ((await workflows.pending()).some((p) => p.instanceId === id)) throw Error('此实例安装尚未完成，请先到任务中心继续安装。');}
  handle('amber:mod-update-scan', (id, pre) => modUpdates.scan(id, pre === true));
  handle('amber:mod-update-lock', async (id, p, value) => {await readyForModUpdate(id);return modUpdates.lock(id, p, value);});
  handle('amber:mod-update-preview', (id, choices, optional, excluded) => modUpdates.preview(id, choices, optional, excluded));
  handle('amber:mod-update-install', async (id, plan) => {await readyForModUpdate(id);await protection140.before(id,'updates');return modUpdates.install(id, plan);});
  handle('amber:mod-update-history', (id) => modUpdates.history(id));
  handle('amber:mod-update-restore', async (id, record) => {await readyForModUpdate(id);return modUpdates.restore(id, record);});
  handle('amber:app-update-state', () => appUpdates.snapshot());
  handle('amber:app-update-channel',channel=>appUpdates.setChannel(channel));
  handle('amber:app-update-check', () => appUpdates.check());
  handle('amber:app-update-download', () => appUpdates.download());
  handle('amber:app-update-cancel', () => appUpdates.cancel());
  handle('amber:app-update-install', async () => {
    if (servers.active || (rooms.active||sakura.active) || launching || storageBusy || workflows.active || core.jobs.some((j) => j.state === 'running')) throw Error('请等待游戏准备、安装或数据迁移结束后再升级。');
    upgradeBusy = true;
    try {for (const item of await core.listInstances()) await core.requireStopped(await core.instancePath(item.id));
      if (servers.active || (rooms.active||sakura.active) || launching || storageBusy || workflows.active || core.jobs.some((j) => j.state === 'running')) throw Error('有新任务开始，请等待结束后再升级。');
      const file = await appUpdates.installer();const answer = await dialog.showMessageBox(window, { type: 'question', title: translateMessage('安装 AMBER 更新'), message: translateMessage('安装包已校验，是否退出 AMBER 并打开安装程序？'), detail: translateMessage('将保留游戏数据，并先备份账号和设置。请在安装向导中确认安装位置。'), buttons: [translateMessage('取消'), translateMessage('退出并安装')], defaultId: 0, cancelId: 0, noLink: true });if (answer.response !== 1) return false;
      await backupUpgradeConfig(app.getPath('userData'), core.root, app.getVersion());
      if(process.platform!=='win32'){const error=await shell.openPath(file);if(error)throw Error(error);}else await new Promise((resolve, reject) => {const child = spawn(file, [], { detached: true, stdio: 'ignore', windowsHide: false });child.once('error', reject);child.once('spawn', () => {child.unref();resolve();});});
      app.quit();return true;
    } finally {upgradeBusy = false;}
  });
  workflows.installPack = async (id, version) => {try {const r = JSON.parse(await readFile(join(await core.instancePath(id), 'modpack.json'), 'utf8'));if (r.versionId === version) return;} catch (e) {if (e.code !== 'ENOENT') throw e;}const p = await packs.preview(id, version);return workflows.wait(await packs.install(id, p.id));};
  handle('amber:backups', (id) => backups.list(id));
  handle('amber:backup-create', (id, mode) => backups.create(id, mode));
  handle('amber:backup-restore', (id) => backups.restore(id));
  handle('amber:storage-usage',()=>workflows.exclusive(()=>storageUsage(core.root,app.getPath('userData'))));
  handle('amber:upgrade-backups-open',async()=>{const path=join(app.getPath('userData'),'upgrade-backups');await ensureParents(app.getPath('userData'),join(path,'probe'));const error=await shell.openPath(path);if(error)throw Error(error);return true;});
  handle('amber:backup-verify',id=>backups.verify(id));
  handle('amber:storage-info', async () => {const r = await storage.get(),disk = await statfs(core.root);return { path: core.root, freeBytes: disk.bavail * disk.bsize, onboarded: r.onboarded || !smoke && (await core.listInstances()).length > 0 };});
  handle('amber:onboarding-complete', () => storage.complete());
  handle('amber:storage-pick', async () => {const r = await dialog.showOpenDialog(window, { title: translateMessage('选择新的空数据文件夹'), properties: ['openDirectory', 'createDirectory'] });if (r.canceled) return null;const token = randomUUID();selections.set(token, { kind: 'storage', value: r.filePaths[0] });return { token, path: r.filePaths[0] };});
  handle('amber:storage-move', async (token) => {if(servers.active||(rooms.active||sakura.active))throw Error('Stop servers and leave the room before moving data / 迁移数据前请停止服务器并退出房间');const target = selection(token, 'storage');if (!target) throw Error('请先选择目标目录');return workflows.exclusive(async () => {for (const item of await core.listInstances()) await core.requireStopped(await core.instancePath(item.id));storageBusy = true;core.operation = { title: '复制并校验数据目录', state: 'running' };try {news.cancel();survey.cancel();await Promise.allSettled([journalObservation,journal.queue,homePrefs.queue,news.pending,survey.done,...news.details.values()].filter(Boolean));await storage.migrate(core, target);app.relaunch();app.exit(0);return true;} catch (e) {storageBusy = false;throw e;} finally {core.operation = null;}});});
  handle('amber:instance-icon', (id, icon) => management.setIcon(id, icon));
  handle('amber:instance-rename', (id, name) => management.rename(id, name));
  handle('amber:instance-remove', (id) => management.remove(id));
  handle('amber:instance-trash', () => management.list());
  handle('amber:trash-details', (id) => management.trashDetails(id));
  handle('amber:trash-purge', (id, confirmation) => management.purge(id, confirmation));
  handle('amber:feedback-prepare',fields=>feedbackDraft(fields,feedbackDiagnosticPreview,text=>redact(text,accounts.secrets())));
  handle('amber:feedback-open',()=>shell.openExternal(feedbackUrl));
  let diagnosticPreview=null,feedbackDiagnosticPreview=null;
  handle('amber:feedback-diagnostics',async()=>{feedbackDiagnosticPreview=localizeFields(await summary());return feedbackDiagnosticPreview;});
  const summary = async () => diagnosticSummary({ version: app.getVersion(), platform: process.platform, arch: process.arch, instances: await core.listInstances(), status: await core.runtimeStatus() });
  handle('amber:diagnostics-preview', async()=>{diagnosticPreview=localizeFields(await summary());return diagnosticPreview;});
  handle('amber:privacy-cleanup',async kind=>{if(!['updates','upgrade-backups'].includes(kind))throw Error('不支持的清理目标。');if(upgradeBusy||storageBusy||launching||workflows.active||core.jobs.some(j=>j.state==='running')||['downloading','checking'].includes(appUpdates.state.phase))throw Error('请等待当前任务结束。');const usage=await measureDirectory(join(app.getPath('userData'),kind));if(!usage.complete)throw Error('清理预览不完整，请检查目录权限或链接。');const answer=await dialog.showMessageBox(window,{type:'warning',title:translateMessage('清理本地副本'),message:translateMessage(kind==='updates'?'删除下载的程序更新包？':'删除旧升级配置备份？'),detail:translateMessage('此操作不可撤销。不会删除活动账号、实例、存档或实例备份。旧配置备份可能包含加密的历史账号库。')+'\n'+join(app.getPath('userData'),kind)+'\n'+usage.files+' files · '+(usage.bytes/1048576).toFixed(1)+' MB',buttons:[translateMessage('取消'),translateMessage('确认清理')],defaultId:0,cancelId:0,noLink:true});if(answer.response!==1)return false;if(upgradeBusy||storageBusy||launching||workflows.active||core.jobs.some(j=>j.state==='running')||['downloading','checking'].includes(appUpdates.state.phase))throw Error('请等待当前任务结束。');upgradeBusy=true;try{await cleanupPrivateCopies(app.getPath('userData'),kind);if(kind==='updates'){appUpdates.candidate=null;appUpdates.state={phase:'idle'};}return true;}finally{upgradeBusy=false;}});
handle('amber:privacy-info', () => ({ accounts: join(core.root, 'accounts.json'), data: core.root, upgrades: join(app.getPath('userData'), 'upgrade-backups') }));
  handle('amber:privacy-copy-path',key=>{const paths={accounts:join(core.root,'accounts.json'),data:core.root,upgrades:join(app.getPath('userData'),'upgrade-backups')};if(!Object.hasOwn(paths,key))throw Error('不支持的数据位置。');clipboard.writeText(paths[key]);return true;});
  handle('amber:diagnostics-export', async () => {if(!diagnosticPreview)throw Error('请先预览诊断摘要。');const snapshot=diagnosticPreview;const result = await dialog.showSaveDialog(window, { title: translateMessage('保存不含账号和日志的诊断摘要'), defaultPath: 'amber-diagnostics.json', filters: [{ name: 'JSON', extensions: ['json'] }] });if (result.canceled) return false;await writeFile(result.filePath, JSON.stringify(snapshot, null, 2));return true;});
  handle('amber:instance-restore', (id) => management.restore(id));
  handle('amber:lite-overlay', (id, v) => configureLiteOverlay(core, id, v));
  handle('amber:layout-export', async () => {const value = { format: 'amber-layout', schema: 1, layout: (await settings.get()).layout };const result = await dialog.showSaveDialog(window, { title: translateMessage('导出布局'), defaultPath: 'amber-layout.json', filters: [{ name: 'AMBER layout', extensions: ['json'] }] });if (result.canceled) return false;await writeFile(result.filePath, JSON.stringify(value, null, 2));return true;});
  handle('amber:layout-import', async () => {const result = await dialog.showOpenDialog(window, { title: translateMessage('导入布局'), properties: ['openFile'], filters: [{ name: 'AMBER layout', extensions: ['json'] }] });if (result.canceled) return null;const path = result.filePaths[0];if ((await stat(path)).size > 64000) throw Error('布局文件过大');const data = JSON.parse(await readFile(path, 'utf8'));if (data.format !== 'amber-layout' || data.schema !== 1) throw Error('不是 AMBER 布局文件');return settings.save({ ...(await settings.get()), layout: validateLayout(data.layout) });});
  core.downloadThreads = (await settings.get()).threads;configureTransferBudget(core.downloadThreads);
  handle('amber:background-pick', async () => {const r = await dialog.showOpenDialog(window, { title: translateMessage('选择启动背景（20 MB 以内）'), properties: ['openFile'], filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }] });if (r.canceled) return null;const background = await importBackground(core.root, r.filePaths[0], (bytes) => nativeImage.createFromBuffer(bytes));return settings.save({ ...(await settings.get()), background });});
  handle('amber:themes-list',()=>themes.list());
  handle('amber:theme-state',()=>themes.state());
  handle('amber:theme-trial',v=>themes.trial(v));
  handle('amber:theme-apply',v=>themes.apply(v));handle('amber:theme-apply-entry',id=>themes.applyEntry(id));
  handle('amber:theme-confirm',id=>themes.confirm(id));
  handle('amber:theme-revert',()=>themes.revert());
  handle('amber:theme-restore',()=>themes.restore());
  handle('amber:theme-reset',()=>themes.reset());
  handle('amber:theme-remove',id=>themes.remove(id));
  handle('amber:theme-draft',(operation,v)=>{if(operation==='read')return themes.draft();if(operation==='clear')return themes.draft(null);if(operation==='save')return themes.draft(validateSettings(v));throw Error('Invalid theme draft operation');});
  handle('amber:theme-save-local',(v,meta)=>themes.saveLocal(validateSettings(v),meta));
  handle('amber:theme-import',async()=>{const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'AMBER theme',extensions:['ambtheme']}]});if(r.canceled)return null;if((await stat(r.filePaths[0])).size>32*1024*1024)throw Error('Theme exceeds 32 MB / 主题包超过 32 MB');return themes.import(await readFile(r.filePaths[0]));});
  handle('amber:theme-export',async(v,meta)=>{const bytes=await themes.export(validateSettings(v),meta);const r=await dialog.showSaveDialog(window,{defaultPath:'My-theme.ambtheme',filters:[{name:'AMBER theme',extensions:['ambtheme']}]});if(r.canceled)return false;await writeFile(r.filePath,bytes);return true;});
  handle('amber:theme-image',async()=>{const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Image',extensions:['png','jpg','jpeg','webp']}]});if(r.canceled)return null;const name=await importBackground(core.root,r.filePaths[0],b=>nativeImage.createFromBuffer(b));return themes.storeAsset(await readFile(join(core.root,'backgrounds',name)));});
  handle('amber:settings', () => settings.get());
  handle('amber:settings-save', async (v) => {if(themes.state())throw Error('Confirm or revert theme preview first / 请先保留或恢复当前主题试用');v=validateSettings(v);if(launching&&v.graphicsMode!==(await settings.get()).graphicsMode)throw Error('正在准备启动。');if(v.graphicsMode==='system'&&(await settings.get()).graphicsMode!=='system')await graphics.restoreAll();const saved = await settings.save(v);core.downloadThreads = saved.threads;configureTransferBudget(saved.threads);network.configure(saved.network);await refreshLocale();applyAppearance(saved);return saved;});
  handle('amber:setup-state', (key) => workflows.state(key));
  handle('amber:setup-cancel', (id) => workflows.cancel(id));
  handle('amber:setup-repair', (id) => workflows.repairSetup(id));
  handle('amber:setup-retry', (id) => workflows.retry(id));
  handle('amber:setup-choices', (game, type) => workflows.choices(game, type));
  handle('amber:setup-file', async (kind) => {if (!['manifest', 'optifine'].includes(kind)) throw Error('无效文件类型');const result = await dialog.showOpenDialog(window, { title: kind === 'manifest' ? '选择 AMBER 模组迁移清单' : '选择 OptiFine 官方 JAR', properties: ['openFile'], filters: [{ name: kind, extensions: [kind === 'manifest' ? 'json' : 'jar'] }] });if (result.canceled) return null;const path = result.filePaths[0];if ((await stat(path)).size > (kind === 'manifest' ? 2000000 : 100000000)) throw Error('文件过大');const value = kind === 'manifest' ? validateManifest(JSON.parse(await readFile(path, 'utf8'))) : path;const token = randomUUID();selections.set(token, { kind, value });return { token, name: path.split(/[\\/]/).at(-1) };});
  function selection(token, kind) {if (!token) return null;const entry = selections.get(token);if (!entry || entry.kind !== kind) throw Error('请选择文件');return entry.value;}
  handle('amber:setup', (input) => workflows.create(input, selection(input.optifineToken, 'optifine'), selection(input.manifestToken, 'manifest')));
  handle('amber:migration-export', async (id) => {const manifest = await workflows.export(id);const result = await dialog.showSaveDialog(window, { title: translateMessage('导出模组清单'), defaultPath: 'amber-mods.json', filters: [{ name: 'AMBER 模组清单', extensions: ['json'] }] });if (result.canceled) return null;await writeFile(result.filePath, JSON.stringify(manifest, null, 2), 'utf8');return { count: manifest.mods.length, identified: manifest.mods.filter((m) => m.projectId).length };});
  handle('amber:migration-run', (id, token) => workflows.migrate(id, selection(token, 'manifest')));
  handle('amber:migration-report', (id) => workflows.report(id));
  handle('amber:project-open', async (id) => {if (typeof id !== 'string' || !/^[-\w]{1,100}$/.test(id)) throw Error('无效项目');const p = await content.api('project/' + id);if (!['mod', 'modpack', 'shader', 'resourcepack', 'plugin'].includes(p.project_type)) throw Error('未知项目类型');if(id.startsWith('cf-')){const url=new URL(p.website);if(url.protocol!=='https:'||!['www.curseforge.com','curseforge.com'].includes(url.hostname))throw Error('Invalid project URL');return shell.openExternal(url.href);}return shell.openExternal('https://modrinth.com/' + p.project_type + '/' + encodeURIComponent(id));});

  handle('amber:pack-create', async (planId,requestKey) => {const plan = packs.plans.get(planId);if (!plan || plan.expiresAt < Date.now()) throw Error('整合包预览已过期');const prefs = await settings.get();const version = plan.loader === 'forge' ? plan.game + '-' + plan.loaderVersion : plan.loaderVersion;return workflows.create({ requestKey, name: plan.title.slice(0, 60), game: plan.game, loader: plan.loader, version, threads: prefs.threads, packVersion: plan.versionId });});
  handle('amber:pack-preview', (id, v) => packs.preview(id, v));
  handle('amber:pack-install', (id, p) => {const plan = packs.plans.get(p);if (!plan || plan.instanceId !== id || plan.expiresAt < Date.now()) throw Error('预览已过期，请重新检查');return workflows.startContent(id, plan, 'pack');});
  handle('amber:content-categories', provider => content.categories(provider));
  handle('amber:content-search', (id, options) => content.search(id, options));
  handle('amber:content-versions', (id, p) => content.versions(id, p));
  handle('amber:content-preview', (id, v, optional, excluded) => content.preview(id, v, optional, excluded, true));
  handle('amber:content-dismiss', (id) => workflows.dismissContent(id));
  handle('amber:content-install', (id, p) => {const plan = content.plans.get(p);if (!plan || plan.instanceId !== id || plan.expiresAt < Date.now()) throw Error('预览已过期，请重新检查');return workflows.startContent(id, plan);});
  handle('amber:content-list', (id) => content.list(id));
  handle('amber:content-remove', (id, p) => content.remove(id, p));
  handle('amber:bulk-preview', (id, paths, action) => bulkContent.preview(id, paths, action));
  handle('amber:bulk-apply', (id, key) => bulkContent.apply(id, key));
  handle('amber:launch-preferences', (id) => launchPreferences.get(id));
  handle('amber:launch-preferences-save', (id, value) => workflows.exclusive(()=>workbench.record(id,'settings',()=>launchPreferences.save(id, value))));
  handle('amber:content-toggle', (id, p) => content.toggle(id, p));
  handle('amber:world-import', async (id) => {const result = await dialog.showOpenDialog(window, { title: translateMessage('导入地图 ZIP（保留原文件，创建独立存档）'), properties: ['openFile'], filters: [{ name: 'Minecraft world ZIP', extensions: ['zip'] }] });return result.canceled ? null : importWorld(core, id, result.filePaths[0]);});
  handle('amber:optifine-import', async (id) => {const result = await dialog.showOpenDialog(window, { title: translateMessage('选择与当前 Minecraft 和 Forge 兼容的 OptiFine 官方 JAR'), properties: ['openFile'], filters: [{ name: 'OptiFine', extensions: ['jar'] }] });return result.canceled ? null : importOptifine(core, id, result.filePaths[0]);});
  handle('amber:optifine-install', async (id) => {const result = await dialog.showOpenDialog(window, { title: translateMessage('选择 OptiFine 官方安装器 JAR（独立安装，替换当前加载器）'), properties: ['openFile'], filters: [{ name: 'OptiFine', extensions: ['jar'] }] });return result.canceled ? null : installOptifine(core, id, result.filePaths[0]);});
  handle('amber:optifine-site', () => shell.openExternal('https://optifine.net/downloads'));
  handle('amber:loader-versions', (id, type) => core.loaderVersions(id, type));
  handle('amber:loader-configure', async (id, type, v) => {await protection140.before(id,'updates');return core.configureLoader(id,type,v);});
  handle('amber:fabric-versions', (id) => core.fabricVersions(id));
  handle('amber:fabric-configure', (id, version) => core.configureFabric(id, version));
  handle('amber:accounts', () => accounts.list());
  handle('amber:ownership-verify',id=>accounts.verifyOwnership(id));
  handle('amber:ownership-link',(id,ownerId)=>accounts.linkOwnership(id,ownerId));
  handle('amber:purchase',()=>shell.openExternal('https://www.minecraft.net/store/minecraft-java-bedrock-edition-pc'));
  handle('amber:account-configure', (id) => accounts.configure(id));
  handle('amber:offline-edit',(id,input)=>{if(!input||Object.keys(input).some(k=>!['name','skin','model'].includes(k))||input.skin!==undefined&&input.skin!==null)throw Error('Invalid account edit');return accounts.editOffline(id,input);});
  handle('amber:offline-skin-pick',async(id,model)=>{if(!accounts.data.accounts.some(a=>a.id===id&&a.type==='offline'))throw Error('Offline account not found');const result=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'PNG skin',extensions:['png']}]});if(result.canceled)return accounts.list();const bytes=await readBoundedFile(result.filePaths[0],1_000_000,{binary:true});skinDimensions(bytes);const img=nativeImage.createFromBuffer(bytes);if(img.isEmpty())throw Error('Invalid PNG skin');return accounts.editOffline(id,{skin:{png:img.toPNG().toString('base64'),model}});});
  handle('amber:account-offline' , (name) => accounts.addOffline(name));
  handle('amber:account-server', (input) => accounts.addServer(input));
  handle('amber:account-remove', (id) => accounts.remove(id));
  handle('amber:account-profile', (id, p) => accounts.selectProfile(id, p));
  handle('amber:ms-start', async () => beginMicrosoftLogin(accounts, clipboard, (url) => shell.openExternal(url), { copy: (await settings.get()).copyLoginCode }));
  handle('amber:ms-copy', () => copyMicrosoftCode(accounts, clipboard));
  handle('amber:ms-poll', () => accounts.pollMicrosoft());
  handle('amber:ms-cancel', () => {clearCopiedCode(accounts);return accounts.cancelMicrosoft();});
  handle('amber:ms-open', () => shell.openExternal(pendingCode(accounts).url));
  const skinRuns=new Set();
  let launching = false;
  handle('amber:launch', async (id, options) => {if (launching) throw Error('正在准备启动。');launching = true;try {core.workflowGuard?.(id);if((await core.runtimeStatus()).processes.some(p=>p.instanceId===id&&p.state==='running'))throw Error('此实例已经在运行。');if (core.jobs.some((j) => j.instanceId===id&&j.state === 'running')) throw Error('请等待此实例安装或更新结束后启动游戏。');await recoverModUpdate(await core.instancePath(id));if ((await workflows.pending()).some((p) => p.instanceId === id)) throw Error('实例安装尚未完成，请先在任务中心继续安装。');await content.validateLaunch(id);const launchPrefs = await launchPreferences.get(id);options = { ...options, accountId: launchPrefs.accountId ?? options.accountId, memory: launchPrefs.memory ?? options.memory };const identity = await accounts.authorizeLaunch(options.accountId,options.username);await protection140.before(id,'daily');const skinBridge=identity.localSkin?await startSkinBridge(identity,identity.localSkin):null;let run;try{const extraJvm = identity?.server||skinBridge ? [`-javaagent:${await authAgent(core.root,fetch,{preferCache:!!skinBridge})}=${identity.server||skinBridge.url}`] : [];if(skinBridge)extraJvm.push('-Dminecraft.api.discovery.host='+skinBridge.url+'discovery');run = await core.launch(id, { username: options.username, memory: options.memory, identity, extraJvm,joinServer:options.serverId?await (async()=>{const link=await environment140.links(options.serverId);if(link.localId!==id)throw Error('Select the linked client / 请选择关联客户端');const run=servers.runs.get(options.serverId);if(run?.state!=='running')throw Error('Start the server first / 请先启动服务端');return '127.0.0.1:'+run.port;})():null });if(skinBridge){const child=core.processes.get(run.id)?.child;if(child){skinRuns.add(run.id);const stopSkin=()=>{skinBridge.close();skinRuns.delete(run.id);};child.once('close',stopSkin);child.once('error',stopSkin);}else skinBridge.close();}}catch(e){skinBridge?.close();throw e;}await libraryState.launched(id, run).catch(() => {});await observe();return run;} finally {launching = false;}});
  handle('amber:open-instance', async (id) => {const error = await shell.openPath(await core.instancePath(id));if (error) throw new Error(error);});
  const placement=new WindowStateStore(app.getPath('userData'));
  let initialCorners='system',placementTimer,placementMaximized=false;
  const windowInfo=()=>({maximized:window?.isMaximized()||false,focused:window?.isFocused()||false,corners:initialCorners,cornersSupported:supportsWindowCorners(process.platform,osRelease())});
  const sendWindowInfo=()=>{if(window&&!window.isDestroyed())window.webContents.send('amber:window-state-changed',windowInfo());};
  handle('amber:window-state',windowInfo);
  handle('amber:window-action',action=>{runWindowAction(window,action);return true;});
  const savePlacement=()=>placement.save(window.getNormalBounds(),window.isMinimized()?placementMaximized:window.isMaximized()).catch(e=>console.error(redact(e.message)));
  let tray=null,explicitQuit=false,exitApproved=false;
  function restoreWindow(){if(window&&!window.isDestroyed()){if(window.isMinimized())window.restore();window.show();window.focus();}}
  function hideToTray(){
    try{
      if(!tray){
        const icon=nativeImage.createFromPath(join(assets,'brand/app-icon.png')).resize({width:24,height:24});
        if(icon.isEmpty())throw Error('Tray icon unavailable');
        tray=new Tray(icon);tray.setToolTip(PRODUCT_NAME);
        tray.on('click',restoreWindow);tray.on('double-click',restoreWindow);
      }
      tray.setContextMenu(Menu.buildFromTemplate([
        {label:translateMessage('恢复窗口'),click:restoreWindow},
        {type:'separator'},
        {label:translateMessage('退出 AMBER'),click:()=>{explicitQuit=true;restoreWindow();window?.close();}}
      ]));
      // Linux shells may accept a tray object without displaying a status icon.
      // Keep a taskbar entry on Linux so the window is always recoverable.
      if(process.platform==='linux')window.minimize();else window.hide();
      return true;
    }catch(e){tray?.destroy();tray=null;window.minimize();return false;}
  }
  app.on('before-quit',event=>{if(!exitApproved&&window&&!window.isDestroyed()){event.preventDefault();explicitQuit=true;restoreWindow();window.close();}});
  app.on('will-quit',()=>{tray?.destroy();tray=null;});
  async function createWindow() {
    const remembered=await placement.load(),prefs=await settings.get();initialCorners=prefs.windowCorners;placementMaximized=remembered?.maximized||false;
    const bounds=fitWindow(remembered?.bounds,screen.getAllDisplays(),screen.getPrimaryDisplay().id);
    window = new BrowserWindow({ title: PRODUCT_NAME, icon:join(assets,'brand/app-icon.png'), ...bounds, minWidth: Math.min(860,bounds.width), minHeight: Math.min(640,bounds.height), frame:false, roundedCorners:initialCorners==='system', thickFrame:true, show: false, backgroundColor: '#fafbf8', webPreferences: { preload: join(base, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
    window.setMenu(null);applyAppearance(prefs);
    window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.control&&input.shift&&input.key==='F12'){event.preventDefault();themes.reset().then(()=>window.webContents.reload()).catch(()=>{});return;}const method=editingCommand(input);if(method){event.preventDefault();window.webContents[method]();}});
    if(remembered?.maximized)window.maximize();
    window.on('maximize',()=>{placementMaximized=true;});window.on('unmaximize',()=>{placementMaximized=false;});
    for(const event of ['maximize','unmaximize','focus','blur','restore'])window.on(event,sendWindowInfo);
    for(const event of ['move','resize','maximize','unmaximize'])window.on(event,()=>{clearTimeout(placementTimer);placementTimer=setTimeout(()=>{if(window&&!window.isDestroyed()&&!window.isMinimized())savePlacement();},250);});
    const recoverDisplay=()=>{if(!window||window.isDestroyed())return;const previous=window.getNormalBounds(),next=fitWindow(previous,screen.getAllDisplays(),screen.getPrimaryDisplay().id);if(['x','y','width','height'].some(k=>previous[k]!==next[k])){const maximized=window.isMaximized();if(maximized)window.unmaximize();window.setMinimumSize(Math.min(860,next.width),Math.min(640,next.height));window.setBounds(next);if(maximized)window.maximize();}};
    for(const event of ['display-removed','display-metrics-changed','display-added'])screen.on(event,recoverDisplay);
    window.on('closed',()=>{clearTimeout(placementTimer);for(const event of ['display-removed','display-metrics-changed','display-added'])screen.removeListener(event,recoverDisplay);window=null;});
    window.once('ready-to-show',()=>{if(!smoke&&(!qaUI||process.argv.includes('--qa-visible')))window.show();});
    let closeAllowed = false,closePrompt = false;
    window.on('close', async event => {
      if(closeAllowed)return;event.preventDefault();if(closePrompt)return;closePrompt=true;
      let pausedSchedules=false;
      try {
        const prefs=await settings.get();
        if(!smoke&&shouldHideToTray(prefs.closeBehavior,servers.active,explicitQuit)){await savePlacement();hideToTray();return;}
        if(!smoke&&skinRuns.size){const answer=await dialog.showMessageBox(window,{type:'question',message:'离线游戏仍在使用本地皮肤 / Offline game is using a local skin',detail:'最小化可继续提供皮肤；退出后尚未缓存的皮肤可能无法加载。 / Minimize to keep serving skins; quitting may prevent uncached skins from loading.',buttons:['最小化 / Minimize','退出 / Quit','返回 / Back'],defaultId:0,cancelId:2});if(answer.response===0){window.minimize();return;}if(answer.response!==1)return;}
        if(storageBusy){await dialog.showMessageBox(window,{type:'info',message:translateMessage('数据目录正在迁移，请等待完成。'),buttons:[translateMessage('确定')]});return;}
        if(!smoke&&(minecraftImport.busy||serverManagement140.backupBusy||workflows.active||core.jobs.some(j=>j.state==='running')||appUpdates.state.phase==='downloading')){
          const answer=await dialog.showMessageBox(window,{type:'warning',title:translateMessage('安装还未结束'),message:translateMessage('退出会中断当前下载或实例配置。'),detail:translateMessage('已完成的文件会保留，建议等待任务结束。实例安装可在任务中心继续；程序更新可在关于页重新下载。'),buttons:[translateMessage('继续等待'),translateMessage('取消任务并退出')],defaultId:0,cancelId:0,noLink:true});
          if(answer.response!==1)return;
          appUpdates.cancel();minecraftImport.cancel();workflows.cancel();for(const j of core.jobs.filter(j=>j.state==='running'))core.controllers.get(j.id)?.abort(Error('用户取消任务并退出。'));
          while(minecraftImport.busy||serverManagement140.backupBusy||workflows.active||core.jobs.some(j=>j.state==='running')||appUpdates.state.phase==='downloading')await new Promise(resolve=>setTimeout(resolve,150));
        }
        await schedules?.pause();pausedSchedules=true;
        if(!smoke&&(servers.active||(rooms.active||sakura.active))){
          const answer=await dialog.showMessageBox(window,{type:'question',message:'服务端或联机连接仍在运行 / Servers or networking are still active',buttons:['最小化并继续 / Minimize and continue','停止服务端并退出 / Stop and quit','返回 / Back'],defaultId:0,cancelId:2,noLink:true});
          if(answer.response===0){window.minimize();return;}if(answer.response!==1)return;
          try{await servers.shutdown();await rooms.leave();await sakura.stop();}catch(e){await dialog.showMessageBox(window,{type:'warning',message:e.message});return;}
        }
        clearTimeout(placementTimer);await savePlacement();exitApproved=true;closeAllowed=true;window.close();app.quit();
      }catch(e){restoreWindow();await dialog.showMessageBox(window,{type:'error',message:redact(e.message)});}
      finally{closePrompt=false;explicitQuit=false;if(pausedSchedules&&!exitApproved)schedules?.start();}
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {if (url !== 'amber://app/') event.preventDefault();});
    window.webContents.on('will-attach-webview', (event) => event.preventDefault());
    window.webContents.on('did-fail-load', (_event, code, description) => {console.error('LOAD_FAILED', code, description);if (smoke) app.exit(1);});
    window.webContents.on('did-finish-load', () => {loaded = true;if (activatePending && !smoke) {window.show();window.focus();activatePending = false;}finishSmoke();});
    window.loadURL('amber://app/');
  }
  schedules=await new ServerSchedules(core.root,servers,{blocked:()=>storageBusy||upgradeBusy||workflows.active||serverManagement140.backupBusy||core.jobs.some(j=>j.state==='running')}).init();
  handle('amber:server-schedules',async(action,input)=>{
    if(action==='list')return schedules.list();
    if(action==='save')return schedules.save(input);
    if(action==='remove')return schedules.remove(input);
    throw Error('Unknown schedule action');
  });
  powerMonitor.on('suspend',()=>{schedules.pause().catch(e=>console.error(redact(e.message)));});
  powerMonitor.on('resume',()=>{if(!exitApproved)schedules.resumeAfterSleep().catch(e=>console.error(redact(e.message)));});
  await createWindow();schedules.start();
  app.on('window-all-closed', () => {if (process.platform !== 'darwin') app.quit();});
  app.on('activate', () => {restoreWindow();if (!BrowserWindow.getAllWindows().length) createWindow().catch(e=>console.error(redact(e.message)));});
}).catch((error) => {console.error(redact(error?.message || String(error)));app.exit(1);});
