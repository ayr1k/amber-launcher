import {t} from './localization.mjs';
// SPDX-License-Identifier: MPL-2.0
export const legacyGames=['1.7.10','1.8','1.8.8','1.8.9','1.9','1.9.4','1.10','1.10.2','1.11','1.11.2','1.12','1.12.1','1.12.2'];
export function canCombine(game,selected,next){
 const all=new Set([...selected,next]);if(all.size<=1)return true;
 if([...all].some(x=>['fabric','neoforge'].includes(x)))return false;
 if([...all].some(x=>!['forge','liteloader','optifine'].includes(x)))return false;
 return !all.has('liteloader')||legacyGames.includes(game);
}
export function instanceLoaders(item){return [...new Set([item.loader,...(item.liteVersion?['liteloader']:[])])];}
export function componentLabel(item){return [item.loader==='vanilla'?t('原版'):`${item.loader} ${item.loaderVersion||''}`,item.liteVersion&&`LiteLoader ${item.liteVersion}`,item.optifineVersion&&`OptiFine ${item.optifineVersion}`].filter(Boolean).join(' + ');}
