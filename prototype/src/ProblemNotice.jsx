// SPDX-License-Identifier: MPL-2.0
import {explainProblem} from '../desktop/problems.mjs';
export function ProblemNotice({error,crash=false,actions={},disabled=false}){
 if(!error)return null;const p=explainProblem(error,{crash});
 const labels={retry:'重试',folder:'打开实例目录',mods:'前往模组管理',manage:'Java 与版本修复',memory:'调整启动内存',logs:'查看运行日志'};
 const keys=[...new Set([p.action,...(crash?['mods','logs']:[])])].filter(k=>actions[k]);
 return <div className="problem-notice" role="alert"><strong>{p.title}</strong><p>{p.hint}</p><div className="inline-actions">{keys.map(k=><button type="button" className="text-button" key={k} disabled={disabled} onClick={actions[k]}>{labels[k]} →</button>)}</div><details><summary>详细信息</summary><pre>{p.detail}</pre></details></div>;
}
