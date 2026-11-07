# AMBER / AmberE 1.5.3 task test build

Unreleased, local update channel. Branch: `codex/1.5.3-room-sync-recovery`; baseline: `7e51b3c2d68328e44ebdaf2c2cc44ed35f2428e7` (published 1.5.2). Both products use the shared implementation and retain their separate account rules, storage and update repositories. No merge, stable Release or Pages deployment is authorized by this task.

## Behavior and limits

- Hosts still start with sharing disabled, choose a stopped client, individually select content, review privacy/compatibility and affirm redistribution permission. Guests inspect versions, paths, sources, total selected bytes and revision differences before confirming.
- Eligible content: `mods/*.jar`, `resourcepacks/*.zip`, `shaderpacks/*.zip`, and text files below `config` with extensions JSON/TOML/properties/CFG/INI/YAML/YML and at most six nested directories. ZIP files are copied intact, never extracted or automatically enabled. Config files are at most 1 MiB. Private-looking names/content, links and hardlinks are excluded or rejected; this is not a guarantee that arbitrary user content is public. Hosts must inspect every selected file and archive for private data and redistribution rights.
- Selection, publication and reception allow at most **2,000 files**, **256 MiB per file**, and **4 GiB selected content**. Paths remain bounded to 200 JavaScript string units. Candidates have a bounded 20,000-entry scan. The UI shows selected bytes and blocks publication above the total. Space is checked before snapshot storage and before guest cache/independent-instance preparation, with 64 MiB headroom; game/Java/loader downloads require additional space.
- The actual signed JSON/base64 envelope is checked before a snapshot becomes active and on reception, with a **4 MiB wire limit**. The larger envelope budget accounts for long Unicode paths, source identifiers, hashes, JSON encoding, base64 expansion and signatures; file count alone is not a byte limit. Both peers should use 1.5.3 for the new content/limits. Older peers may reject them safely.
- Recognized Modrinth/CurseForge archives and mods retain original-platform downloads and exact hash/size provenance. Resource/shader category and game version must match; mods additionally use existing loader compatibility. A restricted/unavailable platform download never falls back to host transfer, even with cached bytes. No arbitrary URL proxy is added.
- Host file transfer streams bounded bytes and supports authenticated range requests. A cancelled download retains a hash-keyed partial; only a fresh explicit confirmation of a current signed revision resumes it. A partial is not installed until the complete SHA-256 and size match. Corrupt partials are discarded, not promoted. Sharing withdrawal disconnects transfers; room departure/expiry and revision change still cancel preparation.
- Local history is bound to the invitation's room name and host public key. No invitation token or account data is persisted in it. Preview differences use the last completed environment, falling back to the previous preview before the first completion. History and verified caches survive restart.
- For the same revision, an unfinished target with matching receipt, setup plan and runtime can resume after fresh confirmation, including Java/loader/game preparation failures. Generic Task Center retry remains blocked for incomplete room setup. Missing/corrupt recovery records, changed runtimes and locally modified selected files prevent same-target resume. The UI explains conflicts and offers an explicit **preserve original and create independent instance** choice. No selected existing file is silently overwritten.
- New revisions create independent instances. Removed files and runtime changes are shown; previous versions, saves and personal edits stay in the old instance. There is no automatic promotion, merging of personal changes or deletion of old instances/caches/snapshots. To roll back, use the preserved previous instance. An interrupted local copy that left conflicting destination bytes requires the independent-instance choice; those bytes are preserved for inspection.

## Verification

Local recorded results: 650 complete regressions passed, zero skipped; four static-serving tests passed; 2,857 bilingual-message checks and source/license checks passed; production frontend build passed. The final history-baseline correction additionally passed the three actual-workflow restart/update cases. Host and guest isolated Electron scripts passed. Packaging/CI status and the exact head are recorded in the PR so later builds cannot inherit these results silently.

The required complete regression suite, static-serving tests, locale/source checks and frontend production build are run for delivery; exact results and tested commit are recorded in the PR and installer provenance. Targeted checks cover:

- 2,000/2,001 selected files including configuration, duplicate/case collisions, unsafe/private paths, hardlinks, file/config/aggregate sizes and platform restrictions;
- actual publication and signed HTTP preview of 2,000 long Unicode paths with platform IDs, plus just-within/over-limit signed-envelope byte tests;
- a real loopback HTTP transfer of a synthetic 65 MiB archive, valid/invalid ranges, authenticated revocation, interrupted streamed bytes and checksum-verified continuation;
- actual Workflows/VanillaLauncher Java, loader and game failure paths, recreated objects after restart, same-instance resume, local conflicts, explicit new-instance recovery and preserved previous revisions;
- real unpackaged Electron with asserted isolated userData: actual host candidate/publish/disable IPC, nested config and archive selection, privacy and redistribution controls, long names, narrow windows, light/square and dark/rounded themes; guest conflict recovery choices and cancellation. Room/server identities and guest previews in the UI check are synthetic.

Screenshots are under `review/room153-*.png`. Reproducible UI scripts are `scripts/qa-room-host153.cjs` and `scripts/qa-room-sync153.cjs`; set `AMBER_PLAYWRIGHT` to an installed Playwright package. Do not point these scripts at personal data.

## Delivery and remaining limits

The PR's `PR test installers` workflow supplies both Windows x64 installers, `.sha256` files, `TEST-REVISION.txt` and per-product provenance in `pr-test-installers-<head SHA>`. GitHub sign-in may be required and retention is 30 days. Generated installers are not committed. The PR must identify the latest tested head and artifact URL; a prior run is not evidence for a later code change.

These checks do **not** establish real modpack compatibility, actual game launch/join, two-machine or cross-network/NAT/relay behavior, live third-party platform availability/credentials, or native macOS/Linux acceptance. The 4 GiB aggregate limit is tested with validated manifest arithmetic; a full 4 GiB real modpack transfer is not claimed. Common single loaders retain existing support; arbitrary mixed loaders are not promised. Performance and disk usage depend on actual selected content and the network. Installers remain subject to independent review and the user's acceptance.

## 中文说明

本版为 1.5.3 任务测试包，非正式发布。支持逐项选择资源包、光影 ZIP 和最多六层子目录的文本配置；ZIP 不解压、不自动启用。统一限制为 2000 个文件、单文件 256 MiB、选中内容合计 4 GiB；配置限 1 MiB，签名后的传输封装限 4 MiB。原平台来源及许可限制、房主明确选择和玩家确认保持有效。

断网／取消后可在重新确认当前修订后复用已校验缓存和下载片段；重启后可继续同一修订的原未完成实例。若本地文件、运行环境或恢复记录发生变化，禁止默认覆盖，需明确选择保留原实例并新建。新修订始终独立创建，差异以最近完成的环境为基准；旧实例、存档和个人修改保留，可回到旧实例使用。未自动清理历史实例、缓存或快照。

隔离测试覆盖数量与字节边界、长 Unicode 路径、实际回环流式传输、取消／恢复、校验失败、授权撤销、工作流重启恢复、本地冲突，以及深浅主题和窄窗口 UI。测试使用合成数据，未完成真实整合包、双机跨网和实际游戏验收，不将这些测试描述为真实联机成功。PR 提供对应提交的两款 Windows 安装包、校验值和构建来源；由独立审核及用户验收决定合并，正式发布另行授权。
