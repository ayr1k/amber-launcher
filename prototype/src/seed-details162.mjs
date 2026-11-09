// SPDX-License-Identifier: MPL-2.0
import {t as translateText} from '../desktop/localization.mjs';
import {validPredictionCoordinate} from '../desktop/seed-coordinates162.mjs';
import {viewWidth,viewHeight} from './seed-view134.mjs';
export const featureKey=f=>`${f.type}:${f.x}:${f.z}`;
export const markerMatches=(m,p)=>m.seed===p.seed&&m.dimension===p.dimension&&m.version===p.version;
export const legacyMarkerMatches=(m,p)=>m.seed===p.seed&&m.dimension===p.dimension&&m.version==null;
export function validMarks(rows){return Array.isArray(rows)&&rows.length<=500&&rows.every(m=>m&&typeof m.name==='string'&&m.name.length<=80&&typeof m.seed==='string'&&m.seed.length<=256&&[-1,0,1].includes(m.dimension)&&(m.version==null||Number.isInteger(m.version)&&m.version>=10&&m.version<=35)&&validPredictionCoordinate(m.x)&&validPredictionCoordinate(m.z));}
export function addFeatureMarker(marks,f,p,name){
 if(!validPredictionCoordinate(f.x)||!validPredictionCoordinate(f.z))throw Error('Invalid marker coordinates');
 if(marks.some(m=>markerMatches(m,p)&&m.x===f.x&&m.z===f.z&&m.name===name))return marks;
 if(marks.length>=500)throw Error('最多保存 500 个标记 / Up to 500 markers');
 return [...marks,{x:f.x,z:f.z,seed:p.seed,version:p.version,dimension:p.dimension,name}];
}
export function nearbyFeatures(rows,pos,scale,radius=4){return rows.filter(f=>Math.hypot(f.x-pos.x,f.z-pos.z)<=scale*radius).sort((a,b)=>Math.hypot(a.x-pos.x,a.z-pos.z)-Math.hypot(b.x-pos.x,b.z-pos.z)||featureKey(a).localeCompare(featureKey(b)));}
export const STRUCTURE_RADIUS_CSS=10;
export function featuresAtPointer(rows,camera,x,y,bounds){
 if(!bounds||bounds.width<=0||bounds.height<=0)return [];
 // Keep sub-block precision for hit testing; integer rounding is for markers only.
 const pos={x:camera.x+(x/bounds.width-.5)*viewWidth*camera.scale,z:camera.z+(y/bounds.height-.5)*viewHeight*camera.scale};
 return nearbyFeatures(rows,pos,camera.scale,viewWidth/bounds.width*STRUCTURE_RADIUS_CSS);
}
// Completeness is proven only by a covering result for every enabled type.
// Earlier overlapping results may supply points, but cannot certify current coverage.
export function structureCoverage(datasets,camera,terrain,types){
 const left=camera.x-96*camera.scale,right=camera.x+96*camera.scale,top=camera.z-57.6*camera.scale,bottom=camera.z+57.6*camera.scale;
 const layers=datasets.filter(({request:r})=>r.seed===camera.seed&&r.version===camera.version&&r.dimension===camera.dimension&&r.y===camera.y&&!!r.terrain===!!terrain&&r.structures&&r.x<=left&&r.z<=top&&r.x+r.width*r.scale>=right&&r.z+r.height*r.scale>=bottom);
 const latest=layers.at(-1),statuses=new Map((latest?.result.structureStatus||[]).map(s=>[s.type,s]));
 return {covered:!!latest,issues:types.map(type=>statuses.get(type)||{type,status:'unknown'}).filter(s=>s.status!=='complete')};
}
export const biomeChinese={ocean:'海洋',plains:'平原',desert:'沙漠',windswept_hills:'风袭丘陵',forest:'森林',taiga:'针叶林',swamp:'沼泽',river:'河流',nether_wastes:'下界荒地',the_end:'末地',frozen_ocean:'冻洋',frozen_river:'冻河',snowy_plains:'雪原',snowy_mountains:'雪山',mushroom_fields:'蘑菇岛',mushroom_field_shore:'蘑菇岛岸',beach:'沙滩',desert_hills:'沙漠丘陵',wooded_hills:'繁茂的丘陵',taiga_hills:'针叶林丘陵',mountain_edge:'山地边缘',jungle:'丛林',jungle_hills:'丛林丘陵',sparse_jungle:'稀疏的丛林',deep_ocean:'深海',stony_shore:'石岸',snowy_beach:'积雪的沙滩',birch_forest:'白桦林',birch_forest_hills:'白桦林丘陵',dark_forest:'黑森林',snowy_taiga:'积雪的针叶林',snowy_taiga_hills:'积雪的针叶林丘陵',old_growth_pine_taiga:'原始松木针叶林',giant_tree_taiga_hills:'巨型针叶林丘陵',windswept_forest:'风袭森林',savanna:'热带草原',savanna_plateau:'热带高原',badlands:'恶地',wooded_badlands:'繁茂的恶地',badlands_plateau:'恶地高原',small_end_islands:'末地小型岛屿',end_midlands:'末地内陆',end_highlands:'末地高地',end_barrens:'末地荒地',warm_ocean:'暖水海洋',lukewarm_ocean:'温水海洋',cold_ocean:'冷水海洋',deep_warm_ocean:'暖水深海',deep_lukewarm_ocean:'温水深海',deep_cold_ocean:'冷水深海',deep_frozen_ocean:'冰冻深海',seasonal_forest:'季节性森林',rainforest:'雨林',shrubland:'灌木丛',the_void:'虚空',sunflower_plains:'向日葵平原',desert_lakes:'沙漠湖泊',windswept_gravelly_hills:'风袭沙砾丘陵',flower_forest:'繁花森林',taiga_mountains:'针叶林山地',swamp_hills:'沼泽丘陵',ice_spikes:'冰刺之地',modified_jungle:'变种丛林',modified_jungle_edge:'变种丛林边缘',old_growth_birch_forest:'原始白桦林',tall_birch_hills:'高大白桦丘陵',dark_forest_hills:'黑森林丘陵',snowy_taiga_mountains:'积雪的针叶林山地',old_growth_spruce_taiga:'原始云杉针叶林',giant_spruce_taiga_hills:'巨型云杉针叶林丘陵',modified_gravelly_mountains:'沙砾山地变种',windswept_savanna:'风袭热带草原',shattered_savanna_plateau:'破碎的热带高原',eroded_badlands:'风蚀恶地',modified_wooded_badlands_plateau:'繁茂的恶地高原变种',modified_badlands_plateau:'恶地高原变种',bamboo_jungle:'竹林',bamboo_jungle_hills:'竹林丘陵',soul_sand_valley:'灵魂沙峡谷',crimson_forest:'绯红森林',warped_forest:'诡异森林',basalt_deltas:'玄武岩三角洲',dripstone_caves:'溶洞',lush_caves:'繁茂洞穴',meadow:'草甸',grove:'雪林',snowy_slopes:'积雪的山坡',jagged_peaks:'尖峭山峰',frozen_peaks:'冰封山峰',stony_peaks:'裸岩山峰',deep_dark:'深暗之域',mangrove_swamp:'红树林沼泽',cherry_grove:'樱花树林',pale_garden:'苍白之园',sulfur_caves:'硫磺洞穴',dappled_forest:'斑驳森林'};
export function biomeName(b,zh){if(!b)return '';const source=biomeChinese[b.name],translated=source?translateText(source):'';return source&&(zh||translated!==source)?translated:b.name.replaceAll('_',' ');}
