# 1.4.4 本地测试 / Local testing

此文档保留已验收的 1.4.4 本地测试清单。用户已授权正式发布；发布状态与验证说明见 RELEASE-ACCEPTANCE.md。

- 服务端实例 → 内容 → 检查更新：Modrinth / CurseForge 兼容更新、批量预览、依赖变化、版本锁定和恢复记录。仅停止后修改，遵循自动备份策略。没有来源记录的文件需要手动管理。
- 联机启动页：最近十分钟 CPU、工作集内存、TPS/MSPT 趋势和启动／加入／卡顿事件。性能与玩家增强组件需安装或更新，然后启动服务端；Paper 提供真实 tick 指标，不支持的核心显示空缺。
- 可主动采集 30 秒的本地性能报告并导出 JSON。报告用于初步排查，不自动上传，也不把 CPU 当作 TPS 或直接认定某个插件导致卡顿。
- 设置／任务中心：全局下载限速（KiB/s，0 不限速）、实际传输数、排队数及优先下载。优先任务取得下一批空闲通道，不打断已有传输；不改变已完成通知的淡出行为。

请重点测试：
1. 测试服务端安装旧版插件或模组，检查更新，锁定依赖，预览批量更新；完成后尝试恢复。
2. Paper 停止时安装／更新增强组件，启动后观察曲线，采集并导出报告。
3. 两个实例同时下载，设置 2048 KiB/s，切换优先任务，再取消限速；尝试暂停与取消。
4. 切换官方主题、中英文和窗口大小，检查新页面的按钮、圆角和滚动区域。

This checklist describes the accepted Windows local tests. Server updates retain verified recovery copies and reject stale plans, incompatible dependencies and changed files. Unknown/manual content has no automatic update source. Performance reports are local, bounded summaries rather than stack profilers; unsupported metrics remain unavailable. The revised bridge keeps Java 8 bytecode and checks optional server APIs at runtime. Native non-Windows acceptance is separate; the public release provides matching platform artifacts. Signing remains deferred.
