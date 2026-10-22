// SPDX-License-Identifier: MPL-2.0
// Deliberately allowlisted. Never include logs, names, paths, tokens or account data.
export function diagnosticSummary({version,platform,arch,instances=[],status={jobs:[],processes:[]}}){
 const clean=value=>typeof value==='string'&&/^[\w.+-]{1,64}$/.test(value)?value:'unknown';
 return {format:'amber-diagnostics',schema:1,createdAt:new Date().toISOString(),app:{version:clean(version),platform:clean(platform),arch:clean(arch)},instances:instances.map(i=>({game:clean(i.game),loader:clean(i.loader),status:clean(i.status),javaMajor:Number.isInteger(i.javaMajor)?i.javaMajor:null})),jobs:status.jobs.slice(-20).map(j=>({kind:clean(j.kind),state:clean(j.state),completed:Number.isFinite(j.completed)?j.completed:0,total:Number.isFinite(j.total)?j.total:0})),processes:status.processes.slice(-10).map(p=>({state:clean(p.state),exitCode:Number.isInteger(p.exitCode)?p.exitCode:null})),privacy:'不包含账号、令牌、实例名称、文件路径或原始日志。此报告只保存到你选择的位置，不自动上传。'};
}
