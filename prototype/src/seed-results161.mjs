// SPDX-License-Identifier: MPL-2.0
import {sceneKey,viewWidth,viewHeight} from './seed-view134.mjs';
// Capability metadata from the pinned MIT Cubiomes getStructureConfig_default,
// desktop/vendor/cubiomes/finders.c; IDs match its MCVersion enum (through 35).
const capabilities={stronghold:[0,10],village:[0,10],desert_pyramid:[0,10],jungle_temple:[0,10],swamp_hut:[0,10],igloo:[0,12],monument:[0,11],mansion:[0,14],outpost:[0,17],ocean_ruin:[0,16],shipwreck:[0,16],ruined_portal:[0,19],ancient_city:[0,23],treasure:[0,16],trail_ruins:[0,25],trial_chambers:[0,26],abandoned_camp:[0,35],fortress:[-1,10],bastion:[-1,19],nether_portal:[-1,19],end_city:[1,12]};
export function supportedStructures(camera){return Object.entries(capabilities).filter(([, [dimension,min]])=>camera.dimension===dimension&&camera.version>=min&&camera.version<=35).map(([type])=>type);}
// Only expose predictions for the current scene and visible map, never stale rows.
export function visibleStructures(datasets,camera,terrain,shown,limit=100){
 const key=sceneKey({...camera,terrain}),halfX=viewWidth*camera.scale/2,halfZ=viewHeight*camera.scale/2;
 const left=camera.x-halfX,right=camera.x+halfX,top=camera.z-halfZ,bottom=camera.z+halfZ;
 const layers=datasets.filter(d=>sceneKey(d.request)===key),features=new Map();
 for(const {result} of layers)for(const f of result.features||[]){
  if(!shown.includes(f.type)||!Number.isFinite(f.x)||!Number.isFinite(f.z)||f.x<left||f.x>=right||f.z<top||f.z>=bottom)continue;
  features.set(`${f.type}:${f.x}:${f.z}`,{...f,distance:Math.hypot(f.x-camera.x,f.z-camera.z)});
 }
 const rows=[...features.values()].sort((a,b)=>a.distance-b.distance||a.type.localeCompare(b.type)||a.x-b.x||a.z-b.z);
 return {rows:rows.slice(0,limit),total:rows.length,covered:layers.some(({request:r})=>r.structures&&r.x<=left&&r.z<=top&&r.x+r.width*r.scale>=right&&r.z+r.height*r.scale>=bottom)};
}
