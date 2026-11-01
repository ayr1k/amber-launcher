# Themes and appearance

[简体中文](zh-CN/THEMES.md)

AMBER and AmberE 1.2.0 share the local `.ambtheme` format and continue to read 1.1.0–1.1.2 themes. Settings → Appearance & themes starts with Basics. Enable More settings or Advanced editing when needed; collapsing controls never deletes their values.

In Theme library, click Apply directly. First-time themes and major usability-affecting edits require confirmation within 30 seconds or automatically revert. An unchanged, previously confirmed appearance applies without another confirmation. Preview & edit only loads a draft; Apply changes affects the actual interface. Discard drafts or restore the previous/classic appearance.

After import, apply immediately or add to the library only. Partial import and export metadata are expandable. Ctrl+Shift+F12 independently restores classic without touching accounts or instances. Window corners require restarting; whole-window opacity also fades text.

Edit home offers module visibility, order and presets; Advanced editing retains fine column controls. New modules are `calendar`, `news`, `storage` and `tools`. Upgrading never automatically replaces a home layout. Calendar records, news refresh and tool favorites are local preferences and are not exported with a theme.

## Creating a package

The simplest route is editing and exporting in the app. Authors can also create a ZIP with the `.ambtheme` extension. The ZIP root contains `theme.json`; images are local `assets/<sha256>.png`. Do not add an enclosing folder. Optional `preview.png` and `LICENSE.txt` are accepted; the current library renders its own preview. No scripts, CSS, HTML, SVG, fonts, remote assets or executable files are accepted. Source/license metadata is informational and never automatically opened. Import requires no official account, approval or marketplace. Format validation is not a trust certification.

See [the schema](theme.schema.json) and [an editable example](theme-example.json). The runtime validator in `prototype/desktop/theme-schema.mjs` is authoritative for bounded layout depth, duplicate modules and images. A minimal document is:

```json
{"format":"ambtheme","schema":1,"compatibleVersions":["1.1.0"],"requiredCapabilities":["appearance-v1"],"appearance":{"name":"My theme","mode":"light","accent":"#6756a1","radius":12}}
```

`appearance` supports name, author, source, license; mode (system/light/dark/custom); six HEX colors (accent/background/surface/text/muted/line); radius, borderWidth, controlHeight, rowHeight, iconSize, fontFamily, fontSize, scale, menuStyle (filled/outline/minimal), listStyle (lines/striped/spacious), navLabels; panelOpacity, windowOpacity; backgroundAsset, heroAsset, artworkAsset, backgroundFit (cover/contain), backgroundPosition, overlay, blur; motion (none/light/standard); and canvas. Missing fields receive defaults. Custom colors beyond accent apply in custom mode. Fonts use installed families with fallback and are not embedded.

`canvas` is null for the classic home or a tree of `module`, `split` and `tabs` nodes. Every node has a unique alphanumeric/hyphen id. Modules: launch, shortcuts, activity, details, instances, favorites, recent, artwork. Each appears at most once and launch must remain. Split direction is vertical or horizontal; horizontal columns require exactly two children and ratio is 25–75. Maximum 32 nodes, depth 5 and 8 children per container. The editor supports nesting, module swaps, move buttons, and keyboard/pointer column resizing. Width-limited windows stack columns. The theme changes placement and appearance, never what authentication or installation actions do.

Top-level `layout` retains navigation position (left/right/top), sidebar width (72–360; widths below 220 apply only with navigation labels hidden), contentWidth (wide/comfortable), instanceView (list/grid) and classic home ordering. Optional `chrome` contains windowCorners (system/square), titlebarColor (theme/accent), and background (forest/none). Export converts an existing custom launch image into an embedded theme asset.

## Limits and compatibility

Packages: at most 32 MiB compressed, 64 entries, 64 MiB unpacked and 20 MiB per entry. `theme.json` is at most 128,000 bytes. Referenced PNGs must match their filename's SHA-256, with nonzero dimensions and at most 16 million pixels. The local image picker normalizes images to PNG. Retain licenses for assets you redistribute; do not package personal screenshots or private data unintentionally.

Supported schema: 1. Required capabilities: appearance-v1, layout-v1 and composition-v1. Unknown required capabilities or schema versions are rejected; unknown optional appearance fields are ignored with a warning. Unlisted compatibleVersions warn rather than prevent local import. All imported entries receive independent IDs, even when names match. Removing an entry retains images referenced by other themes. Export includes visual settings and referenced images only, not accounts, tokens, instances or machine-specific game paths.

This is a declarative appearance system, not a general plugin runtime. Arbitrary commands, scripts, replacement authentication and unrestricted page markup are outside this format. Future capabilities must be versioned and explicitly declared, keeping today's themes usable and recoverable.

Layout controls are consolidated in Appearance & themes → Layout. Classic home order and visibility remain editable there. Narrow icon sidebars retain named tooltips and accessible labels.

## Downloads and reference

[Field and packaging reference](AMBTHEME-FORMAT.md) · [Importable starter](AMBER-Theme-Starter.ambtheme) · [Example JSON](theme-example.json)

The starter is a separate educational download, not bundled in the app. Releases also include `AMBTHEME-Guide-1.2.0.zip` with bilingual help, the field reference, JSON Schema and an example package.

## Fine-grained composition in 1.1.1

Appearance & themes → Layout lets you arrange a vertical launch area, tune heading and control sizes, set header/navigation sizes, and adjust each section’s padding, gaps, background and divider. Viewport backgrounds keep their size when launch options expand. Narrow windows stack columns. Global search retains access to About when sidebar extras are hidden.

Existing 1.1.0 packages import without conversion. New composition or node styles require `composition-v1`; old clients reject that capability instead of silently misrendering. The basic starter remains a 1.1.0-compatible example.

[Download AMBER Alloy](AMBER-Alloy-1.2.0.ambtheme) for either edition 1.2.0 or later. Import the whole theme and choose Apply; confirm that it displays correctly when requested. It uses real instances and recent launches; an empty library stays empty. Themes are separate downloads, never automatically installed.

## Vertical text offset (1.1.2)

In Appearance & themes → Controls & type, adjust vertical text offset from −3 to +3 px in 0.5 px steps. Negative moves up, positive moves down; the default is 0. It adjusts button, menu and single-line field text without moving icons, borders or hit areas, or reflowing body paragraphs. Preview, reset, undo/redo and trial confirmation remain available. Theme exports retain the offset; older themes without this field use 0.

Alloy 1.1.2 uses a 1.5 px downward correction and retains its original artwork. Existing Alloy users can also set 1.5 px manually and apply the appearance changes. Revisit this setting after changing fonts.


The updated Alloy home uses fixed left/right sections: launch and utility tabs on the left, calendar and news on the right. Long content scrolls within its section. Edit home is in the title bar; calendar explanations are collapsed by default. Smaller windows fall back to page scrolling.
