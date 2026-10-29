// SPDX-License-Identifier: MPL-2.0
import {redact} from './privacy.mjs';
// Suggestions are evidence-based hints, never an assertion that all crashes have been diagnosed.
export function explainProblem(value,{crash=false}={}) {
 const detail=redact(value||'').replace(/^Error invoking remote method '[^']+': Error: /,'');
 const rules=[
  [/(?:微软|Xbox|Minecraft|Microsoft|认证).*(?:连接失败|HTTP 429|HTTP 5\d\d|无效响应)/i,'认证服务暂时不可用','检查网络或稍后重试。此次失败不代表未购买游戏，也不会自动切换账号。','retry'],
  [/正版|所有权|资格|账号|账户|微软|Xbox|认证|授权|Minecraft.*(?:ownership|license)|Microsoft|authentication|entitlement/i,'账号或游戏资格需要处理','前往账号页登录、重新验证或关联正版资格。认证失败不会自动切换为离线模式。','accounts'],
  [/取消|AbortError/i,'已取消安装','已完成的校验文件会保留；重试会复用这些文件。','retry'],
  [/ENOSPC|空间不足|磁盘空间/i,'磁盘空间不足','清理实例所在磁盘后，再继续安装。','folder'],
  [/EACCES|EPERM|EBUSY|占用|access.denied/i,'文件暂时无法写入','先退出游戏及正在使用此目录的程序，再重试；也可检查目录权限。','folder'],
  [/429|503|502|504|fetch failed|ECONN|ENOTFOUND|timeout|timed.out|网络|超时/i,'下载服务暂时无法连接','检查网络后重试。已通过校验的文件不会重复下载。','retry'],
  [/404|403/,'下载来源拒绝请求或文件已下架','刷新版本列表后重新选择版本；反复失败时查看详细信息中的状态码。','retry'],
  [/校验失败|大小超过/,'下载的文件不完整','已阻止使用损坏文件。重试会重新下载并校验。','retry'],
  [/OutOfMemoryError|Could not reserve enough space|内存不足/i,'游戏可能没有足够内存','关闭其他程序；在启动选项调整内存。若提示无法预留内存，请降低分配值。','memory'],
  [/UnsupportedClassVersionError|Java.*不兼容|Java.*需要/i,'Java 版本不匹配','打开版本设置，点击“自动准备 Java”后重新启动。','manage'],
  [/Incompatible mods|Mod resolution|requires.*version|不兼容|冲突|必需依赖|已安装其他版本|ZipException|zip END header|Invalid.*jar/i,'模组或依赖需要处理','打开模组管理，根据详细信息停用冲突模组，或补齐必需依赖后重试。','mods'],
  [/GLFW|OpenGL|Pixel format|显卡/i,'游戏图形环境初始化失败','检查显卡驱动是否支持此游戏版本。可先停用光影及图形类模组再试。','mods'],
 ];
 const rule=rules.find(([pattern])=>pattern.test(detail));
 return {title:rule?.[1]||(crash?'游戏异常退出':'操作未完成'),hint:rule?.[2]||(crash?'暂时无法确定原因。可以检查最近添加的模组，并打开运行日志查看具体信息。':'查看详细信息后重试；如果问题持续，可打开实例目录检查文件。'),action:rule?.[3]||(crash?'logs':'folder'),detail};
}
