// SPDX-License-Identifier: MPL-2.0
// A selection intent invalidates every older read/preview, even A -> B -> A.
export class EditorRequests {
 constructor(){this.selection=0;this.channels=new Map();}
 select(){this.selection++;this.channels.clear();}
 begin(channel){const selection=this.selection,serial=(this.channels.get(channel)||0)+1;this.channels.set(channel,serial);return ()=>this.selection===selection&&this.channels.get(channel)===serial;}
}
export function tabLabel(name,names){const base=name.split('/').at(-1);return names.filter(n=>n.split('/').at(-1)===base).length>1?name:base;}
export function firstDifference(a,b){let i=0;while(i<Math.min(a.length,b.length)&&a[i]===b[i])i++;return a===b?null:{line:a.slice(0,i).split(/\r\n|\r|\n/).length,offset:i};}
