// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ContentApiSources} from '../desktop/content-sources176.mjs';
import {download, officialFetch} from '../desktop/download.mjs';
import {DownloadNetwork} from '../desktop/network.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';

const body = Buffer.from('verified content bytes');
const hash = createHash('sha1').update(body).digest('hex');
const primary = 'https://edge.forgecdn.net/example.jar';
const alternate = 'https://mediafilez.forgecdn.net/authorized-replacement.jar';
const temporary = file => file.path + '.amber-' + file.hash + '.part';
const testKey = 'test-only-curseforge-key';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'amber-content176-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  return {root, file: {path: join(root, 'content.jar'), url: primary, versionId: 'cf-1218165-8689629', hash, size: body.length}};
}

for (const platform of ['modrinth', 'curseforge']) {
  test(`${platform} API picks from actual request outcomes and rejects stale cached data`, async () => {
    const now = Date.now(), attempts = [];
    let phase = 'official-timeout';
    const core = {fetcher: {amberNetwork: {settings: {contentMode: 'auto'}}}};
    const sources = new ContentApiSources(core, async url => {
      const testAlternate = url.includes('cache.example');
      attempts.push(testAlternate ? 'cache' : 'official');
      if (!testAlternate && phase === 'official-timeout') throw new DOMException('timed out', 'TimeoutError');
      if (testAlternate && phase === 'cache-miss') throw Object.assign(Error(), {status: 404});
      if (testAlternate) return Response.json({origin: 'cache'}, {headers: {sync_at: new Date(now - (phase === 'old' ? 3_600_000 : 1000)).toISOString()}});
      return Response.json({origin: 'official'});
    }, {clock: () => now, alternates: {[platform]: [{id: 'cache', base: 'https://cache.example/', supports: path => path !== 'authoritative'}]}});
    let status;
    assert.equal((await sources.json(platform, 'search', {status: value => status = value})).origin, 'cache');
    assert.deepEqual(attempts.splice(0), ['official', 'cache']);
    assert.equal(status.failures[0].reason, 'timeout');
    phase = 'old';
    assert.equal((await sources.json(platform, 'project', {status: value => status = value})).origin, 'official');
    assert.deepEqual(attempts.splice(0), ['cache', 'official']);
    assert.equal(status.failures[0].reason, 'stale');
    core.fetcher.amberNetwork.settings.contentMode = 'official';
    phase = 'official-timeout';
    await assert.rejects(sources.json(platform, 'project'), {code: 'CONTENT_TIMEOUT'});
    assert.deepEqual(attempts, ['official']);
  });
}

test('CurseForge without configuration does not contact the API, while category failure leaves search independent', async t => {
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  delete process.env.AMBER_CURSEFORGE_API_KEY;
  const calls = [];
  const core = {metadata: async () => ({item: {game: '1.20.1', loader: 'forge'}}), fetcher: async (url, options) => {
    calls.push(url);
    assert.equal(new Headers(options.headers).get('x-api-key'), testKey);
    if (url.includes('categories?')) return new Response(null, {status: 503});
    if (url.includes('searchFilter=denied')) return new Response(null, {status: 403});
    if (url.includes('searchFilter=limit')) return new Response(null, {status: 429, headers: {'retry-after': '20'}});
    if (url.includes('searchFilter=broken')) return new Response('<html>');
    return Response.json({data: [], pagination: {totalCount: 0}});
  }};
  const shop = new Modrinth(core);
  await assert.rejects(shop.categories('curseforge'), {code: 'CONTENT_CONFIGURATION'});
  assert.equal(calls.length, 0);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  await assert.rejects(shop.categories('curseforge'), {code: 'CONTENT_CONNECTION'});
  assert.equal((await shop.search('instance', {provider: 'curseforge'})).source.host, 'api.curseforge.com');
  for (const [query, code] of [['denied', 'CONTENT_RESTRICTED'], ['broken', 'CONTENT_FORMAT'], ['limit', 'CONTENT_RATE-LIMITED']]) {
    await assert.rejects(shop.search('instance', {provider: 'curseforge', query}), error => error.code === code && !error.message.includes(testKey));
  }
  const before = calls.length;
  await assert.rejects(shop.search('instance', {provider: 'curseforge'}), {status: 429});
  assert.equal(calls.length, before);
});

test('redirects strip credentials and public CDN requests never acquire a key', async t => {
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push([url, new Headers(options.headers), options.credentials]);
    return calls.length === 1 ? new Response(null, {status: 302, headers: {location: primary}}) : new Response(body);
  };
  const r = await officialFetch('https://api.curseforge.com/v1/test', {fetcher, headers: {Cookie: 'secret', Authorization: 'custom'}});
  await r.body.cancel();
  assert.equal(calls[0][1].get('x-api-key'), testKey);
  assert.equal(calls[1][2], 'omit');
  for (const header of ['x-api-key', 'authorization', 'cookie']) assert.equal(calls[1][1].get(header), null);
});

test('CurseForge resumes after a Range-only 404 through the same source without the old partial', async t => {
  const {root, file} = await fixture(t), calls = [];
  await writeFile(temporary(file), body.subarray(0, 4));
  const network = new DownloadNetwork(root, {fetcher: async (url, options) => {
    const headers = new Headers(options.headers);
    calls.push([url, headers.get('range')]);
    assert.equal(headers.get('x-api-key'), null);
    if (headers.get('range')) return new Response(null, {status: 404});
    return url === primary ? new Response(null, {status: 302, headers: {location: alternate}}) : new Response(body);
  }});
  network.configure({contentMode: 'official'});
  const job = {id: 'content176'};
  await network.run(job, () => download(file, {root, fetcher: network.request}));
  assert.deepEqual(calls, [[primary, 'bytes=4-'], [primary, null], [alternate, null]]);
  assert.equal(job.network.source, 'mediafilez.forgecdn.net');
  assert.match(job.network.fallback, /HTTP 404.*Range/);
  assert.deepEqual(await readFile(file.path), body);
});

test('CurseForge refreshes one authorized exact file address after CDN 404 in auto mode', async t => {
  const {root, file} = await fixture(t), seen = [];
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  await download(file, {root, fetcher: async (url, options) => {
    const headers = new Headers(options.headers);
    seen.push(url);
    if (url === primary) return new Response(null, {status: 404});
    if (url === alternate) {assert.equal(headers.get('x-api-key'), null); return new Response(body);}
    assert.match(url, /api\.curseforge\.com\/v1\/mods\/1218165\/files\/8689629\/download-url$/);
    assert.equal(headers.get('x-api-key'), testKey);
    return Response.json({data: alternate});
  }});
  assert.equal(seen.length, 3);
  assert.deepEqual(await readFile(file.path), body);
});

test('Modrinth verifies the original hash across alternatives and honors strict primary override', async t => {
  const {root, file} = await fixture(t);
  file.url = 'https://github.com/example/original';
  file.urls = [file.url, 'https://cdn.modrinth.com/replacement'];
  file.versionId = 'ABCDEFGH';
  const network = new DownloadNetwork(root, {fetcher: async url => new Response(url === file.url ? Buffer.alloc(body.length) : body)});
  network.configure({contentMode: 'official'});
  await assert.rejects(download(file, {root, fetcher: network.request}), {code: 'DOWNLOAD_CHECKSUM'});
  await assert.rejects(readFile(file.path), {code: 'ENOENT'});
  network.configure({contentMode: 'auto'});
  await download(file, {root, fetcher: network.request});
  assert.deepEqual(await readFile(file.path), body);
});

test('a redirected 404 cannot turn an identical CDN address into a second source', async t => {
  const {root, file} = await fixture(t), seen = [];
  file.url = 'https://github.com/example/original';
  file.urls = [file.url, 'https://cdn.modrinth.com/replacement'];
  await assert.rejects(download(file, {root, fetcher: async url => {
    seen.push(url);
    return url === file.url ? new Response(null, {status: 302, headers: {location: file.urls[1]}}) : new Response(null, {status: 404});
  }}), {status: 404});
  assert.equal(seen.length, 2);
});
