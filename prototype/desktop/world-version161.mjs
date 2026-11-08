// SPDX-License-Identifier: MPL-2.0
// Exact backend variants only. Unknown versions must be explicitly selected.
export function resolveWorldVersion(name,versions){
 const match=typeof name==='string'&&/^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(name.trim());
 if(!match)return null;
 const exact=versions.find(v=>v.name===name.trim());
 if(exact)return {id:exact.id,exact:true};
 const major=Number(match[1]),minor=Number(match[2]),patch=Number(match[3]||0);
 // Cubiomes groups these patch versions into the named generation variants.
 const groups={7:[[0,10,10]],8:[[0,9,11]],9:[[0,4,12]],10:[[0,2,13]],11:[[0,2,14]],12:[[0,2,15]],13:[[0,2,16]],14:[[0,4,17]],15:[[0,2,18]],16:[[0,1,19],[2,5,20]],17:[[0,1,21]],18:[[0,2,22]],19:[[0,2,23],[3,4,24]],20:[[0,6,25]],21:[[0,1,26],[2,3,27],[4,4,28],[5,5,29],[6,8,30],[9,10,31],[11,11,32]]};
 const id=major===1?groups[minor]?.find(([lo,hi])=>patch>=lo&&patch<=hi)?.[2]:undefined;
 return versions.some(v=>v.id===id)?{id,exact:false}:null;
}
