// SPDX-License-Identifier: MPL-2.0
export function connectionAddress172(value) {
 if (typeof value !== 'string') return false;
 const match = /^(\d{1,3}(?:\.\d{1,3}){3}|\[[a-f\d:]+(?:%[\w.-]+)?\]):(\d{1,5})$/i.exec(value);
 return !!match && Number(match[2]) > 0 && Number(match[2]) <= 65535 &&
  (match[1].startsWith('[') ? validIPv6(match[1]) : match[1].split('.').every(v => Number(v) <= 255));
}
export function localAddress172(port, addresses) {
 const candidate = port || addresses.find(connectionAddress172)?.split(':').at(-1);
 const value = `127.0.0.1:${candidate || '—'}`;
 return connectionAddress172(value) ? value : '127.0.0.1:—';
}

function validIPv6(host) {
 try { return new URL('http://' + host).hostname.startsWith('['); } catch { return false; }
}
export function copyServerAddress172(value, clipboard) {
 if (!connectionAddress172(value)) throw Error('Invalid server address / 无效服务器地址');
 clipboard.writeText(value);
 return true;
}
