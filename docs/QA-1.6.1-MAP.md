# Map capture investigation / 地图截图调查

Scope: current map changes on the existing layout, using the built application from `4ccc985586b135171398f6e1b7fc3aa22dc3063b`. This follow-up changes only QA and documentation, not product rendering.

## Observation

The previous test launched `--qa-ui` without `--qa-visible`. Project startup intentionally keeps this QA window hidden. Playwright page capture timed out after fonts loaded; element capture timed out in its animation-frame stability wait. Interaction assertions had passed, but these were not accepted as visual evidence.

The diagnostic uses the project's existing visible QA mode, scrolls the selected region into view, takes four geometry samples 250 ms apart, and captures the actual Electron webContents surface using `capturePage`. This is a real raster capture, not reconstructed DOM or generated artwork. User-data and library paths are asserted to point to the newly created synthetic fixture before interaction.

All five captures succeeded at 1280×900. The window was visible and not minimized; document visibility was `visible`. All four geometry samples for each target were identical. This supports a limitation in the previous hidden-window capture path; it does not prove a product layout animation defect. No browser/CUA action or restricted attachment transfer was retried.

## Inspected evidence

Local output is `prototype/review161/` (generated evidence is intentionally untracked):

- `seed-map-native.png`: Chinese/light map and structure markers render; selected center is X 192 / Z 16.
- `seed-results-visible.png`: 53 visible predictions, distance order, readable coordinates and estimate/omission notice; results scroll within their bounded panel.
- `seed-results-hidden.png`: map remains rendered, structure markers disappear, count becomes zero and the no-enabled-structures explanation is visible.
- `seed-relief-en-dark.png`: English/dark map with estimated relief enabled; shading and structures remain visible with the prediction limitation below.
- `seed-capabilities-en-dark.png`: Overworld has 16 supported filters; Nether/End entries are disabled and explicitly labeled Unsupported. Native UI assertion checks the disabled Nether fortress option.
- `map-capture-diagnostics.json`: captured image dimensions, window visibility and four rectangle/scroll samples per capture.
- `map-checks.json`: synthetic-data isolation and actual click-to-center / hide-all assertions.

The final run printed `EDITOR161_UI_AND_MAP_RESULT_ASSERTIONS_OK`. The old `map-screenshot-limitation.txt`, if retained in the local evidence directory, records the superseded failed method and is not the final result.

## Limits / 限制

This is scoped visual verification of the current map changes. The requested screenshot-driven seed-map and gradient layouts remain unimplemented because their original references are not yet readable. The current page still scrolls, as the captured images show. Full AMBER/AmberE, theme, dimension and window-size acceptance remains pending with that integration. No real save was opened, no formal package was delivered, and no merge/release/Pages operation was performed.

本轮确认隐藏测试窗口是原截图方式的重要差异；采用项目现有可见隔离模式及 Electron 原生画面捕获后，五张截图成功且均已实际查看。尺寸采样稳定，没有观察到持续抖动。只确认当前地图改动的局部视觉结果，不能替代尚未实施的两处参考图布局及最终完整验收。
