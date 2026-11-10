# External library management: behavior and evidence

This capability completion round supersedes the fc49e5c, f42939d, 9cb370b and 6241c6e installers. It remains Draft PR #15, not a release or merge. TEST-REVISION.txt and artifact provenance identify the exact packaged source. Full equivalence with arbitrary external launchers is not claimed.

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
| Backups and protection | Full mode captures a verified host-platform launch closure and content; independent empty-library restore is available even after source deletion | Synthetic source-deletion/offline restore, corrupt closure/path rejection, legacy asset views; actual private Forge+OptiFine backup restored into a separate library and launched. Java is excluded. Configuration/world-only modes still depend on the source profile. |
| Checkpoints, undo, trials | Shared content history, per-version settings history, isolated trial | Content plus manifest restoration, settings isolation, trial identity/apply tests. Preview excludes shared assets/libraries/other versions. |
| Guided additions and migration | Scoped content validation and own-state reports | Native service tests. Migration needing a newly created native destination requires a managed library. |
| Recycle, restore, explicit cleanup | Library-specific validated entries; preserve shared files and dependencies | Existing recycle/security regressions. Exact-name confirmation for permanent cleanup; never tested on original samples. |
| Components and launch-file repair | Official-source staging, explicit file plan, selected-profile publication, journal and undo | Vanilla/Fabric transaction tests and real HMCL Fabric replacement/rollback. Missing trusted files can be repaired while different local bytes remain untouched. Modern module launchers and unidentified custom patches retain precise restrictions. |
| Whole-pack upgrade | Explicit MRPACK/provider target, conservative conflicts, new isolated version in the selected external library | Real native parsing/staging/publication pipeline with synthetic upstream and stubbed Java acquisition. No prior receipt required; no inferred pack identity or automatic deletion of unknown user files. |

## Data boundaries

Review correction: f42939d packages are superseded. Running sessions now persist the canonical launch directory and filesystem identity; recovered sessions protect that directory even if the original launcher changes or removes the version profile. A live legacy session without verifiable directory identity blocks writes until stopped. Bulk, catalog, update and local-import plans bind the directory and profile fingerprint and recheck under the shared operation lock. Environment creation, graphics Java inspection/copy and floating task feedback follow the selected library. The eight drift/scope regressions use synthetic files and controlled Node sessions, not real games. Desktop task/graphics regressions use controlled IPC responses and do not modify the clipboard.

### Component and dependency transactions

The external adapter stages native official-source installers in AMBER state. The preview binds the library/version, canonical game-directory filesystem identity, profile/inheritance fingerprints, current library profile set and target-file hashes; plans expire after 30 minutes. Apply rechecks under the game-directory and library dependency locks. Downloads are verified before publication; a journal and preimages support rollback. Undo refuses a changed directory, library profile set or modified target bytes, including after restart. Cancellation before publication preserves source files. Staging and recovery records are retained in AMBER state for diagnosis/recovery and may consume substantial disk space.

Component replacement explicitly changes the selected version JSON/client, preserving unknown top-level launcher fields and actual game content. A referenced parent/client cannot be replaced in place: the user can explicitly create a new launch version sharing the confirmed game directory. Different existing shared dependency bytes are retained and the selected profile references a new AMBER dependency namespace. Third-party assets/libraries are never removed because the new profile stops referencing them. Recognized component metadata is regenerated; arbitrary custom patches cannot be safely attributed and are refused with a specific reason.

Supported entry families remain vanilla, Fabric, Quilt and supported legacy LaunchWrapper. Modern Forge/NeoForge module/JVM profiles are not made compatible by this adapter and fail before external publication. A local official OptiFine JAR is selected through the file picker; it is never bundled or downloaded from a mirror. Existing Forge+OptiFine remains a separately validated direct-launch combination, not a claim of every component replacement combination.

Repair reconstructs descriptors from official Minecraft/loader sources, never from arbitrary external JSON URLs. It fills missing verified files and retains different local bytes. If a loader cannot be reconstructed, the plan can still repair verified vanilla dependencies; an unidentified/custom client is not replaced. Any remaining launch failure is recorded and displayed after the partial repair. This is not a false “fully repaired” result.

The fixed Fabric process-discovery JVM marker is allowed only with Fabric Knot entry points and its exact official value. Its purpose is documented in [Fabric Meta ProfileHandler](https://github.com/FabricMC/fabric-meta/blob/14c83c0/src/main/java/net/fabricmc/meta/web/ProfileHandler.java). Arbitrary values/classes, extra arguments and non-Fabric entries remain rejected. All final expanded game-argument protections remain active.

### Explicit pack upgrade and independent backup

Pack upgrade accepts an explicit target MRPACK or provider version even without an old AMBER receipt. The existing conflict UI defaults unknown local files conservatively; the user chooses local/new bytes and whether to retain worlds. Publication creates a new isolated external version, preserving the source and shared files. Its sidecar stores the new pack baseline. Missing provenance prevents automatic discovery of the same original pack and reliable three-way ownership, not an explicit new target. Direct in-place pack overwrite is redirected to this reviewed new-version workflow.

Full backups capture the flattened, sanitized launch recipe, verified client/libraries/natives/logging/index and every referenced asset object plus selected game-content categories. Restoration verifies the entire dependency closure and creates a new isolated version; original JSON/inheritance/library registration need not survive. The backup folder can be explicitly selected from the backup page and restored into a new empty external library. A failed import retains its preparation for retry and restores the prior library selection. Existing different shared bytes are never overwritten; use an empty library in that case.

Offline completeness is limited to the host platform/architecture and requires complete validated source dependencies at backup time. Java is not included and must be selected or prepared separately. Launcher accounts, session state, private launcher logs and arbitrary top-level launcher metadata are excluded. Mod configuration can contain private credentials: the UI warns users to inspect it before backup/sharing. These are personal backups, not redistribution permission for OptiFine or other third-party binaries. Configuration/world-only backups retain the previous source-dependent semantics and are explicitly labeled.

中文：四项能力现已通过专用外部适配器接入。组件替换有明确文件预览、共享依赖保护和可拒绝覆盖的撤销；修复仅使用可信上游，未知组件不阻碍其他官方资源修复，不同本地内容保持原样。整包升级允许明确选择新 MRPACK，不要求旧 receipt，始终在所选库新建隔离版本。完整备份可在原库已删除时恢复到新空库，包含当前平台依赖但不包含 Java；配置／存档单独备份仍依赖原配置。现代模块加载器、任意自定义补丁及所有组合兼容不作承诺。

Renderer requests capture a library ID. Async service graphs retain that identity through completion. Switching remounts instance pages and invalidates stale plans. Accounts, application preferences and update channels remain product-specific. Additional managed libraries use the same native service graph.

External launch/session state stays in library-state170/<library-id>/<version-id>. Actual game files are separate from AMBER metadata. Content state, locks and history use the confirmed ordinary game directory, shared by versions using that directory. Original JSON and HMCL/PCL configuration are not rewritten for names or scans. Full backups restore a self-contained launch profile; partial backups retain the original inheritance requirement.

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

原生内容安装、依赖检查、启停删除、更新锁定、历史回滚、编辑器、截图、备份及工作台入口已贯通。完整备份可脱离原库恢复到新隔离版本，不覆盖共享存档；Java 需另行准备，配置／存档单独备份仍依赖原配置。组件、修复与整包升级使用上文明确的预览、可信来源和事务边界；不支持的现代模块加载器及未知自定义配置仍有具体限制，不能宣称任意外部库完全等价。

真实桌面和行为测试使用隔离数据，真实游戏测试只操作已核验私有副本。Java 运行与初始化日志不等于可见菜单、世界游玩或安装升级已验收。原始 8,980 个文件保持一致。测试包沿用产品正常安装身份与默认位置，请备份并使用隔离 Windows 用户或虚拟机；合并仍由用户决定。

## Review regression boundaries

The 6241c6e packages are intermediate and superseded. The dedicated library-review170 regressions exercise source account exclusion throughout a shared-library clone and its prepared backup, legitimate incoming root configuration, ancestor-client repair/undo and directory identity changes, cancellation before/during/after publication, and independent restoration of a sanitized pack baseline after source deletion. Existing-source retention and incoming-package eligibility are intentionally separate. The backup management schema only retains necessary title/version identity and relative file hashes/sizes; it never copies arbitrary sidecar objects or absolute source bindings.

`versions/<ancestor>/<ancestor>.jar` is an authorized repair target only when recorded against the resolved current client owner, filesystem identity and affected profiles. Its exact target is revalidated during apply and undo. The atomic new-version directory rename is the pack commit point: before it, cancellation rolls back this operation’s writes; after it, cancellation cannot undo publication and the task reports completion. Post-publication state errors explicitly report that a version has already been published.

中文：6241c6e 为已过时中间包。本轮回归区分外部源安全保留与合法 incoming 文件，排除启动器账号等状态，验证祖先客户端精确撤销、发布取消边界及脱离原库后的整包身份恢复。备份仅保存必要且清洗后的管理字段；修复不扩大任意版本路径写入权限。新版本目录原子发布是提交点，提交后不假称取消。

Existing backups are not silently deleted or rewritten. An older intermediate pack backup containing disallowed launcher/private-state entries is refused on restoration; do not distribute such a backup. / 不会静默删除或改写已有备份。旧中间包产生的备份若包含禁止的启动器／私有状态条目，恢复会被拒绝；请勿分发这类备份。
