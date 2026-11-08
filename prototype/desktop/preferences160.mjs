// SPDX-License-Identifier: MPL-2.0
export const startupDefaults160 = {mode:'local',page:'home'};
export function validateStartup160(value=startupDefaults160){
 if(!value||!['local','online'].includes(value.mode)||!['home','instances','tasks','tools'].includes(value.page))throw Error('Invalid startup preference / 启动偏好无效');
 return {mode:value.mode,page:value.page};
}
export function startupDestination160(value,resume=false){
 const s=validateStartup160(value);
 return resume?{mode:'local',page:'accounts'}:{mode:s.mode,page:s.mode==='online'&&s.page==='home'?'overview':s.page};
}
