# 1.6.1 formal release / 正式发布

PR #11 merged as `e4208982346f708cb91defa0826f0cc3e7fd1bb1`, reviewed head `d3fbfd7bb26514447e4f1e2c615e5e572df9d2aa`. The user requested formal release on 2026-11-08 (America/New_York). Official packages use **1.6.1/public**. Historical candidate restrictions below do not supersede that instruction. The final independent targeted review is recorded at https://github.com/ayr1k/amber-launcher/pull/11#pullrequestreview-5820508528 ; it reports original-image comparison complete and retains prior valid findings. The main release chat reuses that review and the user's approved merge, without another content review. Formal checks are recorded in RELEASE-ACCEPTANCE.md.

PR #11 已合并，用户已授权完整正式发布。下方“待审核／待验收／不得发布”等描述保留历史归属；最终独立定向审核已记录原图比较完成，当前依据已批准合并及已有审核执行发布，不在本会话重复内容审核。

# 1.6.1 task progress / 开发进度

This is a development draft pending independent review and user acceptance, not a formal release.
开发实现待独立复审和用户验收，不是正式发行。

Implemented / 已实现：

- Pointer-anchored map zoom; toolbar zoom remains centered. 鼠标锚点缩放，工具栏缩放保持中心定位。
- Relief shading uses two-dimensional, distance-normalized height differences without wrapping between rows. 地形阴影使用二维、按距离归一化的高度差，避免跨行取样。
- Save import preserves zero-height spawn, distinguishes missing coordinates, switches to Overworld, and requires manual version selection for unsupported worlds. Approximate version matches are labeled. 存档读取保留 Y=0，区分出生点缺失，切回主世界；未知版本需手动选择，近似版本明确提示。
- File editor retains its layout and uses remaining viewport height, with minimum usable editing space and scrolling on smaller windows. 文件编辑器保持布局，按窗口剩余高度伸缩，小窗口保留最低编辑空间及滚动。
- Structure results are deduplicated within the current scene/view, sorted by distance, limited to 100 displayed rows and clickable to center the map. Unsupported version/dimension filters are disabled. Empty/incomplete results are explicitly distinguished from proven absence. 当前视野结构去重、按距离排序、最多显示 100 项并可点击定位；不支持的版本／维度选项禁用，明确区分空结果与结构不存在。
- Disabling supported structure filters skips native structure searching. Relief shading is computed once per height sample (3072 instead of 49152 calculations for a standard request). 关闭适用结构筛选时跳过原生找点；标准请求阴影计算由每像素一次改为每高度采样一次。

Validation / 验证：

- 721 regression tests passed, zero skips (includes nine seed-map tests).
- Frontend build, four static-site tests, 2907 locale checks and source checks passed.
- Isolated unpackaged Electron editor checks passed at 1280×900 English/light, 1600×1000 Chinese/dark, 1024×768 English/dark and 800×900 Chinese/light. User-data and library isolation are asserted before interaction. Small windows retain page scrolling.
- No personal world was opened or modified. No real-game generation acceptance is claimed.
- Native UI interaction assertions verified a predicted village at X 192 / Z 16, clicking to center and hiding all structure results. The hidden-window screenshot limitation was resolved in QA by using the existing `--qa-visible` mode and native Electron `capturePage`. Five actual 1280×900 captures were inspected: Chinese/light map, structure list and hidden state; English/dark estimated relief and unsupported filters. Each capture has four identical geometry samples, visible/non-minimized window state and asserted temporary data isolation. This historical capture set covers the pre-layout map changes; see the later layout integration evidence. 隔离可见窗口原生截图已成功并实际检查五张画面；当前地图改动的局部视觉验证通过，不代表待办布局或完整双版本／主题矩阵验收。
- Three local native samples with structure search enabled took 100.0 / 93.9 / 93.3 ms; disabled took 93.9 / 91.7 / 91.0 ms, with identical biome arrays. This is a small local sample, not a general speed/FPS guarantee. 三组本机样本仅证明跳过搜索后结果一致、耗时略降，不代表普遍性能承诺。

Layout integration / 布局整合：

The coordinator subsequently authorized implementation from their interpretation of the original images after the official transfer failed. The developer has **not** viewed the originals and has not retried the failed transfer. Original-image comparison remains a separate independent review.

- Seed map retains its title, adds a full-width basics band, and puts the responsive map beside a scrollable settings column. Narrow windows stack without hiding settings.
- Gradient output format is beside the title; editing, preview and local color remain on the left; base gradient and output occupy the right.
- File editor adapts only its dimensions. `scripts/qa-layout161.cjs` captures actual Electron surfaces with asserted synthetic-data isolation across three pages, English/Chinese, light/dark and landscape/narrow/portrait sizes.
- Version metadata is 1.6.1. Local test notes: `prototype/LOCAL-TEST-1.6.1.md`. Final installer provenance and download links belong to PR #11; no merge, formal Release or Pages deployment.

Reference boundary / 参考边界：

Only public feature descriptions and licensing notices were consulted for Axolotl. No Axolotl source, assets or UI implementation were copied. Its [desktop packages are GPL-3.0-only](https://github.com/Axolotl-Launcher/Axolotl/blob/main/COPYING.md). The existing pinned [xpple/Cubiomes engine is MIT](https://github.com/xpple/cubiomes/blob/master/LICENSE), separately licensed; its bundled license and notices remain intact. New camera/relief calculations are original MPL-2.0 project code. Engine predictions remain estimates, not observed world terrain.

仅参考 Axolotl 的公开功能说明与许可声明，没有复制其源码、素材或界面实现。其桌面 GPL 许可与现有 Cubiomes 的 MIT 许可分别处理；保留引擎许可和署名。新增计算为项目原创代码，地图预测不代表实测存档地形。

## Keyboard edge follow-up

Keyboard arrows now use `keyboardPanCamera` and the immediate camera ref, clamping to the same integer center boundary as pointer panning. Manual input validation is unchanged (absolute center coordinates strictly below 29,900,000); native request origins retain their existing inclusive bounds. Tests cover all seven scales and 100 repeats on each positive/negative X/Z boundary, valid buffered request origins, unchanged ordinary steps and reverse recovery. Isolated Electron checks additionally completed native map generation after 20 repeated keys at each edge at scale 4096, then reversed successfully with no map error. Evidence: `review161/keyboard-boundary-checks.json`; reproducible script: `scripts/qa-boundary161.cjs`.

The independent-review coordinate-draft and compressed-gradient-band findings were reproduced and corrected; see the follow-up section of `QA-1.6.1-LAYOUT.md`. Earlier installer revisions are superseded by the subsequent PR head.
