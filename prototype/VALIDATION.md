## Beta 1.1 local verification — 2026-10-21

- Package/display: 1.0.0-beta.2 / beta 1.1. No GitHub push, release, asset upload or CI dispatch performed.
- Full local automated suite: 120 tests passed; Sites contract suite: 4 passed. Tests cover one-time public device-code copy/open with fallbacks, expiration, version ordering, installer origin/digest checks, cancellation/retry, encrypted configuration byte preservation, compatible mod updates, locking, required-dependency opt-out, fixed dependency conflicts, disabled state, stale plans, transaction interruption/rollback, modified-file protection and reused Windows process IDs.
- Native installer: first installation and same-directory upgrade in `prototype/releases/beta11-install-test/AMBER` succeeded. Old program backup hash compared successfully. Installed application exited 0 with AMBER_BACKGROUND_OK, AMBER_SYSTEM_ENCRYPTION_OK and AMBER_DESKTOP_AND_IPC_OK. Simultaneous launches with one isolated user-data directory produced exactly one booted application and both processes exited 0.
- Test installation uninstalled successfully. Existing account/preferences/location files that were present retained identical SHA-256 hashes (2 files); all 23 existing instance directories remained; old program backup remained. No real account or game files were written by these checks. Smoke app data was isolated inside releases/.
- Preflight synthetic cases passed: empty Chinese-path directory, data overlap rejection, non-app folder rejection, old-program copy/hash verification, live game identity rejection and stale PID acceptance. Updated hashing uses .NET SHA256 directly to work in the installer’s PowerShell environment without relying on module auto-loading.
- Real read-only GitHub release check returned current/no eligible newer installer, correctly excluding beta 1.0’s ZIP. Future installer download and hash failures use controlled response tests; no newer release was uploaded for testing.
- Browser UI fixture verified updates are opt-in, locked rows disabled and required dependency selectable/default-on with explicit opt-out warning. Screenshot: `design/qa/beta11-mod-updates.png`. The browser fixture is not a live Modrinth update or Microsoft authentication acceptance test.
- Windows installer is unsigned (Authenticode NotSigned). Clean-machine testing, user approval of the visible installation wizard, all mod combinations and real power-loss scenarios remain outside this run. Microsoft authorization, refresh and authenticated launch remain deferred pending allow-list approval.

# beta 1.0 · 1.0.0-beta.1 — 依赖选择调整

- 版本按项目发起人要求统一为 1.0.0-beta.1。所有发布功能和本次调整合并到根目录 CHANGELOG.md 的同一个 beta 1.0 条目，不创建补丁版本或第二份更新日志。
- 共 113 项测试通过：109 项功能测试（新增 7 项）及 4 项 Sites 构建契约测试。新增覆盖：必需项默认勾选、明确跳过后的安装/启停/启动预检、重新勾选恢复保护、保留已经安装的依赖文件、无兼容必需项可取消、共享/递归依赖、版本作用域与冲突保护、跨重启保留选择。
- 浏览器 UI 样例验证：必需项初始勾选；取消后安装清单由 3 项变为 2 项；重新勾选恢复 3 项。截图 `design/qa/beta1/required-dependency-selection.png` 仅作为布局与交互证据。
- Vite 生产构建、许可收集、源码检查通过；源码 Electron 隐藏窗口启动退出 0，背景协议、系统加密与 IPC 成功。
- 依赖例外按消费模组版本及元数据中的依赖条目保存，不修改作者原始声明。默认路径仍检查所有必需依赖；已声明不兼容关系仍阻止安装/启动。用户跳过依赖后，加载器仍可能拒绝运行。
- 测试安装使用模拟下载响应与真实临时文件系统。本轮未进行真实微软授权或新一轮 Minecraft 游玩；以下历史游戏验收仍按原版本标注。

---

# alpha.10 — 2026-10-21 验证记录

- **106 项通过**：102 项功能/模型/临时文件系统测试 + 4 项 Sites 契约测试。Vite 生产构建通过。
- 新增 15 项检查：新 Workflows 对象续接落盘计划且不重建实例；整合包身份；完整/存档备份；校验失败；运行中和链接路径保护；数据复制校验与旧目录保留；目标目录安全；可选依赖递归与冲突；透明度及状态；迁移取消；损坏记录提示；独立模组/整合包恢复；结束内容任务保留文件；旧任务修复保留原记录。
- 所有备份、恢复、迁移和删除类测试仅操作独立临时目录；未移动真实用户的数据目录或备份用户存档。
- UI-only 开发样例实际走查：首次引导原生模态焦点限制与跳过账号路径；暗色 70% 面板背景透出；普通文字拖拽无选区且输入可选；可选依赖勾选后清单从 3 项增至 4 项；不兼容项禁用；启动页未完成状态指向任务中心；备份库及恢复为新实例确认。证据在 `design/qa/alpha10/`，不当作真实游戏下载证明。
- 修复恢复任务等待期间无法取消的问题；停止的内容任务可以明确结束，原文件保留。旧版安装记录缺少计划时提供当前配置修复，不宣称恢复了旧版未保存的迁移/整合包选项。
- 源码与 `AMBER-0.1.0-alpha.10-win-x64/AMBER.exe` 打包版隐藏窗口冒烟均退出 0，背景协议、系统凭据加密往返、渲染器 IPC 均通过。Electron 同步 safeStorage 的弃用提示仍存在。
- 本轮未重新进行真实 Minecraft 世界游玩或微软授权；历史真实安装启动证据保留在下方。微软等待审核，GitHub 未上传。
- 限制：复用完整已校验文件，不提供单文件分段续传；同盘备份不防硬盘损坏；恢复产生新实例且需准备 Java/校验游戏；MRPACK 可选客户端文件与模组可选依赖是不同机制；跨磁盘断电、干净机器、真实第三方账号与长时间游戏仍需发布前验收。

---

# alpha.9 — 2026-10-21 验证记录

- 自动化累计 **91 项通过**：此前完整运行的 86 项功能测试 + 4 项 Sites 测试，随后补充损坏回收记录保护并重跑 update9 全部 4 项。新增测试只操作独立临时目录，不删除用户现有回收实例。
- 永久删除验证：非回收实例、错误确认名、路径穿越、并行任务、运行中游戏及 Windows junction 均被拒绝；正确确认删除模拟实例，保留共享 Java；损坏元数据不能绕过确认。
- 诊断导出仅保留版本、平台、组件和任务统计，测试确认嵌套错误、路径、账号及名称中的私密标记不会导出。
- pnpm frozen/offline 安装、Vite 6.4.4 生产构建及许可文本收集通过。fflate 升级至 0.8.3（含桌面 vendored 文件）；移除 Potrace 旧开发依赖。`pnpm audit --json` 在本次检查中报告所有级别已知漏洞均为 0；这不等同于完整安全审计。
- UI-only 浏览器样例走查：名称不匹配时永久删除按钮禁用、匹配后启用，随后取消，未在 UI 中删除真实数据。版本分组、输入自动筛选、选版本进入组件页、Forge/Fabric 互斥和默认名称联动通过。任务中心展示失败原因，并能定位到对应实例修复页。截图保存在本地 `design/qa/alpha9/`，不随源码分发。
- 关闭窗口的下载保护已经实现；本轮自动冒烟不触发原生退出确认框，该交互仍列入干净机器手动验收。
- 源码版和 `AMBER-0.1.0-alpha.9-win-x64/AMBER.exe` 隐藏窗口冒烟均退出 0，并输出 `AMBER_BACKGROUND_OK`、`AMBER_SYSTEM_ENCRYPTION_OK`、`AMBER_DESKTOP_AND_IPC_OK`。同步 safeStorage 的 Electron 弃用提示仍存在；本轮加密往返成功。
- 顶部导航、18px 字号与圆角组合通过浏览器布局检查：1280px 视口下文档宽度 1280px，无横向溢出。
- 本轮没有重新进行真实 Minecraft 世界游玩或微软账号测试；前一版的实际安装和启动恢复证据见下节。微软登录仍按用户要求等待审核。

---

# alpha.8 — 2026-10-21 验证记录

- 83 automated backend/model tests passed, including new category/sort facets, invalid filters, workflow cancellation between stages, reuse of the same instance on retry, transient HTTP retry vs permanent 404, cancellation during streaming, conflict checks in both directions, disabled-conflict handling, launch dependency preflight, diagnostic fallback and local background validation/copy. Four Sites contract tests passed (87 total).
- Live dedicated instance **dd8e7383-3a04-419e-b705-2e0893a1baab**, Minecraft **1.21.4 / Fabric 0.19.5 / Java 21**: 4133 game files; official Modrinth optimization category and downloads sorting queried successfully. Mod Menu 13.0.4 with Text Placeholder API 2.5.2+1.21.3 and Fabric API 0.119.4+1.21.4 installed. Dependency protection, remove/reinstall, and toggle verified.
- Deliberately invalid JVM flag caused an actual process exit in that dedicated instance; a fresh launcher core recovered the failed-run record. Removing the flag allowed render, OpenAL/audio and Mod Menu initialization. This is a startup-failure recovery check, not proof of arbitrary in-game crash recovery. Only the verification script's own process was terminated. Proof: `design/qa/alpha8/live-verification.json`; reproduce with `scripts/verify-update8.mjs`.
- Browser DEV fixtures (explicitly labeled UI-only) verified official-ID category selection, automatic refresh and downloads sort, light/dark launch background, rounded 18px UI, and crash-log deep link. Viewport/document width both 1280px with no horizontal overflow. Screenshots in `design/qa/alpha8/`; these are layout evidence, not real backend installation evidence.
- Production Vite build and Sites preparation passed. Source Electron smoke exited 0 with `AMBER_BACKGROUND_OK`, `AMBER_SYSTEM_ENCRYPTION_OK`, `AMBER_DESKTOP_AND_IPC_OK`. Background smoke decodes a real local image, normalizes/copies it and reads it through the production custom protocol. Existing synchronous safeStorage deprecation warnings remain.
- Limitations: in-session setup retry closures are not persisted across app restarts; component settings and completed files remain for manual continuation. Mod conflict checks rely on registered project metadata and do not parse every manually imported mod. Crash suggestions are hints with an explicit unknown fallback. Microsoft live login deferred pending approval; no account login attempted.

---

# alpha.7 — 2026-10-21 验证记录

- 全套自动化 **76 / 76 通过**：72 项功能、模型和真实临时文件系统测试 + 4 项 Sites worker 测试。新增依赖启停/移除保护、依赖文件缺失、预览失效、已安装依赖复用、独立整合包筛选、图标持久化及回收恢复、旧外观设置迁移、迁移停用排序和循环依赖报告。
- Vite 生产构建和 Sites 产物准备通过；开发专用 UI 样例由 `import.meta.env.DEV` 排除出正式构建。
- 源码 Electron 隐藏窗口冒烟：退出码 0，系统加密与桌面 IPC 成功。safeStorage 同步接口仍有 Electron 弃用提示，当前往返加密验证通过。
- 打包版 AMBER.exe 隐藏窗口冒烟通过，退出码 0：`AMBER_SYSTEM_ENCRYPTION_OK`、`AMBER_DESKTOP_AND_IPC_OK`。旧版本目录保留。

## 实际端到端流程

`scripts/verify-update7.mjs` 使用正式后端 API 创建新实例 `524cad61-a6f1-4485-ac9f-c824dcb6efca`，未改动原有实例。Minecraft **1.21.4** + Fabric **0.19.5** + Java **21**；4,133 项游戏文件完成下载/校验。

实际 Modrinth 搜索、兼容版本推荐、依赖预览及下载得到：Mod Menu **13.0.4**、Text Placeholder API **2.5.2+1.21.3**、Fabric API **0.119.4+1.21.4**。版本标签不作为兼容判断依据，采用 Modrinth 声明的 game_versions/loaders。测试验证必需依赖不能直接停用、Mod Menu 可移入回收目录并重新安装、启停保留文件、图标由铁镐更换铁砧后持久保存。

随后以专用临时离线名称启动游戏；日志确认 Mod Menu 加载、渲染纹理及音频初始化成功。脚本只结束自身启动的游戏。证据：`design/qa/alpha7/live-verification.json`，日志位于该实例 `logs/amber-1792578957224.log`。这不是长时间世界游玩、多人服务器或所有模组组合验收。

## UI 走查

先记录修改前的启动/创建/内容页面，再在同一浏览器检查修改后界面。使用有明确“UI 样例 · 无真实安装”标识的开发预览；不把样例画面当成实际游戏安装证据。实际后端验收见上节。

1. 创建：通过。默认小写命名、四类图标、组件互斥、手动 Fabric 发行版返回上一步后保留；创建完成后的导航已实现。截图 `design/qa/alpha7/08-after-setup-icons.png`。
2. 安装：通过。选择兼容版本后自动显示依赖清单，区分已安装和将下载；移除多余标题/搜索区占位。截图 `07-after-auto-dependencies.png`。
3. 管理：通过。即时筛选可将 3 项缩至 Fabric API 1 项；开关、类型、启用状态、来源链接和移除入口清楚。截图 `06-after-mod-manager.png`。
4. 外观：通过页面与样式检查。直角/圆角、浅色/深色、18px 大字体下没有横向溢出（文档 1280px，主区 1020px）。深色 select 与 option 计算样式均为文字 `#e5e9e2`、背景 `#202622`、`color-scheme: dark`，对比度约 12.55:1。截图 `04-after-dark-rounded-settings.png`、`09-after-dark-rounded-mods.png`。浏览器截图无法捕获操作系统原生下拉浮层，浮层样式结论以 DOM 计算样式和原生深色方案为依据，未声称独立捕获了浮层像素。
5. 启动：真实后端通过；补充离线名称预检、任务占用原因和异常退出日志入口。微软真实登录按用户要求延期。

---

# alpha.6 — 2026-10-21 验证记录

本节为当前版本；下方保留早期版本验收记录。

- 功能自动化：64 / 64 通过。新增实例改名／回收／恢复、存档内容保留、运行中阻止、恢复冲突与路径校验、旧设置迁移、布局保存与非法字段、LiteLoader 组合参数、基础配置恢复、旧 Forge 缺失依赖、Ivy 内嵌 JAR 校验。
- Vite production build 通过；Sites worker 4 / 4 通过。
- 源码 Electron 隐藏窗口冒烟通过，退出码 0：`AMBER_SYSTEM_ENCRYPTION_OK`、`AMBER_DESKTOP_AND_IPC_OK`。Electron 45 对 safeStorage 同步接口有弃用提示；当前加密往返检查通过。
- 打包版 AMBER.exe 原生冒烟通过，退出码 0；同样输出系统加密与桌面 IPC 成功标记。

## 实际游戏启动

均使用 Java 8、专用测试实例及临时离线玩家。日志达到图形纹理与音频初始化，且包含对应组件初始化；检查 LiteLoader 初始化错误。仅关闭脚本自身启动的游戏。没有进行长时间世界游玩、多人认证或任意第三方模组全集验证。

| 游戏与组合 | 官方组件版本 | 实例 ID | 日志文件 |
| --- | --- | --- | --- |
| 1.7.10 Forge + LiteLoader | Forge 10.13.4.1614-1.7.10 / LiteLoader 1.7.10_04 | dd6b54b6-777e-4539-b2da-6c7c40d606d1 | amber-1792576924545.log |
| 1.8 Forge + LiteLoader | Forge 11.14.4.1577 / LiteLoader 1.8 | 128e8493-83ff-4197-83a7-768363254f55 | amber-1792577166816.log |
| 1.8.9 Forge + LiteLoader | Forge 11.15.1.2318-1.8.9 / LiteLoader 1.8.9-SNAPSHOT-r08134E7-b8-2016-04-14_16-33-58 | 2d0f4627-9dc4-4b18-b1c4-00f02646596c | amber-1792576541766.log |
| 1.10.2 Forge + LiteLoader | Forge 12.18.3.2511 / LiteLoader 1.10.2 | 0ee6a448-b63f-4b6c-91b1-294a6de7efeb | amber-1792577078603.log |
| 1.12.2 Forge + LiteLoader | Forge 14.23.5.2864 / LiteLoader 1.12.2-SNAPSHOT-r4CC2BB0-b4-4 | fd559ba5-4548-481e-8e88-d129af1a47a1 | amber-1792576212165.log |
| 1.12.2 Forge + LiteLoader + OptiFine | Forge 14.23.5.2847 / 同上 LiteLoader / OptiFine HD U G5 | 614d018a-50ec-447c-b90f-6a6c801bd721 | amber-1792576646683.log |
| 1.12.2 OptiFine + LiteLoader | OptiFine HD U G5 / 同上 LiteLoader | 5f706b66-d3c0-465d-8015-72fd68a83793 | amber-1792576729573.log |

日志位于 `%APPDATA%/AMBER/library/instances/<ID>/logs/`。上述 7 个实例均通过改名、移入回收站、恢复及标记文件内容一致性检查。失败的中间尝试不计作成功；相关适配问题已通过新建实例复测；本轮失败的专用测试实例已移至 AMBER 回收站，保留日志和文件。

修复要点：旧 Forge 不接受 `--installClient` 时调用官方 legacy API；补齐旧安装器遗漏的客户端库并校验下载；LiteLoader 使用运行发布包 classifier，稳定版本使用 version 标识；Ivy 1.7.10 / 1.8 从官网安装器提取原始 JAR 并对照清单 MD5，随后以 SHA-1 缓存和校验；避免历史仓库 HTTP 重定向，直接使用同一官方仓库 HTTPS 地址；OptiFine / LiteLoader 共存改用伴随 tweaker，消除重复 --version 参数。

官方参考：LiteLoader 下载与 Forge 共存说明 <https://www.liteloader.com/download>；发布清单 <https://dl.liteloader.com/versions/versions.json>；OptiFine 1.12.2 G5 对应 Forge 2847 <https://optifine.net/downloads>。未打包第三方游戏、Java 或加载器二进制。

## UI 检查与边界

使用 Vite 开发模式的 `?desktop-preview` 样例状态，1280×720 检查启动首页、实例列表、删除确认、两步创建、Fabric 互斥禁用、左右／顶部导航及布局预设。截图保存于 `../design/qa/alpha6-home.png`、`alpha6-components.png`、`alpha6-focus.png`。浏览器样例不调用真实安装和删除功能；真实生命周期检查见上表和原生测试。

微软真实登录明确延期，等待项目审核通过。第三方真实账号、完整历史版本矩阵、任意模组组合、自由 HTML/CSS 编辑与 3D 场景仍不在本轮验收结果中。布局 JSON 仅支持导航、尺寸、列表模式、模块顺序与可见性。

---

# Alpha.3 validation — 2026-10-21

- Automated tests: 29 core tests + 4 Sites scaffold tests pass (33 total) (model fixtures, real filesystem installer, download integrity, accounts and Fabric). Model migration tests remain prototype tests; they do not imply a live content service exists.
- Account fixtures cover encrypted persistence/public projection, no password storage, device polling/throttling/expiry/cancel, Xbox + Minecraft ownership/profile flow, refresh, third-party profile selection and identity-substitution refusal. These are mocked protocol tests, not live Microsoft or skin-site account acceptance.
- Packaged AMBER.exe --smoke-test exited 0 and printed AMBER_SYSTEM_ENCRYPTION_OK and AMBER_DESKTOP_AND_IPC_OK. Windows safeStorage encryption/decryption, renderer loading and the real IPC bridge passed. Electron emits deprecation notices for the still-supported synchronous safeStorage methods; migration to its async API remains maintenance work.
- Real Minecraft 1.21.1 + Fabric Loader 0.19.5 stable + Temurin Java 21: 3,969 files verified; game PID 42832 created. Log confirmed Fabric initialization, OpenAL and GUI atlas creation. The script exits without terminating the game. This does not prove multiplayer or world gameplay.
- Dedicated instance: fbb985df-3e5b-4662-9ecd-bdc419093bb5 under %APPDATA%/AMBER/library/instances.
- Evidence: logs/amber-1792567657482.log within that instance; scripts/verify-fabric.mjs is the reproducible opt-in check.
- Browser desktop-preview is an inert fixture for layout inspection, not an Electron integration test.
- Remaining: actual Microsoft client registration/approved service access and user login, actual third-party account/skin/server validation, broader historical Fabric and original-game version matrix.
- The existing alpha.2 vanilla verification remains valid; previous releases are retained.

## Alpha.3.1 — built-in Microsoft application

Project-owned public Client ID is bundled. New installs and legacy empty configurations use it; existing overrides and stored account client IDs are preserved. Users can restore the default in advanced settings. Microsoft login is the initial account tab and opens the verification page after obtaining the device code.

30 core tests passed, including default device-code requests, encrypted legacy-config migration, custom override persistence and reset. Production build passed; packaged desktop smoke exited 0 with AMBER_SYSTEM_ENCRYPTION_OK and AMBER_DESKTOP_AND_IPC_OK. Application review was submitted by the owner; approval and live user authentication remain unverified.

## Alpha.4 — second update (2026-10-21)

- 46 automated tests passed: 42 application/protocol/filesystem tests and 4 Sites scaffold tests. Six model tests are still prototype migration fixtures, not a claim of live migration support.
- New tests cover dependency closure/cycles/conflicting fixed versions, compatibility rejection, unsafe URL/path refusal, existing manual files, failed-download rollback, disabled dependency reactivation, recoverable removal, loader patch-cache repair, auth-stage messages without reflected secrets, MRPACK client filtering/override order/reserved paths, and map ZIP structure/traversal.
- Real Windows x64 installs and launch evidence below. Audio and texture initialization is verified; this is not multiplayer/world-gameplay acceptance. Test scripts close only their own game processes.

| Configuration | Instance | Evidence log under instance/logs |
| --- | --- | --- |
| MC 1.21.1, Forge 52.1.20, Java 21, 4019 receipt files | 4113c8c8-0970-4b21-803c-d144baf856d4 | amber-1792571467157.log |
| MC 1.21.1, NeoForge 21.1.264, Java 21, 4028 receipt files | cad59b09-bba6-4d5e-afda-8fc6c500586a | amber-1792571572031.log |
| MC 1.21.1, Fabric 0.19.5, Sodium | 94ddbd50-f57e-4749-b992-b8c20ca11a8e | amber-1792571588778.log |
| Same Fabric instance, Mod Menu + required Fabric API + Text Placeholder API | 94ddbd50-f57e-4749-b992-b8c20ca11a8e | amber-1792571999526.log |
| MC 1.12.2, LiteLoader 1.12.2-SNAPSHOT-r4CC2BB0-b4-4 release artifact, Java 8 | 58e2aaf3-999f-4021-bb8a-fd908425fd8a | amber-1792571815594.log |
| MC 1.21.1, Fabric 0.18.4, Simply Optimized & Up to Date MRPACK v91uNAmXo, 37 files | ef3648e5-66f7-4f92-9722-9fd757dddbb6 | amber-1792572173184.log |

- Initial LiteLoader attempt exposed that Maven's unclassified JAR is a development build: it reached vanilla rendering while LiteLoader failed initialization. This was not accepted as success. Switched to the official release classifier and reran with explicit LiteLoader-error detection; PREINIT and rendering passed without the prior initialization error.
- Modrinth live search, version resolution, checksummed Sodium installation and .disabled toggle round trip passed. Mod Menu dependency installation then passed with mod IDs present in the game log. MRPACK first rejected a mismatched loader version as intended, then installed into a new matching empty instance and launched successfully.
- Browser QA: development-only fixture, search → version → dependency preview at 847px viewport; screenshot design/qa/alpha4-content-preview.png. This is layout evidence only; live service and game evidence is listed separately above.
- Pending: Microsoft API approval/live end-to-end account authentication; third-party account/skin/server test; real OptiFine Forge combination; historical loader matrix/NeoForge 26.x; map imported world's actual gameplay; power-loss transaction recovery. Standalone OptiFine now verified separately (see below).

- OptiFine standalone follow-up: official OptiFine_1.21.1_HD_U_J1.jar obtained from optifine.net for local testing only. AMBER-owned reflection bridge checks declared MC version and invokes the installer in an isolated work directory. Patched outputs are hashed and included in receipts. Instance 13970b90-f878-434d-8062-7cc7fa0e7b16, logs/amber-1792572600911.log confirms OptiFine J1, OpenAL and texture atlas initialization. Forge+OptiFine combinations remain unverified. Reproduce with scripts/verify-optifine.mjs and a separately obtained official installer.
- The bridge source is MPL-2.0; compiled for Java 8 (class version 52), SHA-256 322fa45b568aea2879d2821df89482a2c1df4c12f46e1f009b5ad770939a9708. ECJ build dependency and OptiFine test installer are excluded from Git and the distribution.

- Final alpha.4 production build succeeded. 46 tests passed after OptiFine integration. Native Electron smoke exited 0 with AMBER_SYSTEM_ENCRYPTION_OK and AMBER_DESKTOP_AND_IPC_OK; existing synchronous safeStorage deprecation notices remain. No OptiFine or ECJ binary is included in the distribution; only AMBER's own bridge class/source is copied.


## Alpha.5 / update 3 — 2026-10-21

Live integrations use dedicated instances in `%APPDATA%/AMBER/library`; each script closes only the game process it launched. Source test instance 94ddbd50-f57e-4749-b992-b8c20ca11a8e remained unchanged.

- Unified setup + migration: target **38083012-b8b4-48d3-a9bc-e8c53f1ef038**, Minecraft **1.20.1**, Fabric, Java 17, **3650** verified game files. Source 1.21.1 mods resolved to Fabric API 0.92.12+1.20.1, Mod Menu 7.2.2, Text Placeholder API 2.1.4+1.20.1, Sodium mc1.20.1-0.5.13-fabric. Synthetic unknown project skipped with reason; source manifest comparison unchanged. Log **amber-1792573987404.log**: RENDER_AND_AUDIO_OK.
- Automatic MRPACK instance: **1c122d52-af0d-4ddc-911d-5500d5678874**, version 91uNAmXo, Minecraft 1.21.1 / Fabric 0.18.4; **37** pack files. Log **amber-1792574176886.log**: RENDER_AND_AUDIO_OK.
- Legacy Forge: **e9f3ac1b-ede1-44d6-8e11-049be2d46c65**, Minecraft **1.12.2**, Forge **14.23.5.2864**, Java 8, **1349** verified files. Log **amber-1792574241360.log**: RENDER_AND_AUDIO_OK.
- NeoForge new numbering: **10cbad84-b4ec-4e4f-b7f3-cf72a71cf8b7**, Minecraft **26.1**, NeoForge **26.1.0.19-beta**, Java **25**, **4857** verified files. Log **amber-1792574279561.log**: RENDER_AND_AUDIO_OK. Mapping follows https://docs.neoforged.net/docs/gettingstarted/versioning/ including patch component and snapshot suffix.
- Forge + OptiFine: **d46c32c9-77a4-45d1-9c61-3ed8ad76768b**, Minecraft **1.21.1**, Forge **52.0.16**, locally supplied official OptiFine **HD U J1**, Java 21, **4016** verified game files. Log **amber-1792574488919.log**: OptiFine present and RENDER_AND_AUDIO_OK. Forge build chosen from https://optifine.net/downloads compatibility entry, not extrapolated to all Forge versions.

These checks establish loader/game initialization, not prolonged gameplay, every mod combination, multiplayer or account authorization. No new Microsoft approval is claimed.

New offline tests exercise setup ordering/failure receipts/ownership, target-version migration/dependencies/skips/disabled state, current-file hash identity, settings validation/persistence, untrusted manifest fields, strict icon origins, NeoForge mapping, interrupted content commit recovery and changed-file preservation, and OptiFine game metadata recognition. Browser layout fixtures are not installation evidence. New creation flow checked via browser: selecting Forge disables Fabric/NeoForge while allowing optional OptiFine. Screenshot: design/qa/alpha5-create-preview.png.

Final alpha.5 checks: 58 automated tests passed (including 4 Sites contract tests); final Vite production build and Sites preparation succeeded. Source Electron smoke exited 0 with AMBER_SYSTEM_ENCRYPTION_OK and AMBER_DESKTOP_AND_IPC_OK, including the settings IPC channel. Existing synchronous safeStorage APIs emit deprecation notices but encryption round-trip passes. Browser checks confirmed automatic search result appearance without a search click, and dark-theme rendering (design/qa/alpha5-settings-preview.png).

Packaged AMBER-0.1.0-alpha.5-win-x64/AMBER.exe smoke test also exited 0 with system encryption and desktop/settings IPC success markers. Previous alpha.4 package remains intact.


Alpha.8 packaged verification: releases/AMBER-0.1.0-alpha.8-win-x64/AMBER.exe exited 0 with AMBER_BACKGROUND_OK, AMBER_SYSTEM_ENCRYPTION_OK and AMBER_DESKTOP_AND_IPC_OK. Previous releases preserved. No Microsoft real login was attempted.

## Beta 1.2 (1.0.0-beta.3) validation — 2026-10-21

- `pnpm test`: 120 passed; `pnpm test:sites`: 4 passed. Final production build and source/license checks passed.
- Browser UI checks used development-only fixtures (921 versions, clearly labelled simulated completion), not actual Minecraft installation. Checked 1280×720, minimum desktop 860×640, and a 480×640 narrow-layout stress case, with light/dark and square/rounded variants.
- Expanded version group contains all rendered rows and ends before the next group (DOM rectangle check); loading 40 then 104 release rows no longer overlaps. Search and footer remain visible. Verified empty search, clear, back-step keyword retention, Fabric default name and incompatible component disabling.
- Completion dialog has 30px horizontal padding on desktop / 20px narrow; buttons fit inside the panel. Checked heading focus, Esc closing, content-download and home navigation with simulated completion.
- Checked all onboarding steps, invalid/valid offline-name enabling, skip/back, and final create-instance entry. At 860×640 the footer stays inside the panel and outside the scrolling content. Checked empty-home action spacing and background select layout, including switching background to none.
- Final packaged Windows application exited its isolated smoke test with code 0: AMBER_BACKGROUND_OK, AMBER_SYSTEM_ENCRYPTION_OK, AMBER_DESKTOP_AND_IPC_OK. Package metadata is 1.0.0-beta.3. No Beta 1.2 fixture markers are present in the production JavaScript bundle.
- The normal installer build completed after excluding release artifacts and smoke caches from Vite's development watcher. This avoids development-only EBUSY crashes and extraction-directory contention during packaging.
- The existing beta 1.1 installer implementation is retained; this iteration did not overwrite the user's installed program or rerun interactive install/uninstall against their profile. Installer is unsigned. Real Minecraft/account/loader acceptance remains as documented; Microsoft live authentication is deferred pending approval.
- Screenshots are local under `design/qa/beta12-*.png` in the project workspace; they are not user gameplay evidence.


## Beta 1.3 local validation (2026-10-21)

- 129 backend/model regression cases: existing installation, authentication fixture, download, migration, backup and update coverage plus 9 bulk-content / launch-preference tests. Temporary fixtures only; no real Microsoft acceptance.
- Bulk tests cover dependency+consumer aggregate changes, required exceptions, conflicts, stale manifests, changed files, no-op rows, same-name protection, failure/cancellation rollback, recoverable removal, manual-only initialization, running games/tasks, separate instance persistence and global inheritance.
- Browser QA: custom choice lists in light/square and dark/rounded themes; 1280×720, 860×640 with 18px text, and 480×720 stress layout. Keyboard search/Enter/Esc/Tab, selected item visibility, popup top-layer inside setup dialog, no horizontal overflow after narrow navigation fix.
- Store QA retained keyword `fabric`, page 2 and scroll position after project back navigation and leaving/re-entering the page. Different instance compatibility identities use distinct cache keys.
- Launch QA: instance A kept 8 GB while instance B inherited global memory changed from 4 to 12 GB. Source-level checks ensure compatibility-key changes invalidate store results and a removed account cannot silently become offline.
- Task QA: one incomplete setup plus two stage jobs renders one primary card and one continuation entry; completed filter shows its completed stage. Bulk selection/preview UI inspected using explicitly labelled samples.
- Four Sites routing/build checks passed. Windows NSIS packaging uses `--publish never`; packaged app smoke runs against isolated local smoke-data and verifies background, system encryption, frontend and IPC.
- No GitHub uploads. No real-account Microsoft login, no clean-machine installer execution and no fresh all-loader game-launch acceptance claimed.

Screenshots: ../design/qa/beta13/unified-select.png.
