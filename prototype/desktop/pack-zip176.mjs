// SPDX-License-Identifier: MPL-2.0
import {createReadStream, createWriteStream} from 'node:fs';
import {lstat, open, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {Transform, Writable, addAbortSignal} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {crc32} from 'node:zlib';
import yauzl from './vendor/yauzl176/index.cjs';
import {safePath} from './download.mjs';

export const PACK_LIMITS = Object.freeze({archive: 5_000_000_000, expanded: 20_000_000_000,
  file: 5_000_000_000, entries: 20_000, manifest: 8_000_000, directory: 32_000_000});
const invalid = () => Error('Invalid or unsupported ZIP structure / 压缩包损坏或格式不支持');
const checksum = () => Error('Archive checksum mismatch / 压缩包内容损坏，校验失败');

export function checkPackSize(size) {
  if (!Number.isSafeInteger(size) || size < 0 || size > PACK_LIMITS.archive) {
    throw Error('Archive exceeds 5 GB (5,000,000,000 bytes) / 压缩包超过 5 GB');
  }
}

export async function packFileInfo(path) {
  const stat = await lstat(path);
  if (!stat.isFile()) throw Error('Choose an ordinary pack file / 请选择普通整合包文件');
  checkPackSize(stat.size);
  return stat;
}

// Copy into a private file with a hash of the exact bytes copied. An aborted or
// failed copy never leaves a candidate for retry or publication.
export async function snapshotPack(source, target, {signal, expected} = {}) {
  const original = await packFileInfo(source);
  const h = createHash('sha256');
  const sameFile = stat => stat.isFile() && stat.size === original.size && stat.ino === original.ino &&
    stat.dev === original.dev && stat.mtimeMs === original.mtimeMs && stat.ctimeMs === original.ctimeMs;
  signal?.throwIfAborted();
  let size = 0;
  const input = await open(source, 'r');
  let destination;
  try {
    if (!sameFile(await input.stat())) throw checksum();
    destination = await open(target, 'wx');
    await pipeline(input.createReadStream({autoClose: false}), new Transform({transform(chunk, _, done) {
      size += chunk.length;
      if (size > original.size) return done(checksum());
      h.update(chunk);
      done(null, chunk);
    }}), destination.createWriteStream(), {signal});
    const hash = h.digest('hex');
    const after = await packFileInfo(source);
    if (size !== original.size || !sameFile(after) || expected && hash !== expected) throw checksum();
    return {hash, size};
  } catch (error) {
    if (destination) {
      await destination.close();
      await rm(target, {force: true});
    }
    throw error;
  } finally {
    await input.close();
    await destination?.close();
  }
}

export function archiveKey(path) {
  if (typeof path !== 'string' || Buffer.byteLength(path) > 2048 || /[\x00-\x1f<>"|?*\ufffd]/u.test(path) ||
      path.split('/').some(part => !part || part === '.' || Buffer.byteLength(part) > 255 || /^(?:conin\$|conout\$|(?:com|lpt)[¹²³])(?:\.|$)/i.test(part))) throw invalid();
  safePath('pack-check', path);
  return path.normalize('NFC').toLowerCase();
}

export function checkPackPaths(entries) {
  const paths = new Map();
  for (const {name, directory} of entries) {
    const key = archiveKey(name);
    if (paths.has(key)) throw Error('Duplicate archive path / 压缩包包含重复路径：' + name);
    paths.set(key, directory);
  }
  for (const key of paths.keys()) for (let end = key.indexOf('/'); end !== -1; end = key.indexOf('/', end + 1)) {
    if (paths.get(key.slice(0, end)) === false) throw invalid();
  }
}

export async function withPackZip(source, action, {signal, nested = false} = {}) {
  signal?.throwIfAborted();
  const options = {lazyEntries: true, autoClose: false, strictFileNames: true, decodeStrings: nested};
  const file = typeof source === 'string';
  if (file) await packFileInfo(source); else checkPackSize(source.byteLength);
  let zip;
  try {
    zip = file ? await yauzl.openPromise(source, options) : await yauzl.fromBufferPromise(Buffer.from(source.buffer, source.byteOffset, source.byteLength), options);
  } catch (cause) {
    throw Object.assign(invalid(), {cause});
  }
  try {
    const centralStart = zip.readEntryCursor;
    if (!zip.entryCount || zip.entryCount > PACK_LIMITS.entries) throw Error('Archive must have 1–20,000 entries / 压缩包必须包含 1–20,000 项');
    if (zip.centralDirectoryEnd - centralStart > PACK_LIMITS.directory) throw Error('ZIP directory is too large / 压缩包目录超过 32 MB');
    const rows = [], ranges = [];
    let total = 0;
    for await (const entry of zip.eachEntry()) {
      signal?.throwIfAborted();
      if (entry.diskNumberStart !== 0 || zip.readEntryCursor > zip.centralDirectoryEnd) throw invalid();
      const raw = entry.fileNameRaw;
      const name = nested ? entry.fileName : raw.toString('utf8');
      // JAR files are inspected only for recognized metadata. Their other
      // members are never inflated or written by the launcher.
      if (nested && !nested.has(name)) continue;
      const directory = name.endsWith('/');
      const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
      const flags = entry.generalPurposeBitFlag;
      if (flags & (1 | 0x40 | 0x2000) || ![0, 8].includes(entry.compressionMethod) ||
          mode && mode !== (directory ? 0x4000 : 0x8000) || entry.externalFileAttributes & 0x400 ||
          directory && (entry.uncompressedSize !== 0 || entry.compressedSize > 64)) throw invalid();
      const size = entry.uncompressedSize;
      total += size;
      if (size > PACK_LIMITS.file || total > PACK_LIMITS.expanded) throw Error('Archive exceeds 20 GB expanded or 5 GB per file / 解压后超过 20 GB 或单文件超过 5 GB');
      const header = await zip.readLocalFileHeaderPromise(entry);
      const end = header.fileDataStart + entry.compressedSize;
      if (!header.fileName.equals(raw) || header.generalPurposeBitFlag !== flags ||
          header.compressionMethod !== entry.compressionMethod || end > centralStart ||
          !(flags & 8) && (header.crc32 !== entry.crc32 ||
            header.compressedSize !== entry.compressedSize && header.compressedSize !== 0xffffffff ||
            header.uncompressedSize !== size && header.uncompressedSize !== 0xffffffff)) throw invalid();
      ranges.push([entry.relativeOffsetOfLocalHeader, end]);
      rows.push({name: directory ? name.slice(0, -1) : name, directory, size,
        start: header.fileDataStart, packed: entry.compressedSize,
        deflated: entry.compressionMethod === 8, crc: entry.crc32});
    }
    if (zip.readEntryCursor !== zip.centralDirectoryEnd) throw invalid();
    checkPackPaths(rows);
    ranges.sort((a, b) => a[0] - b[0]);
    if (ranges.some(([start], i) => i && start < ranges[i - 1][1])) throw invalid();
    return await action(zip, rows);
  } finally {
    if (file) await new Promise(resolve => { zip.once('close', resolve); zip.close(); });
    else zip.close();
  }
}

export async function readPackEntry(zip, row, {signal, target, bufferLimit} = {}) {
  signal?.throwIfAborted();
  if (bufferLimit !== undefined && row.size > bufferLimit) throw Error('Pack metadata is too large / 整合包元数据过大');
  const stream = await new Promise((resolve, reject) => {
    zip.openReadStreamLowLevel(row.start, row.packed, 0, row.packed, row.deflated, row.size,
      (error, stream) => error ? reject(error) : resolve(stream));
  });
  const hash = createHash('sha1');
  let crc = 0, size = 0;
  const chunks = [];
  const measure = chunk => {
    size += chunk.length;
    if (size > row.size) throw checksum();
    crc = crc32(chunk, crc);
    hash.update(chunk);
    if (bufferLimit !== undefined) chunks.push(chunk);
  };
  if (target) {
    await pipeline(stream, new Transform({transform(chunk, _, done) {
      try { measure(chunk); done(null, chunk); } catch (error) { done(error); }
    }}), createWriteStream(target, {flags: 'wx'}), {signal});
  } else {
    await pipeline(stream, new Writable({write(chunk, _, done) {
      try { measure(chunk); done(); } catch (error) { done(error); }
    }}), {signal});
  }
  if (size !== row.size || crc !== row.crc) throw checksum();
  return {hash: hash.digest('hex'), bytes: bufferLimit === undefined ? undefined : Buffer.concat(chunks, size)};
}

export async function verifyPackHash(path, expected, signal) {
  const hash = createHash('sha256');
  const stream = createReadStream(path);
  for await (const chunk of signal ? addAbortSignal(signal, stream) : stream) hash.update(chunk);
  return hash.digest('hex') === expected;
}
