# AMBER / AmberE 1.6.2 task test guide

This is a development test build, not a formal release. Both editions use the same map implementation. The PR records the tested commit, CI run, installer downloads and SHA-256 checksums. User acceptance and explicit merge approval are still required.

## Changes to try

- Select a structure on the map or in the keyboard-accessible results list. The detail section shows coordinates, straight-line distance from map center and prediction limits. Copy coordinates, center the map and save a marker; repeated saving of the same named point is idempotent. Overlapping map points offer a choice.
- Use **Locate nearest stronghold** in the Overworld. It chooses the nearest biome-validated stronghold staircase chunk to the map center, from all 3 positions before Java 1.9 or all 128 positions in newer supported versions. This is not the portal-room location. Enable at least one structure filter to calculate structures.
- Inspect the bilingual biome names and sampled color legend. Clicking a legend item highlights that biome; click again to clear. A sampled legend can omit small biomes.
- Zoom out and inspect the per-type result reasons. A region grid above 1600 is skipped; reaching 1200 total features truncates remaining scans. The UI distinguishes these from loading, failed calculation, incomplete area coverage, unsupported types and completed scans with no matches. The displayed list separately limits itself to the nearest 100 matches.
- Switch applied seed, generation version, dimension and height; old selections and cross-context results must disappear. Zoom, then edit integer coordinates: the camera keeps its anchored precision while form drafts stay integral.
- New markers bind to seed, generation version and dimension. Legacy markers remain saved, with an unknown-version notice; they stay off the map until explicitly linked to the current version. Export before linking if preserving the original legacy metadata is important. Markers for other known contexts remain stored and reappear when that context is selected.

## Installation and data boundaries

The test installers retain each product's normal Windows application ID (`io.github.ayr1k.amber` / `io.github.ayr1k.ambere`), installation identity and user-data location. Installing may replace the existing installation of that edition and use its existing data. They are **not side-by-side isolated test editions**. The build channel is `local`; it is not a public stable update. AMBER and AmberE remain separate from each other.

Use a disposable Windows profile/VM and copied fixtures for manual acceptance. Automated checks use fresh temporary `--qa-ui` data and verify the selected data/library roots before changes. No real accounts, instances or saved worlds are needed for map validation. The installer does not automatically run the app at completion.

## Validation and limits

- Review follow-up: prediction coordinates can exceed the camera-center envelope. Copy/export/markers retain bounded native coordinates (up to +/-31,000,000); all navigation clamps only the camera to +/-29,899,999 and explains the adjustment. Predictions beyond Minecraft's world border are not a promise that structures can generate there. Positive/negative native edge fixtures cover copy, saved-marker round trips, navigation and reload.
- Unix helpers have executable Git modes. A clean Ubuntu CI checkout runs the native/map regression tests without chmod workarounds or skipped tests. macOS helpers remain cross-compiled only.

- Regression tests cover current-context completeness, legacy/versioned markers, repeated save, overlapping points, latest-scene queue behavior and bounded coordinate-copy IPC.
- Native tests cover the 1600-region boundary, actual 1200-result truncation, unsupported/disabled/empty statuses, cancellation followed by retry, and all stronghold positions for representative Java generation versions 1.7, 1.19 and 26.3 against direct pinned-Cubiomes reference vectors. The nearest navigation array is verified even when all strongholds are outside the viewport.
- `scripts/qa-seed162.cjs` uses an isolated desktop session for actual native maps and screenshots. Injected loading/failure/empty/truncated states are explicitly identified as synthetic evidence. See the PR for the final run outcome; test code alone is not proof of execution.
- All four native helpers are rebuilt and hash-linked to the C source. Windows execution is tested; Ubuntu CI executes the Linux helper and map regressions from a clean checkout. macOS helpers remain cross-compiled without native execution. Linux helper tests are not full Linux desktop acceptance.
- These are Cubiomes predictions, not a real Minecraft generation comparison. Terrain, world upgrades, mods and datapacks can change actual structures. Newer/snapshot biome names use descriptive Chinese labels where the engine catalog has new entries. Estimated relief is not block geometry.
- Spawn estimation, 3D underground views, ore and chest-loot predictions are deferred. This task does not implement 1.6.3, 1.6.4 or 1.7.0.

Existing MIT Cubiomes licensing and project MPL-2.0 notices remain. No Axolotl code or artwork is copied; structure icons are original vector paths shared by canvas and SVG, independent of fonts.

---

# AMBER / AmberE 1.6.2 测试说明

本包是任务测试版，不是正式发布。两款产品共用本轮地图实现。PR 记录最终提交、CI、安装包下载及 SHA-256；仍需用户验收并明确批准合并。

## 验收重点

- 点击地图结构或使用键盘选择结果列表，检查名称、坐标、距地图中心的直线距离及预测说明。验证复制、居中、保存标记、重复保存不增加副本，以及重叠点选择。
- 主世界使用“定位最近要塞”：从当前种子／版本的全部 3 个（1.9 以前）或 128 个要塞中查找距地图中心最近者。使用经过群系校验的楼梯区块坐标，不是传送门房间坐标。至少启用一种结构筛选才能计算。
- 检查中文群系与采样图例、高亮与清除。采样可能遗漏小群系。
- 缩小地图检查逐类原因：区域数超过 1600 时跳过；总结构达到 1200 时截断。加载、失败、视野未覆盖、不支持、完整扫描未找到结果必须区分；列表另有最近 100 项展示上限。
- 应用新的种子／版本／维度／高度后，旧选择与跨上下文结果不应残留；缩放相机精度与整数坐标草稿行为保持。
- 新标记绑定种子、版本、维度。旧标记保留并明确显示版本未知，用户确认关联后才显示在当前地图。关联前可导出原始数据。其他已知版本的标记仍保存，切回对应条件即可查看。

## 安装风险与验证边界

审核修正：预测坐标与相机中心采用不同边界。复制、导出和标记保留原生引擎返回的有界坐标（±31,000,000）；定位仅将相机限制在 ±29,899,999，并明确提示目标坐标未改变。这不保证世界边界外能够实际生成。正负边界均覆盖原生输出、复制、标记往返、定位与重载测试。Unix 引擎已记录可执行文件模式，Ubuntu CI 从干净检出直接执行地图测试，无跳过或临时 chmod。

测试包保留两款产品各自的正式安装标识和数据目录，可能替换已安装的同款产品并读取原数据，**不是独立并存的测试版**。安装包为 `local` 渠道；AMBER 与 AmberE 之间依然独立。建议在可丢弃的 Windows 用户／虚拟机及复制数据中验收。自动化测试只使用临时隔离目录；不操作真实账号、实例和存档。

原生测试包含上限、取消重试、代表版本的全部要塞坐标对照及视野外定位数据。桌面脚本区分真实原生地图交互与人工注入状态；截图不代表真实世界生成验证。四个平台引擎均已重建；Windows 已执行验证，Ubuntu CI 从干净检出执行 Linux 引擎及地图回归，macOS 仅验证交叉编译和校验值。Linux 引擎测试不代表完整 Linux 桌面验收。正式执行结果以 PR 记录为准。

地形、升级区块、模组和数据包可能导致实际生成不同；新版本／快照群系采用描述性中文名称。出生点估算、3D 地下、矿物与箱子战利品预测暂缓。未提前实现 1.6.3、1.6.4、1.7.0。保留 Cubiomes MIT 和项目 MPL-2.0 声明，未复制 Axolotl 代码或图片。

Review follow-up: all 21 structure icons have distinct original vector paths. Canvas and SVG use the same paths; pointer geometry uses the same 10 CSS-pixel radius as the visible icon, including narrow/wide layouts. Regression screenshots cover seed 0 / 26.3 desert pyramids and abandoned camps in the same view, plus center/edge/outside and overlapping-point clicks.

审核修正：21 类结构使用各不相同的自制矢量路径，地图与筛选／列表共用，不依赖字体或外部游戏图片。命中范围按画布显示尺寸换算，与图标 10 CSS 像素可见半径一致；覆盖窄宽窗口、中心／边缘／外侧／重叠点，以及同图沙漠神殿和废弃营地的辨识截图。
