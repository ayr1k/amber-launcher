# AMBER / AmberE 1.6.1 test candidate

Draft PR #11, branch `task/1.6.1-map-workspace`. Local-channel Windows x64 test builds; not a formal release. These installers retain the corresponding product installation identity and may replace an existing installation. Back up data before manual installation. Automated verification uses temporary synthetic profiles only.

## Changes / 更新

- Seed map: pointer-anchored zoom, two-dimensional relief shading, explicit imported-version and spawn limitations, version/dimension-aware structure filtering, clickable nearest results, and reduced redundant calculations.
- Map workspace: title, full-width basics, responsive map on the left and scrollable settings on the right. Narrow windows stack sections without hiding controls.
- Gradient text: output format beside the title; text, preview and local color on the left; base gradient and output on the right. Controls retain existing behavior and theme.
- File editor: adapts to remaining height; existing layout is retained.
- 地图与渐变文字调整布局并适应窗口；文件编辑器仅调整尺寸。结构与地形信息仍是预测，不能当作真实存档扫描结果。

## Verification boundary

See `docs/TASK-1.6.1.md` and `docs/QA-1.6.1-MAP.md` for reproducible checks and evidence. Build provenance and SHA-256 accompany each installer. The developer could not retrieve the original annotated images; implementation follows the coordinator's interpretation after they viewed the originals. Independent comparison with those originals and user acceptance are pending. Do not describe development self-checks as independent acceptance.

No merge, stable Release or Pages deployment is authorized. No real world generation, multiplayer or overwrite-install acceptance is claimed. Existing product account/data/update separation is retained. Axolotl GPL application code was not copied; bundled Cubiomes retains its independent MIT license and attribution.
