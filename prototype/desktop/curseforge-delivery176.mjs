// SPDX-License-Identifier: MPL-2.0
import {ContentApiSources} from './content-sources176.mjs';

const curseForgeEdge = 'https://edge.forgecdn.net';
const media = 'https://mediafilez.forgecdn.net';
const approvedProjects = new WeakMap();
const approvedFiles = new WeakMap();
const previewApproval = Symbol('CurseForge download approval');
const approvalLifetime = 60_000;
const exactId = /^cf-([1-9]\d{0,11})-([1-9]\d{0,11})$/;
const positiveId = /^[1-9]\d{0,11}$/;

export function curseForgeFileURL(value) {
  try {
    const url = new URL(value);
    if (![curseForgeEdge, media].includes(url.origin) || url.username || url.password || url.hash ||
        !/^\/files\/\d+\/\d+\/[^/]+$/.test(url.pathname)) return null;
    if ([...url.searchParams.keys()].some(key => /^(?:(?:x[-_])?api[-_]?key|authorization|cookie)$/i.test(key))) return null;
    return url.href;
  } catch {
    return null;
  }
}

function projectPermission(project) {
  return {id: String(project.id), permitted: project.allowModDistribution !== false && project.isAvailable !== false};
}

function filePermission(value) {
  const identity = `cf-${value.modId}-${value.id}`;
  const rawHash = Array.isArray(value.hashes) && value.hashes.find(h => h?.algo === 1)?.value;
  const hash = typeof rawHash === 'string' ? rawHash.toLowerCase() : null;
  const url = value.isAvailable === false ? null : curseForgeFileURL(value.downloadUrl);
  return {identity, url, hash, size: value.fileLength};
}

export function confirmCurseForgeProject(project, upstream) {
  if (positiveId.test(String(upstream.id))) {
    approvedProjects.set(project, {...projectPermission(upstream), until: Date.now() + approvalLifetime});
  }
}

export function confirmCurseForgeFile(file, upstream) {
  const entry = filePermission(upstream);
  if (exactId.test(entry.identity)) approvedFiles.set(file, {...entry, until: Date.now() + approvalLifetime});
}

// Approval belongs to the preview that already requested the official metadata.
// A symbol survives internal object spreads and is omitted from JSON and IPC.
export function carryCurseForgeApproval(file, project) {
  if (file[previewApproval]) return {[previewApproval]: file[previewApproval]};
  const checkedProject = project && approvedProjects.get(project);
  const checkedFile = approvedFiles.get(file);
  return checkedProject && checkedFile ? {[previewApproval]: {project: checkedProject, file: checkedFile}} : {};
}

function blocked(reason) {
  return Object.assign(Error(reason), {code: 'CURSEFORGE_DISTRIBUTION', status: 403});
}

export async function authorizedCurseForgeURL(file, {fetcher, request, signal, refresh = false}) {
  const match = exactId.exec(file.versionId || '');
  if (!match) throw blocked('CurseForge could not verify the file ID. Use the original CurseForge manifest or the project page. / 无法验证 CurseForge 文件 ID，请使用原始 CurseForge 清单或打开项目页。');
  const [, projectId, fileId] = match;
  const api = new ContentApiSources({fetcher}, request);
  const json = path => api.json('curseforge', path, {signal, officialOnly: true});

  const approval = refresh ? undefined : file[previewApproval];
  const now = Date.now();
  let project = approval?.project.id === projectId && approval.project.until > now ? approval.project : null;
  if (!project) {
    const {data} = await json(`mods/${projectId}`);
    if (String(data?.id) !== projectId) throw blocked('CurseForge project ID could not be verified / 无法验证 CurseForge 项目 ID');
    project = projectPermission(data);
  }
  if (!project?.permitted) throw blocked('CurseForge project disables third-party distribution. Open the project page. / 作者未允许第三方分发，请打开项目页。');

  let entry = approval?.file.identity === file.versionId && approval.file.until > now ? approval.file : null;
  if (!entry) {
    const {data} = await json(`mods/${projectId}/files/${fileId}`);
    if (String(data?.modId) !== projectId || String(data?.id) !== fileId) throw blocked('CurseForge file ID could not be verified / 无法验证 CurseForge 文件 ID');
    entry = filePermission(data);
  }
  if (!entry?.url) throw blocked('CurseForge did not provide an authorized file address. Open the project page. / CurseForge 未提供已授权的文件地址，请打开项目页。');
  const expectedSha1 = file.algorithm === 'sha256' ? file.curseForgeSha1 : file.hash;
  if (!/^[a-f0-9]{40}$/.test(expectedSha1) || entry.hash !== expectedSha1 || entry.size !== file.size) {
    throw Object.assign(Error('CurseForge file hash or size changed. Preview the exact version again. / CurseForge 文件校验值或大小已变化，请重新预览该版本。'), {code: 'CHECKSUM'});
  }
  if (!refresh || entry.url !== file.url) return entry.url;
  const {data} = await json(`mods/${projectId}/files/${fileId}/download-url`);
  const refreshed = curseForgeFileURL(data);
  if (!refreshed) throw blocked('CurseForge did not authorize a new file address / CurseForge 未提供新的已授权下载地址');
  return refreshed;
}
