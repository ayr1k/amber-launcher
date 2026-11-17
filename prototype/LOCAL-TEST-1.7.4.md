# 1.7.4 formal release / 正式发布

PR #19 merged as `3bcc073f8ef8498d32d738f31340bf8b8930942b`; final accepted task head `12f56dcbb71cbc4d656dedb71476faba5729d1cc`. The user authorized formal publication on 2026-11-16 (America/New_York). Official packages use **1.7.4/public**. The earlier P2 cancellation race at `14df49a` was fixed and independently retested by AriaXiaoLan at the final head: 21 transfer tests passed, including all four gated cancellation paths, and the original reproduction now rejects as cancelled. Final CI runs 44012493500 / 44012493577 passed. Full 929-test results are developer/CI evidence, not an independent full rerun. Independent packaged smoke was blocked by Windows ACL access and did not pass; developer and CI startup are separate evidence. Review-time stale delivery lists were historical; the current PR separates final local/CI hashes. This formal release creates fresh source manifests, provenance and checksums from the approved merged state.

用户已批准合并并授权正式发布。更早 P2 取消问题已在最终提交独立复测确认修复，不把旧测试包或旧清单作为本次依据。下方 Draft／本地渠道／等待审核等保留历史阶段；既有界面截图证明原界面，新增 gated 测试证明修复后的取消时序。独立成品复验因 ACL 受阻，不能记为通过；开发／CI 与本次正式成品检查分别记录。本会话不重复内容审核；真实游戏组合、登录、跨设备房间、安装升级／回滚、第三方主题、物理 DPI 和非 Windows 原生验收仍保留原限制。

# AMBER / AmberE 1.7.4 Windows test installers

Local test channel, based on main `f0002a1` (1.7.3), branch `codex/1.7.4-direct-transfer`. This is a Draft PR delivery for independent review and manual acceptance. No merge, stable release or website deployment is authorized.

仅测试渠道，基于 main `f0002a1`，等待小岚独立审核和用户人工验收。不得自行合并、发布正式版本或部署官网。最终提交、构建来源、产品身份和 SHA-256 随安装包记录在 `TEST-REVISION.txt`、`.provenance.json` 和 `.sha256` 文件中，PR 提供下载入口。

## Direct migration / 软件内直接迁移

- **Existing instance:** open instance management → migrate to another version → choose a registered source game library and instance → preview → confirm migration into the current instance.
- **New instance:** manual creation → configure components → optional migration → choose an existing source instance or a manifest file → preview → create. The result shows installed, skipped and failed counts and links to the full migration report.
- **New client from a local server:** in local mode, open Instances → Create a client from a local server → choose a managed local server → preview → confirm creation of an independent client. This does not link or modify an existing client. Linking/comparing existing clients and room synchronization remain separate workflows.
- Mod-list and server-environment JSON import/export remain available for other devices, sharing and backup. New environment exports include bounded diagnostics for unknown/missing and excluded optional/server-only content; older files can describe only what they recorded.

- **迁入现有实例**：实例管理 → 迁移到其他版本 → 选择来源游戏库和实例 → 预览 → 确认迁入当前实例。
- **创建新实例并迁移**：手动创建 → 配置组件 → 可选迁移 → 选择已有实例或清单文件 → 预览 → 创建。完成页显示成功、跳过、失败数量，可打开完整迁移报告。
- **从本机服务器创建客户端**：本地模式 → 实例 → 从本机服务器创建客户端 → 选择已管理服务器 → 预览 → 确认创建独立客户端。这与关联已有客户端、补齐依赖及房间同步用途不同。
- 保留两类 JSON 文件的导入／导出。新的服务端环境文件保留未知／缺失项和未包含内容的诊断摘要；旧文件无法补回未记录的内容。

## Boundaries / 边界

Only compatible Modrinth client releases and their required dependencies are downloaded through the existing content resolver and verified installation transactions. Old JARs, worlds, settings, accounts, addresses and room keys are not copied. Unrecognized content, unavailable releases, conflicts and dependency failures remain visible; optional dependencies are not added automatically. Author compatibility declarations do not guarantee playability.

Library ID and instance ID are separate identities. Same-physical-directory sources are excluded. Stop source and target instances/servers before extraction or migration. Source/target changes, content edits, registration changes, expiration and changed dependencies require a new preview. Shared sources are labelled; shared targets require explicit acknowledgement of effects on other versions using that directory. Existing external-library creation restrictions remain: creating a new instance/client requires an AMBER-managed library.

Cancellation stops further work after the current read/request or transaction settles. Completed verified installations remain and the report distinguishes installed, skipped, failed and cancelled items. A cancelled disabled-state adjustment is reported explicitly. Interrupted setup retains its instance and reviewed plan for the existing task recovery workflow.

仅使用原有内容引擎匹配目标游戏版本／加载器，并通过校验事务下载兼容的 Modrinth 客户端模组和必需依赖。不会复制旧 JAR、世界、配置、账号、地址或房间密钥。未知内容、无兼容版本、冲突及依赖失败会明确列出；可选依赖不自动添加。作者声明不保证可玩。

游戏库和实例身份分开校验，排除相同物理目录；提取和迁移前需停止相关游戏／服务器。来源、目标、内容、库登记、预览有效期或依赖变化后需要重新预览。共享来源会提示，共享目标需勾选确认影响范围。创建新实例／客户端沿用现有约束，需要切换到 AMBER 管理库。

取消会在当前读取／请求或事务安全结束后停止后续操作，已完成的校验安装予以保留；报告准确区分结果。若停用状态尚未应用，会另行提示。中断的安装保留实例和已确认计划，可通过原任务恢复流程继续。

## Installation identity and data / 安装身份与数据

These Windows x64 NSIS test installers retain the normal product identities: `io.github.ayr1k.amber` / `io.github.ayr1k.ambere`. They may upgrade an existing installation. Launcher profiles remain `%APPDATA%\AMBER` / `%APPDATA%\AmberE`; `storage.json` selects each product's actual game-data location, and registered external libraries remain where the user registered them. The two products retain separate account policies, data and update repositories. Both packages identify their build channel as **local**.

安装包沿用正常安装身份，可能覆盖升级同产品的既有安装，也会读取原有数据配置。AMBER／AmberE 分别使用上述独立配置目录；实际游戏数据由 `storage.json` 决定，外部游戏库位置不变。建议在独立 Windows 用户及数据副本上验收。自动验证全部使用隔离数据；没有读取真实账号令牌、存档或游戏库。

## Verification and remaining acceptance / 验证与待验收

The updated PR head fixes cancellation arriving during the final asynchronous library lookup, before a migration/creation workflow has a scope. Both callbacks recheck cancellation immediately before dispatch. New gated regressions cover migration and creation in the default and a second managed library: no new instance, installed content or source/target data change after cancellation. Use the updated head's installers, provenance and hashes; `14df49a` and its earlier test packages are superseded for this review.

本次复审修复最终异步查询游戏库期间的取消竞态。迁移和创建均在实际调用工作流前重新检查信号；新增确定性回归覆盖默认库及第二个管理库，断言取消后不新建实例、不安装内容、不改动源／目标数据。复审请使用 PR 最新提交对应的安装包、来源及校验值；旧 `14df49a` 安装包不代表本次修复。

See [validation and screenshots](review/1.7.4-validation.md). Unit/regression tests use synthetic directories and mocked remote metadata; native UI checks use the real renderer, preload, IPC, migration planning and content transactions with synthetic JAR bytes and substituted Java/game setup primitives. They do not establish live-mod compatibility, real gameplay, login, cross-device room behavior, installer upgrade/rollback, custom themes, hardware DPI or native macOS/Linux acceptance. No signing/installer SmartScreen acceptance is claimed. Real external modpacks, local-mod imports, skins, logs, backups, themes, templates and map-marker migration are outside this change.

详见验证记录和截图。自动测试不等于真实游戏、登录、跨设备联机、安装升级、回滚、第三方主题、物理 DPI 或非 Windows 平台验收；也不代表所有模组组合均可运行。外部整合包、本地模组、皮肤、日志等文件入口不受本次调整影响；未重复建设备份、主题库、模板库或地图标记迁移。
