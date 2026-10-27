# Beta 1.12 测试与发布 / Testing and release

版本 / Version: 1.0.0-beta.13。AMBER 与 AmberE 同步更新；用户已验收本地安装包并授权发布。微软真实账号登录、刷新和正版启动仍待审核通过后验收。安装包未签名。

## 重点测试

1. 在实例概览打开工作台，检查状态、变更记录及安装后指引；用 Ctrl+K 搜索实例、内存、备份、任务。
2. 创建试用副本，分别测试不带存档、复制存档。副本使用独立文件，原实例不应变化。
3. 在副本中更新模组或修改配置，预览回写。内容文件与清单作为一组；配置可逐文件选择。账号选择与世界进度不回写。
4. 原实例发生变化后，回写应被拒绝。保留副本或重新创建试用，不强制覆盖。
5. 修改模组或配置后查看记录，预览恢复；恢复不改存档。手动修改应显示为外部变化，没有备份时不承诺恢复。
6. 模拟下载失败、取消试用复制；原实例保持完整。中断事务重新打开时核对文件后恢复，外部修改会阻止覆盖。
7. 使用真实游玩结果手动标记运行正常。错误提示的日志证据与最近修改线索分开；不自动断言全部崩溃原因。
8. 从本地模板导出 JSON，再导入。只包含问卷偏好；导入后需应用模板、重新生成方案。重复名称、未知字段及超限文件会被拒绝。
9. 检查中文/英文、浅色/深色、窄窗口与 Windows 缩放。输入框、日志可复制；其余界面不应被拖选。

## 回滚准备

开发工作区已保留原始 Beta 1.11 文件与源码快照。公开用户请从对应仓库的 Beta 1.11 Release 获取旧安装包与校验文件，详见 [回滚说明](../docs/zh-CN/ROLLBACK.md)。

回滚程序不会自动撤销本版期间的模组、配置或存档变化。请先在 Beta 1.12 中备份重要实例，并根据需要恢复本版变更，再退出启动器和游戏，使用对应产品的 Beta 1.11 安装包安装回原位置。不要选择清除用户数据。两个产品的数据目录保持独立。

本版新增的 `.amber-history` 和 `trial.json` 是附加记录，不改变旧实例基础格式；旧版会忽略它们。回到旧版后不要依赖试用回写功能。若之后再升级，旧版期间修改的文件会重新核对，不能强制恢复已过期的快照。安装程序仍保留升级前程序副本，位置记录在各产品的 `LOCALAPPDATA/<产品>/previous-program.txt`。

## English

The user accepted both local installers and authorized prerelease publication. Microsoft live acceptance remains deferred. Installers are unsigned.

Test independent trials with and without worlds, guarded promotion, reversible content/configuration changes, explicit good-state confirmation, local evidence, quick search, preference-template exchange and responsive bilingual UI. Trials never share writable worlds or merge world progress. Configuration promotion replaces selected whole files. Content and its manifest move together. A changed original blocks promotion.

Before downgrading, back up valuable instances and restore any unwanted content/configuration changes in Beta 1.12. Close both the launcher and game, then install the matching Beta 1.11 package in the original location without deleting user data. Reinstalling an older program does not undo gameplay or mod changes. Additional history/trial files are ignored by Beta 1.11. Keep the supplied source snapshot and checksums for code rollback.

发布使用用户测试通过的原始安装包；为保持校验值不变，内置标签和随包测试文档可能仍保留本地测试措辞。最新说明以仓库及 Release 为准。

Published installers preserve the exact accepted bytes. Embedded labels/testing notes may retain local-test wording; repository and Release documentation provide the current publication status.
