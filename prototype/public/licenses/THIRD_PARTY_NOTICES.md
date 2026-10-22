# Third-party notices

AMBER project-owned source is licensed under MPL-2.0. This grant does not relicense bundled dependencies, fonts, project logos or user-supplied third-party marks.

- Sarasa Gothic 1.0.42: SIL Open Font License 1.1. Full notice is bundled in `public/fonts/LICENSE-Sarasa.txt` and in built `fonts/`. WOFF2 conversion retains full glyphs and font naming.
- React / React DOM: MIT, Meta Platforms, Inc. and affiliates. Dependency notices remain in installed packages and generated bundles.
- Phosphor Icons: MIT, Phosphor Icons. Source: https://github.com/phosphor-icons/react .
- Electron: MIT, Electron contributors. The desktop distribution retains `LICENSE-Electron.txt` and Chromium's `LICENSES.chromium.html` from the official runtime.
- Vite, its React plugin and other build tools retain their package licenses; their presence does not change AMBER's source license.
- Previously downloaded Sodium, Lithium, Iris, Fabric API and Mod Menu preview icons are excluded from alpha.9 desktop packages and the prepared GitHub source. The prototype uses generic licensed icons. Live Modrinth icons are displayed from the provider CDN while browsing, not redistributed as AMBER-owned art.
- POP Initiative image: supplied by the project initiator for display in About Project. Original file retained without changing the artwork; CSS selects the monochrome half. No trademark assignment or certification is asserted, and this asset is excluded from the source-code MPL grant. Obtain/document the initiative's redistribution terms before public distribution.
- AMBER brand paths: traced from the user-approved generated brand study. Forest banner and instance grass icon are generated concept assets, not actual Minecraft screenshots.

This alpha is a local development build, not a public distribution. Public release preparation must include a complete runtime dependency notice inventory, source availability and review of third-party asset redistribution rights.

Alpha.2 additions:
- fflate 0.8.3 (upgraded from 0.8.2 for the ZIP64 parsing fix), MIT, Arjun Barrett: vendored unmodified Node distribution in `desktop/vendor/fflate.cjs`; full license in `desktop/vendor/LICENSE-fflate`. Source: https://github.com/101arrowz/fflate .
- Eclipse Temurin is downloaded on demand from the official Adoptium API. The archive is retained and extracted with its original license and notice files. Java binaries are not included in the AMBER development package.
- Minecraft files are downloaded on demand from Mojang services; they are not distributed as AMBER-owned source or bundled into the desktop package.

## Runtime downloads added in alpha.3

Fabric Loader / Intermediary and associated Maven libraries are fetched from Fabric official infrastructure at user request. They are not relicensed under MPL-2.0; licenses inside their original JARs remain intact. Source: https://github.com/FabricMC/fabric-loader .

authlib-injector is fetched on demand from its official artifact service, SHA-256 checked and preserved as the original JAR. It is not bundled into the application or modified. Its AGPL-3.0 and project-specific exception remain applicable. Source and license: https://github.com/yushijinhun/authlib-injector .

Authentication protocols were checked against Microsoft device-code documentation, the authlib-injector launcher specification and PrismLauncher authentication flow source. AMBER's implementation is independently written; no client ID or code was copied from another launcher.


## Alpha.6 integration notes

`desktop/java/AmberLegacyForge.java` is AMBER's independently written reflection bridge to the official legacy installer API. It contains no Forge implementation code. The Java 8 class is compiled with Eclipse JDT ECJ as a development tool; the compiler is not shipped. The legacy LiteLoader release is extracted on demand from its original official installer, checked against the official manifest, and retained unchanged in the user's runtime cache. Neither LiteLoader nor OptiFine binaries are bundled into AMBER.

HMCL, PCL and BakaXL screenshots supplied by the user informed interaction hierarchy only. Their screenshots and source code are not included in this implementation.

## Alpha.7 instance icons

`public/icons/box.svg`, `anvil.svg`, `pickaxe.svg` come from the unmodified `lucide-static@0.468.0` package. Lucide's ISC / applicable Feather MIT notices are retained in `public/icons/LICENSE-lucide.txt`, also shipped in built `icons/`. Source: https://github.com/lucide-icons/lucide ; license documentation: https://lucide.dev/license . Icons are rendered with CSS masks for theme colors; no Minecraft textures were copied for these symbols. The existing generated grass-block concept asset remains unchanged.

## Alpha.9 runtime notices

Complete React, React DOM, scheduler and Phosphor runtime license texts are bundled in `public/licenses/RUNTIME-LICENSES.txt` and built `licenses/`. The generation script reads actual installed package versions. Electron/Chromium and fflate notices remain included separately. Source availability and remaining public-release acceptance items are documented in BETA-RELEASE-CHECKLIST.md.

Alpha.9 removes Potrace and its Jimp/phin development chain from package dependencies. Old tracing scripts remain only in the local design workspace and are excluded from the prepared GitHub source. Vite is updated to 6.4.4; the vendored fflate Node distribution is byte-identical to installed 0.8.3.
