import {copyServerAddress172} from './server-address172.mjs';
import {importExternalBackup170} from './library-backup-import170.mjs';
import {directoryKey170} from './library-mod-index170.mjs';
import {LibraryScope170,libraryChannel170} from './library-scope170.mjs';
import {libraryServices170} from './library-services170.mjs';
import {contentState170} from './content-state170.mjs';
import {Libraries170} from './libraries170.mjs';
import {needsInitialLocation170,setInitialLocation170} from './initial-storage170.mjs';
import {LibraryRuntime170} from './library-runtime170.mjs';
import {PrelaunchMemory164} from './prelaunch-memory164.mjs';
import {LaunchPlan160} from './launch-plan160.mjs';
import {Memory160} from './memory160.mjs';
import {previewUpdateCleanup,executeUpdateCleanup} from './maintenance154.mjs';
import {RoomSync152,requireRoomSyncReady152} from './room-sync152.mjs';
import {providerSkinCapability150,uploadProviderSkin150} from './provider-skin150.mjs';
import {MySQL150} from './mysql150.mjs';
import {Ports150} from './ports150.mjs';
import {Sakura150} from './sakura150.mjs';
import {startup} from './startup148.mjs';
import {ServerSchedules} from './server-schedules147.mjs';
import {closeToTray160,shutdownOwned160} from './close160.mjs';
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
import {SeedMap,readWorldFile,coordinateText} from './seed134.mjs';
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
import { getLocale, setLocale, translateMessage, localizeFields, languageTemplate, errorDescriptor } from './localization.mjs';
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
const qaUI = (!app.isPackaged||awaitBuildChannel==='local') && process.argv.includes('--qa-ui');
let window,activatePending = false;
let loaded = false,interfaceReady=false;
const smokeChannels = new Set();
function finishSmoke() {if (smoke && loaded && interfaceReady && ['amber:info', 'amber:instances', 'amber:status', 'amber:settings', 'amber:window-state'].every((c) => smokeChannels.has(c))) {console.log('AMBER_DESKTOP_AND_IPC_OK');setTimeout(() => app.quit(), 250);}}
app.on('second-instance', () => {activatePending = true;if (window&&interfaceReady) {if (window.isMinimized()) window.restore();window.show();window.focus();}});
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
  startup.stage('storage');
  const storage = new Storage(app.getPath('userData'));let storageConfig;let storageBusy=false,exitBusy=false;
  if(!smoke&&!qaUI&&await needsInitialLocation170(storage)){
   let chosen=false;
   while(!chosen){const pick=await dialog.showMessageBox({type:'question',title:'AMBER 数据位置 / Data location',message:'选择首次数据位置 / Choose the initial data location',detail:'AMBER 的账号、设置、缓存和自建实例写入所选位置。选择外部 .minecraft 时，AMBER 状态仍保存在 AppData，外部游戏目录不会被复制。现有数据不会自动覆盖。 / Accounts, settings, caches and managed instances use this location. When selecting an external .minecraft, AMBER state stays in AppData and game data is used in place.',buttons:['程序目录下 / Beside program','AppData（默认 / default）','自选 / Choose folder','退出 / Quit'],defaultId:1,cancelId:3});if(pick.response===3){app.quit();return;}let path=pick.response===0?join(dirname(app.getPath('exe')),PRODUCT_NAME):(await storage.get()).path;if(pick.response===2){const folder=await dialog.showOpenDialog({properties:['openDirectory','createDirectory']});if(folder.canceled)continue;path=folder.filePaths[0];}try{await setInitialLocation170(storage,path,{edition:EDITION});chosen=true;}catch(e){await dialog.showMessageBox({type:'error',title:'位置不可用 / Location unavailable',message:redact(e.message),detail:'未切换到其他位置，请选择可写目录或修复权限。 / No fallback location was selected. Choose a writable location or fix permissions.'});}}
  }
  while(!storageConfig){try{storageConfig=await storage.validateExisting();}catch(e){if(smoke||qaUI)throw e;const answer=await dialog.showMessageBox({type:'error',title:'游戏数据位置不可用 / Game data unavailable',message:'原数据位置无法读取，未创建空库。请连接原磁盘后重试，或重新选择原数据目录。 / Reconnect the original drive or locate your existing library. No empty library was created.',detail:redact(e.message),buttons:['重试 / Retry','选择原目录 / Locate library','退出 / Quit'],defaultId:0,cancelId:2});if(answer.response===2){app.quit();return;}if(answer.response===1){const pick=await dialog.showOpenDialog({properties:['openDirectory']});if(!pick.canceled)try{await storage.reconnect(pick.filePaths[0]);}catch(err){await dialog.showMessageBox({type:'error',message:redact(err.message)});}}}}

  const scopes170=new LibraryScope170();
  const libraryGraphs170=new Map(),libraryRequests170=new Map();
  const core = scopes170.wrap('core',new VanillaLauncher(storageConfig.path));
  await core.init();
  const seedMap=new SeedMap();
  app.on('before-quit',()=>seedMap.cancel());
  handle('amber:seed-map',async(action,input)=>{
   if(action==='copy-coordinates'){clipboard.writeText(coordinateText(input));return true;}
   if(action==='catalog')return seedMap.catalog();
   if(action==='map')return seedMap.map(input);
   if(action==='cancel'){seedMap.cancel();return true;}
   if(action==='world'){const r=await dialog.showOpenDialog(window,{title:'读取世界种子 / Read world seed',properties:['openFile'],filters:[{name:'Java level.dat',extensions:['dat']}]});return r.canceled?null:readWorldFile(r.filePaths[0]);}
   throw Error('Unknown map action');
  });
  startup.stage('recovery');
  const recovery = await recoverTransactions(core);
  if (smoke) {const name = await importBackground(core.root, join(assets, 'assets/forest-banner.png'), (bytes) => nativeImage.createFromBuffer(bytes));const response = await net.fetch('amber://app/user-background/' + name);if (response.status !== 200 || response.headers.get('Content-Type') !== 'image/png' || (await response.arrayBuffer()).byteLength === 0) throw Error('Background round-trip failed');console.log('AMBER_BACKGROUND_OK');}
  if (smoke) {const sample = "amber-credential-codec-check";if (!safeStorage.isEncryptionAvailable() || (await safeStorage.decryptStringAsync(safeStorage.encryptString(sample))).result !== sample || (await safeStorage.decryptStringAsync(await safeStorage.encryptStringAsync(sample))).result !== sample) throw Error("Credential encryption unavailable");console.log("AMBER_SYSTEM_ENCRYPTION_OK");}
  startup.stage('accounts');
  const accounts = new Accounts(core.root, { codec: credentialCodec(safeStorage) });await accounts.init();
  const appUpdates = await new AppUpdates(app.getPath('userData'), app.getVersion()).init();let upgradeBusy = false;
  function handle(channel, fn) {
    ipcMain.handle(channel, async (event, ...args) => {
      const source = new URL(event.senderFrame.url);
      if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame || source.protocol !== 'amber:' || source.host !== 'app') throw new Error('请求来源不受信任。');
      if(exitBusy&&!['amber:window-action','amber:window-state'].includes(channel))throw Error('Launcher closing / 启动器正在退出');
      if(['amber:storage-move','amber:app-update-install'].includes(channel))await libraries170.requireAllStopped();
      if (storageBusy && !['amber:info', 'amber:status', 'amber:setup-cancel', 'amber:window-action', 'amber:window-state'].includes(channel)) throw Error('数据目录正在迁移，请等待完成。');
      if (upgradeBusy && !['amber:info', 'amber:status', 'amber:app-update-state', 'amber:cleanup-cancel', 'amber:window-action', 'amber:window-state'].includes(channel)) throw Error('正在准备升级，请稍候。');
      let result;try {if(IS_AMBERE&&(channel.startsWith('amber:ms-')||channel.startsWith('amber:ownership-')||channel==='amber:account-configure'))accounts.requireMicrosoft();const envelope=args[0]?.__libraryScope170;if(envelope!==undefined)args.shift();if(envelope!==undefined&&libraryChannel170(channel)&&(await libraries170.list()).selected!==envelope)throw Error('Library selection changed; reopen this action / 实例库已切换，请重新打开此操作'+(qaUI?' ('+envelope+' -> '+(await libraries170.list()).selected+')':''));const graph=envelope&&envelope!=='default'&&libraryChannel170(channel)?await libraryGraph170(envelope):null;result = graph?await invokeLibrary170(envelope,graph,()=>graph.core.external&&['amber:world-import','amber:optifine-import','amber:instance-icon','amber:instance-rename','amber:launch-preferences-save'].includes(channel)?graph.core.withGameDirectory170(args[0],()=>fn(...args)):fn(...args)):await fn(...args);} catch (e) {const problem=errorDescriptor(redact(e.message,accounts.secrets()));throw Error('[AMBER '+problem.code+'] '+problem.text);}result = redactFields(result, accounts.secrets());if (smoke) {smokeChannels.add(channel);finishSmoke();}return result;
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
  const servers=await new Servers(core).init(),rooms=new Rooms(core,servers),ports150=new Ports150(servers),sakura=new Sakura150(core,servers,credentialCodec(safeStorage),ports150);
  ports150.inUse=(id,portId)=>sakura.activeFor(id,portId);
  const mysql150=new MySQL150(core,servers,credentialCodec(safeStorage));
  mysql150.ports=ports150;servers.portAllocation150=ports150.allocation=fn=>mysql150.withAllocation(fn);ports150.reserved=()=>mysql150.databaseReservations();servers.validatePort150=async(id,port)=>{if((await ports150.conflicts(id,{protocol:'tcp',port},'main')).length)throw Error('Port conflicts with another instance / 端口与其他实例冲突');};await mysql150.recover();
  const services160=new LaunchPlan160(servers,mysql150,sakura);
  let schedules;
  const serverUpdates144=new ServerUpdates144(servers);
  const serverTrash=new ServerTrash143(servers,{database:mysql150,connected:id=>services160.pending.has(id)||rooms.starting||rooms.active&&rooms.current?.serverId===id||sakura.activeFor(id)||mysql150.activeFor(id)});
  const serverEditor=new InstanceEditor({instancePath:id=>servers.dir(id)},{directories:['config','defaultconfigs','plugins','kubejs','scripts'],files:['server.properties','bukkit.yml','spigot.yml','paper.yml','permissions.yml']});
  const resourceTimer=setInterval(()=>servers.sample(),3000);resourceTimer.unref();
  handle('amber:server',async(action,...args)=>{
   if(exitBusy)throw Error('Exit cleanup in progress / 正在安全退出');
   if(services160.pending.has(args[0])&&!['flow160','start','planCancel160','planSave160'].includes(action))throw Error('Launch plan running; cancel it before another operation / 启动规划正在执行，请先取消再操作');
   const updateMethods={updateScan:'scan',updateLock:'lock',updatePreview:'preview',updateInstall:'install',updateHistory:'history',updateRestore:'restore'};if(Object.hasOwn(updateMethods,action))return serverUpdates144[updateMethods[action]](...args);
   const trashMethods={trashList:'list',trashDetails:'details',trashRemove:'remove',trashRestore:'restore',trashPurge:'purge'};if(Object.hasOwn(trashMethods,action))return serverTrash[trashMethods[action]](...args);
   if(action==='planCancel160')return services160.cancel(args[0]);
   if(action==='planSave160')return services160.savePlan(...args);
   if(action==='servicesSave160')return services160.save(...args);
   if(action==='flow160'){const network=await rooms.state();return {services:await services160.state(args[0]),room:rooms.current?.serverId===args[0]?network.room:null};}
   if(action==='start'){if(storageBusy||upgradeBusy||exitBusy)throw Error('Wait for storage, upgrade or shutdown / 请等待数据迁移、升级或退出完成');return services160.start(...args);}
   const methods=['gameChoices','coreChoices','versions','create','install','launchSettings','properties','saveProperties','backups','restoreConfig','start','stop','command','copy','content','toggleContent','removeContent','contentHistory','restoreContent','search','categories','contentVersions','previewContent','installContent'];
   if(methods.includes(action))return servers[action](...args);
   if(['editorList','editorRead','editorHistory','editorBackup'].includes(action))return serverEditor[action.slice(6).toLowerCase()](...args);
   if(action==='editorSave')return servers.locks.run(args[0],async()=>{await servers.stopped(args[0]);return serverEditor.save(...args);});
   if(action==='openLogs'){const dir=await servers.dir(args[0]);const logs=join(dir,'logs');await ensureParents(dir,join(logs,'.check'));return shell.openPath(logs);}
   if(action==='status')return {instances:await servers.list(),network:await rooms.state()};
   if(action==='addresses'){const p=await servers.properties(args[0]);return servers.addresses(Number(p.values['server-port']||25565));}
   if(action==='open'){const dir=await servers.dir(args[0]);return shell.openPath(dir);}
   if(action==='pickJava'){const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Java',extensions:['exe']}]});return r.canceled?null:(await core.addJava(r.filePaths[0]));}
   if(action==='importJar'||action==='importContent'){const r=await dialog.showOpenDialog(window,{properties:action==='importContent'?['openFile','multiSelections']:['openFile'],filters:[{name:'Java archive',extensions:['jar']}]});if(r.canceled)return null;return action==='importJar'?servers.importJar(args[0],r.filePaths[0]):servers.importContent(args[0],r.filePaths);}
   if(action==='mysqlChoices160')return mysql150.choices();
   const mysqlMethods={mysqlState:'state',mysqlInitialize:'initialize',mysqlStart:'start',mysqlStop:'stop',mysqlBackup:'backup',mysqlRestore:'restore',mysqlConnection:'connection',mysqlCancel:'cancel',mysqlResetPreparation:'resetPreparation'};if(Object.hasOwn(mysqlMethods,action))return mysql150[mysqlMethods[action]](...args);
   if(action==='mysqlBackupLibrary')return mysql150.backupStore.library();
   if(action==='mysqlRecoverOrphan')return mysql150.backupStore.recover(...args);
   if(action==='portsList')return ports150.list(...args);
   if(action==='portsSave')return ports150.save(...args);
   if(action==='portsRemove')return ports150.remove(...args);
   if(['sakuraStart','sakuraStop','sakuraRemove','sakuraRemoteDelete'].includes(action)){const binding=(await sakura.state()).tunnels.find(b=>b.id===args[0]);if(binding?services160.pending.has(binding.serverId):services160.pending.size>0)throw Error('Cancel the launch plan before changing its tunnel / 请先取消启动规划再操作其隧道');}
   if(action==='sakuraToken')return sakura.saveToken(...args);
   if(action==='sakuraCatalog')return sakura.remote.catalog();
   if(action==='sakuraReconcile')return sakura.remote.reconcile();
   if(action==='sakuraClearUncertain'){const answer=await dialog.showMessageBox(window,{type:'warning',message:translateMessage('已在 Sakura 控制台核对远端结果？'),detail:translateMessage('解除待确认状态不会撤销远端操作。再次创建可能产生重复隧道。'),buttons:[translateMessage('取消'),translateMessage('已核对，解除待确认状态')],defaultId:0,cancelId:0});if(answer.response!==1)return null;await sakura.remote.clearUncertain();return {feedback:'已解除待确认状态，请以服务商记录为准。'};}
   if(action==='sakuraRemoteCreate'){const [id,input]=args,port=await ports150.resolve(id,input.portId);const answer=await dialog.showMessageBox(window,{type:'question',message:translateMessage('创建 Sakura 远端隧道？'),detail:translateMessage('将向 Sakura 提交名称、节点及本机端口，占用该账号的隧道额度。')+'\n'+input.name+' · '+port.protocol.toUpperCase()+' · 127.0.0.1:'+port.port,buttons:[translateMessage('取消'),translateMessage('确认创建远端隧道')],defaultId:0,cancelId:0});if(answer.response!==1)return null;return sakura.remote.create(id,input);}
   if(action==='sakuraRemoteDelete'){const binding=(await sakura.config()).tunnels.find(t=>t.id===args[0]);if(!binding)throw Error('找不到隧道关联。');const answer=await dialog.showMessageBox(window,{type:'warning',message:translateMessage('永久删除 Sakura 远端隧道？'),detail:binding.name+' · '+binding.tunnel+'\n'+translateMessage('这是服务商端删除，不是仅移除本机关联。远端地址可能无法恢复，其他设备使用此隧道也会受到影响。'),buttons:[translateMessage('取消'),translateMessage('确认删除远端隧道')],defaultId:0,cancelId:0});if(answer.response!==1)return null;return sakura.remote.delete(args[0]);}
   if(action==='sakuraRemove')return sakura.remove(...args);
   if(action==='sakuraState')return sakura.state(...args);
   if(action==='sakuraDiagnose')return sakura.diagnose(...args);
   if(action==='sakuraSave')return sakura.save(...args);
   if(action==='sakuraInstall')return sakura.install();
   if(action==='sakuraStart')return sakura.start(...args);
   if(action==='sakuraStop')return sakura.stop(...args);
   if(action==='sakuraWebsite')return shell.openExternal('https://www.natfrp.com/tunnel/');
   if(action==='sakuraCopy'){const run=(await sakura.state()).tunnels.find(t=>t.id===args[0])?.run,address=run?.address;if(!address||!run.connected)throw Error('隧道尚未连通 / Tunnel is not connected');clipboard.writeText(address);return true;}
   if(action==='syncCandidates')return rooms.sync.candidates(...args);
   if(action==='syncPublish')return rooms.sync.publish(...args);
   if(action==='syncDisable')return rooms.sync.disable();
   if(action==='syncPreview')return rooms.sync.preview();
   if(action==='syncInstall')return rooms.sync.install(...args);
   if(action==='syncCancel')return rooms.sync.cancel();
   if(action==='networkChoices160')return rooms.versions160.choices();
   if(action==='networkInstall')return rooms.install(args[0]);
   if(action==='host')return servers.locks.run(args[0],()=>rooms.host(...args));
   if(action==='join')return rooms.join(...args);
   if(action==='leave')return rooms.leave();
   if(action==='copyInvite'){const code=(await rooms.state()).room?.code;if(!code)throw Error('No hosted room');clipboard.writeText(code);return true;}
   if(action==='eula')return shell.openExternal('https://www.minecraft.net/eula');
   if(action==='buildtools')return shell.openExternal('https://www.spigotmc.org/wiki/buildtools/');
   throw Error('Unknown server action');
  });
  const content = scopes170.wrap('content',new Modrinth(core));
  const packs = scopes170.wrap('packs',new Modpacks(core, content));
  const workflows = scopes170.wrap('workflows',new Workflows(core, content)),settings = new Settings(core.root),selections = scopes170.wrap('selections',new Map());
  rooms.sync=new RoomSync152(core,rooms,workflows,content);
  const localPacks=scopes170.wrap('localPacks',new LocalPacks(core,packs,workflows));workflows.localPacks=localPacks;
  const packUpgrade140=scopes170.wrap('packUpgrade140',new PackUpgrade140(core,packs,localPacks,workflows));
  handle('amber:pack-upgrade',async(action,id,input)=>{if(action==='versions')return packUpgrade140.versions(id);if(action==='diff')return packUpgrade140.diff(id,input);if(action==='apply')return packUpgrade140.apply(id,input);if(action==='preview'){if(input)return packUpgrade140.preview(id,{version:input});const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Modrinth pack',extensions:['mrpack']}]});return r.canceled?null:packUpgrade140.preview(id,{path:r.filePaths[0]});}throw Error('Invalid action');});
  const minecraftImport=new MinecraftImport(core);
  handle('amber:minecraft-import',async(action,...args)=>{
   if(action==='pick'){const r=await dialog.showOpenDialog(window,{title:'选择原版 .minecraft / Select original .minecraft',properties:['openDirectory']});return r.canceled?null:minecraftImport.scan(r.filePaths[0]);}
   if(action==='pick-data'){const r=await dialog.showOpenDialog(window,{title:translateMessage('选择游戏数据目录'),properties:['openDirectory']});return r.canceled?null:minecraftImport.chooseDirectory(args[0],args[1],r.filePaths[0]);}
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
  startup.stage('settings');
  const themes=await new Themes(core.root,settings).init();
  const network=await new DownloadNetwork(core.root,{fetcher:core.fetcher}).init();network.configure((await settings.get()).network);core.fetcher=network.request;core.network=network;
  handle('amber:network-diagnose',()=>network.diagnose());
  handle('amber:transfer-status144',()=>network.transferStatus());
  handle('amber:transfer-priority144',id=>{const job=core.jobs.find(j=>j.id===id&&j.state==='running');if(!job)throw Error('Task has ended / 任务已结束');for(const j of core.jobs)j.downloadPriority=j.id===id;core.jobQueue.waiting.sort((a,b)=>Number(b.key===job.instanceId)-Number(a.key===job.instanceId));if(network.jobs.has(id))network.prioritize(id);return true;});
  handle('amber:network-pause',(id,value)=>network.pause(id,value));
  if(smoke){const a=(await settings.get()).appearance;for(const key of ['backgroundAsset','heroAsset','artworkAsset'])if(a[key]){const response=await net.fetch('amber://app/theme-assets/'+a[key]);const bytes=Buffer.from(await response.arrayBuffer());if(response.status!==200||response.headers.get('Content-Type')!=='image/png'||nativeImage.createFromBuffer(bytes).isEmpty())throw Error('Theme image protocol failed');}console.log('AMBER_THEME_ASSETS_OK');}

  function applyAppearance(v){startup.preferences(v,translateMessage).catch(()=>{});if(window&&!window.isDestroyed()){window.setOpacity(v.appearance?.enabled?(v.appearance.windowOpacity/100):1);window.webContents.setZoomFactor(v.appearance?.enabled?v.appearance.scale/100:1);window.webContents.send('amber:theme-changed');}}
  themes.onChanged=applyAppearance;

  const guided=scopes170.wrap('guided',new GuidedCreation(core,content,workflows));
  const workbench=scopes170.wrap('workbench',new InstanceWorkbench(core,workflows));core.workbench=workbench;
  startup.stage('library');
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
  await startup.preferences(await settings.get(),translateMessage);
  handle('amber:language-state', refreshLocale);
  handle('amber:language-import', async () => {const r = await dialog.showOpenDialog(window, { title: translateMessage('导入语言包'), properties: ['openFile'], filters: [{ name: 'AMBER JSON', extensions: ['json'] }] });if (r.canceled) return false;const pack = await languages.preview(r.filePaths[0]);const answer = await dialog.showMessageBox(window, { type: 'question', title: translateMessage('导入语言包'), message: pack.name, detail: translateMessage('将替换当前自定义语言包。只导入可信来源；文字可能改变提示的含义。'), buttons: [translateMessage('取消'), translateMessage('导入')], defaultId: 0, cancelId: 0, noLink: true });if (answer.response !== 1) return false;await languages.save(pack);await refreshLocale();return true;});
  handle('amber:language-export', async () => {const r = await dialog.showSaveDialog(window, { title: translateMessage('导出语言包模板'), defaultPath: 'amber-language.json', filters: [{ name: 'JSON', extensions: ['json'] }] });if (r.canceled) return false;await writeFile(r.filePath, JSON.stringify(languageTemplate(), null, 2));return true;});
  handle('amber:language-remove', async () => {await languages.remove();const value = await settings.get();if (value.language.startsWith('x-')) await settings.save({ ...value, language: 'en-US' });return refreshLocale();});
  const management = scopes170.wrap('management',new InstanceManagement(core, workflows)),backups = scopes170.wrap('backups',new Backups(core, workflows));
  const serverManagement140=new ServerManagement140(core,servers),environment140=scopes170.wrap('environment140',new Environment140(core,servers,content,workflows));
  services160.backup=id=>serverManagement140.snapshot(id,'manual');
  const performance144=new Performance144(servers);const performanceTimer=setInterval(()=>performance144.sample().catch(()=>{}),3000);performanceTimer.unref();
  handle('amber:performance144',async(action,id)=>{if(action==='state')return performance144.state(id);if(action==='collect')return performance144.collect(id);if(action==='export'){const state=await performance144.state(id);if(!state.report)throw Error('Collect a report first / 请先采集报告');const out=await dialog.showSaveDialog(window,{defaultPath:'server-performance.json',filters:[{name:'JSON',extensions:['json']}]});if(out.canceled)return null;await writeFile(out.filePath,JSON.stringify(state.report,null,2));return true;}throw Error('Invalid action');});
      handle('amber:external-maintenance',async(action,id,input)=>{const service=scopes170.context.getStore()?.maintenance170;if(!service)throw Error('Select an external instance library');if(action==='preview'){if(input?.action==='components'&&input.loader==='optifine'){const picked=await dialog.showOpenDialog(window,{title:'Select the matching official OptiFine installer JAR / 选择版本匹配的官方 OptiFine 安装 JAR',properties:['openFile'],filters:[{name:'OptiFine',extensions:['jar']}]});if(picked.canceled)return null;input={...input,localJar:picked.filePaths[0]};}return service.prepare(id,input);}if(action==='apply')return service.apply(id,input.token,input);if(action==='history')return service.history(id);if(action==='recover')return service.recover(id,input.token);throw Error('Invalid maintenance action');});
  handle('amber:environment-import',async(action,token,name)=>{if(action==='import'){const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Environment',extensions:['json']}]});if(r.canceled)return null;const st=await lstat(r.filePaths[0]);if(!st.isFile()||st.isSymbolicLink()||st.size>2000000)throw Error('Invalid environment file');return environment140.previewImport(JSON.parse(await readFile(r.filePaths[0],'utf8')));}if(action==='create')return environment140.create(token,name);throw Error('Invalid environment import action');});
handle('amber:server-management',async(action,id,input)=>{if(services160.pending.has(id))throw Error('Launch plan running / 启动规划正在执行');if(['roster','skin','installBridge','players','player','commands','backups','backup','restore','policy','savePolicy','pinBackup'].includes(action))return serverManagement140[action](id,input);if(action==='command')return serverManagement140.consoleResult(id,input);if(action==='link')return environment140.links(id,input);if(action==='compare')return environment140.compare(id,input);if(action==='previewInstall')return environment140.previewInstall(id,input.localId,input.versionId);if(action==='install')return environment140.install(id);if(action==='export'){const r=await environment140.requirements(id);const out=await dialog.showSaveDialog(window,{defaultPath:'server-environment.json',filters:[{name:'Environment',extensions:['json']}]});if(out.canceled)return null;await writeFile(out.filePath,JSON.stringify(r.manifest,null,2));return {unknown:r.unknown,optional:r.optional};}if(action==='import'){const r=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Environment',extensions:['json']}]});if(r.canceled)return null;const st=await lstat(r.filePaths[0]);if(!st.isFile()||st.size>2000000)throw Error('Invalid environment file');return environment140.previewImport(JSON.parse(await readFile(r.filePaths[0],'utf8')));}if(action==='create')return environment140.create(id,input);throw Error('Invalid action');});
  const protection140=scopes170.wrap('protection140',new Protection140(core,backups));
  handle('amber:protection', (action,id,value)=>{if(action==='state')return protection140.state(id);if(action==='save')return protection140.save(id,value);if(action==='pin')return backups.pin(id,value);throw Error('Invalid action');});
  const modUpdates = scopes170.wrap('modUpdates',new ModUpdates(core, content));
  const bulkContent = scopes170.wrap('bulkContent',new BulkContent(core, content, modUpdates)),launchPreferences = scopes170.wrap('launchPreferences',new LaunchPreferences(core));
  content.updates = modUpdates;
  const libraryState = scopes170.wrap('libraryState',new LibraryState(core)),modImport = scopes170.wrap('modImport',new ModImport(core, content, modUpdates)),health = scopes170.wrap('health',new InstanceHealth(core, content, workflows, accounts, launchPreferences, settings));
  handle('amber:server-address-copy',text=>copyServerAddress172(text,clipboard));
  handle('amber:copy-error', (text) => {if (typeof text !== 'string' || text.length > 100000) throw Error('错误详情过长，请手动选择文字复制。');clipboard.writeText(redact(text, accounts.secrets()));return true;});
  const journal=scopes170.wrap('journal',new PlayJournal(core.root)),news=new NewsFeed(core.root),homePrefs=new HomePreferences(core.root),screenshots=scopes170.wrap('screenshots',new Screenshots(core)),survey=new StorageSurvey(core,app.getPath('userData'),{current:app.getVersion(),product:PRODUCT_NAME});
  try{await journal.migrate((await libraryState.get()).history);await journal.recover();}catch{/* Preserve an unreadable journal; it must never prevent launching the application. */}
  await survey.init().catch(()=>{});
  let journalObservation=null;const observe=()=>{if(storageBusy||upgradeBusy)return Promise.resolve();if(journalObservation)return journalObservation;journalObservation=(async()=>{try{const processes=(await core.runtimeStatus()).processes;if(!storageBusy&&!upgradeBusy){await journal.observe(processes);await protection140.observe(processes);}}catch{}})().finally(()=>journalObservation=null);return journalObservation;};
  core.onSessionChanged=observe;await observe();const journalTimer=setInterval(()=>{observe();for(const pending of libraryGraphs170.values())pending.graph?.observe();},30000);journalTimer.unref();
  powerMonitor.on('suspend',()=>{if(!storageBusy)journal.suspend().catch(()=>{});});powerMonitor.on('resume',()=>{journal.resume();observe();});
  handle('amber:journal',()=>journal.get());
  handle('amber:journal-enable',v=>journal.enable(v));
  handle('amber:journal-clear',async()=>{const r=await dialog.showMessageBox(window,{type:'question',message:'清除本地游玩记录？ / Clear local play history?',buttons:['取消 / Cancel','清除 / Clear'],defaultId:0,cancelId:0});return r.response===1?journal.clear():journal.get();});
  handle('amber:journal-export',async()=>{const r=await dialog.showSaveDialog(window,{defaultPath:'play-history.json',filters:[{name:'JSON',extensions:['json']}]});if(r.canceled)return false;await writeFile(r.filePath,JSON.stringify(await journal.get(),null,2));return true;});
  handle('amber:news',()=>news.get());handle('amber:news-refresh',()=>news.refresh());handle('amber:news-cancel',()=>news.cancel());
  handle('amber:news-open',async id=>shell.openExternal(await news.link(id)));handle('amber:news-detail',id=>news.detail(id));
  handle('amber:home-prefs',()=>homePrefs.get());handle('amber:home-prefs-save',v=>homePrefs.save(v));
  handle('amber:survey',()=>survey.get());handle('amber:survey-start',()=>survey.start());handle('amber:survey-cancel',()=>survey.cancel());
  const dependency130=scopes170.wrap('dependency130',new DependencyMetadata(core));
  handle('amber:dependency-metadata',async id=>dependency130.read(id,await content.list(id)));
  const editor130=scopes170.wrap('editor130',new InstanceEditor(core));
  handle('amber:editor-history',(id,name)=>editor130.history(id,name));
  handle('amber:editor-backup',(id,name,token)=>editor130.backup(id,name,token));
  handle('amber:editor-list',id=>editor130.list(id));
  handle('amber:editor-read',(id,name)=>editor130.read(id,name));
  handle('amber:editor-save',(id,input)=>editor130.save(id,input));
  handle('amber:provider-skin-capability',id=>providerSkinCapability150(accounts,id));
  handle('amber:provider-upload-skin',async(id,model)=>{const capability=await providerSkinCapability150(accounts,id);if(!capability.supported)throw Error('服务商未声明支持此角色的皮肤上传。');const pick=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'PNG skin',extensions:['png']}]});if(pick.canceled)return null;const bytes=await readBoundedFile(pick.filePaths[0],1_000_000,{binary:true});skinDimensions(bytes);const image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw Error('Invalid PNG skin');const confirm=await dialog.showMessageBox(window,{type:'question',message:translateMessage('将所选皮肤上传到此账号的服务商？')+'\n'+capability.origin,buttons:[translateMessage('取消'),translateMessage('上传')],defaultId:0,cancelId:0});if(confirm.response!==1)return null;const result=await uploadProviderSkin150(accounts,id,image.toPNG(),model);await accountSkin(accounts,id,true);return {...result,feedback:translateMessage('服务商已接受上传，已请求刷新皮肤。')};});
  handle('amber:account-provider-site',id=>{const account=accounts.data.accounts.find(a=>a.id===id&&a.type==='yggdrasil');if(!account)throw Error('Third-party account not found');const url=new URL(account.server);if(url.protocol!=='https:'||url.username||url.password)throw Error('Invalid provider');return shell.openExternal(url.origin+'/');});
  if(!IS_AMBERE)handle('amber:ms-upload-skin',async(id,model)=>{accounts.requireMicrosoft();if(!accounts.data.accounts.some(a=>a.id===id&&a.type==='microsoft'))throw Error('Microsoft account not found');const pick=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'PNG skin',extensions:['png']}]});if(pick.canceled)return null;const bytes=await readBoundedFile(pick.filePaths[0],1_000_000,{binary:true});skinDimensions(bytes);const image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw Error('Invalid PNG skin');const confirm=await dialog.showMessageBox(window,{type:'question',message:translateMessage('将所选皮肤上传到此微软账号的 Minecraft 官方服务？'),buttons:[translateMessage('取消'),translateMessage('上传')],defaultId:0,cancelId:0});if(confirm.response!==1)return null;const {uploadMicrosoftSkin150}=await import('./microsoft-skin150.mjs');const result=await uploadMicrosoftSkin150(accounts,id,image.toPNG(),model);await accountSkin(accounts,id,true);return {...result,feedback:translateMessage('官方已接受皮肤上传，已刷新皮肤信息；公开贴图可能稍后更新。')};});
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
    if (servers.active || (services160.pending.size||rooms.active||sakura.active||mysql150.active) || launching || storageBusy || workflows.active || core.jobs.some((j) => j.state === 'running')) throw Error('请等待游戏准备、安装或数据迁移结束后再升级。');
    upgradeBusy = true;
    try {const installed=await mysql150.withQuiesced(async()=>{for (const item of await core.listInstances()) await core.requireStopped(await core.instancePath(item.id));
      if (servers.active || (services160.pending.size||rooms.active||sakura.active||mysql150.active) || launching || storageBusy || workflows.active || core.jobs.some((j) => j.state === 'running')) throw Error('有新任务开始，请等待结束后再升级。');
      const file = await appUpdates.installer();const answer = await dialog.showMessageBox(window, { type: 'question', title: translateMessage('安装 AMBER 更新'), message: translateMessage('安装包已校验，是否退出 AMBER 并打开安装程序？'), detail: translateMessage('将保留游戏数据，并先备份账号和设置。请在安装向导中确认安装位置。'), buttons: [translateMessage('取消'), translateMessage('退出并安装')], defaultId: 0, cancelId: 0, noLink: true });if (answer.response !== 1) return false;
      await backupUpgradeConfig(app.getPath('userData'), core.root, app.getVersion());
      if(process.platform!=='win32'){const error=await shell.openPath(file);if(error)throw Error(error);}else await new Promise((resolve, reject) => {const child = spawn(file, [], { detached: true, stdio: 'ignore', windowsHide: false });child.once('error', reject);child.once('spawn', () => {child.unref();resolve();});});
      return true;});if(installed)app.quit();return installed;
    } finally {upgradeBusy = false;}
  });
  workflows.installPack = async (id, version) => {try {const r = JSON.parse(await readFile(join(await core.instancePath(id), 'modpack.json'), 'utf8'));if (r.versionId === version) return;} catch (e) {if (e.code !== 'ENOENT') throw e;}const p = await packs.preview(id, version);return workflows.wait(await packs.install(id, p.id));};
  handle('amber:backups', (id) => backups.list(id));
  handle('amber:backup-create', (id, mode) => backups.create(id, mode));
  handle('amber:external-backup-import',async()=>{const source=await dialog.showOpenDialog(window,{title:'Select complete external backup folder / 选择完整外部备份文件夹',properties:['openDirectory']});if(source.canceled)return null;const target=await dialog.showOpenDialog(window,{title:'Select empty destination for a NEW library / 为新库选择空目标文件夹',properties:['openDirectory','createDirectory']});if(target.canceled)return null;return importExternalBackup170(libraries170,source.filePaths[0],target.filePaths[0],{fetcher:network.request,accounts,settings});});
  handle('amber:backup-restore', (id) => backups.restore(id));
  handle('amber:storage-usage',()=>workflows.exclusive(()=>storageUsage(core.root,app.getPath('userData'))));
  handle('amber:upgrade-backups-open',async()=>{const path=join(app.getPath('userData'),'upgrade-backups');await ensureParents(app.getPath('userData'),join(path,'probe'));const error=await shell.openPath(path);if(error)throw Error(error);return true;});
  handle('amber:backup-verify',id=>backups.verify(id));
  handle('amber:storage-info', async () => {const r = await storage.get(),disk = await statfs(core.root);return { path: core.root, freeBytes: disk.bavail * disk.bsize, onboarded: r.onboarded || !smoke && (await core.listInstances()).length > 0 };});
  handle('amber:onboarding-complete', () => storage.complete());
  handle('amber:storage-pick', async () => {const r = await dialog.showOpenDialog(window, { title: translateMessage('选择新的空数据文件夹'), properties: ['openDirectory', 'createDirectory'] });if (r.canceled) return null;const token = randomUUID();selections.set(token, { kind: 'storage', value: r.filePaths[0] });return { token, path: r.filePaths[0] };});
  handle('amber:storage-move', async (token) => {if(servers.active||(services160.pending.size||rooms.active||sakura.active||mysql150.active))throw Error('Stop servers and leave the room before moving data / 迁移数据前请停止服务器并退出房间');const target = selection(token, 'storage');if (!target) throw Error('请先选择目标目录');return schedules.withPaused(()=>workflows.exclusive(async () => {for (const item of await core.listInstances()) await core.requireStopped(await core.instancePath(item.id));storageBusy = true;core.operation = { title: '复制并校验数据目录', state: 'running' };try {return await mysql150.withQuiesced(async()=>{if(mysql150.active)throw Error('Database still active / 数据库仍在运行');news.cancel();survey.cancel();await Promise.allSettled([journalObservation,journal.queue,homePrefs.queue,news.pending,survey.done,...news.details.values()].filter(Boolean));await storage.migrate(core, target);app.relaunch();app.exit(0);return true;});} catch (e) {storageBusy = false;throw e;} finally {core.operation = null;}}));});
  handle('amber:instance-icon', (id, icon) => management.setIcon(id, icon));
  handle('amber:instance-rename', (id, name) => management.rename(id, name));
  handle('amber:instance-remove', (id) => management.remove(id));
  handle('amber:instance-trash', () => management.list());
  handle('amber:trash-details', (id) => management.trashDetails(id));
  handle('amber:trash-purge', (id, confirmation) => management.purge(id, confirmation));
  handle('amber:feedback-prepare',fields=>feedbackDraft(fields,feedbackDiagnosticPreview,text=>redact(text,accounts.secrets())));
  handle('amber:theme-store-open',()=>shell.openExternal('https://ayr1k.github.io/#/themes'));
  handle('amber:feedback-open',()=>shell.openExternal(feedbackUrl));
  let diagnosticPreview=null,feedbackDiagnosticPreview=null;
  handle('amber:feedback-diagnostics',async()=>{feedbackDiagnosticPreview=localizeFields(await summary());return feedbackDiagnosticPreview;});
  const summary = async () => diagnosticSummary({ version: app.getVersion(), platform: process.platform, arch: process.arch, instances: await core.listInstances(), status: await core.runtimeStatus() });
  handle('amber:diagnostics-preview', async()=>{diagnosticPreview=localizeFields(await summary());return diagnosticPreview;});
  let cleanupController=null;
  const cleanupCheck=()=>{if(storageBusy||launching||workflows.active||servers.active||services160.pending.size||rooms.active||sakura.active||mysql150.active||core.jobs.some(j=>j.state==='running')||['downloading','checking','ready'].includes(appUpdates.state.phase))throw Error('Wait for active tasks / 请先结束活动任务和更新安装');};
  handle('amber:cleanup-cancel',()=>{cleanupController?.abort();return true;});
  handle('amber:privacy-cleanup',async kind=>{
   if(kind!=='updates')throw Error('Backups are protected / 备份受到保护');cleanupCheck();
   const plan=await previewUpdateCleanup(app.getPath('userData'),app.getVersion(),PRODUCT_NAME);
   if(!plan.rows.length)return {state:'done',removedBytes:0,results:[]};
   const answer=await dialog.showMessageBox(window,{type:'warning',title:'清理更新缓存 / Clean update cache',message:'删除已安装版本及更旧版本的已校验更新包？ / Delete verified installers for installed or older versions?',detail:plan.rows.map(r=>r.name).join('\n')+'\n'+plan.rows.reduce((n,r)=>n+r.size,0)+' bytes\n不影响游戏任务恢复；再次使用这些安装包需要重新下载。备份、未知文件及下载片段保留。 / Game recovery is preserved. Reuse requires downloading again. Backups, unknown files and partial downloads stay.',buttons:['取消 / Cancel','确认清理 / Confirm'],defaultId:0,cancelId:0,noLink:true});
   if(answer.response!==1)return {state:'cancelled',removedBytes:0,results:[]};cleanupCheck();if(upgradeBusy)throw Error('Maintenance already running');upgradeBusy=true;cleanupController=new AbortController();
   try{return await executeUpdateCleanup(app.getPath('userData'),plan,app.getVersion(),PRODUCT_NAME,{signal:cleanupController.signal,check:cleanupCheck});}finally{cleanupController=null;upgradeBusy=false;}
  });
handle('amber:privacy-info', () => ({ accounts: join(core.root, 'accounts.json'), data: core.root, upgrades: join(app.getPath('userData'), 'upgrade-backups') }));
  handle('amber:privacy-copy-path',key=>{const paths={accounts:join(core.root,'accounts.json'),data:core.root,upgrades:join(app.getPath('userData'),'upgrade-backups')};if(!Object.hasOwn(paths,key))throw Error('不支持的数据位置。');clipboard.writeText(paths[key]);return true;});
  handle('amber:diagnostics-export', async () => {if(!diagnosticPreview)throw Error('请先预览诊断摘要。');const snapshot=diagnosticPreview;const result = await dialog.showSaveDialog(window, { title: translateMessage('保存不含账号和日志的诊断摘要'), defaultPath: 'amber-diagnostics.json', filters: [{ name: 'JSON', extensions: ['json'] }] });if (result.canceled) return false;await writeFile(result.filePath, JSON.stringify(snapshot, null, 2));return true;});
  handle('amber:instance-restore', (id) => management.restore(id));
  handle('amber:lite-overlay', (id, v) => {if(core.external)throw Error('External component inheritance cannot be rewritten safely / 无法安全改写外部组件继承链');return configureLiteOverlay(core,id,v);});
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
  const memory160=new Memory160({metrics:()=>app.getAppMetrics(),confirm:async()=>{const en=getLocale()==='en-US';const answer=await dialog.showMessageBox(window,{type:'warning',title:en?'Aggressive memory optimization':'激进内存整理',message:en?'Trim all processes belonging to this launcher?':'整理当前启动器的所有自身进程？',detail:en?'Includes the launcher main process and its Electron renderer, GPU and utility processes. Excludes games, servers, databases and other apps. Pages may be faulted back immediately, causing UI stutters and extra disk I/O or paging pressure. This does not repair JVM leaks or guarantee more FPS. Uses current permissions only; inaccessible processes are reported. No elevation, termination, system cache purge or security changes. Continue?':'范围包括当前启动器主进程及 Electron 渲染、GPU 和辅助进程，不包括游戏、服务端、数据库或其他应用。页面可能立即重新调入，造成界面卡顿、缺页、额外磁盘读写或分页压力；不修复 JVM 泄漏、不保证帧率提升。仅使用当前权限，不可访问的进程会报告失败。不提权、不结束进程、不清系统缓存、不修改安全设置。是否继续？',buttons:en?['Cancel','I understand, continue']:['取消','已了解风险，继续'],defaultId:0,cancelId:0});return answer.response===1;}});
  const prelaunch164=new PrelaunchMemory164({memory:memory160,settings});
  core.prelaunchMemory=attempt=>prelaunch164.run(attempt);
  handle('amber:prelaunch164',(action,id,kind)=>{if(action==='state')return prelaunch164.state();if(action==='cancel')return prelaunch164.cancel(id,kind);throw Error('Invalid prelaunch action');});
  handle('amber:memory160',async(action,value)=>{await memory160.action(action,value);return memory160.state();});
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
  handle('amber:optifine-install', async (id) => {if(core.external)throw Error('Standalone OptiFine changes the external launch profile; use its original launcher / 独立 OptiFine 会改写外部启动配置，请使用其原启动器');const result = await dialog.showOpenDialog(window, { title: translateMessage('选择 OptiFine 官方安装器 JAR（独立安装，替换当前加载器）'), properties: ['openFile'], filters: [{ name: 'OptiFine', extensions: ['jar'] }] });return result.canceled ? null : installOptifine(core, id, result.filePaths[0]);});
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
  handle('amber:launch', async (id, options) => {if (launching) throw Error('正在准备启动。');launching = true;const launchAttempt=prelaunch164.begin();try {core.workflowGuard?.(id);if((await core.runtimeStatus()).processes.some(p=>p.instanceId===id&&p.state==='running'))throw Error('此实例已经在运行。');if (core.jobs.some((j) => j.instanceId===id&&j.state === 'running')) throw Error('请等待此实例安装或更新结束后启动游戏。');await recoverModUpdate(await core.instancePath(id),await contentState170(core,await core.instancePath(id)));if ((await workflows.pending()).some((p) => p.instanceId === id)) throw Error('实例安装尚未完成，请先在任务中心继续安装。');if(!core.external)await requireRoomSyncReady152(core,id);else if(options?.serverId||options?.roomSync)throw Error('External client linking requires an explicit library identity / 外部客户端联机绑定需要明确的实例库身份');await content.validateLaunch(id);const launchPrefs = await launchPreferences.get(id);options = { ...options, accountId: launchPrefs.accountId ?? options.accountId, memory: launchPrefs.memory ?? options.memory };const identity = await accounts.authorizeLaunch(options.accountId,options.username);await protection140.before(id,'daily');const skinBridge=identity.localSkin?await startSkinBridge(identity,identity.localSkin):null;let run;try{const extraJvm = identity?.server||skinBridge ? [`-javaagent:${await authAgent(core.root,fetch,{preferCache:!!skinBridge})}=${identity.server||skinBridge.url}`] : [];if(skinBridge)extraJvm.push('-Dminecraft.api.discovery.host='+skinBridge.url+'discovery');launchAttempt.controller.signal.throwIfAborted();run = await core.launch(id, { launchAttempt, username: options.username, memory: options.memory, identity, extraJvm,joinServer:options.roomSync?await rooms.sync.launchAddress(id):options.serverId?await (async()=>{const link=await environment140.links(options.serverId);if(link.localId!==id)throw Error('Select the linked client / 请选择关联客户端');const run=servers.runs.get(options.serverId);if(run?.state!=='running')throw Error('Start the server first / 请先启动服务端');return '127.0.0.1:'+run.port;})():null });if(skinBridge){const child=core.processes.get(run.id)?.child;if(child){skinRuns.add(run.id);const stopSkin=()=>{skinBridge.close();skinRuns.delete(run.id);};child.once('close',stopSkin);child.once('error',stopSkin);}else skinBridge.close();}}catch(e){skinBridge?.close();throw e;}await libraryState.launched(id, run).catch(() => {});await observe();return run;} finally {prelaunch164.finish(launchAttempt);launching = false;}});
  handle('amber:open-instance', async (id) => {const error = await shell.openPath(await core.instancePath(id));if (error) throw new Error(error);});

  async function invokeLibrary170(id,graph,fn){libraryRequests170.set(id,(libraryRequests170.get(id)||0)+1);try{return await scopes170.run(graph,fn);}finally{const count=libraryRequests170.get(id)-1;if(count)libraryRequests170.set(id,count);else libraryRequests170.delete(id);}}

  async function libraryGraph170(id){await libraries170.entry(id);if(!libraryGraphs170.has(id)){const pending=(async()=>{const entry=await libraries170.entry(id),runner=await libraryRunner170(id),graph=await libraryServices170(libraries170,entry,{runner,fetcher:network.request,accounts,settings});graph.selections=new Map();let observing=null;graph.observe=()=>observing||=(async()=>{try{const status=await runner.runtimeStatus();await graph.journal.observe(status.processes);await graph.protection140.observe(status.processes);}catch{}})().finally(()=>observing=null);runner.onSessionChanged=graph.observe;await graph.journal.recover().catch(()=>{});libraryGraphs170.get(id).graph=graph;return graph;})();libraryGraphs170.set(id,pending);pending.catch(()=>libraryGraphs170.delete(id));}return libraryGraphs170.get(id);}
  const libraryRunners170=new Map();
  const libraryPending170=new Set();
  const libraries170=new Libraries170(core.root,{edition:EDITION,active:id=>{const c=libraryRunners170.get(id),g=libraryGraphs170.get(id)?.graph,own=g&&scopes170.context.getStore()===g;return libraryPending170.has(id)||!own&&libraryRequests170.has(id)||!!g&&[...g.gameDirectories].some(key=>g.index.running.has(key))||!own&&!!g?.workflows.active||!!c&&(c.jobs.some(j=>j.state==='running')||[...c.processes.values()].some(p=>p.state==='running'));}});
  if(storageConfig.initialExternal170&&!(await libraries170.list()).libraries.some(l=>l.path===storageConfig.initialExternal170)){
   try{const preview=await libraries170.preview(storageConfig.initialExternal170);const warning=preview.isolation==='shared'||preview.isolation==='mixed'?'此库未开启版本隔离，请自行核对模组冲突风险':'无法可靠确定此库的版本隔离模式，请逐版本核对游戏目录和模组冲突风险。 / Isolation is undetermined; confirm each game directory and mod conflicts.';
   const answer=await dialog.showMessageBox({type:'warning',message:warning,buttons:['添加库 / Add library','暂不添加 / Later'],defaultId:1,cancelId:1});if(answer.response===0)await libraries170.add(preview.token,'Minecraft',true);
   }catch(error){await dialog.showMessageBox({type:'warning',message:'无法添加实例库 / Unable to add library',detail:error.message+'\n应用会继续启动，请在实例页重新添加目录。 / Continue to the app and retry or choose another directory from Instances.',buttons:['继续 / Continue']});}
   delete storageConfig.initialExternal170;await import('./core.mjs').then(({atomicJson})=>atomicJson(storage.config,storageConfig));
  }
  async function libraryRunner170(id){const entry=await libraries170.entry(id);if(id==='default')throw Error('Use the main library actions / 请使用默认库操作');if(!libraryRunners170.has(id)){const runner=entry.kind==='minecraft'?new LibraryRuntime170(libraries170,entry,join(core.root,'library-state170',id)):new VanillaLauncher(entry.path);await runner.init();runner.prelaunchMemory=core.prelaunchMemory;runner.beforeJavaLaunch=core.beforeJavaLaunch;libraryRunners170.set(id,runner);}return libraryRunners170.get(id);}
  async function scanLibrary170(id,action){const graph=await libraryGraph170(id),scan=await libraries170.scan(id),groups=new Map();for(const row of scan.rows){if(!row.gameDir||row.error)continue;const versions=groups.get(row.gameDir)||[];versions.push(row.id);groups.set(row.gameDir,versions);}graph.gameDirectories=new Set([...groups.keys()].map(directoryKey170));const directories=[];for(const [dir,versions]of groups){if(action==='start')graph.index.start(dir).catch(()=>{});if(action==='cancel')graph.index.cancel(dir);let state=graph.index.state(dir);if(state.state==='idle')state=await graph.index.read(dir);directories.push({key:versions[0],versions,state:state.state,completed:state.completed||0,total:state.total||0,error:state.error,matched:state.rows.filter(r=>r.match==='matched').length,unmatched:state.rows.filter(r=>r.match==='unmatched').length,failed:state.rows.filter(r=>r.match==='failed').length});}return {versions:scan.rows,directories};}
  handle('amber:libraries170',async(action,id,input)=>{
   if(['choose','delete','restore'].includes(action)){const runner=await libraryRunner170(id);if(libraryPending170.has(id)||(await runner.runtimeStatus()).processes.some(p=>p.state==='running')||runner.jobs.some(j=>j.state==='running'))throw Error('Library is busy / 实例库正在使用');}
   if(action==='remove'&&libraryPending170.has(id))throw Error('Library is busy / 实例库正在使用');
   if(action==='list')return libraries170.list();
   if(action==='pick'){const pick=await dialog.showOpenDialog(window,{title:'实例库目录 / Instance library directory',properties:['openDirectory','createDirectory']});return pick.canceled?null:libraries170.preview(pick.filePaths[0],{create:input?.create===true,kind:'managed'});}
   if(action==='add'){const entry=await libraries170.add(input.token,input.name,input.acknowledged);if(entry.kind==='minecraft')await scanLibrary170(entry.id,'start');return entry;}
   if(action==='select'){const result=await libraries170.select(id);for(const pending of libraryGraphs170.values()){const graph=pending.graph;if(graph){for(const service of Object.values(graph))service?.plans?.clear?.();graph.selections.clear();}}return result;}
   if(action==='rename')return libraries170.rename(id,input.name);
   if(action==='remove')return libraries170.remove(id);
   if(action==='choose'){const graph=await libraryGraph170(id);if((await graph.workflows.pending()).length)throw Error('Resolve pending library tasks before changing a game directory / 更改游戏目录前请处理库中未完成的任务');for(const service of Object.values(graph))service?.plans?.clear?.();graph.selections.clear();const result=await libraries170.choose(id,input.version,input.path);await scanLibrary170(id,'start');return result;}
   if(action==='scans'||action==='scan-start'||action==='scan-cancel')return scanLibrary170(id,action==='scans'?'state':action==='scan-start'?'start':'cancel');
   const entry=await libraries170.entry(id);
   if(action==='rows')return entry.kind==='minecraft'?libraries170.scan(id):{rows:await (await libraryRunner170(id)).listInstances(),isolation:'isolated'};
   if(action==='trash')return entry.kind==='minecraft'?libraries170.trash(id):new InstanceManagement(await libraryRunner170(id),{exclusive:fn=>libraries170.transaction(fn)}).list();
   if(action==='delete')return entry.kind==='minecraft'?libraries170.trashVersion(id,input.version):new InstanceManagement(await libraryRunner170(id),{exclusive:fn=>libraries170.transaction(fn)}).remove(input.version);
   if(action==='restore')return entry.kind==='minecraft'?libraries170.restore(id,input.ticket):new InstanceManagement(await libraryRunner170(id),{exclusive:fn=>libraries170.transaction(fn)}).restore(input.ticket);
   if(action==='open'){const path=entry.kind==='minecraft'?(await libraries170.profile(id,input.version)).gameDir:await (await libraryRunner170(id)).instancePath(input.version);if(!path)throw Error('Confirm game directory / 请先确认游戏目录');const error=await shell.openPath(path);if(error)throw Error(error);return true;}
   const runner=await libraryRunner170(id);
   if(action==='status')return runner.runtimeStatus();
   if(action==='versions')return runner.versions();
   if(action==='create'){if(entry.kind!=='managed')throw Error('Use the original launcher to add external versions / 请使用原启动器添加外部版本');return runner.createInstance(input);}
   if(action==='install')return runner.install(input.version);
   if(action==='loader-versions'){if(entry.kind!=='managed')throw Error('External library components are read-only');return runner.loaderVersions(input.version,input.type);}
   if(action==='loader-configure'){if(entry.kind!=='managed')throw Error('External library components are read-only');return runner.configureLoader(input.version,input.type,input.loaderVersion);}
   if(action==='java-prepare')return runner.prepareJava(input.version);
   if(action==='optifine-install'||action==='optifine-forge'){if(entry.kind!=='managed')throw Error('Use the original launcher to change external components / 请使用原启动器修改外部组件');const pick=await dialog.showOpenDialog(window,{title:'选择从 OptiFine 官网下载的 JAR / Select an official OptiFine JAR',properties:['openFile'],filters:[{name:'OptiFine',extensions:['jar']}]});if(pick.canceled)return null;return action==='optifine-install'?installOptifine(runner,input.version,pick.filePaths[0]):importOptifine(runner,input.version,pick.filePaths[0]);}
   if(action==='cancel')return runner.cancel(input.jobId);
   if(action==='java'){const pick=await dialog.showOpenDialog(window,{title:'选择 Java / Select Java',properties:['openFile']});if(pick.canceled)return null;const java=await runner.addJava(pick.filePaths[0]);return runner.selectJava(input.version,java.path);}
   if(action==='launch'){
    if(entry.kind==='minecraft'){const selected=await libraries170.profile(id,input.version);for(const run of (await runner.runtimeStatus()).processes.filter(p=>p.state==='running')){const existing=await libraries170.profile(id,run.instanceId);if(existing.gameDir===selected.gameDir)throw Error('Another version is using this shared game directory / 其他版本正在使用此共享游戏目录');}}
    if(launching)throw Error('Launch is being prepared / 正在准备启动');launching=true;libraryPending170.add(id);const attempt=prelaunch164.begin();
    try{const prefs=await settings.get(),identity=await accounts.authorizeLaunch(input.accountId,input.username);const extraJvm=identity.server?[`-javaagent:${await authAgent(core.root,fetch)}=${identity.server}`]:[];attempt.controller.signal.throwIfAborted();return await (await libraryGraph170(id)).core.launch(input.version,{identity,extraJvm,username:input.username,memory:input.memory||prefs.memory,launchAttempt:attempt});}finally{prelaunch164.finish(attempt);launching=false;libraryPending170.delete(id);}
   }
   throw Error('Unknown library action');
  });
  const placement=new WindowStateStore(app.getPath('userData'));
  let initialCorners='system',placementTimer,placementMaximized=false;
  const windowInfo=()=>({maximized:window?.isMaximized()||false,focused:window?.isFocused()||false,corners:initialCorners,cornersSupported:supportsWindowCorners(process.platform,osRelease())});
  const sendWindowInfo=()=>{if(window&&!window.isDestroyed())window.webContents.send('amber:window-state-changed',windowInfo());};
  handle('amber:window-state',windowInfo);
  handle('amber:startup-ready',()=>{if(!interfaceReady){if(!startup.finish(window))return false;interfaceReady=true;if(activatePending&&!smoke){window.focus();activatePending=false;}finishSmoke();}return true;});
  handle('amber:startup-failed',()=>{if(!interfaceReady)startup.fail(Error('Main interface failed to render'));return true;});
  handle('amber:window-action',action=>{runWindowAction(window,action);return true;});
  const savePlacement=()=>placement.save(window.getNormalBounds(),window.isMinimized()?placementMaximized:window.isMaximized()).catch(e=>console.error(redact(e.message)));
  let tray=null,explicitQuit=false,exitApproved=false;
  function restoreWindow(){if(!interfaceReady){startup.focus();return;}if(window&&!window.isDestroyed()){if(window.isMinimized())window.restore();window.show();window.focus();}}
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
    interfaceReady=false;
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
    let closeAllowed = false,closePrompt = false;
    window.on('close', async event => {
      if(closeAllowed)return;event.preventDefault();if(closePrompt)return;closePrompt=true;
      let pausedSchedules=false;
      try {
        const prefs=await settings.get();
        if(!smoke&&closeToTray160(prefs.closeBehavior,{serverActive:servers.active,networkActive:!!(services160.pending.size||rooms.starting||rooms.active||sakura.active||mysql150.active)},explicitQuit)){await savePlacement();hideToTray();return;}
        if(!smoke&&skinRuns.size){const answer=await dialog.showMessageBox(window,{type:'question',message:'离线游戏仍在使用本地皮肤 / Offline game is using a local skin',detail:'最小化可继续提供皮肤；退出后尚未缓存的皮肤可能无法加载。 / Minimize to keep serving skins; quitting may prevent uncached skins from loading.',buttons:['最小化 / Minimize','退出 / Quit','返回 / Back'],defaultId:0,cancelId:2});if(answer.response===0){window.minimize();return;}if(answer.response!==1)return;}
        if(storageBusy){await dialog.showMessageBox(window,{type:'info',message:translateMessage('数据目录正在迁移，请等待完成。'),buttons:[translateMessage('确定')]});return;}
        if(libraryPending170.size||[...libraryRunners170.values()].some(c=>c.jobs.some(j=>j.state==='running'))){await dialog.showMessageBox(window,{type:'info',message:'请先取消或等待实例库任务完成。 / Cancel or wait for library tasks before quitting.',buttons:['确定 / OK']});return;}
        if(!smoke&&(minecraftImport.busy||serverManagement140.backupBusy||workflows.active||core.jobs.some(j=>j.state==='running')||appUpdates.state.phase==='downloading')){
          const answer=await dialog.showMessageBox(window,{type:'warning',title:translateMessage('安装还未结束'),message:translateMessage('退出会中断当前下载或实例配置。'),detail:translateMessage('已完成的文件会保留，建议等待任务结束。实例安装可在任务中心继续；程序更新可在关于页重新下载。'),buttons:[translateMessage('继续等待'),translateMessage('取消任务并退出')],defaultId:0,cancelId:0,noLink:true});
          if(answer.response!==1)return;
          appUpdates.cancel();minecraftImport.cancel();workflows.cancel();for(const j of core.jobs.filter(j=>j.state==='running'))core.controllers.get(j.id)?.abort(Error('用户取消任务并退出。'));
          while(minecraftImport.busy||serverManagement140.backupBusy||workflows.active||core.jobs.some(j=>j.state==='running')||appUpdates.state.phase==='downloading')await new Promise(resolve=>setTimeout(resolve,150));
        }
        if(services160.pending.size)throw Error('Cancel the launch plan and wait for safe completion before quitting / 请取消启动规划并等待安全结束后退出');
        await schedules?.pause();pausedSchedules=true;
        exitBusy=true;if(!smoke)await shutdownOwned160({servers,rooms,sakura,mysql:mysql150});
        exitBusy=true;await mysql150.withQuiesced(async()=>{clearTimeout(placementTimer);await savePlacement();exitApproved=true;closeAllowed=true;window.close();app.quit();});
      }catch(e){restoreWindow();await dialog.showMessageBox(window,{type:'error',message:redact(e.message)});}
      finally{if(!exitApproved){exitBusy=false;rooms.closing=false;}closePrompt=false;explicitQuit=false;if(pausedSchedules&&!exitApproved)schedules?.start();}
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => {if (url !== 'amber://app/') event.preventDefault();});
    window.webContents.on('will-attach-webview', (event) => event.preventDefault());
    window.webContents.on('did-fail-load', (_event, code, description,_url,isMainFrame) => {if(isMainFrame&&code!==-3)startup.fail(Error('LOAD_FAILED '+code+' '+description));});
    window.webContents.on('render-process-gone',()=>startup.fail(Error('Main renderer stopped')));
    window.webContents.on('did-finish-load', () => {loaded = true;finishSmoke();});
    startup.stage('interface');startup.watch();
    window.loadURL('amber://app/').catch(error=>startup.fail(error));
  }
  schedules=await new ServerSchedules(core.root,servers,{blocked:id=>storageBusy||upgradeBusy||services160.pending.has(id)||core.jobs.some(j=>j.state==='running'&&j.instanceId===id)}).init();
  handle('amber:server-schedules',async(action,input)=>{
    if(action==='list')return schedules.list();
    if(action==='save')return schedules.save(input);
    if(action==='remove')return schedules.remove(input);
    throw Error('Unknown schedule action');
  });
  powerMonitor.on('suspend',()=>{schedules.suspend().catch(e=>console.error(redact(e.message)));});
  powerMonitor.on('resume',()=>{if(!exitApproved)schedules.resumeAfterSleep().catch(e=>console.error(redact(e.message)));});
  await createWindow();schedules.start();
  app.on('window-all-closed', () => {if (process.platform !== 'darwin') app.quit();});
  app.on('activate', () => {restoreWindow();if (!BrowserWindow.getAllWindows().length) createWindow().catch(e=>console.error(redact(e.message)));});
}).catch((error) => {console.error(redact(error?.message || String(error)));startup.fail(Error(redact(error?.message||String(error))));});
