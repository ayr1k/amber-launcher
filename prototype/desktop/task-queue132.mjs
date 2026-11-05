// SPDX-License-Identifier: MPL-2.0
// FIFO admission; cancellation never belongs to another caller.
export class TaskQueue {
 constructor(limit=2){this.limit=limit;this.active=new Set();this.waiting=[];}
 async run(key,fn,{signal,onWaiting=()=>{}}={}){
  signal?.throwIfAborted();
  const ticket={key};
  await new Promise((resolve,reject)=>{
   ticket.resolve=resolve;ticket.reject=reject;ticket.signal=signal;
   ticket.abort=()=>{const i=this.waiting.indexOf(ticket);if(i>=0){this.waiting.splice(i,1);reject(signal.reason);this.pump();}};
   signal?.addEventListener('abort',ticket.abort,{once:true});this.waiting.push(ticket);onWaiting();this.pump();
  });
  try{signal?.throwIfAborted();return await fn();}finally{this.active.delete(ticket);this.pump();}
 }
 pump(){for(let i=0;i<this.waiting.length&&this.active.size<this.limit;){const t=this.waiting[i];if([...this.active].some(a=>a.key===t.key)){i++;continue;}this.waiting.splice(i,1);t.signal?.removeEventListener('abort',t.abort);this.active.add(t);t.resolve();}}
}
// Choose the task with the fewest active transfers. A new task gets the next
// available slots without interrupting streams already in progress.
export class TransferQueue extends TaskQueue {
 pump(){while(this.active.size<this.limit){let chosen=-1,best=Infinity;for(let i=0;i<this.waiting.length;i++){const t=this.waiting[i],count=[...this.active].filter(a=>a.key===t.key).length;if(count>=t.cap())continue;if(count<best){chosen=i;best=count;}}if(chosen<0)return;const [t]=this.waiting.splice(chosen,1);t.signal?.removeEventListener('abort',t.abort);this.active.add(t);t.resolve();}}
 async run(group,fn,{signal,limit=()=>128}={}){signal?.throwIfAborted();const ticket={key:group,cap:limit,signal};await new Promise((resolve,reject)=>{ticket.resolve=resolve;ticket.abort=()=>{const i=this.waiting.indexOf(ticket);if(i>=0){this.waiting.splice(i,1);reject(signal.reason);this.pump();}};signal?.addEventListener('abort',ticket.abort,{once:true});this.waiting.push(ticket);this.pump();});try{signal?.throwIfAborted();return await fn();}finally{this.active.delete(ticket);this.pump();}}
}
const files=new TaskQueue(Infinity),transfers=new TransferQueue(8);
export const withFileLock=(path,fn,signal)=>files.run(path.toLowerCase(),fn,{signal});
export const withTransferBudget=(fn,signal,{group=Symbol('transfer'),limit}={})=>transfers.run(group,fn,{signal,limit});
export function configureTransferBudget(limit){if(!Number.isInteger(limit)||limit<1||limit>128)throw Error('Invalid transfer limit');transfers.limit=limit;transfers.pump();}
