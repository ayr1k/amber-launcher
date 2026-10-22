// SPDX-License-Identifier: MPL-2.0
export const instanceIcons = ['grass','dirt','anvil','pickaxe'];
export function validateIcon(value='grass') {
 if (!instanceIcons.includes(value)) throw Error('请选择内置的实例图标。');
 return value;
}
export function defaultInstanceName(game,components=[]) {
 const order=['forge','neoforge','fabric','liteloader','optifine'];
 return `${game}-${order.filter(k=>components.includes(k)).join('+')||'vanilla'}`;
}
