// SPDX-License-Identifier: MPL-2.0
export const viewWidth=192,viewHeight=viewWidth*3/5;
export const sceneKey=p=>JSON.stringify([p.seed,p.version,p.dimension,p.y,!!p.terrain]);
const bounded=n=>Math.max(-29899999,Math.min(29899999,n));
export function panCamera(start,dx,dy,bounds){
 return {...start,x:bounded(start.x-dx/bounds.width*viewWidth*start.scale),z:bounded(start.z-dy/bounds.height*viewHeight*start.scale)};
}
export function mapPosition(camera,x,y,bounds){
 return {x:Math.floor(camera.x+(x/bounds.width-.5)*viewWidth*camera.scale),z:Math.floor(camera.z+(y/bounds.height-.5)*viewHeight*camera.scale)};
}
export function bufferedRequest(p,terrain,structures=true){
 const step=p.scale*16;
 return {...p,width:256,height:192,x:Math.max(-29900000,Math.floor((p.x-128*p.scale)/step)*step),z:Math.max(-29900000,Math.floor((p.z-96*p.scale)/step)*step),terrain,structures};
}
// One native calculation at a time; pointer movement replaces only the queued job.
// In-flight results remain useful as map coverage while the next area is generated.
export class LatestMapQueue {
 constructor(run,receive,fail,status){Object.assign(this,{run,receive,fail,status});this.closed=false;this.running=false;this.pending=null;this.lastKey='';}
 enqueue(request){
  const key=JSON.stringify(request);if(this.closed||key===this.lastKey)return;
  this.lastKey=key;this.pending={request,key};this.pump();
 }
 async pump(){
  if(this.running||this.closed)return;this.running=true;this.status(true);
  while(this.pending&&!this.closed){const job=this.pending;this.pending=null;
   try{const result=await this.run(job.request);if(!this.closed)this.receive({request:job.request,result});}
   catch(error){if(!this.closed&&job.key===this.lastKey){this.lastKey='';this.fail(error);}}
  }
  this.running=false;if(!this.closed)this.status(false);
 }
 dispose(){this.closed=true;this.pending=null;}
}
