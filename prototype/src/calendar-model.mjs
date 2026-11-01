// SPDX-License-Identifier: MPL-2.0
export const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function calendarDays(sessions,instanceId=''){
 const days={};const add=(key,s,ms)=>{const d=days[key]??={milliseconds:0,runs:[]};d.milliseconds+=ms;let r=d.runs.find(r=>r.id===s.id);if(!r){r={...s,milliseconds:0};d.runs.push(r);}r.milliseconds+=ms;};
 for(const s of sessions){if(instanceId&&s.instanceId!==instanceId)continue;const start=new Date(s.startedAt);if(!Number.isFinite(+start))continue;add(dayKey(start),s,0);
  for(const [a,b]of s.segments||[]){if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)continue;let cursor=a;while(cursor<b){const next=new Date(cursor);next.setHours(24,0,0,0);const end=Math.min(b,+next);if(end<=cursor)break;add(dayKey(new Date(cursor)),s,end-cursor);cursor=end;}}
 }return days;
}
