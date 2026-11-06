# 1.4.7 task implementation — validation pending

Branch: `feat/1.4.7-tray-server-schedules`. Based on 1.4.6, commit
`353b5c5ed74f2e66d512c939635703ad65b8ce3c`. These are uncommitted task changes,
not a released build. Package version remains 1.4.6 pending test delivery.

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
- `node --test tests/release147.test.mjs`: 15/15 passed.
- `node --test tests/servers132.test.mjs tests/release140.test.mjs tests/release144.test.mjs tests/release147.test.mjs tests/sites-worker.test.mjs`: 53/53 passed.
- `pnpm build`, `node scripts/check-locales.mjs`, and
  `node scripts/release-check.mjs`: passed. Vite retains the existing large-bundle warning.
- 新增重启/备份锁竞争、备份失败、替代进程、睡眠恢复测试已通过；尚无真实游戏或桌面托盘验收。

## Blocked validation / 验证阻碍

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

This failed before launch: the Electron 45.0.0 binary is absent, its automatic
download returned `TypeError: fetch failed`, then `Electron failed to install
correctly`. No desktop/tray runtime acceptance or installer is claimed.

继续完整验证需要明确授权在允许测试夹具链接和本机回环连接的环境执行测试，
以及下载/安装锁定的 Electron 运行时并执行隔离桌面验收。当前未申请提升权限，
未通过其他工具绕过限制，未修改被阻止的测试。

No PR or installers have been delivered, and no merge, tag, formal release or
Pages deployment has been performed. Retain this checkout and branch for continuation.
