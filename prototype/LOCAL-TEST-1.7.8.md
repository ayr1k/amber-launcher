# AMBER / AmberE 1.7.8 · Download diagnostics / 下载诊断

Baseline: `origin/main` and `v1.7.7` at `1f2f681c725e441ba05575580b47cd875e307b69`. Both products use the same task UI. The test installers use the local channel. For the exact head and installer hashes, see TEST-REVISION.txt and the two .sha256 files in the PR Actions artifact.

Open Tasks → Download diagnostics on an individual download. Configuration describes the most recently started file. Observations cover this job only. The curve shows up to 60 one-second buckets of new response-body bytes. A retransmission counts once when received. Cached files, existing partial files, progress resets and segment assembly add no network bytes. Short final buckets use a full second as denominator. Missing instrumentation is shown as unknown. Paused and ended jobs show zero current speed. Diagnostics stay in memory for this launcher session.

在任务中心展开单个任务的“下载诊断”。配置以最近开始的文件为准，实际数据仅属于所选任务。曲线最多保留 60 个一秒采样。重新传输的数据只在实际收到时计一次；本地缓存、旧片段、进度回退及磁盘拼接均不计入速度。结束时不足一秒的采样使用一秒作为分母。未观测到的数据标为未知。暂停和结束时当前速度归零。诊断仅保存在本次启动的内存中。

## Windows x64 baseline / 基线

| v1.7.7 | Published EXE bytes | win-unpacked logical file bytes | Files | First window / main (ms) | Idle process tree working set (KiB) |
| --- | ---: | ---: | ---: | ---: | ---: |
| AMBER | 153501785 | 423941817 | 536 | 2322 / 4053 | 512752 |
| AmberE | 153496694 | 423932638 | 535 | 1331 / 2376 | 508824 |

EXE hashes matched both public Release asset digests. Logical size sums regular file lengths, excluding filesystem allocation overhead. Native timing uses the v1.7.7 Windows payload loaded by the matching Electron 45 runtime, a fresh isolated library and an observer of actual window show events. Wall time starts before process creation. One process-cold trial per edition, OS file cache uncontrolled. Working set sums the four Electron processes 12 seconds after main-window show and may count shared pages more than once. Concurrent regressions were running. These observations establish a baseline only.

安装包与公开版本校验值相符。逻辑占用为解包目录文件长度之和。首窗与主界面时间来自匹配版本 Electron 加载正式成品资源后触发的窗口显示事件，从启动进程前计时。每款一个新进程及隔离配置，未清空系统文件缓存。主界面显示 12 秒后统计四个 Electron 进程的工作集（共享页可能重复计数）；测量期间有回归测试并行运行。

## Acceptance / 验收

- Windows automated fixture: two simultaneous launcher jobs downloaded separate verified bodies over loopback HTTP. The native renderer and scoped status IPC reported separate histories, correct byte totals and zero speed at completion. English and Simplified Chinese, light and dark, a 940-pixel requested window, keyboard expansion/collapse and horizontal overflow were checked. This exercises the real transfer path with controlled sources.
- 自动化 Windows 验证使用两个同时运行的启动器任务和独立文件，通过环回 HTTP 传输并校验内容。已检查任务隔离、结束态、键盘、窄窗、中英文及明暗主题。公网来源、真实游戏实例、安装后升级和人工验收单独记录。
- A second native Windows test used real Modrinth metadata, CDN bodies and two independent production content-install jobs in disposable Fabric 1.21.1 instances. Sodium (SMxNOGZ6) and Lithium (N08Z8wog) overlapped at 192 KiB/s shared. Pausing Sodium allowed Lithium to continue. Both installed hashes matched. Lithium received 797,454 bytes. Sodium received 1,590,993 bytes for a 1,574,609-byte file, including 16,384 bytes received again across pause/resume.
- 公网实测使用两个独立的 Fabric 1.21.1 隔离实例、Modrinth 官方元数据及实际 CDN 响应。Sodium 暂停时 Lithium 继续传输，两项内容均完整安装并通过哈希校验。此项覆盖内容安装；未启动游戏。
- The NSIS experiment runs after artifact upload only for this task branch on a disposable Windows runner. It compares fresh installation and upgrade from the SHA-256-pinned public 1.7.7 installer. Full per-file hashes, installed startup/IPC, old-program backup and a data marker are checked for each variant. See the PR for run-specific timings and results.
- NSIS 对照仅在本任务分支的一次性 Windows runner 上运行。对照默认与实验压缩方式的新装和从正式 1.7.7 升级，核对逐文件哈希、安装后启动、旧版备份和数据标记。具体结果见 PR。
- Manual check: start two independent content downloads in disposable instances. Compare their sources and speeds. Pause one, let the other progress, resume and inspect the final diagnostics in task history. Check the two local-channel editions independently.
- 人工验收：在隔离实例中分别开始内容下载，核对来源与速度。暂停其中一个，确认另一个继续传输；恢复后在任务记录检查终态。两款安装包分别验收。
