// SPDX-License-Identifier: MPL-2.0
import {networkReason} from './network.mjs';

const official = {
  modrinth: {id: 'official', base: 'https://api.modrinth.com/v2/'},
  curseforge: {id: 'official', base: 'https://api.curseforge.com/v1/'}
};
const healthLifetime = 5 * 60_000;
const cacheLifetime = 15 * 60_000;
const maxJson = 12_000_000;
const apiHealth = new WeakMap();

export function contentFailure(error) {
  if (error.code === 'CURSEFORGE_CONFIG') return 'configuration';
  if (error.code === 'CONTENT_FORMAT') return 'format';
  if (error.code === 'CONTENT_STALE') return 'stale';
  if (error.code === 'CONTENT_CACHE_UNVERIFIED') return 'cache-unverified';
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
  stale: 'Cached metadata is too old. / 缓存已过期。',
  'cache-miss': 'The mirror cache does not contain this result yet. Try again later. / 镜像缓存尚未命中，请稍后重试。',
  'cache-unverified': 'The mirror did not provide a usable cache date. / 无法确认镜像缓存时间。'
};

function cacheTimestamp(value, now) {
  const date = typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isFinite(date) && date <= now + 60_000 ? date : -Infinity;
}

function cacheFreshnessProblem(value, headers, now, freshnessHeader) {
  const payload = value?.data ?? value?.hits ?? value;
  const entries = Array.isArray(payload) ? payload : [payload];
  let dates;
  if (entries.some(entry => entry?.sync_at !== undefined || entry?.checked_at !== undefined)) {
    // A recent upstream check can validate an unchanged entry. Each entry needs its own date.
    dates = entries.map(entry => Math.max(cacheTimestamp(entry?.sync_at, now), cacheTimestamp(entry?.checked_at, now)));
  } else {
    dates = headers.get(freshnessHeader || 'sync_at')?.split(',').map(date => cacheTimestamp(date.trim(), now));
  }
  if (!dates?.length || dates.includes(-Infinity)) return 'CONTENT_CACHE_UNVERIFIED';
  if (dates.some(date => now - date > cacheLifetime)) return 'CONTENT_STALE';
}

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
    // Exact authorization and browsing share the platform's API rate limit.
    const fetcher = core.fetcher || fetch;
    if (clock === Date.now) {
      if (!apiHealth.has(fetcher)) apiHealth.set(fetcher, new SourceHealth());
      this.health = apiHealth.get(fetcher);
    } else this.health = new SourceHealth(clock);
  }
  async json(platform, path, {signal, validate = value => value && typeof value === 'object', status, officialOnly = false} = {}) {
    const mode = this.core.fetcher?.amberNetwork?.settings.contentMode || 'auto';
    const primary = official[platform];
    // Each alternate describes supported read routes and may name a freshness header.
    // Production registers only sources cleared for use.
    const possible = [primary, ...(this.alternates[platform] || []).filter(source => source.supports(path))];
    const key = source => `${platform}:api:${source.id}`;
    const candidates = officialOnly || mode === 'official' ? [primary] : this.health.ordered(possible, key).slice(0, 2);
    const failures = [];
    let upstreamFailure;
    for (const source of candidates) {
      signal?.throwIfAborted();
      const start = this.clock(), hostname = new URL(source.base).hostname;
      try {
        const remaining = (this.health.get(key(source))?.cooldown || 0) - start;
        if (remaining > 0) throw Object.assign(Error('Rate limited'), {status: 429, retryAfterMs: remaining, cooldown: true});
        const timeout = AbortSignal.timeout(candidates.length > 1 ? 5500 : 12_000);
        const response = await this.request(source.base + path, {fetcher: this.core.fetcher,
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout, sameOrigin: true});
        const value = await readContentJson(response);
        if (!validate(value)) throw Object.assign(Error('Invalid content response'), {code: 'CONTENT_FORMAT'});
        if (source !== primary) {
          const code = cacheFreshnessProblem(value, response.headers, this.clock(), source.freshnessHeader);
          if (code) throw Object.assign(Error('Cache freshness check failed'), {code});
        }
        this.health.record(key(source), null, this.clock() - start);
        status?.({host: hostname, failures});
        return value;
      } catch (error) {
        signal?.throwIfAborted();
        if (!error.cooldown && error.status !== 404 && error.code !== 'CURSEFORGE_CONFIG') this.health.record(key(source), error, this.clock() - start);
        const reason = source !== primary && error.status === 404 ? 'cache-miss' : contentFailure(error);
        const failure = {host: hostname, reason, status: error.status, retryAfterMs: error.retryAfterMs};
        failures.push(failure);
        if (source === primary) upstreamFailure = failure;
        if (source === primary && [401, 403, 404].includes(error.status) || error.code === 'CURSEFORGE_CONFIG' && platform === 'curseforge') break;
      }
    }
    const last = failures.at(-1);
    const details = failures.map(row => {
      const reason = row.reason === 'cache-miss' ? 'HTTP 404 · cache miss / 缓存未命中' : row.status ? `HTTP ${row.status}` : row.reason;
      return `${row.host} (${reason})`;
    }).join(' → ');
    // Callers use HTTP 404 to decide whether an official catalog recognizes a file.
    const httpFailure = last.reason === 'cache-miss' ? upstreamFailure : last;
    throw Object.assign(Error(`${platform === 'curseforge' ? 'CurseForge' : 'Modrinth'} · ${descriptions[last.reason]} [${details}]`),
      {code: 'CONTENT_' + last.reason.toUpperCase(), status: httpFailure?.status, retryAfterMs: httpFailure?.retryAfterMs});
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
