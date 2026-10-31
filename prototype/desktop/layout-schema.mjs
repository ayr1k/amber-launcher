// SPDX-License-Identifier: MPL-2.0
export const sections=['launch','shortcuts','activity','details'];
export const defaultLayout={navigation:'left',sidebarWidth:260,contentWidth:'wide',instanceView:'list',homeSections:sections,hiddenSections:[]};
export function validateLayout(input){const l={...defaultLayout,...input};if(!['left','right','top'].includes(l.navigation)||!Number.isInteger(l.sidebarWidth)||l.sidebarWidth<72||l.sidebarWidth>360||!['wide','comfortable'].includes(l.contentWidth)||!['list','grid'].includes(l.instanceView)||!Array.isArray(l.homeSections)||l.homeSections.length!==sections.length||new Set(l.homeSections).size!==sections.length||l.homeSections.some(s=>!sections.includes(s))||!Array.isArray(l.hiddenSections)||l.hiddenSections.some(s=>!sections.includes(s)||s==='launch'))throw Error('布局配置无效');return {...Object.fromEntries(Object.keys(defaultLayout).map(k=>[k,l[k]])),homeSections:[...l.homeSections],hiddenSections:[...new Set(l.hiddenSections)]};}

// Keep full labels readable when reusing a narrow icon-only layout.
export function sidebarWidth(layout,appearance){return Math.max(appearance?.enabled&&appearance.navLabels===false?72:220,Math.min(360,layout?.sidebarWidth??260));}
