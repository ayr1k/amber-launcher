// SPDX-License-Identifier: MPL-2.0
export const stepLabel={java:'准备 Java',loader:'安装加载器',lite:'安装 LiteLoader',game:'下载与校验游戏',optifine:'配置 OptiFine',migration:'迁移模组',content:'安装模组或整合包',done:'完成'};
export function instanceState(instance,status={}){if((status.processes||[]).some(p=>p.instanceId===instance?.id&&p.state==='running'))return '游戏运行中';if(instance?.setup?.active||(status.jobs||[]).some(j=>j.instanceId===instance?.id&&j.state==='running'))return '正在安装';if(instance?.setup)return instance.setup.state==='failed'?'安装需要处理':'等待继续安装';return instance?.status==='installed'?'可以启动':'尚未完成安装';}
