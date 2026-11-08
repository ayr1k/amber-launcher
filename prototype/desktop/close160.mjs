// SPDX-License-Identifier: MPL-2.0
import {shouldHideToTray} from './tray147.mjs';
export function closeToTray160(behavior,{serverActive=false,networkActive=false},explicitQuit=false){return shouldHideToTray(behavior,serverActive||networkActive,explicitQuit);}
export async function shutdownOwned160({servers,rooms,sakura,mysql}){
 // Keep database dependencies alive until normal server shutdown and exit backups finish.
 rooms.closing=true;try{
 await servers.shutdown();
 const services=[['EasyTier',()=>rooms.leave()],['Sakura',()=>sakura.stop()],['MySQL',()=>mysql.shutdown()]];
 const results=await Promise.allSettled(services.map(([,stop])=>stop()));
 const errors=results.flatMap((r,i)=>r.status==='rejected'?[services[i][0]+': '+r.reason.message]:[]);
 if(errors.length)throw Error('Exit cleanup incomplete / 退出清理未完成: '+errors.join('; '));
 }catch(e){rooms.closing=false;throw e;}
}
