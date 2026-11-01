# .ambtheme format reference — schema 1

[简体中文](zh-CN/AMBTHEME-FORMAT.md) · [Using themes](THEMES.md) · [Example JSON](theme-example.json) · [Download starter](AMBER-Theme-Starter.ambtheme)

For AMBER and AmberE 1.1.0–1.2.1. Both products read the same format; a theme cannot change the product, account rules, update repository or game data. The separate starter demonstrates colors, rounded controls and a two-column home. It is not preinstalled. This document and the starter are licensed under MPL-2.0.

## Import, edit and recover

1. Download `AMBER-Theme-Starter.ambtheme` from the release or website.
2. Open Settings → Appearance & themes → Theme library → Import. Review the metadata, then Apply this theme or Add to library only. Partial import is under Advanced import options.
3. Apply directly from the library, or choose Preview & edit and Apply changes. First-time themes and major changes ask for confirmation within 30 seconds; unconfirmed or interrupted changes revert. Previously confirmed, unchanged themes apply in one step.
4. Export to share the draft as a new `.ambtheme` package. Review any included images before sharing.

Use Restore previous or Restore classic in the editor. **Ctrl+Shift+F12** restores classic even if a theme is difficult to use. Recovery changes appearance only. Window corners require a restart; whole-window opacity fades all text too.

## Archive structure

An `.ambtheme` file is a ZIP archive, not a JSON file renamed to `.ambtheme`. Put these entries directly at the archive root, without an enclosing directory:

```text
theme.json                         required, UTF-8 JSON
LICENSE.txt                        optional
preview.png                        optional, not currently shown by the library
assets/<64 lowercase hex>.png       images referenced by theme.json
```

Only these entries are accepted. Keep this help document outside the `.ambtheme`; extra README files inside the theme will be rejected. The downloadable guide ZIP is a documentation archive and must not be imported as a theme: extract it and select its `.ambtheme` example.

Top-level keys: `format` must be `ambtheme`, `schema` must be `1`, and `appearance` contains the visual configuration. `compatibleVersions` is an optional array such as `["1.1.0"]`. `requiredCapabilities` may list `appearance-v1`, `layout-v1` and `composition-v1`; use the first two for layout trees and add the third for 1.1.1 composition or node styles. Unknown required capabilities/schema versions are rejected. A missing version match warns but permits preview. Unknown optional appearance fields warn and are ignored.

## Appearance fields

Missing fields receive the defaults in [theme-example.json](theme-example.json) and the runtime schema; the example intentionally changes some defaults for demonstration. All numbers are plain numbers, not strings with units. Colors must be six-digit HEX values, such as `#245b48`.

| Fields | Allowed values / meaning |
| --- | --- |
| `name`, `author`, `source`, `license` | Text, up to 300 characters each. Metadata is displayed, not executed or automatically opened. |
| `enabled` | Boolean; imported themes are enabled when applied. |
| `mode` | `system`, `light`, `dark`, `custom`. Only `custom` uses all six custom colors. |
| `accent`, `background`, `surface`, `text`, `muted`, `line` | Accent, background, panel, text, secondary text and border colors. In other modes only the accent is customized. |
| `radius`, `borderWidth` | 0–24 px; 0–3 px. Native window corners are separate. |
| `controlHeight`, `rowHeight`, `iconSize` | 36–60 px; 40–90 px; 24–64 px. Icon size applies to instance icons. |
| `fontFamily`, `fontSize`, `scale` | Installed font-family name (1–80 characters, no CSS syntax); 12–22 px; 85–125 percent. Missing fonts/glyphs fall back. |
| `fontOffset` | Optional since 1.1.2, default 0; −3 to +3 px, editor step 0.5 px. Positive moves down, negative moves up. Applies to button, menu and single-line field text; older clients ignore this optional field. |
| `menuStyle` | `filled`, `outline`, `minimal`. |
| `listStyle` | `lines`, `striped`, `spacious`. |
| `navLabels` | Boolean; false allows a narrow icon sidebar. |
| `panelOpacity`, `windowOpacity` | 60–100 percent; 70–100 percent. Whole-window opacity applies in the desktop app and also fades text. |
| `backgroundAsset`, `heroAsset`, `artworkAsset` | `null` or the PNG filename only, including its SHA-256 and `.png`, without `assets/`. Respectively app background, launch scenery and artwork module. |
| `backgroundFit`, `backgroundPosition` | `cover` or `contain`; 0–100 percent vertical image position. |
| `overlay`, `blur` | 0–90 percent overlay; 0–20 px background blur. |
| `motion` | `none`, `light`, `standard`. |
| `canvas` | `null` for classic home, or the tree described below. |

## Home layout tree

Every node needs a unique `id` of 1–60 letters, digits or hyphens and a `type`:

- `module`: add a `module` from `launch`, `shortcuts`, `activity`, `details`, `instances`, `favorites`, `recent`, `artwork`. Each may occur once; `launch` must remain.
- `split`: set `direction` to `vertical` or `horizontal`, and add a `children` array. Use exactly two children for a two-column section; set `ratio` to 25–75 percent. Other child counts render vertically. Narrow windows also stack columns.
- `tabs`: add `children`. These become switchable pages; tab labels come from the app's module names.

Maximum 32 nodes; root depth is 0, maximum depth 5; each container accepts 1–8 children. The editor supports nested containers, module swaps and column resizing. Modules keep their original behavior; the theme cannot replace launch/authentication controls with custom code.

## Navigation and window settings

Optional `layout` fields:

| Field | Values |
| --- | --- |
| `navigation` | `left`, `right`, `top` |
| `sidebarWidth` | Integer 72–360 px; widths below 220 apply only when `navLabels` is false. Top navigation does not use this width. |
| `contentWidth` | `wide`, `comfortable` |
| `instanceView` | `list`, `grid` |
| `homeSections` | Each of `launch`, `shortcuts`, `activity`, `details` exactly once, in the desired classic-home order. |
| `hiddenSections` | Any of `shortcuts`, `activity`, `details`; never `launch`. |

Optional `chrome`: `windowCorners` (`system`/`square`), `titlebarColor` (`theme`/`accent`), `background` (`forest`/`none`). Imported PNG launch scenery takes precedence when present. System rounded windows depend on Windows support. Layout settings are consolidated under Appearance & themes → Layout.

## Images and limits

The app can normalize selected images to PNG and package them on export. For manual authoring, hash the exact PNG bytes with SHA-256, use the lowercase digest as the filename, and reference that filename from `appearance`. Do not reference remote URLs or local absolute paths.

Maximum archive size: 32 MiB compressed; 64 entries; 64 MiB total unpacked; 20 MiB per entry; 128,000 bytes for `theme.json`. Referenced PNGs need nonzero dimensions and at most 16 million pixels. No JavaScript, CSS, HTML, SVG, fonts or executables are permitted. Use images you have permission to redistribute; review personal details before export. Accounts, tokens, instances and machine-specific game paths are not exported.

## Troubleshooting and validation

| Symptom | Action |
| --- | --- |
| Unsupported/unsafe entry | Remove enclosing folders, OS metadata, README files and unsupported file types from the theme ZIP. |
| Missing/changed image | Recompute SHA-256 and match the PNG filename and JSON reference. |
| Invalid layout | Keep launch once, avoid duplicate modules/IDs, and stay within depth/node limits. |
| Colors unchanged | Select `custom` mode for non-accent color overrides; load and try the draft. |
| Narrow sidebar stays wide | Hide navigation text first, then adjust sidebar width. |
| Unreadable appearance | Wait for the trial timeout or press Ctrl+Shift+F12. |

[JSON Schema](theme.schema.json) provides editor assistance. The runtime validators in `prototype/desktop/theme-schema.mjs`, `layout-schema.mjs` and `themes.mjs` also enforce bounds, archive paths, hashes and cross-field rules. Passing validation is not certification of an author's trustworthiness. Keep unknown required capabilities explicit as the format evolves.

## 1.1.1 — composition-v1

Existing 1.1.0 themes import directly; missing `composition` keeps legacy defaults. Archive `schema` remains 1. Themes using composition or node styles must require `composition-v1` and declare `compatibleVersions: ["1.1.1"]`. Older clients reject unknown required capabilities. Do not remove this declaration to bypass compatibility checks.

`appearance.composition` is optional (default `null`). `launchLayout`: `classic` or `stacked`; `shortcuts`: `classic` or `compact`; `sidebarExtras` and `eyebrow`: booleans. Numeric ranges:

| Field | Range |
|---|---|
| `workspacePadding` | 0–64 px |
| `gap` | 0–64 px |
| `headerHeight` | 64–96 px |
| `navigationSize` | 20–32 px |
| `launchWidth` | 280–760 px |
| `titleSize` | 28–72 px |
| `launchTopSpace` | 0–320 px |
| `buttonHeight` | 44–88 px |
| `dockOpacity` | 0–100 % |

Each layout node may have `style`: `padding` and `paddingTop/Right/Bottom/Left` (0–80px), `gap` (0–64px), `surfaceOpacity` (0–100%), `position` (0–100%), `background` (`none/global/hero/artwork`), `fit` (`cover/contain`), `separator` (`none/left/top`) and boolean `viewport`. Edge-specific padding overrides uniform padding. Backgrounds reference the existing validated image slots, never paths or URLs. `viewport` sets a minimum home height and keeps the image layer at viewport height while expanded content remains scrollable.

All options are declarative. They cannot inject CSS or code, hide launch errors or change account policy. Narrow windows stack columns. Section styles can be reset independently; classic recovery, the 30-second confirmation and interrupted-trial recovery remain available.

[AMBER Alloy — composition example](AMBER-Alloy-1.1.1.ambtheme). Open its ZIP to inspect the manifest and hashed PNG; it requires 1.1.1 and is separate from the legacy-compatible starter.

## 1.2.0 home modules

Schema remains `1`; no scripts or arbitrary CSS are introduced. Add `home-modules-v1` to `requiredCapabilities` when using `calendar`, `news`, `storage` or `tools`. Mark compatibility as `1.2.0`; older clients will reject this capability safely. Existing themes remain readable; home now prefers viewport fitting with scrolling inside sections.

`appearance.composition.sidebarAbout` is an optional boolean, independent of `sidebarExtras` (instance shortcuts). When absent, legacy themes retain the previous coupled visibility. New Alloy sets About to true and instance shortcuts to false.

News content is provided by the application, never by theme URLs. Themes do not include play history, screenshots, news caches, favorites or account information. The new [Alloy package](AMBER-Alloy-1.2.0.ambtheme) preserves the original image bytes.

### Home height and scrolling

Optional `appearance.homeOverflow` is `sections` (default) or `page`. Sections mode fits the home to one workspace at viewports of at least 1000 × 640 CSS pixels and scrolls module contents independently. Smaller or zoomed viewports fall back to page scrolling. Page mode always preserves document flow. Older themes that omit this field use the single-screen preference.

Optional node `style.scroll` is `auto` (default, independent module scrolling) or `section` (scroll this section together). A vertical split with two children uses `ratio` to allocate height. These optional fields retain schema 1. Home scrolling is available in the layout editor; section scrolling is available in advanced editing.


## 1.2.1: independent panels and a minimal calendar

The archive remains `schema: 1`; themes from 1.1.0 through 1.2.0 remain importable. Optional section `style` fields:

| Field | Values | Effect |
| --- | --- | --- |
| `radius` | 0–24 | Independent panel corner radius in px |
| `borderWidth` | 0–3 | All-edge border width, using the theme `line` color |
| `shadow` | `none`, `soft`, `raised` | Bounded shadow presets; no arbitrary CSS |

Omitted fields preserve existing rendering. Themes using these fields must declare `section-panels-v1` in `requiredCapabilities` and `1.2.1` in `compatibleVersions`, so older apps do not silently lose the panel styling. Exports add this declaration automatically. Edit them under advanced layout / section background and spacing. Panels are embedded home sections, not operating-system floating windows. Existing layout controls arrange and size them; overflowing content scrolls within sections.

The shared play calendar displays its heading, month and date grid. Click a date for records; the more button opens filters, totals and recording settings. Existing themes, including Alloy, use this component without new calendar fields. Themes cannot change play history.

Export requires a name; other metadata is optional. Saving to the library does not change the active theme. Duplicate names require renaming and never overwrite the original. Appearance drafts store only visual settings and require explicit application after restoration.
