# 1.4.7 task implementation — local validation and CI delivery

Branch: `feat/1.4.7-tray-server-schedules`. Based on 1.4.6, commit
`353b5c5ed74f2e66d512c939635703ad65b8ce3c`. This is a task candidate,
not a released build. Package version remains 1.4.6; identify test installers by
the PR head SHA in `TEST-REVISION.txt`, not the inherited version string.

## Implemented behavior / 已实现行为

- Window close defaults to the tray while a managed server is starting, running,
  or stopping; otherwise it exits through the existing safety checks. Settings →
  Data & onboarding also offers always-tray and quit. Tray actions restore or
  explicitly quit. Linux minimizes with a taskbar entry because some shells do
  not display status icons. Tray creation failure also falls back to minimize.
- 关闭窗口默认在服务端活动时进入托盘，否则走现有退出保护；设置 → 数据与引导可调整。
  Linux 保留任务栏入口，托盘创建失败时退回最小化，防止窗口无法恢复。
- Tasks contains Downloads & activity and Server schedules, without extending
  the main navigation. Schedules support create/edit/pause/delete, one-shot,
  daily local time, and intervals of 1–525600 minutes. Commands are one server
  console line, never shell commands. Command success means submitted, not
  confirmation that the server or a plugin completed it.
- 定时任务归入“任务”，支持增删改、暂停、单次、每日与固定间隔；显示下次时间与最近结果。
  指令只发送到服务端控制台，完成状态表示已发送。
- Restart sends normal stop and waits up to two minutes for process close and
  automatic exit backup. It releases the instance lock during this wait so the
  backup can acquire it, then reacquires it and validates the original run before
  launching. Timeout, failed backup, failed exit, explicit stop, application exit,
  or a replacement run prevent automatic restart; there is no forced kill.
- 重启等待正常退出与自动备份，等待期间释放实例锁；完成后重新加锁并确认仍为原进程。
  超时、备份失败、手动停止、退出软件或替代进程均阻止自动重启，不强杀进程。
- Schedules persist their occurrence claim before execution. Missed occurrences
  are not replayed after app restart or sleep. Offline/busy occurrences are
  skipped. Interval countdown restarts on app launch or edit; daily schedules
  use the computer's current local time zone. AMBER must remain running.
- 退出或睡眠期间错过的任务不补执行；服务端未就绪或其他操作占用时跳过。
  间隔任务从软件启动或保存时重新计时；每日时间遵循电脑当前时区。

## Verified locally / 本地验证

- Node 24.22.1; pnpm 11.25.0; locked dependencies installed.
- `node --test tests/release147.test.mjs`: 25/25 passed after independent-review fixes.
- `node --test tests/servers132.test.mjs tests/release140.test.mjs tests/release144.test.mjs tests/release147.test.mjs tests/sites-worker.test.mjs`: 53/53 passed.
- `pnpm build`, `node scripts/check-locales.mjs`, and
  `node scripts/release-check.mjs`: passed. Vite retains the existing large-bundle warning.
- With approved normal execution permissions, the complete regression suite passed
  **489/489, no skips**, using `node --test --test-concurrency=2` and the test list
  from `package.json`. Fixtures remained within the isolated task temporary root.
- Reused the existing, version-matching Electron 45.0.0 runtime. Desktop smoke passed
  background assets, system encryption, theme assets and desktop/IPC initialization.
- `scripts/qa-tray-schedules147.cjs` verifies isolated userData before any mutation,
  UI create/pause/persist, a real one-shot timer skipping an offline target, actual
  native window hiding, second-instance restore and default idle exit. Playwright
  is an external QA dependency and is not shipped.
- 新增重启/备份锁竞争、备份失败、替代进程、睡眠恢复测试已通过。完整回归 489 项和
  隔离桌面验收通过；未进行真实 Minecraft 世界重启或非 Windows 真机验收。

## Independent-review corrections / 独立审核修复

- Cancellation is checked after Java inspection, port checks, pre-start backup,
  Quilt arguments, and log opening, immediately before recording/spawning a new
  process. Manual stop and task/global pause cannot be lost during async preflight.
- Only durable occurrence claims and state writes share the persistence queue.
  Executions on different servers run independently; pause aborts the task token
  immediately, without waiting for another server's restart. Same-instance overlap
  and busy instance locks are skipped, not queued. An occurrence is rechecked for
  the existing 60-second lateness tolerance at admission, before any command/stop.
- Daily deadlines are recalculated when system zone or UTC offset changes, with
  no catch-up. Storage reads/writes share an 8 MB cap, sufficient for 200 bounded
  tasks including worst-case JSON escaping; 200 maximal Chinese commands round-trip.
- Library relocation now pauses and drains scheduling before entering migration,
  and resumes it after a failed migration. The old code's write-order risk was
  confirmed by inspection; no real migration checksum failure is claimed. A new
  regression proves no scheduler writes occur inside the migration critical section.
- 新增 10 项测试覆盖以上边界。已修复 5 项功能问题，并为迁移写入隔离增加保护和测试；
  不把静态迁移风险描述成已复现的真实迁移失败。

## Initial sandbox limitations / 初次受限环境记录

These failures were resolved for validation by the user-authorized normal permission
request flow. They are retained for traceability; no security settings were changed.

Commands were run from the task checkout's `prototype` directory:

```powershell
$env:TEMP='C:\Users\lempi\Documents\Codex\2026-11-06\task'
$env:TMP=$env:TEMP
node 'C:\Users\lempi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs' test *> ..\test147.log
```

The earlier full run contained 475 tests: 460 passed, 15 failed. It preceded
the four additional lock/sleep tests. No failing test has been removed, marked
skipped, or replaced. Fourteen failures occur while creating symbolic-link or
junction fixtures (`EPERM`, `syscall: symlink`):

| Test file | Test line(s) |
| --- | --- |
| beta112.test.mjs | 30 |
| beta114.test.mjs | 14 |
| beta14.test.mjs | 45 |
| beta15.test.mjs | 21, 26 |
| beta16.test.mjs | 30 |
| release100.test.mjs | 15 |
| release143.test.mjs | 47 |
| release145.test.mjs | 29 |
| themes110.test.mjs | 21 |
| update10.test.mjs | 24, 26 |
| update9.test.mjs | 14 |
| workspace134.test.mjs | 23 |

`platform135.test.mjs:15` additionally failed with
`connect EACCES 127.0.0.1:58838` during its local skin-bridge fetch.

```powershell
node 'C:\Users\lempi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs' desktop:smoke
```

This initial attempt failed before launch: the Electron 45.0.0 binary was absent, its automatic
download returned `TypeError: fetch failed`, then `Electron failed to install
correctly`. The later approved run reused the matching cached runtime successfully.

用户后续明确授权正常权限申请流程；获批后完整测试及桌面验收通过。
本机已有 Git 身份经 API 核实为 ayr1k，拥有仓库写入权限；插件身份为另一访问路径。
没有修改全局账号或系统安全配置，也未删除、跳过原先受限的测试。

The task PR records CI results, downloadable AMBER/AmberE Windows x64 test installers,
the exact head revision and checksums. CI and scripted UI checks are not live-game
or non-Windows acceptance. No merge, tag, formal release or Pages deployment is authorized.
