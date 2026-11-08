// SPDX-License-Identifier: MPL-2.0
export const PLAN_TIMEOUT160=Object.freeze({default:120,min:1,max:3600});
export const hasPlanTimeout160=type=>['server','tunnel','command','backup'].includes(type);
export function planTimeout160(step){
 if(!hasPlanTimeout160(step.type)){if(step.timeoutSeconds!==undefined)throw Error('This module has no readiness timeout / 此模块没有就绪超时设置');return null;}
 const value=step.timeoutSeconds===undefined?PLAN_TIMEOUT160.default:step.timeoutSeconds;
 if(!Number.isInteger(value)||value<PLAN_TIMEOUT160.min||value>PLAN_TIMEOUT160.max)throw Error('Readiness/stop timeout: 1–3600 whole seconds / 就绪或停止超时须为 1–3600 整数秒');
 return value;
}
