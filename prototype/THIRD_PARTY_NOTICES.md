# Third-party notices

[简体中文](../docs/zh-CN/THIRD-PARTY-NOTICES.md)

MPL-2.0 applies to project-owned source only. Dependencies, fonts and third-party marks retain their own terms.

- Sarasa Gothic 1.0.42: SIL OFL 1.1; full text in `public/fonts/LICENSE-Sarasa.txt`. WOFF2 conversion preserves naming and glyphs.
- React, React DOM, scheduler and Phosphor: their full runtime notices are in `public/licenses/RUNTIME-LICENSES.txt`.
- Electron: MIT; the desktop package preserves `LICENSE-Electron.txt` and Chromium's `LICENSES.chromium.html`.
- fflate 0.8.3: MIT, Arjun Barrett; unmodified vendored Node distribution, license in `desktop/vendor/LICENSE-fflate`.
- Lucide icons from `lucide-static@0.468.0`: applicable ISC/Feather MIT notices in `public/icons/LICENSE-lucide.txt`. CSS masks apply theme colors.
- Vite and other development tools retain their package licenses.
- POP Initiative artwork was supplied by the project initiator. It expresses support, not certification or trademark ownership. It is outside the source-code MPL grant; no independent redistribution permission is granted by AMBER.
- AMBER brand and concept artwork are project assets. The forest and grass-block illustrations are not actual game screenshots. Reference-launcher screenshots and their source code are not distributed.
- Modrinth project icons are displayed from its CDN while browsing, not relicensed as AMBER artwork. Five historical preview icons are excluded from packages and source exports.

Minecraft files, Temurin Java, Fabric, Forge, NeoForge, LiteLoader and OptiFine are not bundled as AMBER-owned code. Runtime files are obtained on demand from their sources and retain original notices. OptiFine is supplied by the user from its official website. The independently written legacy Java bridge contains no Forge implementation code; the development compiler is not shipped.

authlib-injector is downloaded and SHA-256 verified on demand. Its AGPL-3.0 and project exception remain applicable; see [upstream source and license](https://github.com/yushijinhun/authlib-injector). The authentication implementation uses AMBER's public Client ID, not another launcher's identity.

Original license texts remain authoritative; translated explanations do not replace them.

## 1.5.0 account preview and enchant calculator

- skinview3d 3.4.2, MIT, bs-community contributors, and its Three.js/skinview-utils dependencies are bundled locally. Complete transitive runtime notices are preserved in `public/licenses/RUNTIME-LICENSES.txt`. Source: https://github.com/bs-community/skinview3d . No remote executable page is loaded.
- iamcal/enchant-order, MIT, copyright 2021 Cal Henderson, pinned commit `9345bd097a300266e347d874feb46ef7e1bd4158`: https://github.com/iamcal/enchant-order . License: `public/licenses/enchant-order-MIT.txt`; source and adaptation notes: `src/vendor/enchant-order/SOURCE.json`. Only the calculation worker and rule/name data are integrated; no upstream website, analytics or external resource loading.
- Optional MySQL Community 8.4.13 is downloaded separately from Oracle, not bundled. Its GPLv2/additional permissions and complete third-party notices remain in the component LICENSE. Source, checksum, architecture and redistribution boundaries: [1.5.0 task notes](LOCAL-TEST-1.5.0.md).

## Optional EasyTier networking component

EasyTier 2.6.4 (Apache-2.0) is downloaded on demand from its official release, not bundled in the installers. Source and license: https://github.com/EasyTier/EasyTier/tree/v2.6.4 . Archive SHA-256: 27af91e270e554709b048bd32327fefd2dfce5062ae1e8701af7550c6f525f84. Extracted core SHA-256: da7eb2d24b5416f3d3407636949e964a0750e3f9dc53a828cb6799a57ead445d.

## 1.3.4 offline tools

- Cubiomes, MIT (Cubitect and contributors), pinned xpple branch commit `6e3e00d26d73efec10e9c0ebaacb003aa3188179`: https://github.com/xpple/cubiomes . Bundled source in `desktop/vendor/cubiomes`, license in `public/licenses/cubiomes-MIT.txt`. Includes cJSON (MIT, Dave Gamble and contributors); complete notice remains at the beginning of its source and in `public/licenses/cJSON-MIT.txt`. The AMBER helper executable is built from this source; no Cubiomes Viewer code is included.
- Minecraft Gradient Text Generator, copyright 2024 tuanzi, MIT: https://github.com/tuanzisama/minecraft-gradient-text-generator . The character builder and legacy color adapters are adapted into the existing editor, with fixes for literal replacement text. Full license: `public/licenses/gradient-generator-MIT.txt`. No upstream analytics, fonts or website shell are included.
- The map does not embed or redistribute Chunkbase. Terrain shading is approximate. The gradient preview uses existing AMBER concept artwork, not an in-game screenshot.
