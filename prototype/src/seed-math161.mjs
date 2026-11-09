// SPDX-License-Identifier: MPL-2.0
// Original camera and relief calculations; no reference-app code is used.
import {viewWidth,viewHeight} from './seed-view134.mjs';
const bound=n=>Math.max(-29899999,Math.min(29899999,n));
export function keyboardPanCamera(camera,key){
 const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[key];
 if(!delta)return camera;
 return {...camera,x:bound(camera.x+delta[0]*camera.scale*40),z:bound(camera.z+delta[1]*camera.scale*40)};
}
export function zoomCamera(camera,scale,x,y,bounds){
 if(!bounds||bounds.width<=0||bounds.height<=0)return {...camera,scale};
 return {...camera,scale,
  x:bound(camera.x+(x/bounds.width-.5)*viewWidth*(camera.scale-scale)),
  z:bound(camera.z+(y/bounds.height-.5)*viewHeight*(camera.scale-scale))};
}
// Central differences, clamped within each row; distance is measured in blocks.
export function reliefShade(heights,columns,index,spacing){
 if(!heights.length||columns<1||!Number.isFinite(spacing)||spacing<=0)return 1;
 const rows=Math.ceil(heights.length/columns),x=index%columns,z=Math.floor(index/columns);
 const left=Math.max(0,x-1),right=Math.min(columns-1,x+1),top=Math.max(0,z-1),bottom=Math.min(rows-1,z+1);
 const dx=(heights[z*columns+right]-heights[z*columns+left])/(Math.max(1,right-left)*spacing);
 const dz=(heights[bottom*columns+x]-heights[top*columns+x])/(Math.max(1,bottom-top)*spacing);
 if(!Number.isFinite(dx)||!Number.isFinite(dz))return 1;
 return Math.max(.55,Math.min(1.35,(1-(dx+dz)*.5)/Math.hypot(dx,dz,1)));
}
