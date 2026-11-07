// SPDX-License-Identifier: MPL-2.0
// Real Electron interaction, isolated synthetic source and network fixtures only.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp,mkdir,readFile,writeFile,readdir,lstat}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join,resolve,relative}=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const root=resolve(__dirname,'..'),output=resolve(process.env.AMBER_QA_OUTPUT||join(root,'.qa/import151'));
const catalog=require('../desktop/locales/catalog.json'),en=Object.fromEntries(Object.values(catalog).map(v=>[v.zh,v.en]));
async function snapshot(root){const out={};async function walk(dir){for(const e of await readdir(dir)){const p=join(dir,e),s=await lstat(p);if(s.isDirectory())await walk(p);else out[relative(root,p)]={hash:createHash('sha256').update(await readFile(p)).digest('hex'),mtime:s.mtimeMs};}}await walk(root);return out;}
async function run(name,presets){
 const data=await mkdtemp(join(tmpdir(),'amber-desktop151-')),library=join(data,'library'),source=join(data,'synthetic-source-with-a-long-directory-name-for-layout'),isolated=join(source,'versions','1.21.11-Fabric'),empty=join(data,'empty-game');
 const put=async(path,text)=>{await mkdir(join(path,'..'),{recursive:true});await writeFile(path,typeof text==='string'?text:JSON.stringify(text));};
 await mkdir(empty);await mkdir(library);await put(join(data,'storage.json'),{schema:1,path:library,onboarded:true});
 const base={id:'1.21.11',mainClass:'net.minecraft.client.main.Main',libraries:[],arguments:{game:[]},javaVersion:{majorVersion:21}};
 await put(join(source,'versions','1.21.11','1.21.11.json'),base);
 const merged={id:'1.21.11-Fabric',mainClass:'net.fabricmc.loader.impl.launch.knot.KnotClient',libraries:[{name:'net.fabricmc:fabric-loader:0.18.0'},{name:'net.fabricmc:intermediary:1.21.11'}]};
 await put(join(isolated,'1.21.11-Fabric.json'),merged);await put(join(isolated,'options.txt'),'isolated data');await put(join(source,'options.txt'),'shared data');await put(join(source,'launcher_accounts.json'),'synthetic secret, must not copy');
 await put(join(source,'versions','uncertain','uncertain.json'),{...merged,id:'uncertain',libraries:[merged.libraries[0]]});
 await put(join(source,'launcher_profiles.json'),{profiles:{long:{name:'Long display name for a custom Fabric profile — synthetic import acceptance only',lastVersionId:merged.id},vanilla:{name:'Vanilla fixture',lastVersionId:base.id},unknown:{name:'Confirm base fixture',lastVersionId:'uncertain'}}});
 const before=await snapshot(source),packaged=process.env.AMBER_QA_UNPACKAGED!=='1',stage=process.env.AMBER_QA_APP_ROOT||join(root,'releases/1.5.1',name,'win-unpacked/resources/app');
 const executable=packaged?join(stage,'../../',name+'.exe'):join(root,'node_modules/electron/dist/electron.exe');
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:resolve(executable),args:[...(!packaged?[root]:[]),'--qa-ui','--qa-visible'],env});
 const report={product:name,packaged,isolatedData:data,checks:[],screenshots:[]};await mkdir(join(output,name),{recursive:true});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let n=0;n<400;n++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}assert.ok(page,'main window');page.setDefaultTimeout(15000);await page.waitForFunction(()=>!!window.amberDesktop);
  assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Patch network at the backend class boundary in this isolated process only.
  // Neither shipped code nor user data is modified by these fixtures.
  const client='synthetic desktop client, never launched',index='{"objects":{}}',sha=x=>createHash('sha1').update(x).digest('hex');
  const meta={...base,assetIndex:{id:'fixture',url:'https://piston-meta.mojang.com/index.json',sha1:sha(index),size:Buffer.byteLength(index)},downloads:{client:{url:'https://piston-data.mojang.com/client.jar',sha1:sha(client),size:Buffer.byteLength(client)}}},body=JSON.stringify(meta);
  await app.evaluate(async({dialog},f)=>{
   const vm=process.getBuiltinModule('node:vm');const {VanillaLauncher}=await vm.runInThisContext('import('+JSON.stringify(f.module)+')',{importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER});
   VanillaLauncher.prototype.versions=async function(){this.catalog=[{id:'1.21.11',type:'release',url:'https://piston-meta.mojang.com/meta.json',sha1:f.hash},{id:'1.21.1',type:'release',url:'https://piston-meta.mojang.com/meta.json',sha1:f.hash}];this.fetcher=async url=>{if(url.endsWith('/meta.json'))return new Response(f.body);if(url.endsWith('/index.json'))return new Response(f.index);if(url.endsWith('/client.jar'))return new Response(f.client);if(url.includes('meta.fabricmc.net'))return new Response(JSON.stringify([{loader:{version:'0.18.0',stable:true}}]));throw Error('Unexpected synthetic network URL')};return {versions:this.catalog}};
   dialog.showOpenDialog=async()=>({canceled:false,filePaths:[f.source]});
  },{module:pathToFileURL(join(packaged?stage:root,'desktop/launcher.mjs')).href,source,body,hash:sha(body),client,index});
  for(const [theme,locale,width,height,fontSize,motion] of [['classic','zh-CN',1440,1000,14,true],['focus','en-US',1200,800,16,true],['desk','en-US',860,640,20,false],['scenery','zh-CN',980,720,18,true]]){
   const label=zh=>locale==='zh-CN'?zh:en[zh]||zh,button=zh=>page.getByRole('button',{name:label(zh),exact:true});
   await app.evaluate(({BrowserWindow},size)=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/'));w.unmaximize();w.setSize(...size);w.show()},[width,height]);
   await page.evaluate(async v=>{const s=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...s,language:v.locale});await window.amberDesktop.themeApply({...s,language:v.locale,fontSize:Math.min(v.fontSize,18),motion:v.motion,theme:'light',appearance:{...v.appearance,fontSize:v.fontSize,motion:v.motion?'standard':'none'}})}, {locale,fontSize,motion,appearance:presets[theme]});
   await page.reload();if(await page.evaluate(()=>window.amberDesktop.themeState()))await button('确认更改').click();
   await page.getByRole('button',{name:locale==='zh-CN'?'实例':'Instances',exact:true}).first().click();
   await page.getByRole('button',{name:locale==='zh-CN'?'导入 .minecraft…':'Import .minecraft…',exact:true}).click();
   const dialog=page.locator('.minecraft-import134');await dialog.waitFor();
   await app.evaluate(({dialog},source)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[source]})},source);
   await button('选择 .minecraft 文件夹…').click();
   await page.getByText(label('检测到多个可能目录，请先选择实际游戏目录。'),{exact:true}).waitFor();
   const choose=async(zh,match)=>{const control=page.getByRole('combobox',{name:label(zh),exact:true});await control.scrollIntoViewIfNeeded();await control.click();await page.getByRole('option',{name:match}).click()};
   await choose('游戏数据来源',new RegExp(locale==='zh-CN'?'版本隔离目录':'Isolated version directory'));
   await dialog.locator('.import-summary151').filter({hasText:'0.18.0'}).waitFor();
   assert.ok((await dialog.locator('.import-summary151').innerText()).includes(isolated));
   assert.ok(await button('复制并安装').isDisabled());
   await page.getByRole('checkbox',{name:label('已核对数据来源，原游戏已退出，导入期间不修改源文件。'),exact:true}).check();
   assert.ok(await button('复制并安装').isEnabled());
   const shot=join(output,name,theme+'.png');await page.screenshot({path:shot});report.screenshots.push(shot);
   const layout=await dialog.evaluate(el=>{const b=el.getBoundingClientRect(),body=el.querySelector('.dialog-body'),actions=el.querySelector('.dialog-actions').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scroll:body.scrollHeight>body.clientHeight,overflow:el.scrollWidth>el.clientWidth+2,actionsBottom:actions.bottom,dialogBottom:b.bottom,font:getComputedStyle(el).fontSize}});
   assert.equal(layout.overflow,false);assert.ok(layout.actionsBottom<=layout.height&&layout.dialogBottom<=layout.height,'actions stay reachable');
   await choose('版本 / 启动配置',/Confirm base fixture/);await page.getByRole('combobox',{name:label('确认 Minecraft 基础版本'),exact:true}).waitFor();await choose('确认 Minecraft 基础版本',/^1\.21\.11$/);await dialog.locator('.import-summary151').filter({hasText:'0.18.0'}).waitFor();
   await choose('版本 / 启动配置',/Vanilla fixture/);
   await app.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]})},empty);await button('选择其他游戏数据目录…').click();
   await page.getByRole('checkbox',{name:label('确认不复制游戏数据，仅创建运行环境'),exact:true}).waitFor();
   assert.ok(await button('仅创建运行环境').isDisabled());
   await page.getByRole('checkbox',{name:label('已核对数据来源，原游戏已退出，导入期间不修改源文件。'),exact:true}).check();assert.ok(await button('仅创建运行环境').isDisabled());
   await page.getByRole('checkbox',{name:label('确认不复制游戏数据，仅创建运行环境'),exact:true}).check();assert.ok(await button('仅创建运行环境').isEnabled());
   const emptyShot=join(output,name,theme+'-empty.png');await page.screenshot({path:emptyShot});report.screenshots.push(emptyShot);
   if(theme==='classic'){
    await app.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]})},isolated);await button('选择其他游戏数据目录…').click();await dialog.locator('.import-summary151').filter({hasText:'vanilla'}).waitFor();
    await page.getByRole('checkbox',{name:label('已核对数据来源，原游戏已退出，导入期间不修改源文件。'),exact:true}).check();await button('复制并安装').click();await dialog.waitFor({state:'hidden'});
    const instances=await page.evaluate(()=>window.amberDesktop.listInstances());const imported=instances.find(i=>i.name==='Vanilla fixture');assert.ok(imported);assert.equal(await readFile(join(library,'instances',imported.id,'options.txt'),'utf8'),'isolated data');
   }else await button('关闭').click();
   report.checks.push({theme,locale,fontSize,motion,layout,checks:['ambiguous directory','isolated preview','long ID and path','manual base confirmation','directory switch','zero files opt-in',...(theme==='classic'?['copy success']:[])]});
  }
  assert.deepEqual(await snapshot(source),before);assert.deepEqual(errors,[]);report.sourceUnchanged=true;report.rendererErrors=errors;
  if(packaged){report.provenance=JSON.parse(await readFile(join(stage,'desktop/build-provenance.json'),'utf8'));assert.equal(report.provenance.version,'1.5.1');assert.equal(report.provenance.channel,'local')}
  await writeFile(join(output,name,'report.json'),JSON.stringify(report,null,2));console.log('DESKTOP_IMPORT151_OK',name,output);
 }finally{await app.close()}
}
(async()=>{const {appearanceDefaults}=await import('../desktop/theme-schema.mjs');const source=await readFile(join(root,'src/ThemeStudio.jsx'),'utf8'),presets=Function('appearanceDefaults','return '+/const presets=(.*);\r?\n/.exec(source)[1])(appearanceDefaults);for(const name of process.env.AMBER_QA_PRODUCT?[process.env.AMBER_QA_PRODUCT]:['AMBER','AmberE'])await run(name,presets)})().catch(e=>{console.error(e);process.exitCode=1});
