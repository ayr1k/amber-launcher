# 1.7.0 formal release / 正式发布

PR #15 merged as `db50abef2d74b50bcd8e220163c6fb8f297a6daa`; accepted merged task head: `6f567e9b11875a40f0910bb7c9e28d57a6c0184e`. The user explicitly requested formal publication on 2026-11-11 (America/New_York). Official packages use **1.7.0/public**. Earlier independent COMMENT review applies to `fc49e5c5ce6c03a2b9edbfedf78a82c1a1fcabe5`; it is not described as independent review of later changes. Final-head CI/developer/coordinator evidence retains its own scope. User-approved merging and this release instruction govern publication; candidate/local-only/no-publication language below is historical. This main chat does not repeat content review. Rendered menu/world pixel acceptance was not completed after application screenshot approval timed out; visible-window metadata is not substituted for that acceptance. All other recorded limits remain. See RELEASE-ACCEPTANCE.md for formal checks.

PR #15 已合并并获用户明确正式发布授权。独立复核仅归属于其原提交，后续最终提交的 CI／开发／协调证据保留各自范围，不冒称已完成新的独立审核。下方 Draft、本地渠道、不得发布等为历史阶段描述；本次使用 1.7.0/public。菜单／世界像素画面因截图批准超时未完成验收，不以窗口属性代替；本会话按已批准合并执行发布，不重复内容审核。

# AMBER / AmberE 1.7.0 task builds

This is a development PR, **not a formal release**. Base main: `3069b969ce416ba40173d1681b505b554e262361`. The final PR head and CI `TEST-REVISION.txt` identify the tested source; each installer has its own byte count, SHA-256 and provenance. No merge, Release publication or Pages deployment is part of this task.

**Back up existing data before installing.** Test installers retain the normal product installation identities and default data locations. They can upgrade/replace an installed product and are not inherently isolated. Use a disposable Windows user or VM for installer acceptance. Automated desktop QA uses explicitly checked, isolated userData and synthetic libraries. AMBER ownership checks and AmberE's independent account policy remain in force. AmberX and theme assets are unchanged.

## Libraries and data locations

The Instances page has a library directory on the left. Each library has an application display name and a folder path; renaming the display label never renames a disk directory. Adding an existing library registers the path directly. There is no `.minecraft` copy-import entry in the interface. Existing instances produced by earlier copy imports remain regular AMBER instances and are not migrated or deleted. Local modpack import remains separate.

The selected library now supplies the global selector, quick list, launch home and existing instance-management pages. Managed libraries use the same native services. External versions use confirmed game directories for content, editor, screenshot and world operations, with AMBER metadata, transaction history, preferences and backups kept in application state. See [the capability and validation matrix](LIBRARY-MANAGEMENT-1.7.0.md) for supported operations and exact limits. External component replacement and missing-file repair now use reviewed official-source transactions; explicit whole-pack upgrade creates a new isolated version. Full backups support independent empty-library recovery. See the matrix for exact supported profiles, source requirements and remaining limits.

All additional-library calls carry a library ID. Per-library components remount on switching and discard responses after unmount. Same-named versions in different libraries are independent. Removing a library only unregisters it; files remain. Re-adding the same path restores its registration identity and recycle records. Unavailable disks cause an error rather than creation of an empty replacement library.

External game data is read in place. AMBER launch records, native extraction and Java selections live under the application's own `library-state170/<library-id>/<version-id>` directory. The game itself writes to the explicitly resolved game directory, including its own options, logs, saves and mod configuration. Existing assets and libraries are used from the external root. External version recycling moves only `versions/<version-id>` to `.amber-trash` or `.ambere-trash` in that same library. Root-level saves/mods/assets/libraries are not moved. Inheritance dependents and ambiguous/unreadable dependent versions block recycling. Restoration refuses same-name collisions. Permanent cleanup requires the exact recycled name and deletes only the validated recycle entry; it never cleans shared library resources.

First launch offers a product-named directory beside the program, the normal AppData location, or a custom directory. Existing application data is retained on upgrade. Empty custom locations hold application data directly. Selecting `.minecraft` keeps AMBER state in its own AppData library and offers registration of the external game root after an isolation warning. A small storage pointer and Electron preferences remain in the edition's AppData userData. Unwritable chosen paths show an error without switching to a fallback. Existing data relocation still uses the previous copy/verify/restart workflow. This does not add a portable distribution.

## Compatibility and safety boundary

| Input | Implemented behavior | Evidence / limits |
| --- | --- | --- |
| Official version inheritance / launcher profiles | Bounded inheritance, cycle/ID checks, configured game directory | Synthetic regression coverage; outside-root directories are rejected, not followed automatically |
| HMCL resolved profiles with patches | Uses the resolved metadata once; combines legacy game arguments with supplemental arguments | Six supplied sample copies initially formed local plans; final log-safety checks also require the official XML; no claim that folder names prove isolation |
| HMCL per-version isolation | Reads explicit non-global `hmclversion.cfg` settings | Missing global configuration leaves mode undetermined; user confirms actual game directory |
| PCL per-version isolation | Reads explicit V2 boolean or legacy manual flags from `PCL/Setup.ini` | Global/default settings are not guessed; unknown requires confirmation |
| Mixed shared/isolated versions | Per-version directories and a mixed summary | Synthetic tests; shared mods are never automatically relocated |
| Vanilla, Fabric, Quilt, legacy LaunchWrapper | Allowlisted main classes, bounded local metadata, local classpath/native validation | Native architecture and Java requirements still apply |
| Legacy Forge + OptiFine | Preserves both FML and OptiFine tweak arguments and local libraries | 1.12.2 sample plans verified; real-game evidence is reported separately |
| Modern Forge / NeoForge module launchers, custom main classes/JVM flags | Explicitly blocked in external direct-launch mode | No universal loader compatibility claim; use original launcher |
| Junctions, symlinks, traversal, inherited cycles, unknown tweak classes/agents | Rejected | Synthetic regression coverage |

Launch planning verifies declared hashes for client/library/index files, hashes the local classpath/native inputs for a pre-spawn consistency check, and checks asset object existence/size. A locally computed hash is a change detector, not an upstream authenticity assertion. Existing local executable game/mod JARs are not sandboxed. AMBER never executes launcher pre/post commands, wrappers or arbitrary external JVM flags, and does not download from external profile URLs. Missing/changed files stop launch with an error.

The warning for a recognized shared or mixed library includes the exact requested text: **此库未开启版本隔离，请自行核对模组冲突风险**. Unknown isolation has its own explicit warning and requires per-version confirmation. A library containing only modded versions cannot distinguish a global “modded only” policy from “all versions” without further configuration evidence.

## OptiFine sources and distribution

The redundant OptiFine download/explanation row has been removed from the library page. Existing official-source and local-installer safeguards remain. Use the official [downloads page](https://optifine.net/downloads) to match Minecraft and the listed Forge build. The [copyright terms](https://optifine.net/copyright) prohibit public redistribution without advance written permission. Therefore no OptiFine binaries are committed or bundled, and no unofficial mirror bypass is introduced. Browser download followed by explicit local JAR selection is the supported acquisition flow; AMBER does not invent a trusted automatic-download checksum catalog.

Managed instances retain standalone installation and supported Forge-mod import. Standalone installation now checks the Minecraft version embedded in the selected JAR before running the existing installer helper. Forge compatibility remains the official table's responsibility; matching Minecraft alone is not a guarantee for every Forge version. Fabric/Quilt combinations are not advertised as supported. Existing external OptiFine profiles are handled through the direct-launch safety boundary above.

Configuration-format evidence was consulted from upstream HMCL `VersionSetting` and PCL `McInstance.PathIndie` (2026-11-10):
- <https://raw.githubusercontent.com/HMCL-dev/HMCL/master/HMCL/src/main/java/org/jackhuang/hmcl/setting/VersionSetting.java>
- <https://raw.githubusercontent.com/Meloong-Git/PCL/main/Plain%20Craft%20Launcher%202/Modules/Minecraft/ModMinecraft.vb>

## Verification record

Original HMCL samples are never launched or changed. Before testing, all 8,980 original files were hashed, copied into a private isolated QA directory and the copy verified. Original hashes matched afterward. The six copied versions yielded local launch plans after explicit QA directory confirmation: 1.12.2 Forge + OptiFine (53 classpath entries / 3 native archives), 1.16.4 Fabric (42 / 8). This is not itself real-game acceptance. Sample contents, private logs, account stores and file-level integrity manifests are excluded from the PR and installers.

Historical intermediate candidate `6241c6e52a14cd888fffd3866b93b5f16cb5c2bb` (superseded; four subsequent capability-review regressions exposed defects): 876 repository tests and 4 Sites tests passed; build, release:check (3,200 bilingual messages / 503 source files), isolated desktop smoke and both packaged-product smoke/provenance checks passed. These numbers describe that exact reviewed candidate, not any subsequent working-tree revision; the PR delivery identifies the current tested head and artifacts. Electron IPC/UI tests cover same-name library switching, scoped content operations, official repair previews, confirmation and stale-plan invalidation, English/light and Chinese/dark at 125% zoom; inner workspace overflow and reachable bottom controls are checked. Task/graphics routing fixtures are explicitly distinguished from real IPC operations. Private-copy normal-home launches verified Forge + OptiFine, Fabric, an independently restored version, and a replaced Fabric configuration followed by exact-profile rollback. Java/resource/audio initialization is not visible game-menu or gameplay acceptance. Build retains the existing large-bundle warning. Actual installer upgrade, long-running multi-launcher concurrency and native non-Windows acceptance remain unverified. Earlier test totals are superseded and are not current acceptance evidence.

## 中文说明

这是 1.7.0 开发任务测试包，不是正式发布。左侧选择实例库，右侧显示该库实例；库名称仅用于软件显示，下方显示文件夹位置。添加现有库直接注册路径，不复制内容。旧版复制导入产生的实例继续保留，整合包导入不受影响。每库独立回收恢复；外部回收仅移动版本目录，根目录共享资源不移动，恢复不覆盖同名目录。移除库仅从列表注销，重新添加可找回原回收记录。

首次运行可选程序目录下产品文件夹、AppData 或自选位置。选择外部 `.minecraft` 时，应用状态留在产品自己的 AppData，游戏数据就地使用；明确写入路径，不可写时停止，不静默回退。升级保留既有数据；不新增便携版。

额外托管库复用原生管理服务；所选实例库已贯通全局快速切换、启动页、内容工具、设置和备份页。受支持的外部版本可直接启动并管理实际游戏目录中的内容；组件替换和可信缺失文件修复使用明确预览、校验、共享依赖保护与事务回滚。整包升级允许明确选择目标 MRPACK，在所选外部库创建新隔离版本，不要求已有 AMBER 安装记录。完整备份可在原库删除后恢复到新空库，限定已验证的当前平台依赖且不包含 Java；配置／存档单独备份仍依赖原配置。现代 Forge/NeoForge 的外部模块启动入口、未知自定义主类/JVM 参数或补丁归属、库外游戏目录仍有限制，具体见能力矩阵。无法确定隔离模式时明确提示并要求逐版本确认，不按文件夹名推断，不搬走共享模组。

历史中间候选 `6241c6e` 的测试记录为（不代表后续四项能力审查通过，该包已过时）：876 项仓库测试、4 项 Sites 测试、3,200 条双语消息及 503 个源码文件检查通过，双产品成品启动与来源一致。后续修改不能沿用该候选的验收结论，当前交付 head、安装包及检查结果以 PR 为准。旧的测试总数不再作为当前最终结果。

OptiFine 从官网在浏览器下载后，使用本地 JAR 安装流程；不打包再分发，不使用不可信镜像。按官网匹配 Minecraft 与 Forge；不宣称全版本、全加载器兼容。独立安装增加 Minecraft 版本一致性校验。六份测试副本已通过本地启动计划检查，原始 8,980 个文件前后完整性一致；计划检查不代表真实游戏成功。最终测试、成品、CI 和游戏验收结果以 PR 交付记录为准。

测试安装包沿用正式安装身份和默认数据位置，可能替换现有安装，**请先备份，使用一次性 Windows 用户或虚拟机验收**。AMBER 与 AmberE 保留各自账号规则和默认数据/更新渠道。未合并 PR、未发布 Release、未部署 Pages；独立审查与用户验收仍待父会话协调。

## Final safety and real-game evidence

Recovered on-disk game sessions block unregister, data migration and updates even before a library page is opened. Migration rejects overlap with registered and retired libraries. Initial external validation occurs before committing the location pointer; a later unavailable library shows an error and continues to the application, where it can be added again. Recycle records carry an identity stored inside the library recycle directory, allowing recovery from another application-data root. Explicit user directory choices remain editable.

External logging accepts only the official `-Dlog4j.configurationFile=${path}` template and two pinned Mojang XML hashes (client-1.7.xml: 50c9cc4af6d853d9fc137c84bcd153e2bd3a9a82; client-1.12.xml: bd65e7d2e3c237be76cfbef4c2405033d7f91521), verified against [official version metadata](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json) on 2026-11-10. Missing or altered XML blocks launch; external URLs are not fetched. Resolved HMCL dependency conflicts use declared component priorities rather than version-number sorting. Forge-aware OptiFine tweak normalization and classpath ordering occur only in memory, keeping the original client and actual dependencies ahead of OptiFine placeholder classes.

Actual game test: the isolated AmberE desktop used its normal offline-account authorization flow and the copied mod-isolated library. The copy lacked the official logging XML; that file alone was downloaded from Mojang, hash checked, and added to the private copy for the final run. Both 1.12.2 / Forge 14.23.5.2864 / OptiFine HD_U_G6_pre1 and 1.16.4 / Fabric remained running for the 45-second observation interval and logged resource/audio initialization. No world gameplay, multiplayer, visible game-menu acceptance, or real Microsoft-account launch is claimed. Native window capture approval timed out, so visible-game acceptance remains unverified. The other two sample libraries have static-plan evidence, not real-game acceptance. Earlier failures and their fixes are recorded privately; this is not evidence of universal loader compatibility.

Remaining acceptance gaps: actual installer upgrade over a previous release, non-Windows native UI/game launch, full first-run dialog interaction under disk removal/ACL changes, custom-theme visual combinations, global HMCL/PCL settings located outside the registered root, modern Forge/NeoForge launchers, arbitrary custom JVM flags and out-of-root game directories. Modern/custom unsupported launch profiles still require their original launcher; ordinary supported profiles have the explicit component, repair and new-version pack workflows described in the capability matrix. These are explicit Draft PR limitations, not completed product acceptance.

## Conditional launch-argument follow-up

The cb6ff437 test packages are superseded: review reproduced an OS/feature rule bypass that changed protected option/value adjacency after validation. External launch now uses the same rule-filtering function as argument expansion, validates the effective ordered tokens under the launch environment, and retains only those validated strings in its in-memory plan. Later placeholder expansion cannot re-filter or reorder them. Twenty-nine additional regressions exercise the full profile/local-plan pipeline for OS and feature conditions affecting gameDir, assetsDir and tweakClass, plus a valid conditional profile through final launchArguments. The plan also carries a mandatory final-token validator used by launchArguments after placeholder expansion, bound to the confirmed game directory and library assets root. Placeholder-generated gameDir and tweakClass regressions exercise that direct pipeline without caller-supplied validation options. No Java is spawned by these synthetic security tests. Replacement installers and exact-head provenance are linked from the PR.

The final validator also rejects every non-canonical prefix of protected jopt-simple options, covering unambiguous/ambiguous abbreviations, single-dash long options/attached-value clusters and equals forms. Single-dash game tokens are rejected rather than interpreted as short-option clusters, with a narrowly defined exception for plain negative numeric values. Twenty additional cases exercise those spellings both directly and through metadata placeholder expansion. Only complete double-dash spellings of protected option names are accepted; game-directory, assets-directory and tweak-class values retain their strict checks. The intermediate 2541f3f and 837a3c3 packages are also superseded; use only the final head linked in the PR.

## External-management feedback round

The `fc49e5c` packages predate this feedback and are superseded by the replacement exact-head packages linked in PR #15. The selected-library context now reaches all native instance pages. Adding a confirmed external directory starts read-only local metadata discovery and official Modrinth batch-hash matching; disabled, invalid, duplicate, offline, failed and unmatched states remain distinct. Scanning can be cancelled/retried and stale library requests are rejected. The original sample files remain untouched. The matrix documents behavior tests separately from live Java, UI and installer acceptance.

本轮替换包包含切库贯通与外部内容管理；`fc49e5c` 及更早测试包不包含这些反馈修复。初次扫描只读文件，联网仅发送必要哈希，不发送路径或 JAR。外部备份恢复创建新隔离版本；目录共享时使用同一内容锁和事务状态。原始样本保持不变，完整兼容性与实际安装验收仍由用户确认。

## Capability review corrections / 能力复审修正

External source retention now uses an explicit game-content allowlist and excludes launcher accounts, session/token stores and global launcher state before file hashing, preview or copying. Incoming pack rules remain separate so legitimate declared root game configuration is still supported. Full backups preserve only a schema-versioned, sanitized pack baseline in their management state; restoration writes it to the new sidecar, without source paths, account/session objects, URLs or arbitrary metadata. Known private-state filenames are excluded even if a baseline lists them. Inspect legitimate mod configurations for private values before sharing.

Inherited-client repair records the exact authorized ancestor JAR, its directory filesystem identity and affected profile fingerprints. Undo revalidates those targets and dependents under the write lock, rather than accepting arbitrary version paths. Pack publication forwards the job AbortSignal into restoration. Cancellation before the atomic version-directory rename removes newly created verified files and the private partial version; after that commit point the operation completes registration and reports publication instead of claiming cancellation.

外部源保留采用明确的游戏内容范围，账号、session／token 及启动器全局状态在哈希、预览、复制前排除；incoming 新包保留独立规则，合法根目录游戏配置仍可使用。完整备份以版本化、清洗后的管理状态保留整包身份和文件基线，恢复到新 sidecar，不携带源路径、账号、session、URL 或任意字段。祖先客户端修复记录精确目标、目录身份及受影响版本，撤销时在锁内重新核验。发布前取消会清理本次新增内容；原子发布之后如实完成登记，不假称已取消。当前修正的精确 head、回归与安装包结果以 PR 交付表为准。

Known pack-owned root game files from the validated, sanitized baseline participate in upgrade conflict previews and explicit local retention. The same captured baseline governs source snapshots and retained copies; baseline drift requires a new preview. Private names are always excluded, even when listed in baseline metadata. Unknown root files remain excluded. / 经验证并清洗的整包 baseline 所属根游戏配置参与升级冲突比较和本地保留；源快照及复制使用同一记录，记录变化须重新预览。私密名称始终排除，未知根文件不会因此放行。

## HMCL logging-layout compatibility

Missing assets/log_configs in an HMCL library is supported. AMBER validates existing canonical files when present; otherwise it downloads the pinned Mojang security XML into its own library-state170/<library-id>/logging170 cache. Only the fixed argument template, matching filename, size and approved SHA-1 are accepted; metadata URLs and per-version custom log4j2.xml are not adopted. No original library file is created or overwritten. Existing linked/corrupt canonical or cache files fail closed. Initial cache preparation requires network access; a verified cache works offline and is rechecked before spawn. Full backups capture the verified private XML so offline recovery remains independent.

Official pinned sources: [client-1.12.xml](https://piston-data.mojang.com/v1/objects/bd65e7d2e3c237be76cfbef4c2405033d7f91521/client-1.12.xml), 888 bytes; [client-1.7.xml](https://piston-data.mojang.com/v1/objects/50c9cc4af6d853d9fc137c84bcd153e2bd3a9a82/client-1.7.xml), 966 bytes. Exact test-only payloads exercise checksum enforcement; production downloads through the existing trusted-source/checksum mechanism.

中文：HMCL 库缺少 assets/log_configs 不再直接导致 ENOENT。AMBER 将官方固定哈希的安全日志配置存入自身私有缓存，首次准备需要联网，已校验缓存可离线使用；不采用任意 HMCL XML，也不创建或覆盖原库文件。链接、损坏及不受支持的描述仍会被拒绝，启动前再次校验；完整备份会收集该配置。

## Windows game-window visibility

The actual game process no longer receives windowsHide:true. In the private Minecraft 1.12.2 Forge+OptiFine comparison, both java.exe and javaw.exe created hidden LWJGL windows with that flag and visible, non-minimized windows without it. Bounds were normal and arguments/game content were unchanged. Switching executables alone did not solve the issue. Java inspection and background installers retain their existing hidden behavior; launch validation, detached lifetime, file logging and session tracking remain unchanged.

Windows documents that STARTUPINFO can override the first ShowWindow request: https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-showwindow . The desktop game QA now supports AMBER_QA_REQUIRE_VISIBLE=1 to check the owned process ID/start time, LWJGL/GLFW visibility, minimized state and positive bounds; audio or initialization logs alone are insufficient. This flag does not assert that rendered menu/world pixels were visually accepted.

中文：修复实际游戏进程被 Windows 启动隐藏标记隐藏的问题。私有副本对照中，java.exe 与 javaw.exe 都受该标记影响；移除后窗口可见、未最小化且位置正常。仅更换 Java 可执行文件或补装 OptiFine 不能解决。新增窗口属性回归，不再把音乐或初始化日志当作可见画面验收。
