// SPDX-License-Identifier: MPL-2.0
import { mkdir, readFile, writeFile, rename, readdir, lstat, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';

import {validateIcon} from './appearance.mjs';

export const MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function atomicJson(path, value) {
  const temporary = path + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2), { flag: 'wx' });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}

async function ordinaryDirectory(path) {
  await mkdir(path, { recursive: true });
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('实例目录不可使用链接。');
}

export class LauncherCore {
  constructor(root, { fetcher = fetch } = {}) { this.root = resolve(root); this.fetcher = fetcher; this.catalog = null; }
  async init() { await ordinaryDirectory(this.root); await ordinaryDirectory(join(this.root, 'instances')); }
  async listInstances() {
    await this.init();
    const items = [];
    for (const entry of await readdir(join(this.root, 'instances'), { withFileTypes: true })) {
      if (!entry.isDirectory() || !uuid.test(entry.name)) continue;
      try {
        const item = JSON.parse(await readFile(join(this.root, 'instances', entry.name, 'instance.json'), 'utf8'));
        if (item.schema === 1 && item.id === entry.name) items.push(item);
      } catch { /* Incomplete or externally edited instance: never guess its contents. */ }
    }
    return items.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  }
  async versions() {
    const response = await this.fetcher(MANIFEST_URL, { signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (!response.ok) throw new Error(`官方版本目录请求失败 (${response.status})`);
    const body = await response.text();
    if (body.length > 8_000_000) throw new Error('版本目录超出允许大小。');
    const data = JSON.parse(body);
    if (!Array.isArray(data.versions) || !data.versions.length) throw new Error('官方版本目录格式不正确。');
    const versions = data.versions.map(v => {
      const url = new URL(v.url);
      if (url.protocol !== 'https:' || url.hostname !== 'piston-meta.mojang.com' || url.port || !/^[a-f0-9]{40}$/.test(v.sha1)) throw new Error('版本元数据来源或校验值不正确。');
      return { id: String(v.id), type: String(v.type), releaseTime: v.releaseTime, url: url.href, sha1: v.sha1 };
    });
    this.catalog = versions;
    return { latest: data.latest, versions: versions.map(({url,sha1,...v})=>v), fetchedAt: new Date().toISOString() };
  }
  async createInstance(input) {
    if (!input || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 60) throw new Error('实例名称需要 1–60 个字符。');
    if (typeof input.game !== 'string' || !this.catalog?.some(v=>v.id===input.game)) throw new Error('请先从官方目录选择游戏版本。');
    const icon = validateIcon(input.icon);
    const version = this.catalog.find(v=>v.id===input.game);
    const response = await this.fetcher(version.url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
    if (!response.ok) throw new Error(`版本元数据下载失败 (${response.status})`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 16_000_000 || createHash('sha1').update(bytes).digest('hex') !== version.sha1) throw new Error('版本元数据校验失败，未创建实例。');
    const metadata = JSON.parse(bytes.toString('utf8'));
    if (metadata.id !== input.game) throw new Error('版本元数据与选择不一致。');
    await this.init();
    const id = randomUUID(), dir = join(this.root, 'instances', id);
    await mkdir(dir);
    const item = { schema: 1, id, icon, name: input.name.trim(), game: input.game, loader: 'vanilla', status: 'metadata-ready', createdAt: new Date().toISOString(), javaMajor: metadata.javaVersion?.majorVersion ?? null, metadataSha1: version.sha1 };
    // Commit marker is written last. A failed operation is not listed as a usable instance.
    await Promise.all(['mods','config','saves','resourcepacks','shaderpacks'].map(p=>mkdir(join(dir,p))));
    await writeFile(join(dir, 'version.json'), bytes, { flag: 'wx' });
    await atomicJson(join(dir, 'instance.json'), item);
    return item;
  }
  async instancePath(id) {
    if (typeof id !== 'string' || !uuid.test(id)) throw new Error('无效的实例标识。');
    if (!(await this.listInstances()).some(i=>i.id===id)) throw new Error('实例不存在。');
    const dir = join(this.root, 'instances', id);
    const stat = await lstat(dir);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('实例目录不可使用链接。');
    return dir;
  }
}
