// SPDX-License-Identifier: MPL-2.0
// Camera bounds leave room for overscan; returned points can lie beyond them.
export const CAMERA_LIMIT=29899999;
// Covers native request origin +/-29,900,000 plus 256 * 4096 blocks.
// This is a bounded prediction/clipboard contract, not a Minecraft world-border guarantee.
export const PREDICTION_LIMIT=31000000;
export const validPredictionCoordinate=n=>Number.isInteger(n)&&Math.abs(n)<=PREDICTION_LIMIT;
export function boundedCamera(p){
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z))throw Error('Invalid camera coordinates');
 const bound=n=>Math.max(-CAMERA_LIMIT,Math.min(CAMERA_LIMIT,n));
 return {...p,x:bound(p.x),z:bound(p.z)};
}
