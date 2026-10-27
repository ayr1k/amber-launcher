// SPDX-License-Identifier: MPL-2.0
// Curated functionality, not popularity. Every candidate still needs live file checks.
export const tiers=['aggressive','balanced','conservative'];
export const features={
 renderer:{group:'performance',slugs:['sodium','embeddium'],reason:'reasonPerformance'},
 logic:{group:'performance',slugs:['lithium'],reason:'reasonLogic'},
 memory:{group:'performance',slugs:['ferrite-core'],reason:'memoryHelp'},
 culling:{group:'performance',slugs:['entityculling'],reason:'cullingHelp'},
 immediate:{group:'performance',slugs:['immediatelyfast'],reason:'immediateHelp'},
 background:{group:'performance',slugs:['dynamic-fps'],reason:'backgroundHelp'},
 menu:{group:'utility',slugs:['modmenu'],reason:'reasonMenu'},
 recipes:{group:'utility',slugs:['jei','emi','rei'],reason:'reasonRecipes'},
 identify:{group:'utility',slugs:['jade'],reason:'identifyHelp'},
 food:{group:'utility',slugs:['appleskin'],reason:'foodHelp'},
 inventory:{group:'utility',slugs:['mouse-tweaks'],reason:'inventoryHelp'},
 minimap:{group:'utility',slugs:['xaeros-minimap'],reason:'minimapHelp'},
 worldmap:{group:'utility',slugs:['xaeros-world-map'],reason:'worldmapHelp'},
 connected:{group:'visual',slugs:['continuity'],reason:'connectedHelp'},
 skins:{group:'visual',slugs:['3dskinlayers'],reason:'skinsHelp'},
 farming:{group:'gameplay',slugs:['farmers-delight','farmers-delight-refabricated'],reason:'farmingHelp'},
 decoration:{group:'gameplay',slugs:['supplementaries'],reason:'decorationHelp'},
 terrain:{group:'gameplay',slugs:['terralith'],reason:'reasonExploration'},
 machinery:{group:'gameplay',slugs:['create','create-fabric'],reason:'machineryHelp'},
};
export const utilityChoices=['recipes','identify','food','inventory','minimap','worldmap','connected','skins'];
export const gameplayChoices=['farming','decoration','terrain','machinery'];
export function featureFor(slug){return Object.keys(features).find(k=>features[k].slugs.includes(slug));}
export function requestedFeatures(a,tier){
 if(a.change==='vanilla')return [];
 const out=['renderer','logic','memory',...a.features];
 if(tier!=='conservative')out.push('culling','immediate');
 if(a.power||tier==='aggressive')out.push('background');
 if(a.hud!=='simple')out.push('menu');
 if(a.change==='expanded'&&a.play==='single'&&!a.addon){
   const selected=a.gameplay;
   out.push(...(tier==='aggressive'?selected:tier==='balanced'?selected.slice(0,1):[]));
 }
 return [...new Set(out)].filter(k=>!a.excludedFeatures?.includes(k));
}
export function visualBudget(a,tier,detected=0){
 const ram=a.memoryGB||detected;
 const allowed=a.gpu==='dedicated'&&ram>=8&&!a.power&&a.priority!=='performance';
 let profile=tier==='aggressive'?'MEDIUM':'LOW';
 if(tier==='conservative'||a.resolution!=='1080'||a.fps==='120'||ram<16||['unknown','entry'].includes(a.gpuBudget))profile='VERYLOW';
 if(tier==='aggressive'&&a.gpuBudget==='high'&&a.priority==='visual'&&a.resolution==='1080'&&a.fps==='60'&&ram>=32)profile='HIGH';
 return {allowed,profile,shaders:allowed&&a.shaders!=='off'&&(tier!=='conservative'||a.shaders==='on'),lod:allowed&&a.lod!=='off'&&(tier!=='conservative'||!['auto','off'].includes(a.lod))};
}
export function impact(roots){
 return roots.some(r=>r.group==='gameplay')?'expanded':roots.some(r=>r.group==='visual'||r.group==='utility')?'light':'vanilla';
}
