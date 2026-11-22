// SPDX-License-Identifier: MPL-2.0
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {copyFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {createRequire} from 'node:module';

// Production packages exclude node_modules. Use the standalone distribution
// from the locked dependency in every desktop packaging entry point.
export async function stageJavaVerifier(desktop,{windows=process.platform==='win32'}={}){
 const pkg=resolve(dirname(createRequire(import.meta.url).resolve('openpgp')),'../..');
 await copyFile(join(pkg,'dist/openpgp.min.mjs'),join(desktop,'vendor/openpgp.mjs'));
 await copyFile(join(pkg,'LICENSE'),join(desktop,'vendor/LICENSE-openpgp'));
 if(windows){
  // Compile at build time. The client needs only the Windows .NET Framework runtime.
  const native=process.platform==='win32';
  const compiler=native?join(process.env.SystemRoot,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'):'mcs';
  const source=fileURLToPath(new URL('../desktop/SystemJavaVerifier.cs',import.meta.url));
  const option=native?'/':'-';
  await promisify(execFile)(compiler,['nologo','optimize+','platform:anycpu','target:exe','r:System.Web.Extensions.dll',
   'out:'+join(desktop,'bin','system-java-verifier.exe')].map(arg=>option+arg).concat(source),{windowsHide:true});
 }
}
