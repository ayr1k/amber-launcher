// SPDX-License-Identifier: MPL-2.0
export const selectableRoomMod152=f=>f.path.startsWith('mods/')&&!f.blocked;
export function selectAllRoomMods152(paths,files){return [...new Set([...paths,...files.filter(selectableRoomMod152).map(f=>f.path)])];}
export function retainRoomSelection152(paths,before,after){
 if(before?.id!==after.id)return [];
 return paths.filter(path=>{const old=before.files.find(f=>f.path===path),next=after.files.find(f=>f.path===path);return old&&next&&!next.blocked&&old.sha256===next.sha256;});
}
