// SPDX-License-Identifier: MPL-2.0
import {networkReason} from './network.mjs';

const official = {
  modrinth: {id: 'official', base: 'https://api.modrinth.com/v2/'},
  curseforge: {id: 'official', base: 'https://api.curseforge.com/v1/'}
};
const healthLifetime = 5 * 60_000;
const cacheLifetime = 15 * 60_000;
const maxJson = 12_000_000;

export function contentFailure(error) {
  if (error.code === 'CURSEFORGE_CONFIG') return 'configuration';
  if (error.code === 'CONTENT_FORMAT') return 'format';
  if (error.code === 'CONTENT_STALE') return 'stale';
  if (error.name === 'TimeoutError') return 'timeout';
  return networkReason(error);
}

const descriptions = {
  connection: 'Connection failed. Retry after checking the network. / 连接失败，请检查网络后重试。',
  timeout: 'Connection timed out. Try again. / 连接超时，请重试。',
  missing: 'The API returned 404 for this request. / API 对此请求返回 404。',
  restricted: 'Authorization failed. Check for an official launcher update. / 授权失败，请检查官方启动器更新。',
  'rate-limited': 'Rate limit reached. Wait before trying again. / 请求过于频繁，请稍后重试。',
  configuration: 'CurseForge access is missing from this build. Use the official installer. / 此构建未配置 CurseForge 访问，请使用官方安装包。',
  format: 'Invalid API response. Try again later. / API 响应格式无效，请稍后重试。',
  stale: 'Cached metadata is missing or too old. / 缓存未命中或已过期。'
};

export async function readContentJson(response) {
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > maxJson) throw Error('Response too large');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
  } catch (cause) {
    if (cause instanceof SyntaxError || cause.message === 'Response too large' || !response.body) {
      throw Object.assign(Error('Invalid content response', {cause}), {code: 'CONTENT_FORMAT'});
    }
    throw cause;
  }
}

export class SourceHealth {
  constructor(clock = Date.now) { this.clock = clock; this.rows = new Map(); }
  record(key, error, elapsed) {
    const previous = this.get(key), now = this.clock(), reason = error && contentFailure(error);
    const availability = error ? previous ? previous.availability * .7 : .25 : previous ? .3 + previous.availability * .7 : 1;
    const cooldown = error?.status === 429 ? now + (error.retryAfterMs || 15_000) : previous?.cooldown || 0;
    this.rows.delete(key);
    this.rows.set(key, {availability, ms: previous ? previous.ms * .7 + elapsed * .3 : elapsed, reason, cooldown, at: now});
    if (this.rows.size > 128) this.rows.delete(this.rows.keys().next().value);
  }
  get(key) {
    const row = this.rows.get(key);
    return row && (row.at + healthLifetime > this.clock() || row.cooldown > this.clock()) ? row : undefined;
  }
  ordered(rows, key) {
    const score = row => {
      const health = this.get(key(row));
      if (!health) return 1000;
      return (health.cooldown > this.clock() ? 1e8 : 0) + (1 - health.availability) * 5000 + Math.min(health.ms, 5000);
    };
    return [...rows].sort((a, b) => score(a) - score(b));
  }
}

export class ContentApiSources {
  constructor(core, request, {alternates = {}, clock = Date.now} = {}) {
    Object.assign(this, {core, request, alternates, clock});
    this.health = new SourceHealth(clock);
  }
  async json(platform, path, {signal, validate = value => value && typeof value === 'object', status} = {}) {
    const mode = this.core.fetcher?.amberNetwork?.settings.contentMode || 'auto';
    const primary = official[platform];
    // Each alternate describes supported read routes and an operator-provided
    // freshness header. Production registers only sources cleared for use.
    const possible = [primary, ...(this.alternates[platform] || []).filter(source => source.supports(path))];
    const key = source => `${platform}:api:${source.id}`;
    const candidates = mode === 'official' ? [primary] : this.health.ordered(possible, key).slice(0, 2);
    const failures = [];
    for (const source of candidates) {
      signal?.throwIfAborted();
      const start = this.clock(), hostname = new URL(source.base).hostname;
      try {
        const remaining = (this.health.get(key(source))?.cooldown || 0) - start;
        if (remaining > 0) throw Object.assign(Error('Rate limited'), {status: 429, retryAfterMs: remaining, cooldown: true});
        const timeout = AbortSignal.timeout(candidates.length > 1 ? 5500 : 12_000);
        const response = await this.request(source.base + path, {fetcher: this.core.fetcher,
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout, sameOrigin: true});
        if (source !== primary) {
          const dates = response.headers.get(source.freshnessHeader || 'sync_at')?.split(',').map(v => Date.parse(v.trim()));
          if (!dates?.length || dates.some(date => !Number.isFinite(date) || date > start + 60_000 || start - date > cacheLifetime)) {
            await response.body?.cancel();
            throw Object.assign(Error('Stale cache'), {code: 'CONTENT_STALE'});
          }
        }
        const value = await readContentJson(response);
        if (!validate(value)) throw Object.assign(Error('Invalid content response'), {code: 'CONTENT_FORMAT'});
        this.health.record(key(source), null, this.clock() - start);
        status?.({host: hostname, failures});
        return value;
      } catch (error) {
        signal?.throwIfAborted();
        if (!error.cooldown && error.status !== 404 && error.code !== 'CURSEFORGE_CONFIG') this.health.record(key(source), error, this.clock() - start);
        const reason = source !== primary && error.status === 404 ? 'stale' : contentFailure(error);
        failures.push({host: hostname, reason, status: error.status, retryAfterMs: error.retryAfterMs});
        if (source === primary && [401, 403, 404].includes(error.status) || error.code === 'CURSEFORGE_CONFIG' && platform === 'curseforge') break;
      }
    }
    const last = failures.at(-1);
    const details = failures.map(row => `${row.host} (${row.status ? `HTTP ${row.status}` : row.reason})`).join(' → ');
    throw Object.assign(Error(`${platform === 'curseforge' ? 'CurseForge' : 'Modrinth'} · ${descriptions[last.reason]} [${details}]`),
      {code: 'CONTENT_' + last.reason.toUpperCase(), status: last.status, retryAfterMs: last.retryAfterMs});
  }
}

export function filePlatform(url) {
  const hostname = new URL(url).hostname;
  if (hostname === 'cdn.modrinth.com') return 'modrinth';
  if (['edge.forgecdn.net', 'mediafilez.forgecdn.net'].includes(hostname)) return 'curseforge';
  return undefined;
}

export function fileSource(url) {
  const platform = filePlatform(url);
  return platform === 'curseforge' ? 'curseforge-cdn' : new URL(url).origin;
}
