// SPDX-License-Identifier: MPL-2.0
// Exercises only a fresh synthetic Java path; never an installed game or Java preference.
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {GraphicsPreferences,windowsGraphicsRegistry,graphicsAdapters,supportsGraphics} from '../desktop/graphics.mjs';
if(!supportsGraphics())throw Error('This integration check requires Windows 10 2004 or newer.');
const root=await mkdtemp(join(tmpdir(),'amber-gpu-integration-')),path=join(root,'Synthetic Java & Unicode 测试','bin','java.exe');
const manager=new GraphicsPreferences(root);assert.equal(await windowsGraphicsRegistry.read(path),null);
try{
 assert.equal((await manager.apply(path,'high-performance')).state,'applied');assert.equal(await windowsGraphicsRegistry.read(path),'GpuPreference=2;');
 await manager.apply(path,'power-saving');assert.equal(await windowsGraphicsRegistry.read(path),'GpuPreference=1;');
 await manager.restoreAll();assert.equal(await windowsGraphicsRegistry.read(path),null);
 console.log('WINDOWS_GRAPHICS_APPLY_RESTORE_OK; adapters detected:',(await graphicsAdapters()).length);
}finally{await manager.restoreAll();assert.equal(await windowsGraphicsRegistry.read(path),null);await rm(root,{recursive:true,force:true});}
