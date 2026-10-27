// SPDX-License-Identifier: MPL-2.0
// In-memory, single-use grants: renderer fields and JSON files cannot mint one.
const grants = new WeakMap();
export function grantLaunch(identity, validate, now = Date.now) {
  const result = Object.freeze({...identity});
  grants.set(result, {validate, now, expires: now() + 15 * 60 * 1000});
  return result;
}
export function requireLaunchGrant(identity, consume = false) {
  const grant = identity && grants.get(identity);
  if (!grant || grant.now() >= grant.expires) throw Error('启动授权无效或已过期，请重新点击启动。');
  grant.validate();
  if (consume) grants.delete(identity);
}
