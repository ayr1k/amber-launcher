import './beta11.css';
// SPDX-License-Identifier: MPL-2.0
import React from "react";
import {defaultLayout} from "../desktop/layout-schema.mjs";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";
import "./alpha7.css";
import "./alpha8.css";
import "./alpha9.css";
import "./alpha10.css";
import "./beta12.css";

if (import.meta.env.DEV && new URLSearchParams(location.search).has('desktop-preview')) {
  const instance={id:'layout-only',name:'界面样例 · Fabric',game:'1.21.1',loader:'fabric',loaderVersion:'0.19.5',status:'installed',javaMajor:21,javaPath:'AMBER / runtimes / Temurin 21 / bin / java.exe'};
  const unavailable=async()=>{throw new Error('此浏览器页面仅用于桌面界面布局检查，请在 AMBER.exe 中使用真实功能。');};
  window.amberDesktop={preview:true,backups:async()=>[],createBackup:unavailable,restoreBackup:unavailable,storageInfo:async()=>({path:'UI 样例 / AMBER / library',freeBytes:120*1073741824,onboarded:!new URLSearchParams(location.search).has('qa-welcome')}),pickStorage:unavailable,moveStorage:unavailable,completeOnboarding:async()=>true,trashDetails:unavailable,purgeInstance:unavailable,exportDiagnostics:unavailable,pickBackground:unavailable,contentCategories:async()=>[{name:'adventure',project_type:'mod'},{name:'technology',project_type:'mod'},{name:'optimization',project_type:'mod'}],setupState:async()=>({}),cancelSetup:unavailable,retrySetup:unavailable,trashInstances:async()=>[],setInstanceIcon:unavailable,renameInstance:unavailable,removeInstance:unavailable,restoreInstance:unavailable,configureLite:unavailable,exportLayout:unavailable,importLayout:unavailable,settings:async()=>({background:'forest',theme:'light',accent:'forest',density:'comfortable',motion:true,fontSize:14,threads:8,memory:4,layout:defaultLayout}),saveSettings:async v=>v,setupChoices:async(game,type)=>type==='liteloader'?(game==='1.12.2'?[{version:'1.12.2-SNAPSHOT-r4CC2BB0-b4-4',stable:false}]:[]):[{version:type==='fabric'?'0.19.5':type==='forge'?'1.21.1-52.1.20':'21.1.264',stable:true},...(type==='fabric'?[{version:'0.18.4',stable:true}]:[])],setup:unavailable,setupFile:unavailable,migrationReport:async()=>null,migrationExport:unavailable,migrationRun:unavailable,openProject:unavailable,packCreate:unavailable,loaderVersions:async()=>[{version:'0.19.5',stable:true}],configureLoader:unavailable,installOptifine:unavailable,importOptifine:unavailable,openOptifine:unavailable,importWorld:unavailable,contentSearch:async()=>({total:1,hits:[{id:'sample-modmenu',icon:'/icons/box.svg',title:'Mod Menu · 布局样例',description:'为游戏提供已安装模组的菜单与配置入口。此结果仅用于布局检查。',author:'Prospector',downloads:1000000}]}),contentVersions:async()=>[{id:'sample-version',version_number:'11.0.3',version_type:'release'}],contentPreview:async()=>({id:'sample-plan',files:[{projectId:'sample-modmenu',title:'Mod Menu',version:'11.0.3',relative:'mods/modmenu.jar',size:1000000},{projectId:'sample-fabricapi',title:'Fabric API',version:'0.116.7',relative:'mods/fabric-api.jar',size:2200000},{projectId:'sample-placeholder',title:'Text Placeholder API',version:'2.4.2',relative:'mods/placeholder-api.jar',size:220000}],warnings:['此为界面布局样例；安装操作在浏览器中不可用。']}),contentInstall:unavailable,contentRemove:unavailable,contentToggle:unavailable,contentList:async()=>[{relative:'mods/modmenu.jar',title:'Mod Menu · 布局样例',version:'13.0.4',type:'mod',enabled:true,managed:true,projectId:'sample-modmenu'},{relative:'mods/fabric-api.jar',title:'Fabric API · 布局样例',version:'0.119.4',type:'mod',enabled:true,managed:true,projectId:'sample-fabricapi'},{relative:'mods/example.jar.disabled',title:'已停用模组 · 布局样例',type:'mod',enabled:false,managed:false}],packPreview:unavailable,packInstall:unavailable,accounts:async()=>({accounts:[],clientId:'ab7cf49a-fea7-432d-8ce8-beb922eb554e'}),pollMicrosoft:async()=>({accounts:[],clientId:'ab7cf49a-fea7-432d-8ce8-beb922eb554e'}),fabricVersions:unavailable,configureFabric:unavailable,addOffline:unavailable,configureAccount:unavailable,startMicrosoft:unavailable,addServer:unavailable,info:async()=>({dataPath:'桌面界面布局预览（示例状态）',version:'1.0.0-beta.3'}),listInstances:async()=>[instance],status:async()=>({jobs:[],processes:[]}),scanJava:async()=>[],versions:async()=>({latest:{release:'1.21.1'},versions:[{id:'1.21.1',type:'release'},{id:'1.20.1',type:'release'},{id:'1.12.2',type:'release'},{id:'24w33a',type:'snapshot'},{id:'b1.7.3',type:'old_beta'},{id:'a1.2.6',type:'old_alpha'}]}),createInstance:unavailable,install:unavailable,cancel:unavailable,prepareJava:unavailable,selectJava:unavailable,browseJava:unavailable,launch:unavailable,openInstance:unavailable};
  if(new URLSearchParams(location.search).has('qa-beta12')){
    window.amberDesktop.versions=async()=>({latest:{release:'1.21.4'},versions:[{id:'1.21.4',type:'release',releaseTime:'2024-12-03'},...Array.from({length:103},(_,i)=>({id:'layout-release-'+i,type:'release',releaseTime:'2024-01-01'})),...Array.from({length:756},(_,i)=>({id:'layout-snapshot-'+i,type:'snapshot'})),...Array.from({length:61},(_,i)=>({id:'layout-legacy-'+i,type:'old_beta'}))]});
    const originalSettings=window.amberDesktop.settings;
    window.amberDesktop.settings=async()=>({...await originalSettings(),theme:new URLSearchParams(location.search).get('theme')||'dark',uiStyle:new URLSearchParams(location.search).get('style')||'square'});
    window.amberDesktop.setup=async options=>Object.assign(instance,{...options,name:options.name+' · 界面样例（未安装）',icon:options.icon});
  }
  window.amberDesktop.modUpdateHistory=async()=>[];
  if(new URLSearchParams(location.search).has('qa-empty'))window.amberDesktop.listInstances=async()=>[];
  if(new URLSearchParams(location.search).has('qa-beta11')){
    window.amberDesktop.beta11QA=true;
    window.amberDesktop.modUpdateScan=async()=>({rows:[{projectId:'sample-modmenu',title:'Mod Menu · 更新样例',current:'13.0.4',version:'13.0.5',versionId:'sample-new',enabled:true},{projectId:'sample-fabricapi',title:'Fabric API · 已锁定样例',current:'0.119.4',version:'0.119.5',versionId:'sample-api',locked:true,enabled:true}]});
    window.amberDesktop.modUpdatePreview=async(_id,_choices,_optional,excluded)=>({id:'ui-update',files:[{projectId:'sample-modmenu',title:'Mod Menu · 更新样例',version:'13.0.5',size:1000000}],required:[{key:'ui:0',title:'Fabric API',owner:'Mod Menu',available:true}],optional:[],warnings:[],blockers:[]});
    window.amberDesktop.modUpdateInstall=unavailable;window.amberDesktop.modUpdateLock=unavailable;
  }
  const qaProblem=new URLSearchParams(location.search).get('qa-problem');
  if(qaProblem==='resume'){const setup={instanceId:instance.id,name:instance.name,state:'interrupted',step:'game',completed:['java','loader'],resumable:true,active:false};instance.setup=setup;window.amberDesktop.status=async()=>({jobs:[],processes:[],setups:[setup]});}
  window.amberDesktop.backups=async()=>[{id:'ui-backup',name:'界面样例备份',mode:'full',createdAt:'2026-10-21T12:00:00Z',bytes:125829120,files:123}];
  const previewBase=window.amberDesktop.contentPreview;window.amberDesktop.contentPreview=async(id,version,selected=[],excluded=[])=>{const plan=await previewBase(id,version);return {...plan,compatible:true,required:[{key:'sample-version:0',title:'Fabric API · 必需依赖样例',owner:'Mod Menu · 布局样例',available:true,selected:!excluded.includes('sample-version:0')}],optional:[{key:'optional-ui',title:'附加功能 · 可选依赖样例',owner:'Mod Menu · 布局样例',available:true},{key:'unavailable-ui',title:'不兼容的可选依赖样例',owner:'Mod Menu · 布局样例',available:false,reason:'当前游戏版本没有兼容发行版'}],warnings:[...plan.warnings,...(excluded.length?['已手动跳过作者声明的必需依赖，可能导致游戏无法启动。']:[])],files:[...plan.files.filter(f=>!excluded.includes('sample-version:0')||f.projectId!=='sample-fabricapi'),...(selected.includes('optional-ui')?[{projectId:'optional-ui',title:'附加功能 · 样例',relative:'mods/optional-demo.jar',size:2048}]:[])]};};
  if(qaProblem==='trash'){window.amberDesktop.trashInstances=async()=>[{id:'ui-trash',name:'回收站界面样例',game:'1.20.1',loader:'fabric',icon:'anvil',status:'installed',deletedAt:'2026-10-21T12:00:00Z'}];window.amberDesktop.trashDetails=async()=>({id:'ui-trash',name:'回收站界面样例',bytes:104857600,files:123});}
  if(qaProblem==='crash')window.amberDesktop.status=async()=>({jobs:[],processes:[{id:'ui-crash',instanceId:instance.id,state:'failed',exitCode:1,tail:'Incompatible mods found!\n示例：新安装的模组与当前模组组合不兼容。此为界面检查数据。',logPath:'UI 样例 / logs / example.log'}]});
  if(qaProblem==='download')window.amberDesktop.status=async()=>({jobs:[{id:'ui-download',instanceId:instance.id,kind:'install',state:'failed',phase:'游戏文件下载未完成',error:'界面样例：下载请求失败 (503)',completed:40,total:100,transferred:10485760}],processes:[]});
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
