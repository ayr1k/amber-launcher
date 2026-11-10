# External library management: behavior and evidence

This feedback round supersedes the fc49e5c installers. It remains Draft PR #15, not a release or merge. TEST-REVISION.txt and artifact provenance identify the exact packaged source. Full equivalence with arbitrary external launchers is not claimed.

| Native capability | External behavior | Evidence / limits |
| --- | --- | --- |
| Global selector, quick list, launch home | Selected library supplies all instances; grass default icon; normal authorization | Real Electron: same-name libraries, empty native round trip, stale request rejection. Both private game copies launched through the actual home button. |
| Names, icons, favorites, sort, history | Library-specific application state; no folder rename | Name/icon/preferences tests; UI selector and quick-list checks. Existing state/history service reused. |
| Java, account, memory settings | Existing interface; separate state; Java picker/download | Settings and settings-undo tests; real existing-Java launch. New Java download covered by native tests, not a new live download. |
| Catalog and dependencies | Existing source allowlist, hash checks and dependency plans | Synthetic hash-verified resource-pack install, lock, disable, remove and rollback; native dependency suite. No live remote-update acceptance claimed. |
| Mods/resources/shaders, import, batch operations | Actual confirmed game directory; shared lock and sidecar transactions | Shared-version content and cross-library tests; native import/transaction coverage. Every format was not separately exercised on a real external library. |
| Updates, locks, history, rollback | Indexed exact identity feeds existing update service | Lock/history/rollback and changed-file tests; provider availability still applies. |
| Registration scan | Read-only metadata plus official batch-hash matching | Disabled/invalid/duplicate/multi-mod, cancellation/retry, cache invalidation, offline/failure/mismatch tests. Live private-copy scan returned two exact matches. |
| Editor and screenshots | Actual game files; sidecar recovery history; shared running-game guard | Configuration edit and recovery-byte test; screenshot shared-session protection test. |
| Health and logs | External local launch plan replaces native receipt assumption | Existing health service and validated external launch pipeline; unsupported profiles fail explicitly. |
| Backups and protection | Sidecar backups; restore creates new isolated inherited version | Synthetic backup/restore and original-file preservation. Source inheritance must remain unchanged. Not a standalone portable export; restored mod identity is re-indexed. |
| Checkpoints, undo, trials | Shared content history, per-version settings history, isolated trial | Content plus manifest restoration, settings isolation, trial identity/apply tests. Preview excludes shared assets/libraries/other versions. |
| Guided additions and migration | Scoped content validation and own-state reports | Native service tests. Migration needing a newly created native destination requires a managed library. |
| Recycle, restore, explicit cleanup | Library-specific validated entries; preserve shared files and dependencies | Existing recycle/security regressions. Exact-name confirmation for permanent cleanup; never tested on original samples. |
| Components, whole-pack replacement, launch-file repair | Explicit reason; original launcher required | Not equivalent to native managed profiles. Other content management remains available. Modern Forge/NeoForge and custom launchers retain prior restrictions. |

## Data boundaries

Renderer requests capture a library ID. Async service graphs retain that identity through completion. Switching remounts instance pages and invalidates stale plans. Accounts, application preferences and update channels remain product-specific. Additional managed libraries use the same native service graph.

External launch/session state stays in library-state170/<library-id>/<version-id>. Actual game files are separate from AMBER metadata. Content state, locks and history use the confirmed ordinary game directory, shared by versions using that directory. Original JSON and HMCL/PCL configuration are not rewritten for names or scans. Restored backups create an isolated version inheriting the unchanged source.

Indexing sends only SHA-1 hashes to the official Modrinth batch endpoint. Returned hashes and sizes must match. Local metadata survives network errors; failure is not a negative match. Completed matches/misses are cached for at most 24 hours and changed bytes invalidate them. Requests are deduplicated in batches of at most 100, serialized with spacing and cancellable. File/response reads are bounded. Downloads retain existing origin and integrity checks.

Primary references: [batch hash API](https://docs.modrinth.com/api/operations/versionsfromhashes/) and [API requirements](https://docs.modrinth.com/api/).

## Reproducible checks and limits

- tests/library-services170.test.mjs and tests/library-mod-index170.test.mjs use synthetic temporary libraries. The existing 58 library security tests retain final expanded-argument and parser-alias guards.
- scripts/qa-library-management170.cjs uses real Electron/IPC with synthetic libraries: selection/home navigation, same-name isolation, stale requests, internal overflow and reachable bottom actions. English light 1440x960 and Chinese dark 1000x720 at 125% screenshots were inspected; not every custom theme was tested.
- scripts/qa-game-home170.cjs uses normal AmberE offline authorization and actual home-button clicks on verified private copies. Forge 1.12.2 + OptiFine and Fabric 1.16.4 created Java processes, remained running for 45 seconds and logged resource/audio initialization. No visible game-menu, world gameplay, Microsoft-account or multiplayer acceptance claimed.
- All 8,980 original sample files matched the prior SHA-256 inventory. Private logs, paths and sample files are not committed or uploaded.
- Full tests/build/site/language/consistency/smoke results are in the PR delivery. CI verifies packaged startup and exact-head provenance. Actual installer upgrade and non-Windows native acceptance remain unverified.

The supported Library helper could not materialize the two reference screenshots in this Windows executor: os.setxattr is unavailable in Windows Python. No local reference-pixel inspection is claimed. Implementation follows the explicit entire-row removal and global-selector instructions; generated QA screenshots were inspected.

## 中文验收说明

左侧切库后，顶部当前实例、快捷列表、启动首页及管理页面使用同一个库上下文。外部实例默认草方块图标；显示名称不改磁盘目录名。扫描只读文件，精确匹配仅发送必要哈希；离线、失败、未知、重复及禁用状态分别保留。共享游戏目录共用内容状态与锁，设置历史仍按版本隔离。

原生内容安装、依赖检查、启停删除、更新锁定、历史回滚、编辑器、截图、备份及工作台入口已贯通。备份恢复创建新隔离版本，不覆盖共享存档，也不等同于可脱离原库运行的完整导出。外部组件继承链改写、整合包凭据替换、缺失启动文件修复及不支持的现代加载器仍给出具体限制，不能宣称任意外部库完全等价。

真实桌面和行为测试使用隔离数据，真实游戏测试只操作已核验私有副本。Java 运行与初始化日志不等于可见菜单、世界游玩或安装升级已验收。原始 8,980 个文件保持一致。测试包沿用产品正常安装身份与默认位置，请备份并使用隔离 Windows 用户或虚拟机；合并仍由用户决定。
