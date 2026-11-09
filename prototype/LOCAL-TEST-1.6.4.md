# AMBER / AmberE 1.6.4 — prelaunch memory test

Task build, local update channel; not a formal release. Base: `e9da357978438792fb8ed03979d533031dfed3af` (published 1.6.3). Branch: `task/1.6.4-prelaunch-memory`. Exact head, source dirty state and installer digests are in the PR artifact's `TEST-REVISION.txt`, `.provenance.json` and `.sha256` files. Installers must be built from the final clean commit. No merge, Release or Pages deployment is authorized by this delivery.

**Back up data before installing.** These installers use the normal AMBER / AmberE identities and data directories and can replace an existing installation. Test in a disposable Windows user or VM. This task does not install over an existing product. Both editions share the implementation and retain independent accounts, data and update repositories. AmberX is unchanged.

## Behavior and default

Settings → Operation & memory has a persistent **Trim conservatively before Minecraft starts** switch, off for both new and upgraded installations. When enabled, the launch pipeline requests one Windows working-set trim of this launcher's main process after game validation, before Java spawn. The existing graphics-preference hook remains. The operation never changes the separately selected manual mode, touches game/server/other-app processes, purges system caches, terminates processes or elevates privileges. Aggressive manual operation still requires its existing confirmations.

The launch status offers two separate actions: **Skip trim, continue launch** and **Cancel entire launch**. Skipping or native errors, insufficient permissions, unsupported platforms and a 3-second timeout allow normal launch to continue. Cancelling the whole launch prevents Java spawn, including cancellation during the following graphics hook. Duplicate launch requests are rejected; the automatic result is cached per attempt. Automatic and manual operations share a busy guard and a 30-second cooldown. A helper that fails to settle retains the busy guard, while the launch chain can continue. Cancellation cannot reverse an already completed native trim and cannot stop a game that has already spawned.

Defaults remain off because working-set reduction is not Java heap reclamation or evidence of improved frame times. Pages may be faulted back, causing extra disk reads or UI stutters. Supported native target identity is checked using the same opened process handle before trimming.

## Measured evidence

Three isolated unpackaged Electron launcher sessions on Windows used `--qa-ui`. The harness asserted `userData` and the library root before application mutations. It passed the fixture's actual main-process PID and creation time to the production native helper; the production prelaunch controller ran from the harness. This measures the hook and real target working set, **not a real Minecraft launch**. Trial 1 also exercised the settings UI; these are descriptive samples, not a controlled performance benchmark.

| Trial | Hook delay (ms) | Disabled control (ms) | Working set before / immediate / 1s / 5s (KiB) |
|---|---:|---:|---|
| 1 | 381.01 | 0.092 | 139004 / 4196 / 13628 / 19308 |
| 2 | 380.86 | 0.027 | 158032 / 4372 / 15152 / 20344 |
| 3 | 415.36 | 0.056 | 155808 / 4204 / 17816 / 22040 |

System free-memory immediate changes were approximately −6.4, +18.2 and −92.3 MiB. Background activity and helper overhead make this unsuitable as a causal benefit estimate. Raw snapshots, including system memory and rebound, are in `docs/qa-1.6.4-memory.json`. There is no FPS, frame-time, real-game launch, full installation/upgrade, long-session or native non-Windows acceptance claim. Account/ownership checks were not bypassed.

## Validation and manual acceptance

- Full Windows regression suite: 760 passed, no skips. Includes 9 new deterministic tests for defaults/persistence, conservative scope, one attempt, shared cooldown, duplicate/stale requests, failure, access denied, timeout, cancellation and hook integration.
- `build`, `test:sites` (4), `release:check` (3119 locale entries) and `desktop:smoke` passed. Build retains the existing large-chunk warning.
- Native identity checks: 7 injected same-handle cases plus an actual isolated Electron process; incorrect timestamp skipped and correct timestamp trimmed.
- Native UI: English/light 1440×960 and Chinese/dark 1000×720 at 125%, keyboard Space toggle and settings persistence; synthetic status fixtures verified distinct cancellation requests, permission-result text, dismiss and viewport bounds. Synthetic outcomes are not claimed as real game launches.
- Packaged startup and CI results are attached to the final PR delivery; independent review and user acceptance remain pending.

For manual acceptance, use an authorized disposable game instance: check the switch remains after restarting, launch with it off/on, test rapid double launch, skip trimming, cancel the whole launch, and confirm the existing graphics preference still applies. Compare actual game loading and frame times over repeated comparable runs before deciding whether the setting helps your machine. Avoid changing aggressive mode during comparisons.

## 中文说明

这是 1.6.4 本地测试渠道任务包，不是正式发行。基于已发布的 1.6.3 主分支；准确提交、干净状态和校验值以 PR 工件为准。未合并、未发布 Release、未部署官网。安装包沿用正常产品身份和数据目录，可能替换现有安装，请先备份，并用一次性 Windows 用户或虚拟机验收。

设置 → 操作与内存新增可持久保存的“启动 Minecraft 前自动保守整理”，新用户和升级用户均默认关闭。只请求整理当前启动器主进程的 Windows 工作集，不整理游戏、服务端、其他应用或系统缓存，不改变 Java 堆，不提权、不杀进程。激进档仍是独立的手动确认流程，显卡设置钩子保留。

每次启动最多整理一次，共享 30 秒冷却和并发保护，最多等待 3 秒。失败、权限不足、超时或不支持平台均继续正常启动。“跳过整理，继续启动”和“取消整个启动”是不同操作：后者在 Java 创建前阻止本次启动，前者仅取消等待整理。已完成的工作集操作不能撤销，已经启动的游戏不能通过这个按钮停止。

三轮隔离启动器实测整理钩子增加约 381–415 毫秒，工作集迅速下降后在 1 秒、5 秒采样中回弹，系统可用内存变化不一致。因此保持默认关闭，不宣称提升 FPS、释放 Java 堆或修复内存泄漏。未进行真实 Minecraft 启动、帧时间、完整安装升级或长时间游戏验收；没有绕过账号或所有权验证。完整回归 760 项、静态测试 4 项、构建、语言/发行检查、桌面冒烟和原生身份检查通过。中英、深浅、窄窗、125% 缩放和键盘已检查；取消按钮展示使用明确标注的模拟状态。最终成品启动和 CI 证据随 PR 交付，独立审查与用户验收仍待完成。

## Cancellation-feedback review fix

The initial implementation passed 760 full regressions. Independent review then identified stale global feedback after whole-launch cancellation outside the native trim wait. The follow-up records cancellation immediately against the current attempt, retains completed trim rows and prior trim status, clears the previous attempt result on begin, and prevents late async writes or stale finish/cancel calls from overwriting a newer attempt. A completed trim cannot be undone.

The affected suite now passes 55 tests (47 prior + 8 new behavior tests). New cases cover preparation, successful/failed settings reads, late completion after a new attempt, trim/timeout/cooldown outcomes, skip followed by whole-launch cancellation, and actual production launch-method execution with isolated I/O stubs at the graphics and log-open boundaries. Both boundary cases assert zero spawn, own-lock cleanup and final global cancellation. These fixture tests do not launch Minecraft or bypass real account validation. Exact-head full CI and rebuilt installer evidence are linked in the PR; the initial 7089153 package checksums and attachment IDs are superseded.

独立审核指出原实现仅在等待原生整理时正确更新全局取消结果。修复后，整个启动取消会立即绑定本次 attempt；保留已经完成的整理记录，启动新 attempt 时清除旧结果，旧异步任务或迟到取消不能覆盖新任务。受影响的 55 项回归通过，其中新增 8 项行为测试。显卡和日志打开阶段执行实际启动方法体的隔离测试均验证零 Java 创建、本次锁清理和全局最终取消。旧 7089153 安装包校验值和附件身份已被新交付替代，请以 PR 新 head 的成品及检查为准。

Launch cancellation now has a dedicated bilingual problem explanation before the generic installation-cancellation rule. The native UI fixture verifies LaunchHome error/retry and persistent global cancellation after navigating to Settings, in both languages. Existing download/installation cancellation explanations are unchanged. / 启动取消使用独立中英文说明，安装与下载取消解释保留。隔离 UI 验证启动页错误、重试以及切到设置后仍准确显示全局取消。
