// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ContentApiSources} from '../desktop/content-sources176.mjs';
import {download, downloadPool, officialFetch} from '../desktop/download.mjs';
import {DownloadNetwork} from '../desktop/network.mjs';
import {Modrinth} from '../desktop/modrinth.mjs';
import {CurseForge141} from '../desktop/curseforge141.mjs';
import {carryCurseForgeApproval} from '../desktop/curseforge-delivery176.mjs';

const body = Buffer.from('verified content bytes');
const hash = createHash('sha1').update(body).digest('hex');
const temporary = file => file.path + '.amber-' + file.hash + '.part';
const testKey = 'test-only-curseforge-key';
const exactEdge = 'https://edge.forgecdn.net/files/8689/629/superb-warfare.jar';
const exactMedia = 'https://mediafilez.forgecdn.net/files/8689/629/superb-warfare.jar';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'amber-content176-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  return {root, file: {path: join(root, 'content.jar'), url: exactEdge, versionId: 'cf-1218165-8689629', hash, size: body.length}};
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

  test(`${platform} reads per-record cache timestamps from JSON and honors an upstream check`, async () => {
    const now = Date.parse('2026-11-18T13:20:00Z');
    const stamp = age => new Date(now - age).toISOString();
    const recent = {sync_at: stamp(2_000)};
    const confirmed = {sync_at: stamp(3_600_000), checked_at: stamp(2_000)};
    const detail = item => platform === 'curseforge' ? {data: item} : item;
    const request = payload => new ContentApiSources({}, async url => {
      if (new URL(url).hostname !== 'cache.example') throw new DOMException('timed out', 'TimeoutError');
      return Response.json(payload);
    }, {clock: () => now, alternates: {[platform]: [{id: 'cache', base: 'https://cache.example/', supports: () => true}]}});
    const read = payload => request(payload).json(platform, 'version');

    assert.deepEqual(await read(detail(confirmed)), detail(confirmed));
    assert.deepEqual(await read(detail([recent, confirmed])), detail([recent, confirmed]));
    await assert.rejects(read(detail([confirmed, {sync_at: stamp(3_600_000)}])), {code: 'CONTENT_STALE'});
    await assert.rejects(read(detail([recent, {}])), {code: 'CONTENT_CACHE-UNVERIFIED'});
    await assert.rejects(read(detail({sync_at: 'unknown', checked_at: stamp(-3_600_000)})), {code: 'CONTENT_CACHE-UNVERIFIED'});
  });
}

test('a mirror API 404 is reported as a cache miss and preserves the upstream failure', async () => {
  const request = failure => new ContentApiSources({}, async url => {
    if (new URL(url).hostname === 'cache.example') throw Object.assign(Error(), {status: 404});
    throw failure;
  }, {clock: () => 0, alternates: {modrinth: [{id: 'cache', base: 'https://cache.example/', supports: () => true}]}});
  await assert.rejects(request(Object.assign(Error(), {status: 503})).json('modrinth', 'version'), error =>
    error.code === 'CONTENT_CACHE-MISS' && error.status === 503 &&
    error.message.includes('api.modrinth.com (HTTP 503)') && error.message.includes('cache.example (HTTP 404 · cache miss'));
  await assert.rejects(request(new DOMException('timed out', 'TimeoutError')).json('modrinth', 'version'),
    error => error.code === 'CONTENT_CACHE-MISS' && error.status === undefined);
  await assert.rejects(request(Object.assign(Error(), {status: 404})).json('modrinth', 'version'),
    {code: 'CONTENT_MISSING', status: 404});
});

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
    return calls.length === 1 ? new Response(null, {status: 302, headers: {location: 'https://github.com/example/file.jar'}}) : new Response(body);
  };
  const r = await officialFetch('https://api.curseforge.com/v1/test', {fetcher, headers: {Cookie: 'secret', Authorization: 'custom'}});
  await r.body.cancel();
  assert.equal(calls[0][1].get('x-api-key'), testKey);
  assert.equal(calls[1][2], 'omit');
  for (const header of ['x-api-key', 'authorization', 'cookie']) assert.equal(calls[1][1].get(header), null);
});

test('a URL from an unrelated platform cannot redirect into the CurseForge CDN', async t => {
  const {root, file} = await fixture(t);
  file.url = 'https://github.com/example/unapproved-file';
  delete file.versionId;
  file.urls = [file.url, exactMedia];
  const requested = [];
  await assert.rejects(download(file, {root, fetcher: async url => {
    requested.push(url);
    return new Response(null, {status: 302, headers: {location: exactEdge}});
  }}), {status: 403});
  assert.deepEqual(requested, [file.url]);
});

test('CurseForge refreshes one exact file address on a CDN 404 only in automatic mode', async t => {
  const {root, file} = await fixture(t), seen = [];
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  const network = new DownloadNetwork(root, {fetcher: async (url, options) => {
    const headers = new Headers(options.headers);
    seen.push(url);
    if (url === exactMedia) {assert.equal(headers.get('x-api-key'), null); return new Response(body);}
    assert.equal(headers.get('x-api-key'), testKey);
    if (url === exactEdge) return new Response(null, {status: 404});
    if (url.endsWith('/download-url')) return Response.json({data: exactMedia});
    if (url.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: true}});
    assert.match(url, /api\.curseforge\.com\/v1\/mods\/1218165\/files\/8689629$/);
    return Response.json({data: {id: 8689629, modId: 1218165, downloadUrl: exactEdge,
      hashes: [{algo: 1, value: hash}], fileLength: body.length}});
  }});
  network.configure({contentMode: 'official'});
  await assert.rejects(download(file, {root, fetcher: network.request}), {status: 404});
  assert.deepEqual(seen.splice(0).map(url => url.replace('https://api.curseforge.com/v1/', '')), [
    'mods/1218165', 'mods/1218165/files/8689629', exactEdge
  ]);
  network.configure({contentMode: 'auto'});
  await download(file, {root, fetcher: network.request});
  assert.deepEqual(seen.map(url => url.replace('https://api.curseforge.com/v1/', '')), [
    'mods/1218165', 'mods/1218165/files/8689629', exactEdge,
    'mods/1218165', 'mods/1218165/files/8689629', 'mods/1218165/files/8689629/download-url', exactMedia
  ]);
  assert.deepEqual(await readFile(file.path), body);
});

test('CurseForge download authorization shares an API rate limit with browsing', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  const requests = [];
  const fetcher = async url => {
    requests.push(url);
    return new Response(null, {status: 429, headers: {'Retry-After': '15'}});
  };
  const provider = new CurseForge141({fetcher});
  await assert.rejects(provider.categories(), {status: 429});
  await assert.rejects(download(file, {root, fetcher}), {code: 'CONTENT_RATE-LIMITED', status: 429});
  assert.deepEqual(requests, ['https://api.curseforge.com/v1/categories?gameId=432']);
});

test('a pre-download CurseForge address change discards only the partial in automatic mode', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  const fragment = body.subarray(0, 4);
  await writeFile(temporary(file), fragment);
  let transfers = 0;
  const network = new DownloadNetwork(root, {fetcher: async (url, options) => {
    if (url.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: true}});
    if (url.endsWith('/8689629')) return Response.json({data: {id: 8689629, modId: 1218165, downloadUrl: exactMedia,
      hashes: [{algo: 1, value: hash}], fileLength: body.length}});
    transfers++;
    assert.equal(url, exactMedia);
    assert.equal(new Headers(options.headers).get('range'), null);
    return new Response(body);
  }});
  network.configure({contentMode: 'official'});
  await assert.rejects(download(file, {root, fetcher: network.request}), /changed the selected file address/);
  assert.equal(transfers, 0);
  assert.deepEqual(await readFile(temporary(file)), fragment);
  network.configure({contentMode: 'auto'});
  await download(file, {root, fetcher: network.request});
  assert.equal(transfers, 1);
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
  delete file.versionId;
  file.urls = [file.url, 'https://cdn.modrinth.com/replacement'];
  await assert.rejects(download(file, {root, fetcher: async url => {
    seen.push(url);
    return url === file.url ? new Response(null, {status: 302, headers: {location: file.urls[1]}}) : new Response(null, {status: 404});
  }}), {status: 404});
  assert.equal(seen.length, 2);
});

test('CurseForge first-party file protocol uses the exact authorized Edge URL and restarts a Range 404', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  file.url = exactEdge;
  const calls = [];
  const network = new DownloadNetwork(root, {fetcher: async (url, options) => {
    const requested = new URL(url), headers = new Headers(options.headers);
    calls.push([requested.hostname, headers.has('x-api-key'), headers.get('range')]);
    for (const header of ['cookie', 'authorization']) assert.equal(headers.get(header), null);
    if (requested.hostname === 'api.curseforge.com') {
      if (requested.pathname.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: true}});
      return Response.json({data: {id: 8689629, modId: 1218165, downloadUrl: exactEdge,
        hashes: [{algo: 1, value: hash}], fileLength: body.length}});
    }
    if (url === exactEdge) {
      assert.equal(headers.get('x-api-key'), testKey);
      if (headers.has('range')) return new Response(null, {status: 404});
      return new Response(null, {status: 302, headers: {location: exactMedia}});
    }
    assert.equal(url, exactMedia);
    assert.equal(headers.get('x-api-key'), null);
    return new Response(body);
  }});
  network.configure({contentMode: 'official'});
  await writeFile(temporary(file), body.subarray(0, 4));
  const job = {id: 'authorized-cf'};
  await network.run(job, () => download(file, {root, fetcher: network.request}));
  assert.deepEqual(calls, [['api.curseforge.com', true, null], ['api.curseforge.com', true, null],
    ['edge.forgecdn.net', true, 'bytes=4-'], ['edge.forgecdn.net', true, null], ['mediafilez.forgecdn.net', false, null]]);
  assert.equal(job.network.source, 'mediafilez.forgecdn.net');
  assert.match(job.network.fallback, /HTTP 404.*Range/);
  assert.deepEqual(await readFile(file.path), body);
});

test('CurseForge rejects restricted projects, withdrawn files and tampered identities before contacting the CDN', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  for (const scenario of ['restricted', 'withdrawn', 'wrong-file', 'wrong-hash', 'unsafe-url']) {
    const fetcher = async (url, options) => {
      assert.match(url, /^https:\/\/api\.curseforge\.com\/v1\//);
      assert.equal(new Headers(options.headers).get('x-api-key'), testKey);
      if (url.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: scenario !== 'restricted'}});
      return Response.json({data: {id: scenario === 'wrong-file' ? 8689630 : 8689629, modId: 1218165,
        downloadUrl: scenario === 'withdrawn' ? null : scenario === 'unsafe-url' ? exactEdge + '?api-key=reflected' : exactEdge,
        hashes: [{algo: 1, value: scenario === 'wrong-hash' ? '0'.repeat(40) : hash}], fileLength: body.length}});
    };
    await assert.rejects(download({...file, url: exactEdge, urls: [exactEdge, 'https://cdn.modrinth.com/other']}, {root, fetcher}),
      {code: scenario === 'wrong-hash' ? 'CHECKSUM' : 'CURSEFORGE_DISTRIBUTION'});
  }
  await assert.rejects(readFile(file.path), {code: 'ENOENT'});
});

test('CurseForge identity survives file-cache reuse and transfer deduplication', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  await writeFile(file.path, body);
  await assert.rejects(download({...file, url: 'https://cdn.modrinth.com/unapproved.jar'}, {root,
    fetcher: () => assert.fail('unexpected request')}), {code: 'CURSEFORGE_DISTRIBUTION'});
  const requests = [];
  const fetcher = async url => {
    requests.push(url);
    if (url.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: false}});
    if (url.endsWith('/1218166')) return Response.json({data: {id: 1218166, allowModDistribution: true}});
    assert.ok(url.endsWith('/1218166/files/8689629'));
    return Response.json({data: {id: 8689629, modId: 1218166, downloadUrl: exactEdge,
      hashes: [{algo: 1, value: hash}], fileLength: body.length}});
  };
  await assert.rejects(downloadPool([file, {...file, versionId: 'cf-1218166-8689629'}], {root, fetcher, threads: 1}),
    {code: 'CURSEFORGE_DISTRIBUTION'});
  assert.deepEqual(requests, ['https://api.curseforge.com/v1/mods/1218165']);
  assert.deepEqual(await readFile(file.path), body);
  assert.deepEqual(await download({...file, versionId: 'cf-1218166-8689629'}, {root, fetcher}), {cached: true});
});

test('CurseForge room transfers require the signed SHA-256 and the official SHA-1', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  const hash256 = createHash('sha256').update(body).digest('hex');
  const fetcher = async url => {
    if (url.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: true}});
    if (url === exactEdge) return new Response(body);
    return Response.json({data: {id: 8689629, modId: 1218165, downloadUrl: exactEdge,
      hashes: [{algo: 1, value: hash}], fileLength: body.length}});
  };
  const target = {...file, hash: hash256, algorithm: 'sha256', curseForgeSha1: hash};
  await assert.rejects(download({...target, curseForgeSha1: '0'.repeat(40)}, {root, fetcher}), {code: 'CHECKSUM'});
  await assert.rejects(download({...target, hash: '0'.repeat(64)}, {root, fetcher}), {code: 'DOWNLOAD_CHECKSUM'});
  await assert.rejects(readFile(file.path), {code: 'ENOENT'});
  await download(target, {root, fetcher});
  assert.deepEqual(await readFile(file.path), body);
});

test('CurseForge direct Edge authentication sends no invented credentials when this build has none', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  delete process.env.AMBER_CURSEFORGE_API_KEY;
  await assert.rejects(download({...file, url: exactEdge}, {root, fetcher: () => assert.fail('unexpected request')}), {code: 'CONTENT_CONFIGURATION'});
});

test('an exact CurseForge preview supplies a temporary approval, without saving the approval in the receipt', async t => {
  const {root, file} = await fixture(t);
  const previous = process.env.AMBER_CURSEFORGE_API_KEY;
  t.after(() => previous === undefined ? delete process.env.AMBER_CURSEFORGE_API_KEY : process.env.AMBER_CURSEFORGE_API_KEY = previous);
  process.env.AMBER_CURSEFORGE_API_KEY = testKey;
  let apiCalls = 0, fileCalls = 0;
  const fetcher = async (url, options) => {
    assert.equal(new Headers(options.headers).get('x-api-key'), testKey);
    if (url === exactEdge) { fileCalls++; return new Response(body); }
    apiCalls++;
    if (url.endsWith('/1218165')) return Response.json({data: {id: 1218165, allowModDistribution: true}});
    return Response.json({data: {id: 8689629, modId: 1218165, downloadUrl: exactEdge, hashes: [{algo: 1, value: hash}], fileLength: body.length}});
  };
  const provider = new CurseForge141({fetcher});
  const project = await provider.project('cf-1218165');
  const version = await provider.version(file.versionId);
  const selected = {...file, url: exactEdge, ...carryCurseForgeApproval(version.files[0], project)};
  await download(selected, {root, fetcher});
  assert.equal(apiCalls, 2);
  assert.equal(fileCalls, 1);
  const restored = {...JSON.parse(JSON.stringify(selected)),path: join(root, 'retry.jar')};
  await download(restored, {root, fetcher});
  assert.equal(apiCalls, 4);
  assert.equal(fileCalls, 2);
});
