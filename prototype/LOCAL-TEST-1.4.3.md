# 1.4.3 本地测试 / Local testing

此文档保留 1.4.3 本地测试清单。用户已验收并授权正式发布；当前发布状态与验证结果见 RELEASE-ACCEPTANCE.md。

- 下载：并发上限提升至 128，保留默认 8 与原有设置；所有任务共用额度，按任务分配可用通道。弱网或限流后降速，连续成功后逐步恢复。服务端内容与依赖改用并行下载，保留完整性校验与事务提交。
- 联机实例：移入应用回收站、恢复、精确名称确认后彻底删除。服务端、下载、备份与隧道占用时阻止删除。恢复检查端口冲突并允许选择空闲端口。独立备份及共享 Java、缓存保留。
- 实用工具：Java 操作垂直居中；截图筛选与刷新按钮复用主题控件。

High concurrency applies to simultaneous files, not multiple ranges of a single file. Higher limits do not guarantee faster downloads. Windows local installers are unsigned. Other platform artifacts remain part of the public release workflow; native non-Windows acceptance remains separate.

请测试 / Please test:
1. 设置下载并发为 32 / 64 / 128，检查本地与联机下载、取消与重试。
2. 用测试实例验证删除、回收站恢复、端口冲突及彻底删除；有重要世界时先备份。
3. 切换方角／圆角与官方主题，检查 Java 操作、截图筛选和下拉菜单。
