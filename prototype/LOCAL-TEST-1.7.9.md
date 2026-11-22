# AMBER / AmberE 1.7.9 Windows test installers

Baseline `22276ca3bf0b3921a9594c3fa754b708f1fc5e33`. The installer artifact records the tested commit, product, local channel, SHA-256 and packaged startup result. Both editions use the shared package version.

## Windows directory tests

Both actions are available on the Instances page. Add / create library registers a directory in place. In the default library, Import existing .minecraft copies the selected content into a new managed instance and prepares an official game and loader environment. Imported launch commands are never executed. The copy workflow does not install OptiFine.

| Source root | Actual selected game directory | Application data | Result on the Windows workstation |
| --- | --- | --- | --- |
| C: temporary source | versions/isolated ID inside source | C: separate temporary data | Both actions passed |
| C: temporary source | versions/isolated ID inside source | E: separate temporary data | Both actions passed |
| E: temporary source | versions/isolated ID inside source | C: separate temporary data | Both actions passed |

Tests used separate fixed NTFS volumes and synthetic options data. Every row exercised Electron renderer controls, preload, IPC, library registration, instance creation, copying and destination-byte verification. Only the native folder picker and network metadata/content were substituted. The repository test also compares source bytes and modification times. The executable's location plays no role in these checks.

On the 1.7.8 baseline, ordinary sibling and cross-volume paths already passed both backend services. Its renderer had no reachable copy dialog. Its scanner excluded local IDs containing spaces and its registry returned an error row for them. The specific reported database-overlap failure remains unreproduced. Reproduction still needs the source root, resolved game directory, configured application data path, any aliases, and the failing action from the affected installation. Genuine overlap now reports the paths, and preview checks them before reading the selected files. Equality, both nesting directions, junctions, parent traversal and unselected IPC paths are covered separately. No D: volume was available on the local workstation. The workflow records the drive pair it actually exercised.

## Game profiles and Java

- A real self-contained Minecraft 1.21.4 / Fabric 0.16.14 JSON with a space in its ID came from a public PCL crash report. The included launcher log identifies PCL. Both clientVersion and intermediary identified 1.21.4. Registration and official catalogue validation succeeded. The copy service installed the official Fabric environment with an empty content selection. The original generation session was not observed. [Source report](https://github.com/Jaffe2718/Microphone-Text-Input/issues/15)
- A separate public PCL report supplied a Minecraft 1.21.4 / Forge 54.1.8 profile with game patch metadata and the ForgeBootstrap entry point. Both services resolved it and the official loader pair passed preview. No direct launch or OptiFine reconstruction was tested. [Source report](https://github.com/Meloong-Git/PCL/issues/7306)
- The official Forge 40.2.9 installer supplied the 1.18.2 child profile. It identifies its build through fmlloader. In one Windows copy run, an isolated APPDATA contained Mojang's Windows launcher runtime 17.0.15, downloaded file by file against the official hashes. The import selected its executable before copying, made zero Java download requests, and completed the Forge installer and game installation. With that runtime absent, a second run downloaded and validated the compatible runtime through automatic preparation and completed the same import. [Mojang runtime manifest](https://launchermeta.mojang.com/v1/products/java-runtime/2ec0cc96c44e5a76b9c8b7c39df7210883d12871/all.json)
- Constructed cases cover FPScraft X, Chinese IDs, display names independent of local IDs, vanilla and parent chains, empty/null inheritance, Windows filename restrictions, conflicting/missing base evidence, offline retry, and explicit stale choices. A submitted non-catalog choice reproduces the catalogue rejection branch. The baseline UI initially sent an empty choice. The original reporter's selected value and catalogue response remain unknown.
- Failure and cancellation during Java preparation were injected twice. No user file was copied, the source remained byte-identical and an earlier destination retained its data. Incorrect Java major versions were skipped. The launcher may retain a metadata-only instance after failed preparation.

## Java provenance follow-up on Windows x64

The preflight retains discovery under the official launcher's runtime directory. Supported Windows runtime fingerprints come from the Mojang file manifests. AMBER checks the complete file set, copies a matching installation into launcher storage and checks the copied bytes before the first probe. On subsequent scans it verifies that copy. An unknown or updated build falls back to automatic preparation, or the user can explicitly pick a Java executable in the Java picker. The fallback authenticates the Adoptium archive by SHA-256 and extracts those bytes into a fresh directory. It compares an existing installation with that extraction before reuse.

On this revision the official Forge 40.2.9 / Minecraft 1.18.2 profile completed a new copy import using the isolated Mojang Java 17.0.15 x64 runtime. At the first content copy the selected path was inside the verified launcher copy. Java download requests were zero. The Java, copy, loader, cache and install jobs all finished. The test used synthetic options data and stopped before gameplay.

Substituted probes recorded zero calls for a modified JVM library, a missing installation and a modified managed runtime. Independent fixture fingerprints admitted a matching runtime. The returned executable stayed bound to the verified path. Wrong Java majors and architectures entered automatic preparation. Concurrent scans admitted at most two probes. Cancellation reached running probes and the fallback request. Repeated preparation failures and cancellations copied zero selected files and preserved both the source and a previous destination.

The local Windows full suite passed 1002 tests with both physical volumes enabled. The focused import, library, Java and loader run passed 128 tests. The build and source/locale checks passed. The earlier profile and renderer observations above were collected on the previous PR revision. Native Windows arm64 and non-Windows runtime reuse were not exercised in this follow-up.

## Repeating the checks

Run `pnpm test` from prototype. For the volume matrix, set `AMBER_TEST_SECOND_VOLUME` to an existing writable directory on a different Windows volume. For the renderer checks, build the application, set `AMBER_PLAYWRIGHT` to the local Playwright installation and run `node scripts/qa-minecraft-import179.cjs`. The script uses only newly allocated fixture directories.

The Windows local-channel packages are for acceptance. Gameplay, upgrades over an existing installation, the reporter's original directory layout and native non-Windows testing remain outside the measured results.
