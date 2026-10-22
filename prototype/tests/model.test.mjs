import test from 'node:test';
import assert from 'node:assert/strict';
import { initialInstances, resolveInstall, planMigration, migrationItems, makeManifest, parseManifest } from '../src/model.js';
test('dependency resolution re-enables a disabled dependency without duplicates',()=>{
 const instance=structuredClone(initialInstances[0]); instance.mods=instance.mods.map(m=>({...m,enabled:m.id!=='sodium'&&m.id!=='iris'}));
 const result=resolveInstall(['iris'],instance); assert.deepEqual(result.errors,[]); assert.deepEqual(result.items.map(m=>m.id),['sodium','iris']);
});
test('missing transitive dependency blocks migration of its consumer',()=>{
 const catalog=[{id:'a',source:'Modrinth',games:['1'],loaders:['Fabric'],dependencies:['missing']}];
 const rows=planMigration([{id:'a',source:'Modrinth',enabled:true}],{game:'1',loader:'Fabric'},catalog);
 assert.equal(rows[0].status,'skipped'); assert.match(rows[0].reason,/missing/); assert.deepEqual(migrationItems(rows),[]);
});
test('migration preserves disabled state, skips incompatible projects and never mutates source',()=>{
 const source=structuredClone(initialInstances[0]); const before=JSON.stringify(source);
 const rows=planMigration(source.mods,{game:'1.20.1',loader:'Fabric'});
 assert.equal(rows.filter(r=>r.status==='matched').length,3);assert.equal(rows.filter(r=>r.status==='skipped').length,2);assert.equal(JSON.stringify(source),before);
 const same=planMigration(source.mods,{game:'1.21.1',loader:'Fabric'});assert.equal(migrationItems(same).find(m=>m.id==='modmenu').enabled,false);
});
test('different source with identical project id is not silently substituted',()=>{
 const row=planMigration([{id:'sodium',name:'Sodium',source:'CurseForge'}],{game:'1.21.1',loader:'Fabric'})[0];assert.equal(row.status,'skipped');
});
test('manifest round trip preserves source ids and disabled state',()=>{
 const manifest=makeManifest(initialInstances[0]);const restored=parseManifest(JSON.stringify(manifest));assert.deepEqual(restored.mods,manifest.mods);
 assert.throws(()=>parseManifest(JSON.stringify({...manifest,mods:[manifest.mods[0],manifest.mods[0]]})),/重复/);
 assert.throws(()=>parseManifest('{"mods":[]}'),/格式/);
});
test('enabled consumer forces shared dependency enabled regardless of source ordering',()=>{
 const source=structuredClone(initialInstances[0]); source.mods.find(m=>m.id==='sodium').enabled=false;source.mods.reverse();
 const items=migrationItems(planMigration(source.mods,{game:'1.21.1',loader:'Fabric'}));assert.equal(items.find(m=>m.id==='sodium').enabled,true);
});
