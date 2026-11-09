// SPDX-License-Identifier: MPL-2.0
// A launch-scoped controller. Never changes the separately confirmed manual mode.
export class PrelaunchMemory164 {
 constructor({memory,settings,now=Date.now,timeoutMs=3000}={}){Object.assign(this,{memory,settings,now,timeoutMs});this.active=null;this.last=null;this.sequence=0;}
 state(){return {active:this.active?{id:this.active.id,phase:this.active.phase,startedAt:this.active.startedAt}:null,last:this.last};}
 begin(){if(this.active)throw Error('Launch preparation already active / 正在准备启动');const attempt={id:++this.sequence,controller:new AbortController(),phase:'preparing',startedAt:this.now()};this.active=attempt;return attempt;}
 cancel(id,kind){const a=this.active;if(!a||a.id!==id||a.phase==='launched')return false;if(kind==='launch'){a.controller.abort(Error('Launch cancelled / 启动已取消'));a.trimController?.abort();return true;}if(kind==='memory'&&a.phase==='memory'){a.skipped=true;a.trimController?.abort();return true;}return false;}
 finish(a){if(this.active===a)this.active=null;}
 run(a){if(!a||this.active!==a)return Promise.reject(Error('Invalid launch attempt'));return a.memoryPromise??=this.runOnce(a);}
 async runOnce(a){
  a.controller.signal.throwIfAborted();const start=this.now();
  const record=(status,rows=[])=>{const result={id:a.id,status,rows,elapsedMs:Math.max(0,this.now()-start),at:new Date(this.now()).toISOString()};this.last=result;return result;};
  let enabled;try{enabled=(await this.settings.get()).prelaunchMemory164===true;}catch{return record('settings-unavailable');}
  a.controller.signal.throwIfAborted();
  if(!enabled)return record('disabled');
  if(this.memory.platform!=='win32')return record('unsupported');
  if(this.memory.busy)return record('busy');
  if(this.memory.lastRun!==null&&this.now()-this.memory.lastRun<30000)return record('cooldown');
  this.memory.busy=true;this.memory.lastRun=this.now();a.phase='memory';a.trimController=new AbortController();
  let timer,timedOut=false;const abort=()=>a.trimController.abort();a.controller.signal.addEventListener('abort',abort,{once:true});
  try{
   // The native helper receives the same deadline and cancellation signal. Keep the
   // lock until it settles, even if a faulty injected backend ignores cancellation.
   const work=Promise.resolve().then(()=>this.memory.trim([{pid:this.memory.pid,creationTime:this.memory.creationTime}],{signal:a.trimController.signal,timeout:this.timeoutMs}));
   const stopped=new Promise(resolve=>{a.trimController.signal.addEventListener('abort',()=>resolve(null),{once:true});if(a.trimController.signal.aborted)resolve(null);});
   timer=setTimeout(()=>{timedOut=true;a.trimController.abort();},this.timeoutMs);
   work.finally(()=>{this.memory.busy=false;}).catch(()=>{});
   const rows=await Promise.race([work,stopped]);
   if(a.controller.signal.aborted){record('launch-cancelled');a.controller.signal.throwIfAborted();}
   if(timedOut)return record('timeout');
   if(a.skipped)return record('cancelled');
   return record(rows?.every(r=>r.ok)?'trimmed':'not-trimmed',rows||[]);
  }catch(e){if(a.controller.signal.aborted){record('launch-cancelled');throw a.controller.signal.reason;}return record(timedOut?'timeout':a.skipped?'cancelled':'failed');}
  finally{clearTimeout(timer);a.controller.signal.removeEventListener('abort',abort);a.phase='preparing';delete a.trimController;}
 }
}
