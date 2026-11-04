// SPDX-License-Identifier: MPL-2.0
import {redact} from './privacy.mjs';
// Rules require diagnostic messages, not merely a mod name in a stack trace.
export function analyzeCrash(input,locale='zh-CN'){
 const text=redact(String(input||'').slice(0,2_000_000)).replace(/\x1b\[[0-9;]*m/g,''),en=locale.startsWith('en'),findings=[];
 const add=(id,zh,english,zhHint,enHint,evidence,certainty='identified')=>{if(!findings.some(f=>f.id===id))findings.push({id,title:en?english:zh,hint:en?enHint:zhHint,evidence:evidence.slice(0,3000),certainty});};
 for(const line of text.split(/\r?\n/)){
  let m=line.match(/Mod ['"]([^'"]+)['"]\s*\(([^)]+)\).*requires (.+?) of (?:mod )?['"]([^'"]+)['"]\s*\(([^)]+)\).*?(missing|wrong version|only the wrong|not present)/i);
  if(m){const missing=/missing|not present/i.test(m[6]);add('dependency:'+m[2]+':'+m[5],`${m[1]} ${missing?'缺少依赖':'依赖版本不匹配'}：${m[4]}`,`${m[1]}: ${missing?'missing dependency':'incompatible dependency'} ${m[4]}`,`要求：${m[3]}。请在内容管理中选择兼容的 ${m[4]} 版本。`,`Required: ${m[3]}. Select a compatible ${m[4]} version in content management.`,line);}
  m=line.match(/Missing or unsupported mandatory dependencies:/i);if(m)add('mandatory','存在缺失或不兼容的必需依赖','Missing or incompatible required dependencies','查看下方日志中的 Mod ID、要求版本与当前版本，补齐对应依赖。','Check the mod ID, required version and installed version below.',text.slice(Math.max(0,text.indexOf(line)),text.indexOf(line)+1800));
  m=line.match(/(?:UnknownDependencyException|Unknown dependency|Missing dependency|Missing required plugin)[^\n]*/i);if(m)add('plugin-dependency','插件缺少必需依赖','A plugin is missing a required dependency','根据日志中的插件名称安装兼容依赖，然后重启服务端。','Install the compatible dependency named in the log, then restart the server.',line);
 }
 const rules=[
 ['java',/UnsupportedClassVersionError[^\n]*|class file version \d+\.\d+[^\n]*only recognizes[^\n]*/i,'Java 版本不匹配','Java version mismatch','选择满足该游戏、加载器或模组要求的 Java；查看证据中的 class file 版本。','Select Java compatible with the game, loader and mods; see the class file version in the evidence.'],
 ['reserve',/Could not reserve enough space[^\n]*|Could not create the Java Virtual Machine[^\n]*/i,'Java 无法启动或预留内存','Java could not start or reserve memory','检查启动参数；若无法预留内存，降低分配值并关闭其他程序。','Check launch arguments; if memory could not be reserved, lower the allocation and close other applications.'],
 ['memory',/OutOfMemoryError[^\n]*/i,'运行时内存不足','Runtime memory exhaustion','根据日志区分堆内存、原生内存或线程不足；检查可用内存与模组负载。','Check whether heap, native memory or threads were exhausted; review available memory and mod workload.'],
 ['port',/BindException[^\n]*|FAILED TO BIND TO PORT[^\n]*|Address already in use[^\n]*/i,'服务端无法绑定端口','Server could not bind its port','检查其他服务端是否占用端口，以及 server-ip 是否属于本机。','Check for another server using the port and verify server-ip belongs to this machine.'],
 ['archive',/(?:ZipException|zip END header not found|Invalid or corrupt jarfile)[^\n]*/i,'压缩包或 JAR 文件可能损坏','An archive or JAR may be damaged','根据日志确认文件，重新下载该文件；不要批量删除模组。','Identify the file in the log and download it again.', 'possible'],
 ['graphics',/GLFW error \d+[^\n]*|Failed to create (?:an? )?OpenGL[^\n]*|Pixel format not accelerated[^\n]*/i,'图形环境初始化失败','Graphics initialization failed','检查显卡驱动和当前版本要求，并排查最近添加的图形模组。','Check graphics drivers, version requirements and recently added graphics mods.'],
 ['conflict',/Mod [^\n]+(?:is incompatible with|breaks) [^\n]+/i,'模组声明存在冲突','Declared mod conflict','按日志列出的模组与版本调整组合；保留备份后再修改。','Adjust the named mod versions or combination, keeping a backup first.'],
 ['mixin',/Mixin apply [^\n]*failed[^\n]*|MixinTransformerError[^\n]*/i,'模组代码注入失败，需进一步排查','Mod code injection failed; further investigation needed','这不能单独证明某个模组有问题。结合完整异常链检查版本与近期变更。','This alone does not identify a faulty mod. Check the exception chain, versions and recent changes.','possible']
 ];
 for(const [id,re,zh,english,zhHint,enHint,certainty] of rules){const m=text.match(re);if(m)add(id,zh,english,zhHint,enHint,m[0],certainty);}
 return {findings,summary:findings.length?(en?'Log evidence found':'已找到日志依据'):(en?'No supported cause identified. Inspect the full log; exit codes alone do not identify the cause.':'暂时无法确定原因。请查看完整日志，退出码本身不能说明具体原因。')};
}
