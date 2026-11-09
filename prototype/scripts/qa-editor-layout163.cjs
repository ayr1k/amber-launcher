// SPDX-License-Identifier: MPL-2.0
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'../../tmp/qa/node_modules/playwright');
const fs=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),data=await fs.mkdtemp(join(tmpdir(),'amber163-ui-')),library=join(data,'library'),id='a1111111-1111-4111-8111-111111111111',dir=join(library,'instances',id),out=join(root,'review163');
 await fs.mkdir(join(dir,'config'),{recursive:true});await fs.mkdir(join(dir,'scripts'));await fs.mkdir(out,{recursive:true});
 await fs.writeFile(join(dir,'instance.json'),JSON.stringify({schema:1,id,name:'Synthetic editor',game:'1.21.1',loader:'vanilla',status:'installed',createdAt:new Date().toISOString()}));await fs.writeFile(join(dir,'version.json'),JSON.stringify({id:'1.21.1'}));await fs.writeFile(join(data,'storage.json'),JSON.stringify({schema:1,path:library,onboarded:true}));
 const target=join(dir,'config','same.txt');await fs.writeFile(target,'\uFEFF原始\r\n第二行\r\n');await fs.writeFile(join(dir,'scripts','same.txt'),'other\n');await fs.writeFile(join(dir,'config','mixed.txt'),'a\r\nb\n');
 for(let i=0;i<100;i++)await fs.writeFile(join(dir,'config',`stress-${String(i).padStart(3,'0')}.txt`),'synthetic');
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[root,'--qa-ui','--qa-visible','--disable-gpu'],env});const results=[],errors=[];
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),data);
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(page);page.setDefaultTimeout(12000);await page.waitForFunction(()=>!!window.amberDesktop);assert.equal(resolve((await page.evaluate(()=>window.amberDesktop.storageInfo())).path),library);page.on('pageerror',e=>errors.push(e.message));let approve=true;page.on('dialog',d=>(approve?d.accept():d.dismiss()).catch(()=>{}));
  async function open(language='en-US',theme='light',width=1440,height=960){await page.evaluate(async({language,theme})=>window.amberDesktop.saveSettings({...await window.amberDesktop.settings(),language,theme,uiStyle:theme==='dark'?'rounded':'square',motion:theme!=='dark'}),{language,theme});await page.emulateMedia({reducedMotion:theme==='dark'?'reduce':'no-preference'});await page.reload();await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).setSize(...size),[width,height]);await page.getByRole('button',{name:language==='en-US'?'Tools':'实用工具',exact:true}).first().click();await page.getByRole('button',{name:language==='en-US'?'File editor':'文件编辑器',exact:true}).click();}
  const content=()=>page.locator('.edit-code .cm-content');
  async function edit(text){await content().click();await page.keyboard.press('Control+A');await page.keyboard.insertText(text);}
  async function save(){await page.getByRole('button',{name:'Save',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.edit-status').textContent.includes('Saving'));}
  await page.evaluate(async({id})=>{const a=window.amberDesktop,d=await a.editorRead(id,'config/same.txt');await a.editorSave(id,{...d,text:'saved fixture\n'.repeat(200)});},{id});
  const baseline=process.argv.includes('--baseline');
  for(const [language,theme,width,height] of [['en-US','light',1440,960],['zh-CN','dark',1600,1000],['en-US','dark',1024,768],['zh-CN','light',800,900]]){
   if(process.argv.includes('--narrow')&&width!==800)continue;
   for(const zoom of baseline?[1]:process.argv.includes('--narrow')?[1.25]:[1,1.25]){
    await open(language,theme,width,height);
    await app.evaluate(({BrowserWindow},zoom)=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/')).webContents.setZoomFactor(zoom),zoom);
    await page.locator('.edit-file[title="config/same.txt"]').click();await page.locator('.cm-content[aria-label="config/same.txt"]').waitFor();
    for(const mode of baseline?['disk']:['disk','conflict','backup']){
     const zh=language==='zh-CN';
     if(mode==='conflict'){
      await edit('UNSAVED CONFLICT BUFFER');await fs.writeFile(target,`external fixture ${language}-${width}-${zoom}\n`);
      await page.getByRole('button',{name:zh?'保存':'Save',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.edit-status').textContent.includes('EDITOR_CONFLICT'));
     }
     if(mode==='backup'){await page.getByRole('button',{name:zh?'历史备份':'Backups',exact:true}).click();await page.locator('.edit-history button').first().click();}
     else await page.getByRole('button',{name:zh?'比较磁盘 / 重载':'Compare disk / reload',exact:true}).click();
     const panel=page.locator('.edit-comparison163');await panel.waitFor();await page.waitForTimeout(450);
     const geometry=await page.locator('.editor-studio').evaluate(el=>{
      const rect=s=>{const r=el.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width}};
      return {viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},layout:rect('.edit-layout'),footer:rect('.edit-main footer'),code:rect('.edit-code'),toolbar:rect('.edit-toolbar'),panel:rect('.edit-comparison163'),horizontalOverflow:el.scrollWidth>el.clientWidth+2};
     });
     const native=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().startsWith('amber://app/'));return {bounds:w.getBounds(),contentBounds:w.getContentBounds(),zoom:w.webContents.getZoomFactor()}});assert.equal(native.zoom,zoom);
     async function hit(selector){const item=page.locator(selector);await item.scrollIntoViewIfNeeded();return item.evaluate(el=>{const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,at=document.elementFromPoint(x,y);return {hit:!!at&&(at===el||el.contains(at)),target:at?.className||at?.tagName,x,y,visible:y>=0&&y<innerHeight}})}
     const heading=await hit('.edit-comparison163 h3'),summary=await hit('.edit-comparison163 > p:first-of-type'),action=await hit('.edit-compare-actions163 button:first-child');
     const row={language,theme,requested:{width,height},native,mode,geometry,footerOverflow:geometry.footer.bottom-geometry.layout.bottom,overlap:geometry.footer.bottom-geometry.panel.top,heading,summary,action};results.push(row);
     await fs.writeFile(join(out,'layout-in-progress.json'),JSON.stringify(results,null,2));await page.screenshot({path:join(out,'layout-current.png')});
     if(!baseline){assert.ok(row.footerOverflow<=1,JSON.stringify(row));assert.ok(row.overlap<=-15,JSON.stringify(row));assert.ok(geometry.code.height>=159);assert.ok(geometry.layout.height<=Math.max(geometry.viewport.height,800),JSON.stringify(row));assert.equal(geometry.horizontalOverflow,false);assert.ok(heading.hit&&heading.visible);assert.ok(summary.hit&&summary.visible);assert.ok(action.hit&&action.visible);}
     await page.screenshot({path:join(out,(baseline?'baseline':'fixed')+'-layout-'+language+'-'+width+'-'+zoom+'-'+mode+'.png')});
     await page.getByRole('button',{name:zh?'取消':'Cancel',exact:true}).click();
    }
    await page.getByRole('button',{name:(language==='zh-CN'?'关闭 ':'Close ')+'config/same.txt',exact:true}).click();
   }
  }
  if(baseline){assert.ok(results.find(x=>x.requested.width===1024).overlap>40);assert.ok(results.find(x=>x.requested.width===800).overlap>70);}
  assert.deepEqual(errors,[]);await fs.writeFile(join(out,baseline?'layout-baseline-review.json':'layout-fixed-review.json'),JSON.stringify({baseline,data,library,isolated:true,results,errors},null,2));console.log(JSON.stringify(results.map(x=>({requested:x.requested,native:x.native,mode:x.mode,viewport:x.geometry.viewport,footerOverflow:x.footerOverflow,overlap:x.overlap,headingHit:x.heading.hit,actionHit:x.action.hit}))));
 }finally{await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.destroy()}).catch(()=>{});await app.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
