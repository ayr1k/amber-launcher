// SPDX-License-Identifier: MPL-2.0
// Native identity tests target only a freshly spawned, windowless Electron fixture.
const {spawn,execFile}=require('node:child_process'),{promisify}=require('node:util'),{mkdtemp,mkdir,readFile,writeFile}=require('node:fs/promises'),{tmpdir}=require('node:os'),{join,resolve}=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
(async()=>{
 const root=resolve(__dirname,'..'),out=join(root,'.qa','memory-identity160');await mkdir(out,{recursive:true});const run=promisify(execFile),powershell=join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe');
 const source=await readFile(join(root,'desktop/memory-native160.cs'),'utf8'),tests=(await readFile(join(root,'tests/memory-native160-tests.cs'),'utf8')).replace('using System;','');
 const script=`$ErrorActionPreference='Stop'\nAdd-Type -TypeDefinition @'\n${source}\n${tests}\n'@\n[MemoryNativeTests160]::Run()`;
 const fake=await run(powershell,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:30000});assert.match(fake.stdout,/MEMORY_NATIVE160_OK/);
 const data=await mkdtemp(join(tmpdir(),'amber160-memory-')),fixture=join(data,'fixture.cjs');await writeFile(fixture,`const {app}=require('electron');app.setPath('userData',process.env.AMBER_IDENTITY_DATA);app.disableHardwareAcceleration();app.whenReady().then(()=>console.log('IDENTITY160 '+JSON.stringify({pid:process.pid,creationTime:process.getCreationTime()})));setInterval(()=>{},1000);`);
 const env={...process.env,AMBER_IDENTITY_DATA:data};delete env.ELECTRON_RUN_AS_NODE;const child=spawn(join(root,'node_modules/electron/dist/electron.exe'),[fixture],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
 try{
  const identity=await new Promise((ok,fail)=>{let text='';const timer=setTimeout(()=>fail(Error('fixture timeout')),15000);child.on('error',fail);child.stdout.on('data',b=>{text+=b;const found=/IDENTITY160 (\{[^\n]+\})/.exec(text);if(found){clearTimeout(timer);ok(JSON.parse(found[1]));}});});assert.equal(identity.pid,child.pid);assert.ok(identity.creationTime>0);
  const {trimWorkingSets160}=await import(pathToFileURL(join(root,'desktop/memory160.mjs')));
  const mismatched=await trimWorkingSets160([{...identity,creationTime:identity.creationTime+1}]);assert.equal(mismatched[0].status,'identity-mismatch');assert.equal(mismatched[0].ok,false);
  const own=await trimWorkingSets160([identity]);assert.equal(own[0].status,'trimmed');assert.equal(own[0].ok,true);
  await writeFile(join(out,'result.json'),JSON.stringify({fake:fake.stdout.trim(),identity,mismatched,own},null,2));console.log(fake.stdout.trim());console.log('NATIVE_ELECTRON_IDENTITY160_OK: mismatched timestamp skipped; exact same fixture identity trimmed');
 }finally{child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
