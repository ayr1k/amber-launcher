# 1.6.1 task progress / 开发进度

This is an incomplete development draft, not an acceptance candidate or formal release.
本任务尚未完成，不是用户验收候选版，也不是正式发行。

Implemented / 已实现：

- Pointer-anchored map zoom; toolbar zoom remains centered. 鼠标锚点缩放，工具栏缩放保持中心定位。
- Relief shading uses two-dimensional, distance-normalized height differences without wrapping between rows. 地形阴影使用二维、按距离归一化的高度差，避免跨行取样。
- Save import preserves zero-height spawn, distinguishes missing coordinates, switches to Overworld, and requires manual version selection for unsupported worlds. Approximate version matches are labeled. 存档读取保留 Y=0，区分出生点缺失，切回主世界；未知版本需手动选择，近似版本明确提示。
- File editor retains its layout and uses remaining viewport height, with minimum usable editing space and scrolling on smaller windows. 文件编辑器保持布局，按窗口剩余高度伸缩，小窗口保留最低编辑空间及滚动。
- Structure results are deduplicated within the current scene/view, sorted by distance, limited to 100 displayed rows and clickable to center the map. Unsupported version/dimension filters are disabled. Empty/incomplete results are explicitly distinguished from proven absence. 当前视野结构去重、按距离排序、最多显示 100 项并可点击定位；不支持的版本／维度选项禁用，明确区分空结果与结构不存在。
- Disabling supported structure filters skips native structure searching. Relief shading is computed once per height sample (3072 instead of 49152 calculations for a standard request). 关闭适用结构筛选时跳过原生找点；标准请求阴影计算由每像素一次改为每高度采样一次。

Validation / 验证：

- 719 regression tests passed, zero skips (includes seven new seed-map tests).
- Frontend build, four static-site tests, 2907 locale checks and source checks passed.
- Isolated unpackaged Electron editor checks passed at 1280×900 English/light, 1600×1000 Chinese/dark, 1024×768 English/dark and 800×900 Chinese/light. User-data and library isolation are asserted before interaction. Small windows retain page scrolling.
- No personal world was opened or modified. No real-game generation acceptance is claimed.
- Native UI interaction assertions verified a predicted village at X 192 / Z 16, clicking to center and hiding all structure results. The hidden-window screenshot limitation was resolved in QA by using the existing `--qa-visible` mode and native Electron `capturePage`. Five actual 1280×900 captures were inspected: Chinese/light map, structure list and hidden state; English/dark estimated relief and unsupported filters. Each capture has four identical geometry samples, visible/non-minimized window state and asserted temporary data isolation. This covers current map changes only, not the pending reference layouts or full edition/theme matrix. 隔离可见窗口原生截图已成功并实际检查五张画面；当前地图改动的局部视觉验证通过，不代表待办布局或完整双版本／主题矩阵验收。
- Three local native samples with structure search enabled took 100.0 / 93.9 / 93.3 ms; disabled took 93.9 / 91.7 / 91.0 ms, with identical biome arrays. This is a small local sample, not a general speed/FPS guarantee. 三组本机样本仅证明跳过搜索后结果一致、耗时略降，不代表普遍性能承诺。

Outstanding / 待完成：

- Both original annotated images must be materialized and visually inspected before seed-map and gradient layout implementation. The current Windows Library transfer helper fails while applying metadata (`os.setxattr` unavailable); image-dependent work is blocked, not approximated from prose.
- Complete image-dependent layout integration, full map/gradient/edition/theme UI coverage, final version metadata and paired Windows test installers with final-commit provenance and SHA-256.
- No final installer delivery is available yet. Do not merge this draft or publish a stable release.

Reference boundary / 参考边界：

Only public feature descriptions and licensing notices were consulted for Axolotl. No Axolotl source, assets or UI implementation were copied. Its [desktop packages are GPL-3.0-only](https://github.com/Axolotl-Launcher/Axolotl/blob/main/COPYING.md). The existing pinned [xpple/Cubiomes engine is MIT](https://github.com/xpple/cubiomes/blob/master/LICENSE), separately licensed; its bundled license and notices remain intact. New camera/relief calculations are original MPL-2.0 project code. Engine predictions remain estimates, not observed world terrain.

仅参考 Axolotl 的公开功能说明与许可声明，没有复制其源码、素材或界面实现。其桌面 GPL 许可与现有 Cubiomes 的 MIT 许可分别处理；保留引擎许可和署名。新增计算为项目原创代码，地图预测不代表实测存档地形。
