// SPDX-License-Identifier: MPL-2.0
// Versioned declarative presentation only. No CSS, paths, scripts or launch policy.
export const compositionDefaults={workspacePadding:30,gap:28,headerHeight:72,navigationSize:20,sidebarExtras:true,sidebarAbout:true,launchLayout:'classic',launchWidth:560,titleSize:38,launchTopSpace:0,buttonHeight:62,dockOpacity:100,shortcuts:'classic',eyebrow:true};
const ranges={workspacePadding:[0,64],gap:[0,64],headerHeight:[64,96],navigationSize:[20,32],launchWidth:[280,760],titleSize:[28,72],launchTopSpace:[0,320],buttonHeight:[44,88],dockOpacity:[0,100]};
export function validateComposition(value){
 if(value==null)return null;if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid composition / 布局外观无效');
 const v={...compositionDefaults,...value};for(const [key,[min,max]] of Object.entries(ranges))if(!Number.isFinite(v[key])||v[key]<min||v[key]>max)throw Error('Invalid composition value: '+key);
 for(const key of ['sidebarExtras','sidebarAbout','eyebrow'])if(typeof v[key]!=='boolean')throw Error('Invalid composition flag: '+key);
 if(!['classic','stacked'].includes(v.launchLayout)||!['classic','compact'].includes(v.shortcuts))throw Error('Invalid composition variant');
 return Object.fromEntries(Object.keys(compositionDefaults).filter(key=>key!=='sidebarAbout'||value.sidebarAbout!==undefined).map(key=>[key,v[key]]));
}
export function validateSectionStyle(value){
 if(value===undefined)return undefined;if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid section style');
 const out={};for(const [key,[min,max]] of Object.entries({padding:[0,80],paddingTop:[0,80],paddingRight:[0,80],paddingBottom:[0,80],paddingLeft:[0,80],gap:[0,64],surfaceOpacity:[0,100],position:[0,100],radius:[0,24],borderWidth:[0,3]}))if(value[key]!==undefined){if(!Number.isFinite(value[key])||value[key]<min||value[key]>max)throw Error('Invalid section value: '+key);out[key]=value[key];}
 for(const [key,choices] of Object.entries({background:['none','global','hero','artwork'],fit:['cover','contain'],separator:['none','left','top'],scroll:['auto','section']}))if(value[key]!==undefined){if(!choices.includes(value[key]))throw Error('Invalid section choice: '+key);out[key]=value[key];}
 if(value.shadow!==undefined){if(!['none','soft','raised'].includes(value.shadow))throw Error('Invalid section shadow');out.shadow=value.shadow;}
 if(value.viewport!==undefined){if(typeof value.viewport!=='boolean')throw Error('Invalid section height');out.viewport=value.viewport;}
 return out;
}
export function needsComposition(appearance){const visit=n=>!!n&&(!!n.style||n.children?.some(visit));return !!appearance.composition||!!visit(appearance.canvas);}
export function hasSectionPanels(n){return !!n&&(['radius','borderWidth','shadow'].some(k=>n.style?.[k]!==undefined)||!!n.children?.some(hasSectionPanels));}
export function compositionVariables(c){if(!c)return {};return Object.fromEntries(Object.entries({padding:c.workspacePadding,gap:c.gap,header:c.headerHeight,nav:c.navigationSize,width:c.launchWidth,title:c.titleSize,top:c.launchTopSpace,button:c.buttonHeight}).map(([k,v])=>['--composition-'+k,v+'px']).concat([['--composition-dock',c.dockOpacity+'%']]));}
