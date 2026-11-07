# 1.5.4 formal release

PR #9 merged as `5265ddb05709b4d20301fb5bcb2ebed57d82fc0e`, accepted task head `0687c46e9f787438d5726b751259de7f8eab30de`. The user requested formal release on 2026-11-07. Official packages use **1.5.4/public**. Candidate restrictions and review requests below remain historical evidence, not the current authorization. Content review belongs to separate tasks and Dot and is not repeated here. RELEASE-ACCEPTANCE.md records formal release verification.

PR #9 已合并且用户已授权完整正式发布；正式包为 **1.5.4/public**。下方候选限制与待审核描述保留历史归属；当前发布沿用既有独立任务／Dot 审核及用户验收。

# AMBER / AmberE 1.5.4 task candidate

Branch: `codex/1.5.4-storage-lists`. Base: `61d95e1` (published 1.5.3). Version 1.5.4, local test channel. This task does not authorize merging, stable Releases or Pages deployment. Both editions share these changes and retain their account, data and update identities.

## Storage maintenance

The existing Settings → Data & onboarding scan includes room synchronization state, server instances and server recycle storage. Category totals deduplicate file identities (including hardlinks). Instance detail is a breakdown, not an additional total. These are bounded logical file-byte subtotals, not allocated disk usage or guaranteed freed space. Unlisted paths, inaccessible entries and link targets are excluded; incomplete rows retain their warning.

Cleanup is deliberately limited to **completed updater downloads with a valid receipt**, a matching SHA-256/size/product/filename, and a version no newer than the installed version. Downloads now write receipts after verification. Historical downloads without receipts, partial downloads, newer installers and unknown files are retained. Therefore an existing installation may have no eligible downloads until it has downloaded and upgraded with this version. Age or a directory name alone never makes a file eligible.

The scan also shows verified reclaimable file bytes and protected in-use, incomplete/recovery or unknown instance activity as of the scan time. The existing update-cache cleanup action presents exact filenames, expected bytes and redownload consequences in a native confirmation dialog. Active tasks and ready update installers block cleanup. Execution revalidates each receipt, hash, file identity, boundary and task state, removes individual ordinary files only, and supports cancellation between I/O chunks/files. Reports distinguish completed files, failures, partial completion and cancellation; removed file bytes are not a promise of an equal free-space increase. Small receipts remain as provenance. Concurrent external filesystem changes are rejected when observed; this is not a defense against a privileged process continuously racing filesystem operations.

No direct cleanup is offered for content/loader caches whose recovery references cannot safely be ruled out. Room snapshots, recovery journals, download fragments, instances/worlds, personal settings/accounts, manual/upgrade backups, databases, shared runtimes and recycle bins remain protected. No automatic cleanup or developer-workspace installer cleanup is added. Existing explicit instance recycle-bin operations retain their separate confirmation.

## Lists

Installed content clears selection when search/type/state/instance changes; batch actions receive only visible nonmissing entries. Select-all applies to the entire current filtered result (no pagination), excludes missing files and retains the existing 200-item batch limit and dependency/recovery confirmation. Routine refresh preserves still-present selections. Selected rows use theme colors and visible checkbox hit areas.

Instances, installed content and tasks have independent remembered comfortable/compact density controls using the existing themed keyboard-accessible choice component. Existing instance search/sort/favorites are reused; tasks gain a name/phase search alongside their existing status filters. No new destructive instance/task bulk action is introduced.

## Evidence

- Complete regressions: 659 passed, zero skipped (650 existing + 9 storage tests).
- Production build, four static-serving checks, 2,857 locale checks and source/license checks passed.
- `tests/maintenance154.test.mjs`: isolated temporary files; provenance/hash/product/future-version rejection, changed files after preview, active-task rejection, partial permission failure, cancellation, hardlink protection/deduplication, directory junction boundary rejection. Permission/task failures are injected; hardlinks and junctions are real temporary filesystem objects.
- `scripts/qa-maintenance154.cjs`: real unpackaged Electron with asserted temporary userData/library; 250 synthetic content files, filtered select-all, filter clearing, polling refresh retention, batch preview/return, density persistence, keyboard selection, empty tasks, light/dark themes and 1280×900 / 860×700 windows. Screenshots are `review/*154-*.png`. Set `AMBER_PLAYWRIGHT` to the installed Playwright package.
- Exact tested head, Windows installer workflow URL, SHA-256 and provenance are recorded in the draft PR. Generated installers remain outside source commits. GitHub Actions downloads require sign-in and expire after 30 days.

Not verified: real-world game/account data, actual upgrade wizard over an existing installation, native macOS/Linux, every custom theme/Windows DPI, or full-volume physical-space accounting. No real user data was cleaned. The two products' Windows packaged startup checks are recorded separately in the PR.

## 中文验收说明

本版复用已有存储扫描／清理入口；清理只接受新版下载器留下凭据、校验一致、版本不高于当前版本的完整更新包。旧版没有凭据的安装包和所有下载片段保留，不根据文件年龄或名称推断可删除。备份、回收站、房间同步恢复数据和无法证明无引用的缓存不提供清理。确认前列出文件与预计字节数；执行中复核并报告部分成功、取消和失败，文件字节数不等于实际释放磁盘空间。

内容筛选变化时清除选择，全选仅作用于当前筛选结果中的可用条目；实例、内容、任务分别记住密度，沿用主题控件。测试使用隔离合成数据；不代表真实游戏、账号或升级安装验收。测试包与同名正式产品共享安装身份和默认数据位置，手动验收宜使用独立 Windows 用户及可丢弃游戏副本。保持草稿 PR，交由小岚独立审核和用户验收，不合并、不正式发布、不部署官网。

## Independent review correction: missing-record single removal

Review baseline: `9efabcb2a6e99187236c8ec32a557ca271068b9e`. A row's explicit Remove action used the bulk-checkbox selection, which excludes missing entries. Consequently missing-record removal passed an empty selection to the backend and could not show its confirmation.

The row action now carries its explicit relative path separately from bulk selection. Only a currently visible row can enter that preview, and missing entries remain eligible only for removal. Select-all still excludes missing entries. Preview validity includes instance, filter criteria, visible row identities/missing states and selection; a filter change invalidates both an existing preview and any delayed response. Execution retains the existing backend revalidation and confirmation.

Scoped regression: `scripts/qa-missing154.cjs`, real Electron and real content preview/apply against asserted temporary userData/library. It verifies a missing enabled record's explicit preview and confirmation, completion of the actual content job, preservation of a second disabled missing record and an unrelated real file, select-all exclusion, polling-refresh retention, filter invalidation before and after a deliberately held real backend response, and disabled bulk removal after filtering away the selection. The same test fails waiting for confirmation against the clean baseline AMBER stage and passes against the fix. No real instance/account data is used. The earlier 9 storage-specific checks, wider theme/layout checks and package review retain their original revision attribution; they are not repeated as a new content-review gate. Existing PR workflows continue to run their configured checks automatically.

中文：修复缺失记录的单项“移除…”被批量选择过滤为空的问题。单项目标独立传递，仍须当前可见且经过确认；全选继续排除缺失条目。切换筛选会同时撤销已显示和延迟返回的旧预览。定向隔离测试在旧包复现失败、修复版通过，只覆盖本次变更及相关筛选保护。最终新提交与新安装包校验值以 PR 的最新交付段落为准。

## User acceptance layout corrections after 26c36a6

Baseline: `26c36a61115a152532036f66696f3f51a608ce49`; the missing-record removal correction is preserved. This increment changes shared layout and placement only:

- Storage category rows share grid columns, so the update-cleanup action cannot shift the information column. Container-width rules move the action below the information on narrow panels and stack fields at very small widths. Long names and explanations wrap; cleanup eligibility, confirmation and execution are unchanged.
- The existing shared-environment import component is rendered in an `afterHeading` slot immediately below the instance-management heading. Its component, creation callback and picker logic are unchanged.
- All three density controls retain the same themed Select and short native label. A non-label block owns the row whitespace; only the fit-content label/control activates the choice list. Keyboard semantics, focus and per-list storage are unchanged.

Scoped verification: `scripts/qa-layout154.cjs` passed in real unpackaged Electron with asserted temporary userData/library, synthetic cached survey rows/content and an injected cancelled file-picker reply. Checks cover shared title/info x-coordinates, long unbroken explanation overflow, heading-before-import ordering, expand/collapse preservation through density changes, real picker dispatch/cancellation, blank clicks versus label/control clicks on instances/content/tasks, keyboard selection and focus restoration, persistence across reload, light/square 1280×900 and dark/rounded 860×700. No cleanup or real instance/account mutation was performed. Screenshots are `review/layout154-{storage,instances,content,tasks}-{light,dark}.png`; machine-readable scope is `review/layout154-checks.json`.

Production build, locale/source checks are run for this increment. Previous storage/synchronization behavior review and missing-record regression results retain their original attribution; no unrelated full manual review is repeated. Existing PR CI runs its configured checks and builds both editions. The PR identifies the latest head, exact downloaded Windows installers, checksums and provenance; all older installers are superseded.

中文：本轮只修复存储分类列对齐、联机环境清单入口在实例标题下方的位置，以及三个密度控件整行空白误触。隔离桌面验证覆盖深浅主题、宽窄窗口、长说明、导入折叠与选择器取消、空白／标签／框内点击、键盘焦点和记忆；未执行真实清理或导入，未改动存储安全及账号逻辑。此前审核结果保留原归属，以 PR 最新提交及新包为本轮交付。
