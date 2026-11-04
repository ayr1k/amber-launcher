# AMBER / AmberE 1.4.0 local test

The user accepted this build and authorized GitHub releases and Pages publication. The accepted binaries retain their embedded local-test documents; current release notes supersede their local-only wording. CurseForge integration and signing remain deferred. Existing public releases and AmberX are unchanged.

## 测试入口

- **实例 → 管理 → 备份与恢复**：按实例启用每日首次启动前、正常退出后、模组或加载器更新前的自动备份。默认关闭。可设置数量和容量、固定备份；手动和固定备份不会自动删除，至少保留最新自动备份。备份仍保存在同一磁盘，不替代异地备份。
- **实例 → 管理 → 概览与检查 → 整合包升级**：查询已记录的 Modrinth 来源或选择本地 MRPACK；查看版本和文件差异，选择保留本地修改/删除或采用新版。升级总是创建新实例，可选复制世界与截图。新版世界可能无法降级，请保留原实例。
- **联机 → 实例 → 管理 → 备份、玩家与客户端**：停止服务端后完整备份、恢复为独立实例；查询在线玩家、白名单、管理员和封禁列表；确认后执行管理指令并显示控制台反馈；保存常用指令。
- 同一页面可关联本地实例、检查游戏/加载器和可识别的客户端依赖、预览缺失依赖安装、选择账号启动客户端并连接本机服务端。Paper/Spigot/Bukkit 插件不会当成客户端模组。
- **实例列表 → 导入联机环境清单**：从共享清单创建独立实例。清单包含游戏版本、加载器种类、项目和文件版本；不包含账号、世界、地址或房间密钥。创建时选择该游戏可用的加载器版本，界面先展示实际选择；无法安装指定内容时保留失败任务，不以完整环境冒充成功。
- **实用工具 → 日志与诊断**：有明确模组依赖名称的报告可直接查找兼容项目，再选择版本、预览依赖并确认安装。

## Acceptance scope

- Automatic client backups are opt-in; start/exit snapshots contain worlds and configuration. Pre-update snapshots contain mods and configuration. Enabled pre-action protection fails closed when a snapshot cannot be created. Failed exit backups remain visible in the instance policy panel.
- Manual and pinned snapshots are exempt from automatic retention. Restores create independent instances. Server snapshots require a stopped server and are manual in this release.
- MRPACK upgrades compare original-pack hashes, current files and new files. Conflicts default to keeping local files or deletions. Text comparison is bounded to 100 KB; downloaded/binary files show their identity rather than an invented text diff. Optional pack downloads are omitted. Upgrade recovery uses verified retained files and the existing task center. A normal process exit is recorded; it does not prove every world/mod works.
- Player queries recognize standard English vanilla/Paper `list` output. Stopped servers and unrecognized/plugin-localized output are shown as unknown. Plugin command overrides may change behavior; inspect console responses. Player modifications require a running server and confirmation. No required companion plugin.
- Environment comparison is declaration-based, not a guarantee of runtime compatibility. Unmanaged or altered server JARs are unknown; optional/server-only projects are shown separately. Missing recognized dependencies can be previewed; version replacements continue through normal content management. Joining starts a local client against the locally managed server; remote-room address automation is not added.
- Account entitlement policies, separate edition storage, themes and existing game data remain unchanged. No cloud sync, hosted multiplayer infrastructure or CurseForge key is included.

## Platform release checklist

This local delivery targets Windows x64 installers for both editions. Existing macOS/Linux/FreeBSD published downloads remain 1.3.5; do not relabel them 1.4.0. Before a future multiplatform release, build each artifact from this source, validate architecture, Java acquisition, map engine, theme/layout, instance backup/restore, process shutdown and checksums on the target OS. FreeBSD remains an experimental server/tools-only target. Signing is deferred.

Live Microsoft login, real-world modpack gameplay, remote peers, plugin-overridden player commands and non-Windows runtime acceptance require user/target-system testing. Automated checks use isolated synthetic data.

## 本轮反馈修订

- 联机实例的备份、玩家管理标题、说明、操作与记录增加间距，沿用主题配色。
- 联机实例可独立启用每日首次启动前、正常停止后，以及安装或更新核心/模组/插件前的完整自动备份，默认关闭。强制终止与异常退出不触发停止后备份。
- 自动备份支持数量/容量保留策略、固定与取消固定；手动及固定备份不自动清理，至少保留最新自动备份。备份失败阻止对应启动/更新。运行中的服务端不会被直接复制。
- 在“刷新备份记录”查看新增记录；恢复仍创建独立实例，新实例的自动备份默认关闭。
