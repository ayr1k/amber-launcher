import {Environment140} from './environment140.mjs';
import {json170} from './library-paths170.mjs';
// SPDX-License-Identifier: MPL-2.0
import {join,dirname} from 'node:path';
import {VanillaLauncher} from './launcher.mjs';
import {LibraryRuntime170} from './library-runtime170.mjs';
import {externalCore170,ExternalContent170} from './library-content170.mjs';
import {LibraryModIndex170,lookupModHashes170,directoryKey170} from './library-mod-index170.mjs';
import {Modrinth} from './modrinth.mjs';
import {ModUpdates} from './mod-updates.mjs';
import {BulkContent} from './bulk-content.mjs';
import {ModImport} from './mod-import.mjs';
import {Workflows} from './workflows.mjs';
import {InstanceManagement} from './instance-management.mjs';
import {Backups} from './backups.mjs';
import {ExternalBackups170} from './library-backups170.mjs';
import {LaunchPreferences} from './launch-preferences.mjs';
import {LibraryState} from './library-state.mjs';
import {InstanceEditor} from './editor130.mjs';
import {DependencyMetadata} from './dependency130.mjs';
import {Protection140} from './protection140.mjs';
import {InstanceHealth} from './instance-health.mjs';
import {InstanceWorkbench} from './instance-workbench.mjs';
import {PlayJournal,Screenshots} from './home-services.mjs';
import {GuidedCreation} from './guided.mjs';
import {Modpacks} from './modpacks.mjs';
import {LocalPacks} from './local-packs.mjs';
import {PackUpgrade140} from './pack-upgrade140.mjs';
import {atomicJson} from './core.mjs';
import {validateIcon} from './appearance.mjs';
import {inspectTrashTree,purgeTrashTree} from './trash-purge.mjs';
import {ExternalEditor170} from './library-editor170.mjs';
import {ExternalWorkbench170} from './library-workbench170.mjs';
const indexes170=new WeakMap();

export async function libraryServices170(registry,entry,{runner,fetcher,accounts,settings}={}){
 const stateRoot=join(registry.root,'library-state170',entry.id);runner||=entry.kind==='minecraft'?new LibraryRuntime170(registry,entry,stateRoot):new VanillaLauncher(entry.path);await runner.init();if(fetcher)runner.fetcher=fetcher;
 if(!indexes170.has(registry))indexes170.set(registry,new LibraryModIndex170(registry.root,{lookup:(hashes,options)=>lookupModHashes170(hashes,{...options,fetcher:runner.fetcher})}));const index=indexes170.get(registry);
 const external=entry.kind==='minecraft',core=external?externalCore170(runner,stateRoot,index):runner,content=external?new ExternalContent170(core):new Modrinth(core),workflows=new Workflows(core,content);
 const modUpdates=new ModUpdates(core,content),bulkContent=new BulkContent(core,content,modUpdates);content.updates=modUpdates;content.bulk=bulkContent;
 const backups=external?new ExternalBackups170(core,workflows):new Backups(core,workflows),launchPreferences=new LaunchPreferences(core),workbench=external?new ExternalWorkbench170(core,workflows,content):new InstanceWorkbench(core,workflows);
 core.workbench=workbench;
 if(external)runner.workflowGuard=core.workflowGuard;
 const management=new InstanceManagement(core,workflows);
 if(external){
  const originalBackupRestore=backups.restore.bind(backups);backups.restore=async ticket=>{if(!(await backups.list()).some(r=>r.id===ticket))throw Error('Backup unavailable');const record=await json170(join(backups.root,ticket,'backup.json'),{max:16000000});return core.withGameDirectory170(record.sourceId,()=>originalBackupRestore(ticket));};
  const originalBackupCreate=backups.create.bind(backups);backups.create=(id,...args)=>core.withGameDirectory170(id,()=>originalBackupCreate(id,...args));
  const change=(id,fn)=>workflows.exclusive(async()=>{const {dir,item,stateDir}=await core.metadata(id);await core.requireStopped(dir);fn(item);await atomicJson(join(stateDir,'instance.json'),item);return item;});
  management.setIcon=(id,icon)=>change(id,item=>item.icon=validateIcon(icon));management.rename=(id,name)=>change(id,item=>{if(typeof name!=='string'||!name.trim()||name.length>60)throw Error('Name must contain 1–60 characters / 名称应为 1–60 个字符');item.name=name.trim();});
  management.remove=async id=>{await registry.requireStopped(entry.id);await registry.trashVersion(entry.id,id);return {id};};
  management.list=async()=>(await registry.trash(entry.id)).map(r=>({...r,id:r.trashId,name:r.name||r.version}));
  management.restore=async ticket=>{const r=(await registry.trash(entry.id)).find(r=>r.trashId===ticket);if(!r)throw Error('Recycle entry unavailable');await registry.requireStopped(entry.id);await registry.restore(entry.id,ticket);return (await core.metadata(r.version)).item;};
  management.trashDetails=async id=>{const r=(await management.list()).find(r=>r.id===id);if(!r)throw Error('Recycle entry unavailable');const {bytes,files}=await inspectTrashTree(runner.root,await registry.trashRoot(entry.id),id);return {...r,bytes,files};};
  management.purge=async(id,confirmation)=>{const r=await management.trashDetails(id);if(confirmation!==r.name)throw Error('Type the exact recycled instance name / 请输入完整的回收实例名称');await registry.requireStopped(entry.id);const {target,bytes,files}=await inspectTrashTree(runner.root,await registry.trashRoot(entry.id),id);await purgeTrashTree(target);return {id,bytes,files};};
  const originalRestore=workbench.restore.bind(workbench);workbench.restore=async(id,token)=>{const result=await originalRestore(id,token);await index.refreshLocal((await core.metadata(id)).dir);return result;};
  const originalApply=workbench.applyTrial.bind(workbench);workbench.applyTrial=async(...args)=>{const result=await originalApply(...args);await index.refreshLocal((await core.metadata(result.id)).dir);return result;};
  workbench.createTrial=async(id,{saves=false,name}={})=>{const {dir,item}=await core.metadata(id);await core.requireStopped(dir);const baseline=await workbench.scan(dir),backup=await backups.create(id,saves?'full':'configuration'),trial=await backups.restore(backup.id),state=await runner.instancePath(trial.id);await atomicJson(join(state,'trial.json'),{schema:1,sourceId:id,sourceName:item.name,baseline,saves,createdAt:new Date().toISOString()});if(name)await management.rename(trial.id,name);return (await core.metadata(trial.id)).item;};
 }
 const graph={core,runner,index,content,workflows,modUpdates,bulkContent,backups,launchPreferences,workbench,management,modImport:new ModImport(core,content,modUpdates),libraryState:new LibraryState(core),editor130:external?new ExternalEditor170(core):new InstanceEditor(core),dependency130:new DependencyMetadata(core),journal:new PlayJournal(core.root),screenshots:new Screenshots(external?{root:runner.root,instancePath:id=>core.instancePath(id)}:core),gameDirectories:new Set(external?(await registry.scan(entry.id)).rows.filter(r=>r.gameDir).map(r=>directoryKey170(r.gameDir)):[])};
 graph.environment140=new Environment140(core,null,content,workflows);graph.protection140=new Protection140(core,backups);graph.health=new InstanceHealth(core,content,workflows,accounts,launchPreferences,settings);graph.guided=new GuidedCreation(core,content,workflows);graph.packs=new Modpacks(core,content);graph.localPacks=new LocalPacks(core,graph.packs,workflows);workflows.localPacks=graph.localPacks;graph.packUpgrade140=new PackUpgrade140(core,graph.packs,graph.localPacks,workflows);
 if(external){
  const trashScreenshot=graph.screenshots.trash.bind(graph.screenshots);graph.screenshots.trash=async(token,move)=>{const {path}=await graph.screenshots.read(token),rows=(await registry.scan(entry.id)).rows,owner=rows.find(r=>r.gameDir&&directoryKey170(join(r.gameDir,'screenshots'))===directoryKey170(dirname(path)));if(!owner)throw Error('Screenshot directory is no longer confirmed');return core.withGameDirectory170(owner.id,()=>trashScreenshot(token,move));};
  const unsupportedPack=async()=>{throw Error('This external version has no AMBER pack installation receipt. Create a separate managed instance to install or upgrade a whole pack; individual content remains available / 此外部版本没有 AMBER 整合包安装记录。安装或升级整个整合包请创建独立托管实例；单项内容仍可管理');};
  graph.packs.install=unsupportedPack;workflows.installPack=unsupportedPack;graph.packUpgrade140.preview=unsupportedPack;graph.packUpgrade140.apply=unsupportedPack;graph.packUpgrade140.versions=async()=>({current:null,versions:[],reason:'External launcher pack metadata is not an AMBER installation receipt / 外部启动器整合包元数据不是 AMBER 安装记录'});
 }
 return graph;
}
