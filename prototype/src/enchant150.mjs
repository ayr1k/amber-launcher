// SPDX-License-Identifier: MPL-2.0
import data from './vendor/enchant-order/data.mjs';
export function validateEnchantSelection(item,selection){
 if(!data.items.includes(item)||item==='book')throw Error('请选择有效装备。');
 const entries=Object.entries(selection).filter(([,level])=>level!==0);
 if(!entries.length||entries.length>10)throw Error('请选择 1 至 10 种附魔。');
 for(const [id,level] of entries){const e=data.enchants[id];if(!e||!e.items.includes(item)||!Number.isInteger(level)||level<1||level>Number(e.levelMax))throw Error('附魔或等级不适用于此装备。');if(e.incompatible.some(key=>entries.some(([id])=>id===key)))throw Error('所选附魔互不兼容，请调整组合。');}
 return entries;
}
