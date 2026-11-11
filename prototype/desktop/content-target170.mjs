// SPDX-License-Identifier: MPL-2.0
export const contentTarget170=(core,id,metadata)=>core.contentTargetIdentity170?.(id,metadata);
export async function assertContentTarget170(core,id,expected){if(core.contentTargetIdentity170&&expected!==await core.contentTargetIdentity170(id))throw Error('Game directory or launch profile changed; preview again / 游戏目录或启动配置已变化，请重新预览');}
