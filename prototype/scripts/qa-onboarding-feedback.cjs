// SPDX-License-Identifier: MPL-2.0
// Optional desktop acceptance runner. Supply AMBER_PLAYWRIGHT when Playwright is
// provided by an external QA runtime; it is not a shipped application dependency.
const {_electron:electron}=require(process.env.AMBER_PLAYWRIGHT||'playwright');
const {mkdtemp}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {join,resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),stage=resolve(process.env.AMBER_QA_STAGE||root);
 const data=await mkdtemp(join(tmpdir(),'amber-onboarding-account-'));
 const env={...process.env,AMBER_SMOKE_ROOT:data};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({executablePath:join(root,'node_modules/electron/dist/electron.exe'),args:[stage,'--qa-ui','--qa-visible'],env});
 try{
  assert.equal(resolve(await app.evaluate(({app})=>app.getPath('userData'))),resolve(data));
  let page;for(let i=0;i<400;i++){page=app.windows().find(p=>p.url().startsWith('amber://app/'));if(page)break;await new Promise(r=>setTimeout(r,50));}if(!page)throw Error('Main window did not load');page.setDefaultTimeout(15000);
  await page.locator('.onboarding').waitFor();
  await page.evaluate(async()=>{const value=await window.amberDesktop.settings();await window.amberDesktop.saveSettings({...value,language:'en-US'});});
  await page.reload();await page.locator('.onboarding').waitFor();
  await page.locator('.welcome-actions .button').click();
  // The first text action is sign-in (AMBER) / other accounts (AmberE).
  await page.locator('.welcome-actions .text-button').first().click();
  await page.locator('.onboarding-resume').waitFor();
  assert.equal(await page.evaluate(async()=>(await window.amberDesktop.storageInfo()).onboarded),false);
  assert.equal(await page.locator('.desktop-app').getAttribute('data-page'),'accounts');
  await page.reload();await page.locator('.onboarding-resume').waitFor();
  assert.equal(await page.locator('.onboarding').count(),0);
  await page.getByRole('button',{name:'Continue to create or import a game',exact:true}).click();
  await page.getByRole('heading',{name:'Choose how to get started',exact:true}).waitFor();
  await page.getByRole('button',{name:'I already play Minecraft',exact:true}).click();
  await page.locator('.existing-game-import').waitFor();
  assert.equal(await page.evaluate(async()=>(await window.amberDesktop.storageInfo()).onboarded),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem('amber.onboarding.resume')),null);
  await page.getByRole('button',{name:'Import later',exact:true}).click();
  await page.reload();assert.equal(await page.locator('.onboarding-resume').count(),0);
  assert.equal(await page.locator('.onboarding').count(),0);
  console.log('ACCOUNT_ONBOARDING_RESUME_OK',stage);
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
