// SPDX-License-Identifier: MPL-2.0
// Keep the heavy application graph behind the first painted loading window.
import {app,protocol} from 'electron';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PRODUCT_NAME} from './edition.mjs';
import {startup,showStartup} from './startup148.mjs';
const base=dirname(fileURLToPath(import.meta.url));
app.setPath('userData',join(app.getPath('appData'),PRODUCT_NAME));
if(process.argv.includes('--smoke-test')||!app.isPackaged&&process.argv.includes('--qa-ui'))app.setPath('userData',process.env.AMBER_SMOKE_ROOT?resolve(process.env.AMBER_SMOKE_ROOT):resolve(base,'../.smoke-data'));
app.setName(PRODUCT_NAME);
if(!app.requestSingleInstanceLock())app.exit(0);
else {
  protocol.registerSchemesAsPrivileged([{scheme:'amber',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
  app.on('second-instance',()=>startup.focus());
  app.whenReady().then(async()=>{await showStartup();await import('./main.mjs');}).catch(error=>startup.fail(error));
}
