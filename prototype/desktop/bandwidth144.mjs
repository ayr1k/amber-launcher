// SPDX-License-Identifier: MPL-2.0
// One cancellable token bucket shared by all download streams. Metadata is exempt.
export class Bandwidth144 {
 constructor(){this.rate=0;this.tokens=0;this.at=Date.now();this.queue=[];this.timer=null;}
 configure(kib){if(!Number.isInteger(kib)||kib<0||kib>1048576)throw Error('Download limit: 0–1048576 KiB/s');this.rate=kib*1024;this.tokens=0;this.at=Date.now();this.pump();}
 take(bytes,signal){signal?.throwIfAborted();if(!this.rate)return Promise.resolve();return new Promise((resolve,reject)=>{const t={remaining:bytes,resolve,reject,signal};t.abort=()=>{const i=this.queue.indexOf(t);if(i>=0)this.queue.splice(i,1);reject(signal.reason);this.pump();};signal?.addEventListener('abort',t.abort,{once:true});this.queue.push(t);this.pump();});}
 pump(){clearTimeout(this.timer);this.timer=null;const now=Date.now();this.tokens=Math.min(this.rate/4,this.tokens+(now-this.at)*this.rate/1000);this.at=now;
  while(this.queue.length){const t=this.queue[0];if(this.rate){const n=Math.min(this.tokens,t.remaining);this.tokens-=n;t.remaining-=n;if(t.remaining>0)break;}this.queue.shift();t.signal?.removeEventListener('abort',t.abort);t.resolve();}
  if(this.queue.length)this.timer=setTimeout(()=>this.pump(),25);
 }
}
