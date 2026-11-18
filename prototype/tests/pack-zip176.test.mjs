// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {lstat, mkdir, mkdtemp, readdir, rm, statfs, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkPackSize, PACK_LIMITS, snapshotPack, withPackZip} from '../desktop/pack-zip176.mjs';
import {checkPackFiles, readPackPlan} from '../desktop/pack-plan176.mjs';
import {requireSpace} from '../desktop/safe-copy.mjs';
import {beginTransaction, recoverInstance} from '../desktop/recovery.mjs';
const {zipSync} = createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
const zip = files => Buffer.from(zipSync(files));
const content = Buffer.from('synthetic bytes');

async function temp(t) {
  const root = await mkdtemp(join(tmpdir(), 'amber-zip176-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  return root;
}

test('archive maximum is an inclusive decimal 5 GB and expansion limits are separate', () => {
  assert.doesNotThrow(() => checkPackSize(5_000_000_000));
  assert.throws(() => checkPackSize(5_000_000_001), /exceeds 5 GB/);
  const rows = Array.from({length: 4}, (_, i) => ({relative: `config/${i}.bin`, size: 5_000_000_000}));
  assert.doesNotThrow(() => checkPackFiles(rows));
  assert.throws(() => checkPackFiles([...rows, {relative: 'config/extra.bin', size: 1}]), /exceeds/);
  assert.throws(() => checkPackFiles([{relative: 'config/large.bin', size: 5_000_000_001}]), /exceeds/);
  assert.equal(PACK_LIMITS.entries, 20_000);
});

test('preflight rejects central directory count, overlap, and Windows aliases before inflation', async () => {
  const original = zip({'config/a': content, 'config/b': content});
  const directory = original.indexOf(Buffer.from('504b0102', 'hex'));
  const end = original.length - 22;
  for (const corrupt of [
    b => b.writeUInt16LE(0, end + 8),
    b => b.writeUInt16LE(1, directory + 34),
    b => b.writeUInt16LE(1, end + 8) && b.writeUInt16LE(1, end + 10),
    b => b.writeUInt32LE(5, end + 12)
  ]) {
    const broken = Buffer.from(original);
    corrupt(broken);
    await assert.rejects(withPackZip(broken, () => assert.fail('unexpected inflation')));
  }
  for (const paths of [['config/x', 'config/x/y'], ['config/é', 'config/e\u0301'], ['config/CONIN$'], ['config/COM¹']]) {
    await assert.rejects(readPackPlan(zip(Object.fromEntries(paths.map(path => [path, content])))));
  }
});

test('local archive CRC covers ignored entries, and a manifest cannot expand into unbounded memory', async () => {
  const bytes = zip({'README.md': content, 'config/settings.json': content});
  bytes.writeUInt32LE(0, 14);
  bytes.writeUInt32LE(0, bytes.indexOf(Buffer.from('504b0102', 'hex')) + 16);
  await assert.rejects(readPackPlan(bytes), /checksum mismatch/);
  const oversized = zip({'modrinth.index.json': Buffer.alloc(PACK_LIMITS.manifest + 1)});
  await assert.rejects(readPackPlan(oversized), /metadata is too large/);
});

test('insufficient disk space is refused and cancelled copies leave no preview target', async t => {
  const root = await temp(t), disk = await statfs(root);
  await assert.rejects(requireSpace(root, disk.bavail * disk.bsize), /磁盘/);
  const source = join(root, 'original.zip'), target = join(root, 'staging.zip');
  await writeFile(source, zip({'config/settings.json': content}));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(snapshotPack(source, target, {signal: controller.signal}), {name: 'AbortError'});
  assert.deepEqual(await readdir(root), ['original.zip']);
});

test('oversized entry count stops before reading local entries', async () => {
  const many = zip(Object.fromEntries(Array.from({length: 20_001}, (_, i) => [`config/${i}`, Buffer.alloc(0)])));
  await assert.rejects(withPackZip(many, () => assert.fail('preflight should fail')), /20,000/);
});

test('pack rollback preserves independently created matching bytes when file identity differs', async t => {
  const root = await temp(t);
  await mkdir(join(root, 'config'));
  await writeFile(join(root, 'staged'), content);
  const stat = await lstat(join(root, 'staged'), {bigint: true});
  await beginTransaction(root, 'modpack.json', [{relative: 'config/owned.bin', size: content.length,
    hash: createHash('sha1').update(content).digest('hex'), owner: {dev: String(stat.dev), ino: String(stat.ino)}}]);
  await writeFile(join(root, 'config', 'owned.bin'), content);
  const recovery = await recoverInstance(root);
  assert.deepEqual(recovery.preserved, ['config/owned.bin']);
  assert.deepEqual(recovery.moved, []);
});
