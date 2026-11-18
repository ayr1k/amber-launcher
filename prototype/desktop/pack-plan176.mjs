// SPDX-License-Identifier: MPL-2.0
import {basename, join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {lstat, rm} from 'node:fs/promises';
import {packPath} from './modpacks.mjs';
import {resolveCursePack} from './curseforge-pack141.mjs';
import {carryCurseForgeApproval} from './curseforge-delivery176.mjs';
import {metadataNames, parseModMetadata} from './mod-import.mjs';
import {requireSpace} from './safe-copy.mjs';
import {ensureParents, safeURL} from './download.mjs';
import {archiveKey, checkPackPaths, PACK_LIMITS, readPackEntry, withPackZip} from './pack-zip176.mjs';

const contentDirs = new Set(['mods', 'config', 'resourcepacks', 'shaderpacks', 'saves', 'defaultconfigs', 'kubejs', 'scripts']);
const knownRoot = name => ['modrinth.index.json', 'manifest.json', 'backup.json', 'instance.json', 'servers.dat'].includes(name) ||
  contentDirs.has(name.split('/')[0]) || /^options[^/]*\.txt$/i.test(name);
const problem = (en, zh) => Error(`${en} / ${zh}`);

function wrapper(rows) {
  let prefix = '';
  for (let depth = 0; depth < 3; depth++) {
    const names = rows.map(row => row.name.slice(prefix.length));
    if (names.some(knownRoot)) break;
    const part = names[0]?.split('/')[0] + '/';
    if (names.some(name => !name.startsWith(part))) break;
    prefix += part;
  }
  return prefix;
}

export function checkPackFiles(files) {
  checkPackPaths(files.map(f => ({name: f.relative, directory: false})));
  if (files.length > PACK_LIMITS.entries || files.reduce((total, file) => total + file.size, 0) > PACK_LIMITS.expanded ||
      files.some(f => !Number.isSafeInteger(f.size) || f.size < 0 || f.size > PACK_LIMITS.file)) {
    throw problem('Pack exceeds extracted file limits', '整合包安装内容超过 20 GB、单文件超过 5 GB 或超过 20,000 项');
  }
}

function downloads(index, includeOptional, warnings) {
  if (index?.formatVersion !== 1 || index.game !== 'minecraft' || !index.dependencies?.minecraft ||
      !Array.isArray(index.files) || index.files.length > PACK_LIMITS.entries) throw problem('Unsupported MRPACK manifest', '不支持的 MRPACK 清单');
  const files = new Map(), paths = new Set();
  for (const f of index.files) {
    if (f?.env?.client === 'unsupported') continue;
    const relative = packPath('pack-check', f?.path);
    const key = archiveKey(relative);
    if (paths.has(key)) throw problem('Duplicate pack path', '整合包包含重复路径');
    paths.add(key);
    const optional = f.env?.client === 'optional';
    if (optional && !includeOptional) { warnings.push('已跳过可选客户端文件：' + relative); continue; }
    if (!/^[a-f0-9]{40}$/.test(f.hashes?.sha1) || !Number.isSafeInteger(f.fileSize) || f.fileSize < 1) {
      throw problem('Invalid pack file size or hash', '整合包文件缺少有效的大小或校验值');
    }
    const urls = [...new Set((Array.isArray(f.downloads) ? f.downloads.slice(0, 8) : []).flatMap(url => {
      try { return [safeURL(url)]; } catch { return []; }
    }))];
    if (!urls.length) throw problem('No trusted download URL for ' + relative, '没有可用的受信任下载地址：' + relative);
    files.set(key, {...carryCurseForgeApproval(f),relative, hash: f.hashes.sha1, size: f.fileSize, url: urls[0], urls,
      title: relative, optional, ...(f.versionId ? {versionId: f.versionId} : {})});
  }
  checkPackFiles([...files.values()]);
  return files;
}

async function metadata(zip, row, scratch, signal) {
  const target = join(scratch, randomUUID() + '.jar');
  await ensureParents(scratch, target);
  await requireSpace(scratch, row.size);
  try {
    const {hash} = await readPackEntry(zip, row, {signal, target});
    const info = await withPackZip(target, async (jar, entries) => {
      if (entries.reduce((n, entry) => n + entry.size, 0) > 3_000_000) throw Error('Mod metadata exceeds limit');
      const docs = Object.create(null);
      for (const entry of entries) docs[entry.name] = (await readPackEntry(jar, entry, {bufferLimit: 1_000_000, signal})).bytes;
      return parseModMetadata(docs);
    }, {nested: metadataNames, signal});
    return {hash, metadata: info};
  } catch (error) {
    signal?.throwIfAborted();
    if (error.code === 'ENOSPC') throw error;
    throw problem('Invalid mod archive: ' + row.name, '模组文件损坏或元数据无法读取：' + row.name);
  } finally {
    await rm(target, {force: true});
  }
}

export async function readPackPlan(source, {filename = 'pack.zip', scratch, provider, signal,
  includeOptional = true, inspectMods = true} = {}) {
  return withPackZip(source, async (zip, allRows) => {
    const rows = allRows.filter(row => !row.directory);
    if (!rows.length) throw problem('Empty archive', '压缩包为空');
    const prefix = wrapper(rows);
    const byName = new Map(rows.map(row => [row.name.slice(prefix.length), row]));
    if (byName.has('backup.json') || byName.has('instance.json')) return {kind: 'backup', files: [], warnings: []};
    const warnings = [], targets = new Map();
    let kind = 'zip', index, manifest, downloadFiles = new Map();
    const mr = byName.get('modrinth.index.json'), cf = byName.get('manifest.json');
    if (mr && cf) throw problem('Ambiguous pack manifest', '整合包清单不唯一');
    if (mr || cf) {
      const data = await readPackEntry(zip, mr || cf, {signal, bufferLimit: PACK_LIMITS.manifest});
      try { manifest = JSON.parse(data.bytes.toString('utf8')); }
      catch { throw problem('Invalid pack manifest', '整合包清单损坏'); }
      if (!manifest || typeof manifest !== 'object') throw problem('Invalid pack manifest', '整合包清单损坏');
      if (mr) {
        if (prefix) throw problem('MRPACK index must be at the root', 'MRPACK 清单必须位于压缩包根目录');
        index = manifest;
        kind = 'mrpack';
      } else {
        kind = 'curseforge';
        if (!provider) throw problem('CurseForge provider is unavailable', 'CurseForge 整合包需要可用的 CurseForge API');
        index = await resolveCursePack(manifest, provider, {signal});
      }
      downloadFiles = downloads(index, includeOptional, warnings);
      const overrides = kind === 'mrpack' ? ['overrides', 'client-overrides'] : [manifest.overrides || 'overrides'];
      for (const folder of overrides) {
        archiveKey(folder);
        for (const [name, row] of byName) {
          if (!name.startsWith(folder + '/')) continue;
          const relative = packPath('pack-check', name.slice(folder.length + 1)), key = archiveKey(relative);
          if (kind === 'curseforge' && downloadFiles.has(key)) throw problem('Pack override conflicts with a download', '整合包覆盖文件与下载文件冲突：' + relative);
          targets.set(key, {relative, row});
        }
      }
    } else {
      for (const [relative, row] of byName) {
        if (/^(readme|license|changelog|credits)(\.[^/]*)?$/i.test(relative) || relative === 'modlist.html') {
          warnings.push('Skipped documentation / 已跳过说明文件：' + relative);
          continue;
        }
        if (!knownRoot(relative)) throw problem('Unsupported content: ' + relative, '无法安全判断此文件用途：' + relative);
        packPath('pack-check', relative);
        targets.set(archiveKey(relative), {relative, row});
      }
      if (!targets.size) throw problem('No installable content', '未找到可安装内容');
    }
    const byRow = new Map([...targets].map(([key, target]) => [target.row, {...target, key}]));
    for (const row of allRows) {
      if (row === mr || row === cf) continue;
      const target = byRow.get(row);
      const info = inspectMods && kind === 'zip' && target && /^mods\/[^/]+\.(jar|litemod)$/i.test(target.relative)
        ? await metadata(zip, row, scratch, signal) : await readPackEntry(zip, row, {signal});
      if (!target) continue;
      const {key, relative} = target;
      if (info.metadata && !info.metadata.loaders.length) warnings.push('Unrecognized mod metadata / 无法识别模组版本与加载器：' + relative);
      downloadFiles.set(key, {relative, ...info, size: row.size, archiveName: row.name, title: relative});
    }
    const files = [...downloadFiles.values()];
    checkPackFiles(files);
    if (!index) return {kind, title: basename(filename, '.zip').slice(0, 60), packVersion: '', game: '', loader: 'fabric', version: '', files, warnings};
    const deps = index.dependencies, keys = Object.keys(deps).filter(key => key !== 'minecraft');
    if (keys.length > 1 || keys.some(key => !['quilt-loader', 'fabric-loader', 'forge', 'neoforge'].includes(key))) {
      throw problem('Unsupported loader combination', '此整合包的加载器组合暂不支持');
    }
    const loader = keys[0]?.replace('-loader', '') || 'vanilla', loaderVersion = keys.length ? deps[keys[0]] : '';
    if (typeof deps.minecraft !== 'string' || !deps.minecraft || deps.minecraft.length > 100 ||
        typeof loaderVersion !== 'string' || loaderVersion.length > 100) throw problem('Invalid version information', '整合包版本信息无效');
    return {kind, title: String(index.name || basename(filename)).slice(0, 60), packVersion: String(index.versionId || '').slice(0, 100),
      game: deps.minecraft, loader, loaderVersion, version: loader === 'forge' ? `${deps.minecraft}-${loaderVersion}` : loaderVersion, files, warnings};
  }, {signal});
}

export async function packText(source, file) {
  if (!file.archiveName) return '[Downloaded file: compare hashes above]';
  if (file.size > 100_000) return '[File exceeds text preview limit]';
  return withPackZip(source, async (zip, rows) => {
    const row = rows.find(entry => entry.name === file.archiveName);
    if (!row) throw Error('Pack entry changed / 整合包条目已变化');
    const {bytes, hash} = await readPackEntry(zip, row, {bufferLimit: 100_000});
    if (hash !== file.hash) throw Error('Pack entry changed / 整合包条目已变化');
    return bytes.includes(0) ? '[Binary file]' : bytes.toString('utf8');
  });
}

export async function extractPackEntries(source, files, signal) {
  if (!files.length) return;
  await withPackZip(source, async (zip, rows) => {
    const entries = new Map(rows.map(row => [row.name, row]));
    for (const f of files) {
      signal?.throwIfAborted();
      const row = entries.get(f.archiveName);
      if (!row || row.directory || row.size !== f.size) throw Error('Pack entry changed / 整合包条目已变化');
      const target = f.path;
      try { await lstat(target); throw Error('Pack staging file already exists'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      const {hash} = await readPackEntry(zip, row, {signal, target});
      if (hash !== f.hash) throw Error('Pack entry changed / 整合包条目已变化');
    }
  }, {signal});
}
