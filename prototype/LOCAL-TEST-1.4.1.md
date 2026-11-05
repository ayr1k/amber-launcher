# Publication update

The user accepted the repaired packages and authorized GitHub releases and Pages. Keep accepted artifacts unchanged; current release notes supersede embedded local-only wording.

# 1.4.1 本地测试 / Local testing

AMBER 与 AmberE 同步；本轮不发布 GitHub、Release 或 Pages。

- 内容下载可选择 Modrinth / CurseForge，保留兼容版本、依赖预览、下载校验、任务与恢复流程。来源独立记录，更新不跨平台替换。
- 支持 CurseForge 整合包与本地 manifest ZIP 导入到独立实例。作者禁止第三方下载时明确停止，不绕过限制。
- 联机导航新增“玩家”：进入自动刷新，名单单独滚动；底部可输入尚未入服的玩家名称加入白名单。服务端运行时执行操作，显示原始控制台反馈。
- 在线玩家、白名单、管理员、封禁名单可筛选；提供头像、逐人操作选择。Ping 仅显示服务端实测值，不以本机延迟代替。
- Paper/Spigot/CraftBukkit 的可选玩家信息插件需停止服务端后安装、重启生效。原版/Fabric 或未安装插件时 Ping 显示不可用。插件仅响应控制台，源码位于 desktop/java/players141。
- 全局滚动条使用透明轨道、主题颜色和细滑块；支持减少动画和主题包。

验证重点：切换平台、翻页、依赖安装；玩家较多时底部入口可见；踢出/封禁/管理员操作反馈；主题与中英文；升级保留原实例、账号和存档。

构建：`pnpm package:all` 生成同版本双产品 Windows、macOS x64/arm64、Linux 和 FreeBSD 包。当前 Windows 测试通过后才发布。macOS/Linux 仍需对应真机验收；FreeBSD 保持实验性服务端/工具范围。签名继续延期。

CurseForge 构建使用 AMBER_CURSEFORGE_API_KEY 环境变量；本地忽略文件可供打包脚本注入。构建产物中的客户端密钥可以被提取，不将其视为服务器保密凭据。公开源码导出排除注入文件；CI 使用仓库 secret，日志不输出密钥。

## English
CurseForge is a separate content provider with compatible versions, dependency previews and verified downloads. Author-restricted downloads stop explicitly. The dedicated Players page keeps its whitelist form visible while only the roster scrolls. Actions require a running server and show console feedback. Real per-player Ping requires the optional console-only Paper/Spigot/CraftBukkit bridge; unavailable values are never fabricated. All-platform packages share the same version; native macOS/Linux acceptance remains pending and FreeBSD remains experimental server/tools-only. No publishing or signing in this local test delivery.

## 1.4.1 内容下载白屏修复
修复分类接口缺少 provider 参数导致的未定义变量异常。新增直接执行 preload 分类接口的回归检查，覆盖默认、Modrinth 和 CurseForge。保持版本号 1.4.1；重新生成本地安装包，不发布。
