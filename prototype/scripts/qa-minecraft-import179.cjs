// SPDX-License-Identifier: MPL-2.0
// Start a disposable renderer and drive both entry points. Only the native
// folder picker and Mojang responses are substituted. No game is launched.
const { _electron } = require(process.env.AMBER_PLAYWRIGHT);
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, readFile, writeFile } = require('node:fs/promises');
const { join, resolve, parse } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');

async function check(sourceParent, dataParent) {
 const root = resolve(__dirname, '..');
 const userData = await mkdtemp(join(dataParent, 'amber179-ui-'));
 const source = await mkdtemp(join(sourceParent, 'amber179-source-'));
 const localId = '中文 FPScraft X', gameDir = join(source, 'versions', localId);
 const library = join(userData, 'data');
 await mkdir(gameDir, {recursive:true});
 await mkdir(library);
 await writeFile(join(userData, 'storage.json'), JSON.stringify({schema:1,path:library,onboarded:true}));
 await writeFile(join(gameDir, localId+'.json'), JSON.stringify({id:localId,clientVersion:'1.21.4',mainClass:'net.minecraft.client.main.Main',libraries:[]}));
 await writeFile(join(gameDir, 'options.txt'), 'fixture content');
 const client='fixture', index='{"objects":{}}';
 const hash=s=>createHash('sha1').update(s).digest('hex');
 const meta=JSON.stringify({id:'1.21.4',mainClass:'net.minecraft.client.main.Main',libraries:[],arguments:{game:[]},
  javaVersion:{majorVersion:21},assetIndex:{id:'qa',url:'https://piston-meta.mojang.com/index.json',sha1:hash(index),size:index.length},
  downloads:{client:{url:'https://piston-data.mojang.com/client.jar',sha1:hash(client),size:client.length}}});
 const env={...process.env,AMBER_SMOKE_ROOT:userData};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--disable-gpu'],env});
 try {
  assert.equal(await app.evaluate(({app})=>app.getPath('userData')),userData);
  let page;
  for(let attempt=0;attempt<200&&!page;attempt++){page=app.windows().find(p=>p.url()==='amber://app/');if(!page)await new Promise(r=>setTimeout(r,100));}
  assert.ok(page,'main window');await page.waitForFunction(()=>!!window.amberDesktop);
  page.setDefaultTimeout(20000);
  await page.waitForLoadState('load');
  await page.locator('#root button').first().waitFor({state:'visible'});
  await page.evaluate(async()=>{const api=window.amberDesktop;await api.saveSettings({...await api.settings(),language:'en-US'})});
  await page.reload();
  await app.evaluate(async({dialog},f)=>{
   dialog.showOpenDialog=async()=>({canceled:false,filePaths:[f.source]});
   const vm=process.getBuiltinModule('node:vm');
   const {VanillaLauncher}=await vm.runInThisContext('import('+JSON.stringify(f.module)+')',{importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER});
   VanillaLauncher.prototype.versions=async function(){
    this.catalog=[{id:'1.21.4',type:'release',url:'https://piston-meta.mojang.com/base.json',sha1:f.sha}];
    this.fetcher=async url=>{if(url.endsWith('/base.json'))return new Response(f.meta);if(url.endsWith('/index.json'))return new Response(f.index);if(url.endsWith('/client.jar'))return new Response(f.client);throw Error('Unexpected fixture URL');};
    return {versions:this.catalog};
   };
  },{module:pathToFileURL(join(root,'desktop/launcher.mjs')).href,source,meta,sha:hash(meta),index,client});
  const button=name=>page.getByRole('button',{name,exact:true});
  await button('Instances').first().click();
  await button('Add / create library').click();
  const form=page.getByRole('dialog',{name:'Add instance library'});
  await form.getByRole('textbox').fill('External QA');
  await button('Add existing library…').click();
  await form.getByText(localId,{exact:false}).waitFor();
  await form.getByRole('checkbox').check();
  await form.getByRole('button',{name:'Add',exact:true}).click();
  const nav=page.locator('.library170-nav nav');
  await nav.getByRole('button',{name:/External QA/}).waitFor();
  await nav.getByRole('button',{name:/^AMBER/}).click();
  await button('Import existing .minecraft').click();
  const copy=page.locator('.minecraft-import134');
  await copy.getByRole('button',{name:/\.minecraft/}).click();
  await copy.locator('.import-summary151').getByText(/Minecraft 1\.21\.4/).waitFor();
  assert.ok((await copy.locator('.import-summary151').innerText()).includes(gameDir));
  await copy.locator('label.check131').last().locator('input').check();
  await copy.locator('.dialog-actions .button').last().click();
  await copy.waitFor({state:'hidden'});
  const item=(await page.evaluate(()=>window.amberDesktop.listInstances())).find(i=>i.name===localId);
  assert.equal(await readFile(join(library,'instances',item.id,'options.txt'),'utf8'),'fixture content');
  assert.equal(await readFile(join(gameDir,'options.txt'),'utf8'),'fixture content');
  console.log('Passed renderer, preload, IPC, registration and copy',parse(source).root,'to',parse(library).root);
 } finally {await app.close();}
}
(async()=>{
 const first=tmpdir(),second=process.env.AMBER_TEST_SECOND_VOLUME;
 await check(first,first);
 if(second){assert.notEqual(parse(first).root.toLowerCase(),parse(second).root.toLowerCase());await check(first,second);await check(second,first);}
})().catch(e=>{console.error(e);process.exitCode=1});
