// SPDX-License-Identifier: MPL-2.0
import {nodeRestriction150} from '../desktop/sakura-rules150.mjs';

export const sakuraNext177 = {
  credentials: '关闭此窗口，先在 Sakura FRP 保存访问密钥。',
  pending: '关闭此窗口，在 Sakura FRP 核对远端结果后再试。',
  catalog: '先读取或重新读取节点与账号额度。',
  port: '请选择有效的实例端口。',
  scope: '请选择实际的服务器使用范围。',
  node: '请选择符合当前端口协议和使用范围的节点。',
  quota: '请在 Sakura 控制台检查或释放隧道额度，再重新读取。',
  name: '请输入有效的远端隧道名称。',
  remote: '请输入 1–65535 的整数，或留空自动分配。',
};

export function readSakuraCatalog177(value) {
  return value && Array.isArray(value.nodes) && [value.used,value.limit,value.level].every(Number.isSafeInteger) &&
    value.used >= 0 && value.limit >= 0 && value.level >= 0 ? value : null;
}

function catalogNodes(catalog) {
  return catalog.nodes.filter(node => Number.isSafeInteger(node?.id) && node.id > 0);
}

export function sakuraCreateOptions177(catalog, port, scope) {
  if (!readSakuraCatalog177(catalog)) return [];
  return catalogNodes(catalog).map(node => ({
    ...node, reason: nodeRestriction150(node, port?.protocol, scope === 'public', catalog.level),
  }));
}

export function sakuraCreateReadiness177({hasToken, pending, catalog, current, port, scope, node, name, remote}) {
  if (!hasToken) return {code:'credentials', reason:'请先保存 Sakura 访问密钥。'};
  if (pending) return {code:'pending', reason:'有待确认的远端操作，请先核对结果，勿重复提交。'};
  if (!catalog) return {code:'catalog', reason:'尚未读取节点与账号额度。'};
  if (!readSakuraCatalog177(catalog)) return {code:'catalog', reason:'无法确认 Sakura 账号权限或额度。'};
  if (!current || !port) return {code:'port', reason:'请选择有效的实例端口。'};
  if (scope !== 'private' && scope !== 'public') return {code:'scope', reason:'请选择实际的服务器使用范围。'};
  if (catalog.used >= catalog.limit) return {code:'quota', reason:'Sakura 隧道额度已用完。'};
  const selected = catalogNodes(catalog).find(row => String(row.id) === String(node));
  if (!selected) return {code:'node', reason:'尚未选择可验证的 Sakura 节点。'};
  const reason = nodeRestriction150(selected, port.protocol, scope === 'public', catalog.level);
  if (reason) return {code:'node', reason};
  if (!name.trim() || name.length > 80) return {code:'name', reason:'请输入有效的远端隧道名称。'};
  if (remote !== '' && (!/^\d+$/.test(remote) || Number(remote) < 1 || Number(remote) > 65535)) {
    return {code:'remote', reason:sakuraNext177.remote};
  }
  return {payload:{name,portId:port.id,node:selected.id,remote:remote === '' ? '' : Number(remote),publicGame:scope === 'public'}};
}

export function switchSakuraNode177(draft, id, options) {
  return options.some(row => String(row.id) === String(id) && !row.reason) && String(draft.node) !== String(id)
    ? {...draft,node:id,remote:''} : draft;
}

export async function withSakuraCreateLock177(lock, task, onBusy) {
  if (lock.current) return;
  lock.current = true;
  try {
    onBusy(true);
    return await task();
  } finally {
    lock.current = false;
    onBusy(false);
  }
}
