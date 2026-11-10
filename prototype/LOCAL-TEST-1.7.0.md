# AMBER / AmberE 1.7.0 task builds

This is a development PR, **not a formal release**. Base main: `3069b969ce416ba40173d1681b505b554e262361`. The final PR head and CI `TEST-REVISION.txt` identify the tested source; each installer has its own byte count, SHA-256 and provenance. No merge, Release publication or Pages deployment is part of this task.

**Back up existing data before installing.** Test installers retain the normal product installation identities and default data locations. They can upgrade/replace an installed product and are not inherently isolated. Use a disposable Windows user or VM for installer acceptance. Automated desktop QA uses explicitly checked, isolated userData and synthetic libraries. AMBER ownership checks and AmberE's independent account policy remain in force. AmberX and theme assets are unchanged.

## Libraries and data locations

The Instances page has a library directory on the left. Each library has an application display name and a folder path; renaming the display label never renames a disk directory. Adding an existing library registers the path directly. There is no `.minecraft` copy-import entry in the interface. Existing instances produced by earlier copy imports remain regular AMBER instances and are not migrated or deleted. Local modpack import remains separate.

The default library retains the existing full instance management interface. Additional managed libraries currently expose vanilla creation, installation/repair, Java selection, launch, folder access and recycle/restore. External Minecraft libraries expose their existing versions, explicit game-directory confirmation, Java selection, launch, folder access and recycle/restore. Changing external loader installations and repairing missing external files remains the original launcher's responsibility; AMBER does not rewrite another launcher's JSON or silently rebuild its library. Global quick-switch, content tools and backup pages still refer to the default managed library; they are not presented as external-version tools.

All additional-library calls carry a library ID. Per-library components remount on switching and discard responses after unmount. Same-named versions in different libraries are independent. Removing a library only unregisters it; files remain. Re-adding the same path restores its registration identity and recycle records. Unavailable disks cause an error rather than creation of an empty replacement library.

External game data is read in place. AMBER launch records, native extraction and Java selections live under the application's own `library-state170/<library-id>/<version-id>` directory. The game itself writes to the explicitly resolved game directory, including its own options, logs, saves and mod configuration. Existing assets and libraries are used from the external root. External version recycling moves only `versions/<version-id>` to `.amber-trash` or `.ambere-trash` in that same library. Root-level saves/mods/assets/libraries are not moved. Inheritance dependents and ambiguous/unreadable dependent versions block recycling. Restoration refuses same-name collisions. There is no permanent external-library purge action.

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

The library page offers **Download OptiFine (official site)** through the system browser. Use the official [downloads page](https://optifine.net/downloads) to match Minecraft and the listed Forge build. The [copyright terms](https://optifine.net/copyright) prohibit public redistribution without advance written permission. Therefore no OptiFine binaries are committed or bundled, and no unofficial mirror bypass is introduced. Browser download followed by explicit local JAR selection is the supported acquisition flow; AMBER does not invent a trusted automatic-download checksum catalog.

Managed instances retain standalone installation and supported Forge-mod import. Standalone installation now checks the Minecraft version embedded in the selected JAR before running the existing installer helper. Forge compatibility remains the official table's responsibility; matching Minecraft alone is not a guarantee for every Forge version. Fabric/Quilt combinations are not advertised as supported. Existing external OptiFine profiles are handled through the direct-launch safety boundary above.

Configuration-format evidence was consulted from upstream HMCL `VersionSetting` and PCL `McInstance.PathIndie` (2026-11-10):
- <https://raw.githubusercontent.com/HMCL-dev/HMCL/master/HMCL/src/main/java/org/jackhuang/hmcl/setting/VersionSetting.java>
- <https://raw.githubusercontent.com/Meloong-Git/PCL/main/Plain%20Craft%20Launcher%202/Modules/Minecraft/ModMinecraft.vb>

## Verification record

Original HMCL samples are never launched or changed. Before testing, all 8,980 original files were hashed, copied into a private isolated QA directory and the copy verified. Original hashes matched afterward. The six copied versions yielded local launch plans after explicit QA directory confirmation: 1.12.2 Forge + OptiFine (53 classpath entries / 3 native archives), 1.16.4 Fabric (42 / 8). This is not itself real-game acceptance. Sample contents, private logs, account stores and file-level integrity manifests are excluded from the PR and installers.

Final complete local regression: 804 passed, no skips, including 36 library/location boundary tests; Sites tests: 4 passed. Build, release:check (3,158 bilingual messages / 478 source files), and isolated desktop smoke passed. Electron IPC/UI tests cover switching same-name versions, recycle/restore, unchanged shared saves, cancel, English/light and Chinese/dark at 125% zoom; inner workspace overflow is checked and bottom controls are exercised. CI and packaged provenance results are recorded in the PR delivery. Build retains the existing large-bundle warning. Full installer upgrade acceptance, long-running multi-launcher concurrency and native non-Windows acceptance remain separate from mocked/synthetic UI checks.

## 中文说明

这是 1.7.0 开发任务测试包，不是正式发布。左侧选择实例库，右侧显示该库实例；库名称仅用于软件显示，下方显示文件夹位置。添加现有库直接注册路径，不复制内容。旧版复制导入产生的实例继续保留，整合包导入不受影响。每库独立回收恢复；外部回收仅移动版本目录，根目录共享资源不移动，恢复不覆盖同名目录。移除库仅从列表注销，重新添加可找回原回收记录。

首次运行可选程序目录下产品文件夹、AppData 或自选位置。选择外部 `.minecraft` 时，应用状态留在产品自己的 AppData，游戏数据就地使用；明确写入路径，不可写时停止，不静默回退。升级保留既有数据；不新增便携版。

默认库保留完整旧管理功能；额外自建库目前提供原版创建、安装修复、Java 选择、启动和回收恢复。外部库提供目录确认、就地启动和回收恢复，修复或修改组件请使用原启动器。全局快速切换、内容工具和备份页仍面向默认库。现代 Forge/NeoForge 的外部模块启动入口、自定义主类/JVM 参数和库外游戏目录暂不接管。无法确定隔离模式时明确提示并要求逐版本确认，不按文件夹名推断，不搬走共享模组。

OptiFine 从官网在浏览器下载后，使用本地 JAR 安装流程；不打包再分发，不使用不可信镜像。按官网匹配 Minecraft 与 Forge；不宣称全版本、全加载器兼容。独立安装增加 Minecraft 版本一致性校验。六份测试副本已通过本地启动计划检查，原始 8,980 个文件前后完整性一致；计划检查不代表真实游戏成功。最终测试、成品、CI 和游戏验收结果以 PR 交付记录为准。

测试安装包沿用正式安装身份和默认数据位置，可能替换现有安装，**请先备份，使用一次性 Windows 用户或虚拟机验收**。AMBER 与 AmberE 保留各自账号规则和默认数据/更新渠道。未合并 PR、未发布 Release、未部署 Pages；独立审查与用户验收仍待父会话协调。

## Final safety and real-game evidence

Recovered on-disk game sessions block unregister, data migration and updates even before a library page is opened. Migration rejects overlap with registered and retired libraries. Initial external validation occurs before committing the location pointer; a later unavailable library shows an error and continues to the application, where it can be added again. Recycle records carry an identity stored inside the library recycle directory, allowing recovery from another application-data root. Explicit user directory choices remain editable.

External logging accepts only the official `-Dlog4j.configurationFile=${path}` template and two pinned Mojang XML hashes (client-1.7.xml: 50c9cc4af6d853d9fc137c84bcd153e2bd3a9a82; client-1.12.xml: bd65e7d2e3c237be76cfbef4c2405033d7f91521), verified against [official version metadata](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json) on 2026-11-10. Missing or altered XML blocks launch; external URLs are not fetched. Resolved HMCL dependency conflicts use declared component priorities rather than version-number sorting. Forge-aware OptiFine tweak normalization and classpath ordering occur only in memory, keeping the original client and actual dependencies ahead of OptiFine placeholder classes.

Actual game test: the isolated AmberE desktop used its normal offline-account authorization flow and the copied mod-isolated library. The copy lacked the official logging XML; that file alone was downloaded from Mojang, hash checked, and added to the private copy for the final run. Both 1.12.2 / Forge 14.23.5.2864 / OptiFine HD_U_G6_pre1 and 1.16.4 / Fabric remained running for the 45-second observation interval and logged resource/audio initialization. No world gameplay, multiplayer, visible game-menu acceptance, or real Microsoft-account launch is claimed. Native window capture approval timed out, so visible-game acceptance remains unverified. The other two sample libraries have static-plan evidence, not real-game acceptance. Earlier failures and their fixes are recorded privately; this is not evidence of universal loader compatibility.

Remaining acceptance gaps: actual installer upgrade over a previous release, non-Windows native UI/game launch, full first-run dialog interaction under disk removal/ACL changes, custom-theme visual combinations, global HMCL/PCL settings located outside the registered root, modern Forge/NeoForge launchers, arbitrary custom JVM flags and out-of-root game directories. Additional libraries currently expose a focused manager; the global quick switch, content and backup tools still target the default library. These are explicit Draft PR limitations, not completed product acceptance.

## Conditional launch-argument follow-up

The cb6ff437 test packages are superseded: review reproduced an OS/feature rule bypass that changed protected option/value adjacency after validation. External launch now uses the same rule-filtering function as argument expansion, validates the effective ordered tokens under the launch environment, and retains only those validated strings in its in-memory plan. Later placeholder expansion cannot re-filter or reorder them. Seven additional regressions exercise the full profile/local-plan pipeline for OS and feature conditions affecting gameDir, assetsDir and tweakClass, plus a valid conditional profile through final launchArguments. No Java is spawned by these synthetic security tests. Replacement installers and exact-head provenance are linked from the PR.
