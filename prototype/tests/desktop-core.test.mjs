// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { LauncherCore, MANIFEST_URL } from '../desktop/core.mjs';

const metadata=JSON.stringify({id:'1.21.1',javaVersion:{majorVersion:21}});
const checksum=createHash('sha1').update(metadata).digest('hex');
const manifest={latest:{release:'1.21.1'},versions:[{id:'1.21.1',type:'release',url:'https://piston-meta.mojang.com/v1/packages/test.json',sha1:checksum}]};
async function fixture(t, fetcher) {
  const root=await mkdtemp(join(tmpdir(),'amber-core-'));
  t.after(()=>{if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw Error('Unsafe cleanup');return rm(root,{recursive:true,force:true});});
  return new LauncherCore(root,{fetcher:fetcher|| (async url=>new Response(url===MANIFEST_URL?JSON.stringify(manifest):metadata))});
}
test('real instance directories are isolated, metadata is verified, and state survives a new core',async t=>{
  const core=await fixture(t); await core.versions();
  const first=await core.createInstance({name:'../../a name is not a path',game:'1.21.1'});
  const second=await core.createInstance({name:first.name,game:'1.21.1',icon:'anvil'});
  assert.equal(first.icon,'grass');assert.equal(second.icon,'anvil');
  await assert.rejects(core.createInstance({name:'bad icon',game:'1.21.1',icon:'../../file'}),/图标/);
  assert.notEqual(first.id,second.id);
  const path=await core.instancePath(first.id);
  assert.deepEqual((await readdir(path)).sort(),['config','instance.json','mods','resourcepacks','saves','shaderpacks','version.json']);
  assert.equal(await readFile(join(path,'version.json'),'utf8'),metadata);
  assert.equal((await new LauncherCore(core.root).listInstances()).length,2);
  assert.equal(first.status,'metadata-ready');
});
test('checksum failures never commit an instance',async t=>{
  const core=await fixture(t,async url=>new Response(url===MANIFEST_URL?JSON.stringify(manifest):'tampered'));
  await core.versions(); await assert.rejects(core.createInstance({name:'test',game:'1.21.1'}),/校验失败/);
  assert.equal((await core.listInstances()).length,0);
});
test('only allowlisted official metadata can be fetched',async t=>{
  const altered=structuredClone(manifest);altered.versions[0].url='https://example.com/metadata';
  const core=await fixture(t,async()=>new Response(JSON.stringify(altered)));
  await assert.rejects(core.versions(),/来源/);
});
test('reject arbitrary version and directory traversal through IPC inputs',async t=>{
  const core=await fixture(t); await core.versions();
  await assert.rejects(core.createInstance({name:'test',game:'../../bad'}),/官方目录/);
  await assert.rejects(core.createInstance({name:' ',game:'1.21.1'}),/名称/);
  await assert.rejects(core.instancePath('../../outside'),/无效/);
});
test('catalog HTTP failures are explicit and do not turn into demo data',async t=>{
  const core=await fixture(t,async()=>new Response('',{status:503}));
  await assert.rejects(core.versions(),/503/); assert.equal(core.catalog,null);
});
