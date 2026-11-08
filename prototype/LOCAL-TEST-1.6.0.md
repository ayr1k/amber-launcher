# AMBER / AmberE 1.6.0 task candidate

This is a local-channel test build, not a formal release. **It uses the same installation identity and data directories as the corresponding stable edition. Installing it can replace that edition's installed application. Back up your data first. AMBER and AmberE remain separate products.** No merge, stable Release, or Pages deployment is authorized by this task delivery.

## Changes / 更新内容

- Settings → Operation & memory: choose Local/Online and Launch/Instances/Tasks/Tools as the next startup destination. Existing onboarding recovery takes priority. Existing home layout, Ctrl K shortcuts and per-list density are retained rather than duplicated.
- Server launch → Connection steps & launch services: separate server readiness, tunnel/provider evidence, environment sharing and explicitly queried player roster. A running EasyTier process is never presented as proof of remote connectivity. A provider connection is not proof that another player can reach the game.
- Save per-instance manual-launch choices for an already prepared MySQL database and existing Sakura tunnel bindings. Defaults are off. Database first, then server, then tunnels. A server-start failure stops only a database started by that attempt. Tunnel failure leaves the server available and reports the specific error. Scheduled server restarts do not restart these companion services. Stopping the server leaves companion services running; stop them explicitly on their own pages. EasyTier rooms remain explicit, with no automatic secret-sharing.
- Windows memory optimization is manual, session-only and off on restart. Conservative trims only the launcher main process. Aggressive includes only this launcher's Electron child processes (renderers, GPU and utilities); it does not enumerate or trim games, Java, servers, databases or unrelated applications. Selecting Aggressive and each aggressive execution require a native warning with Cancel as the default. No periodic cleaning, elevation, termination, system cache purge or security-setting changes. Each process returns its own success or Windows error; retries are rate-limited to 30 seconds. Unsupported platforms show an unavailable message.

中文：设置新增默认启动模式／页面，以及默认关闭、仅手动执行的保守／激进内存整理。激进档启用和执行均需弹窗确认；重启后恢复关闭。联机实例启动页显示各步骤证据，提供数据库和已关联 Sakura 隧道的手动启动联动。默认不启动附加服务，保留原有布局与列表偏好。

## Memory design references

The PCL project is an interaction reference, not a claim that its private or current native implementation has been reproduced: https://github.com/Meloong-Git/PCL . The operation here uses Windows `EmptyWorkingSet`, with `SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SET_QUOTA`: https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-emptyworkingset . Working-set pages may be faulted back immediately. This is not JVM heap reclamation, a memory-leak repair, permanent RAM savings or an FPS guarantee. Aggressive mode can temporarily stutter the launcher's UI and increase disk I/O or paging pressure. Access-denied and exited-process failures are reported without elevation.

## Verification and limits

- Unit/regression checks use temporary directories and injected process/service fixtures. They cover preference defaults/persistence, onboarding priority, unsupported systems, aggressive confirmation/cancellation, busy state, per-process access failures, cooldown, binding boundaries, service failure cleanup and concurrent launch rejection.
- `scripts/qa-release160.cjs` runs an actual Electron window with asserted temporary userData and library roots. It verifies startup navigation, English controls, narrow light/dark layouts, native warning contents with intercepted accept/cancel responses, one actual conservative trim of the test launcher itself, saving preferences and the synthetic server flow panel. It never executes aggressive trimming against the user's applications.
- Real cross-network EasyTier/Sakura gameplay, provider outages, live-account sign-in, real loader/game sessions, long-running memory behavior and installer-over-stable user-data migration are **not** established by synthetic tests. These remain user acceptance items. Non-Windows native acceptance is not performed by this Windows test delivery.
- The PR records the tested commit and downloadable CI installers with SHA-256/provenance. Generated installers are not committed. Preserve all existing acknowledgement entries and edition-specific account/update boundaries.

## Manual acceptance

1. Back up stable data; test with disposable instances/accounts when possible. Check the desired default mode and page after reopening, and confirm layout/list density survive.
2. In Settings, cancel Aggressive and verify it stays off; accept only after reading the scope. Cancel execution and verify no operation runs. Conservative should report one launcher PID. Turn Off to disable manual execution.
3. On a disposable server, save service choices. Try missing/unprepared database, stale tunnel and provider failure paths. Verify errors stay specific, no foreign instance's tunnel starts, and surviving services are visible.
4. Independently test actual supported loader sessions, remote player joins, interrupted synchronization recovery and stable-overwrite installation. Record the environment and results rather than interpreting process state as acceptance.

## Review corrections and evidence

- Memory targets carry Electron creation times, not only numeric PIDs. The native helper opens each process once, checks its exact creation time and live state on that handle, then trims that same handle. Missing/conflicting identity, PID reuse, exited processes and access denial fail closed with distinct results. See Electron ProcessMetric creationTime and Windows GetProcessTimes documentation.
- `tests/memory-identity160.test.mjs` covers conservative/aggressive target boundaries, conflicting identity, partial success and invalid helper results. Together with `tests/release160.test.mjs`, 16 targeted checks pass. The earlier 671-check suite remains baseline evidence for commit 1cc43e1; it is not represented as a full rerun of this correction.
- `scripts/qa-memory-identity160.cjs` runs seven injected native handle tests and a newly spawned, windowless Electron fixture: a changed timestamp is skipped; only the exact owned fixture is trimmed. This check also runs before PR installer packaging. No user application is targeted.
- `scripts/qa-flow-layout160.cjs` checks eight English/Chinese, light/dark and wide/narrow cases for settings heading hierarchy, spacing, horizontal overflow, modal padding, checkbox/text alignment and footer clearance. Screenshots and measured results are under `.qa/flow-layout160/`.
- Installers made from 1cc43e1 predate these corrections. Use only the new PR-head CI artifact, checking its TEST-REVISION.txt, .sha256 and provenance files. Generated binaries and screenshots remain outside source commits.

## Legacy tunnel compatibility correction

- Launch services accept UUID binding IDs and the existing Sakura migration form `legacy-<server UUID>`. A migrated ID must match its owning instance. All selected bindings must still exist, be unique, belong to the current instance and have valid associations; remote-deleted records are rejected. Bindings are checked before any startup and again immediately before tunnel activation.
- The selection limit reuses Sakura's 64-binding capacity instead of the previous inconsistent 32. Errors distinguish invalid IDs, duplicate selections, over-capacity, missing bindings, wrong ownership, remote deletion and stale port associations. No legacy configuration rewrite or tunnel recreation is required.
- 39 related checks pass, including actual Sakura configuration migration through displayed state, save, reload and injected startup; normal UUIDs, 33/64 selections, rejected 65th selection, invalid/duplicate/foreign/deleted/stale records and an ownership change during startup. Fixtures use temporary directories and injected workers; no real tunnel or user configuration was accessed. The reported user incident is consistent with this reproduced defect, but its actual configuration has not been inspected.
- Earlier 01a1696 installers do not contain this correction. Use the subsequent PR-head artifact and its revision/provenance/checksum files. Other accepted layout and memory validation remains applicable.
