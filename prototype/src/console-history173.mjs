// SPDX-License-Identifier: MPL-2.0
// One console's renderer-memory history. Never serialize commands or drafts.
export class ConsoleHistory173 {
 constructor(limit=100){this.limit=limit;this.entries=[];this.cursor=-1;this.draft='';}
 browse(direction,value){
  if(!this.entries.length||direction==='down'&&this.cursor<0)return null;
  if(this.cursor<0){this.draft=value;this.cursor=this.entries.length;}
  this.cursor=Math.max(0,Math.min(this.entries.length,this.cursor+(direction==='up'?-1:1)));
  if(this.cursor===this.entries.length){this.cursor=-1;return this.draft;}
  return this.entries[this.cursor];
 }
 sent(value){
  const next=this.cursor<0?'':this.draft;
  this.entries.push(value.trim());
  if(this.entries.length>this.limit)this.entries.splice(0,this.entries.length-this.limit);
  this.cursor=-1;this.draft='';return next;
 }
 clear(value){const next=this.cursor<0?value:this.draft;this.entries=[];this.cursor=-1;this.draft='';return next;}
}
