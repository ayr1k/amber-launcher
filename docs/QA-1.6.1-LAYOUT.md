# 1.6.1 layout verification

Development verification only. The developer did not see the original annotated images; the coordinator viewed them and supplied the region relationships. Independent original-image comparison and user acceptance remain pending.

## Reproduction and evidence

Run `scripts/qa-layout161.cjs` with `AMBER_PLAYWRIGHT` pointing to the installed Playwright package. The script starts the real Electron application with `--qa-ui --qa-visible --disable-gpu`, asserts temporary user-data/library paths, creates only a synthetic JSON configuration, and captures native `webContents.capturePage()` PNGs. `AMBER_QA_STAGE` selects an edition staging directory, `AMBER_QA_ELECTRON` selects a built product executable, and `AMBER_QA_NAME` identifies evidence. The report records `app.isPackaged` and the executable path for packaged runs. No real instances are read or modified.

Each edition covers all three pages at Chinese/light 1280x900, English/dark 1440x900, Chinese/dark 1600x1000, English/light 1024x768, Chinese/light 860x700 and English/dark 900x1100. Wide layouts assert zero horizontal and outer vertical overflow against the **visible** tool-page scroll container. Narrow layouts retain page scrolling, preserve controls and capture both top and scrolled regions. Expanded map filters and gradient positions are captured in wide windows. `review161/*-layout-checks.json` records the matrix and geometry; adjacent PNGs are the review evidence. Generated evidence is ignored by git.

Interactions cover real native map completion, adding markers, text editing, bold formatting reflected in JSON, solid-color application and opening a synthetic editor file. Existing map evidence separately checks structure result focus/hide and relief. `qa-boundary161.cjs` covers real repeated keyboard movement and recovery at all four extreme edges. Tests assert no renderer errors. The editor retains its existing file-list/editor arrangement and toolbar wrapping.

## Observations and limits

Titles and descriptions remain separate from controls. Output format occupies the gradient title row. Local color remains below the left preview; base gradient and output remain on the right. Same-group action buttons use shared heights and align at their row baselines. The map uses a fixed-aspect canvas that fits the available region; settings scroll internally in wide windows. Small windows intentionally stack map/gradient sections and scroll vertically. The gradient palette scrolls internally to keep advanced controls accessible; text/output areas also scroll for long content.

The final snapshot is a test build, not a formal release. Root-development screenshots may show the source public-channel label; installer staging explicitly selects the local channel. Product account policy, identity and channel separation follow the existing packaging process. No real-game world accuracy, overwrite-install, multiplayer or non-Windows acceptance is claimed. There is no dedicated lint/typecheck script in this JavaScript repository; frontend compilation, required regression/site tests, locale/source checks and native UI verification are used.
