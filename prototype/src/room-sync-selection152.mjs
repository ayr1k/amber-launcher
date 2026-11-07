// SPDX-License-Identifier: MPL-2.0
import {ROOM_SYNC_MAX_FILES152} from '../desktop/room-sync-limits152.mjs';
export {ROOM_SYNC_MAX_FILES152};
export const selectableRoomMod152=f=>f.path.startsWith('mods/')&&!f.blocked;
function addSelection(paths,additions){
 const next=[...new Set([...paths,...additions])],limited=next.length>ROOM_SYNC_MAX_FILES152;
 // An oversized bulk action is rejected as a whole; never silently truncate or clear choices.
 return {paths:limited?paths:next,limited,pending:next.length-paths.length};
}
export function selectAllRoomMods152(paths,files){return addSelection(paths,files.filter(selectableRoomMod152).map(f=>f.path));}
export function toggleRoomFile152(paths,file,checked){
 if(!checked)return {paths:paths.filter(p=>p!==file.path),limited:false};
 if(file.blocked)return {paths,limited:false,blocked:true};
 return addSelection(paths,[file.path]);
}
export function retainRoomSelection152(paths,before,after){
 if(before?.id!==after.id)return [];
 return paths.filter(path=>{const old=before.files.find(f=>f.path===path),next=after.files.find(f=>f.path===path);return old&&next&&!next.blocked&&old.sha256===next.sha256;});
}
