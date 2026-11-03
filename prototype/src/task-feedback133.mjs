// SPDX-License-Identifier: MPL-2.0
export const activeTask = j => ['running','queued','pending'].includes(j.state);
export function observeTasks(previous, jobs) {
 const seen=new Map(jobs.map(j=>[j.id,j.state]));
 const changed=jobs.filter(j=>previous ? previous.get(j.id)!==j.state : activeTask(j)||j.state==='failed');
 return {seen,changed};
}
export function mayDismissTasks(jobs) {return jobs.length>0&&jobs.every(j=>j.state==='done');}
