# AMBER / AmberE 1.7.6 本地验收 / Local acceptance

## 整合包导入 / Pack import

本地 ZIP、MRPACK 和 CurseForge 整合包可读取单卷 ZIP64。压缩包上限是 5,000,000,000 字节（含边界）。整个压缩包声明的展开量最多 20 GB，单文件最多 5 GB，ZIP 条目最多 20,000 个，中央目录最多 32 MB，清单最多 8 MB。实际安装的覆盖文件与客户端下载也合计检查 20 GB、单文件和文件数。CurseForge 清单最多引用 5,000 个精确文件 ID。

Single-volume ZIP64 is supported for local ZIP, MRPACK and CurseForge packs. Compressed size is capped at exactly 5,000,000,000 bytes, inclusive. The archive is limited to 20 GB expanded, 5 GB per file, 20,000 ZIP entries, a 32 MB central directory and an 8 MB manifest. Installed overrides and client downloads are also checked against the expanded byte, file-size and file-count limits. A CurseForge manifest can reference up to 5,000 exact file IDs.

预览会流式创建并校验本地副本。安装需要为保留包、暂存内容、下载缓存和新实例预留空间，游戏、加载器和 Java 另计。预览取消会清理部分副本。创建实例时先完成原包保留，再进入可继续的安装阶段。正常退出和取消会清理本次暂存文件，重启后再次运行导入会清理上次中断的暂存。支持硬链接的卷可原子、排他地写入已校验文件。其他文件系统使用排他复制，中途强制结束时，校验不一致的残留需人工检查。

Preview streams and verifies a local snapshot. Installation needs disk space for the retained archive, staging, download cache and the new instance. Game, loader and Java files are additional. Cancelling preview removes the partial snapshot. Setup finishes retaining the archive before honoring cancellation, so the instance can resume. Staging is cleared on normal exit or cancellation. Restarting the pack task also clears staging left by an interrupted run. Volumes with hard-link support publish verified files atomically without replacing existing files. Other file systems use exclusive copy. An unexpected process termination there may leave files requiring manual inspection.

## 内容来源 / Content sources

自动模式和手动指定官方 API／文件主地址共用校验与安全重定向。自动模式按实际请求结果、可用性及响应延迟排序，最多尝试两个已批准的候选。文件策略与 API 分开，包清单提供的可信备用地址可在校验相同文件时使用。官方文件返回 404 时，可查询同一精确版本 ID 的新地址。带 Range 的续传返回 404 时，允许对同一地址从头重试一次。CurseForge API key 只发往其官方 API，正式构建通过环境注入配置，本地测试构建不内置配置。

Automatic and manual official/primary routing both verify content and restrict redirects. Automatic routing orders up to two approved candidates using actual outcomes, availability and response latency. File tracking is independent of API tracking. A trusted alternate URL from a pack manifest must verify against the same hash. An official file 404 can trigger an exact-version URL refresh. A 404 on a Range request can restart once at the same address without Range. The CurseForge API key is sent only to the official API. The formal build injects its configuration through the build environment. Local test packages ship without the configuration.

当前启用 Modrinth 和 CurseForge 官方 API 及其官方文件路线。BMCLAPI 的运营方为 bangbang93，其文档覆盖 Minecraft／加载器资源，此次没有验证到这两个内容平台的覆盖。MCIM 由 Minecraft Mod Info Mirror 维护，声明提供两平台的缓存元数据，接入需登记启动器与 UA。该环境于 2026-11-18 复测时，MCIM 主站可打开，API 与文件域在建立 HTTPS 时失败，无法核验新鲜度。维护方现行仓库说明文件分发暂停，接入指南列有回跳官方 CDN 的方式。此次未启用或登记 MCIM，亦未确认独立的国内文件来源。

The enabled routes are the official Modrinth and CurseForge APIs and file endpoints. BMCLAPI, operated by bangbang93, documents Minecraft and loader resources. Coverage of these content platforms was unverified. Minecraft Mod Info Mirror (MCIM) documents cached metadata for both platforms and requires launcher and User-Agent registration. On November 18, 2026, its public site responded, while this host could not establish HTTPS to its API and file host. Cache freshness could not be verified. Its maintained repository says file service is suspended and its guide describes redirects to official CDNs. MCIM was kept out of this build and no independent domestic file endpoint was confirmed.

- [Modrinth API](https://docs.modrinth.com/api/), [Modrinth terms](https://modrinth.com/legal/terms/), [CurseForge API](https://docs.curseforge.com/rest-api/), [CurseForge author consent](https://support.curseforge.com/support/solutions/articles/9000208346-about-the-curseforge-api-and-how-to-apply-for-a-key)
- [MCIM integration guide](https://www.mcimirror.top/guide/start/getting-started), [cache dates](https://www.mcimirror.top/guide/semantics/freshness), [maintained repository](https://github.com/mcmod-info-mirror/mcim-rust-api), [BMCLAPI](https://github.com/bangbang93/openbmclapi)

## Superb Warfare 404

CurseForge 项目 `1218165`。正式 1.7.5 构建配置查询了 Forge 1.20.1 样本文件 `8689629`、`6940728`。官方文件详情与下载地址接口均返回 200，为每个样本提供同一地址与文件详情的 SHA-1。从当前环境发出 `Range: bytes=0-0` 得到 404，普通 GET 从 `edge.forgecdn.net` 重定向到 `mediafilez.forgecdn.net` 后返回 200。反馈所用文件 ID 和实际请求未知。若再次遇到，请提供启动器版本、文件 ID 或版本名、时间、任务详情中的来源和 HTTP 状态，并去除 URL 查询参数。

CurseForge project `1218165`. Using the released 1.7.5 build configuration, the exact-file and download-URL APIs returned 200 for Forge 1.20.1 samples `8689629` and `6940728`. The two API routes agreed on each URL and file metadata supplied SHA-1. From this host, a `Range: bytes=0-0` request returned 404, and regular GET redirected from `edge.forgecdn.net` to `mediafilez.forgecdn.net` with 200. The original report's file ID and request are unknown. For a recurrence, include the launcher version, file ID or version name, time, host and HTTP status from the task details, with any URL query removed.

[Sample 8689629](https://www.curseforge.com/minecraft/mc-mods/superb-warfare/files/8689629) · [Sample 6940728](https://www.curseforge.com/minecraft/mc-mods/superb-warfare/files/6940728)

## 验证范围 / Verification scope

- Windows 真实导入验证使用 5,000,000,000 字节的 ZIP64 和真实落盘，含一个 4,400,000,000 字节条目。导入、保留原包及生成完成记录通过。Node JS 堆上限 64 MiB，观察到进程峰值约 114 MiB。游戏和 Java 下载使用隔离夹具。Windows Electron 另通过文件选择 IPC 预览同一大包，并用受控请求验证快速切源。正式游戏启动、完整安装升级和非 Windows 原生验收未覆盖。
- Windows backend QA imported and wrote a real 5,000,000,000-byte ZIP64 with a 4,400,000,000-byte entry, verified the retained archive and checked the completion record. The Node heap cap was 64 MiB and peak process memory was about 114 MiB. Game and Java downloads used isolated fixtures. A separate Windows Electron check previewed the same large ZIP via file-picker IPC, and used controlled requests for rapid provider switching. Live game launch, installed upgrade and native non-Windows acceptance were outside these checks.
