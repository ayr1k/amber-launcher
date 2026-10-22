// SPDX-License-Identifier: MPL-2.0
export function pendingCode(accounts, now = Date.now()) {
  const device = accounts.list().device;
  if (device?.state !== 'pending' || device.expiresAt <= now) throw Error('验证码已失效，请重新点击微软登录。');
  if (typeof device.code !== 'string' || !/^[A-Za-z0-9-]{4,32}$/.test(device.code)) throw Error('微软返回的验证码格式无效，请重试。');
  return device;
}
export async function copyMicrosoftCode(accounts, clipboard) {
  await clipboard.writeText(pendingCode(accounts).code);
  return true;
}
export async function beginMicrosoftLogin(accounts, clipboard, openExternal) {
  const result = await accounts.startMicrosoft();
  const feedback = [];
  try { await copyMicrosoftCode(accounts, clipboard); feedback.push('验证码已复制，请在微软页面粘贴。'); }
  catch { feedback.push('自动复制失败，请手动选中并复制下方验证码。'); }
  try { await openExternal(pendingCode(accounts).url); }
  catch { feedback.push('未能打开浏览器，请点击“重新打开验证网页”，或手动打开下方微软地址。'); }
  return {...result, feedback:feedback.join(' ')};
}
