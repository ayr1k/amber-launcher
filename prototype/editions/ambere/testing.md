# 1.5.1 release verification

Approved baseline: merged AMBER PR #6 (`9c09b61b18566392f23a3515e6c40c4b52cb686f`), reviewed task head `31831aad326f3788db9ada17f97ce71d192e5ef7`. The import implementation is unchanged. Content, functional and UI acceptance uses the existing separate task/Dot review and packaged synthetic-fixture evidence from PR #6 and LOCAL-TEST-1.5.1.md; release work does not add another content review.

This release run passed **605/605 regressions with no skips**, four static-serving tests, 2,857 bilingual-message checks, production builds and source/license checks. Formal package verification covers clean-source provenance, version 1.5.1, public update channel, independent product identity, Windows packaged startup/IPC, all-platform archive contents and runtime notices, source manifests, SHA-256 and public download links. Test activity uses isolated synthetic temporary data. The build provenance identifies the actual clean source commit; the final release commit additionally records the generated source manifest without changing application code.

Existing task desktop checks exercised both products, four themes, both languages, small windows/large text, directory ambiguity, missing-path correction, explicit version selection, empty-content consent and actual copying using synthetic source/network fixtures. Those remain attributed to their original tested revision, not new acceptance by this release chat. The user's real version JSON/directory structure, very large real libraries, arbitrary original client/JVM changes, native non-Windows behavior and live gameplay remain unverified. Keep the original game closed during import and preserve original files. Native non-Windows desktop and installer-upgrade acceptance remain pending; FreeBSD is experimental server/tools-only. Packages are unsigned and macOS is not notarized. Private test assets and injected credentials are excluded from public source.

# 1.5.0 release verification

The approved source is merged AMBER PR #5 (`9e5ee8facf4e1db933bb7713b9b545c958434bb7`), reviewed task head `8c81d4da8f58cebd5f27f23307dbf3f86fe08c6d`. Content, functional, database and UI review relies on the separate task/Dot acceptance and explicitly reused records in PR #5 and LOCAL-TEST-1.5.0.md; it is not repeated as another release gate. Release preparation changes documentation and source-export coverage only.

This release run passed **570/570 regressions without skips**, four static-serving tests, 2,812 bilingual-message checks, production builds and source/license checks. Formal package validation checks clean build provenance, version 1.5.0, public channel, separate product identities and packaged Windows startup/IPC. Platform archives, runtime notices, source manifests, SHA-256 and public download links are verified before completing publication. Official package build-provenance.json identifies its clean source commit; the release commit may additionally update the generated source manifest without changing application code.

Existing task evidence covers real isolated Oracle processes and database recovery, multi-theme desktop checks, account/skin/tools paths and synthetic provider operations. It remains attributed to its original revisions; this release does not claim to have repeated those content checks. No real Microsoft/third-party skin upload, production Sakura create/delete, provider-node or public TCP/UDP acceptance is claimed. Native non-Windows desktop execution, all GPUs/custom themes and the installer upgrade wizard remain outside verified scope. MySQL preparation supports Windows x64 and downloads Oracle's program on demand; it is not bundled. FreeBSD is experimental server/tools-only. Packages are unsigned and macOS is not notarized. Public source excludes injected credentials and private test assets.

# 1.4.8 release verification

Release baseline: merged AMBER PR #4 (`5426477ddd428175851946fae60506c0be50d4c7`), reviewed task head `2bec3e53c866920cfa53e1d7ab1717fe04dba6b9`. The release uses the accepted startup/download implementation unchanged. Content, UI, timing and benchmark acceptance is provided by the task reviewers and Dot, as recorded in LOCAL-TEST-1.4.8.md and docs/evidence; it is not repeated as an additional release gate.

The release regression run passed **516/516 without skips**. Production builds, four static-serving checks, 2,483 bilingual-message checks and source/license checks passed. Release validation checks source provenance, public-channel/package identity, packaged startup, platform archive contents, source manifests, checksums and published download links. Test operations use temporary synthetic data; no personal accounts, game libraries or worlds are used.

The existing task record includes multi-theme/language/size checks, startup timing/failure paths and controlled loopback download benchmarks. Its timings begin at application entry, not an OS cold start. Controlled single-connection bottlenecks can benefit from ranges; server total bandwidth, application caps and sources without range support may not. These are task-review results, not new real-CDN or real-game acceptance by the release process.

Official AMBER/AmberE packages use version 1.4.8 and public update channels with independent identities/data. Windows x64, macOS x64/arm64, Linux x64 and experimental FreeBSD artifacts are provided. Native non-Windows desktop execution, real-CDN speed, actual accounts/gameplay, cold starts and the upgrade installer wizard remain outside the verified scope. FreeBSD is server/tools-only. Packages are unsigned and macOS is not notarized. Public source excludes injected build credentials and private test assets.

# 1.4.7 release verification

Release baseline: merged AMBER PR #3 (`6842409348b0e1b1fec395b80ea6521cd2631c52`), reviewed task head `84a0e98db6e66d6c7294c094cfd8c3811629ed08`. Both editions use the accepted tray/scheduling implementation and review corrections. Changes after merge are release versioning, documentation and packaging/source-export metadata.

The full release regression run passed **494/494 with no skips**, including 30 scheduling/tray-specific tests. Production builds, four static-serving checks, 2,472 bilingual messages and source/license checks passed. Both public-channel edition stages passed isolated Windows desktop acceptance: schedule create/pause/persist, a real one-shot timer skipping an offline target, native window hiding, second-instance restore and idle close. Test profiles were temporary synthetic data. The earlier task's layout and boundary acceptance remains in LOCAL-TEST-1.4.7.md; its inherited 1.4.6/local installer descriptions are historical, not the official 1.4.7/public release.

Shutdown/backup locking, cancellation through async startup, per-server concurrency, busy/lateness admission, migration holds, sleep recovery and daily time-zone/DST boundaries are covered by controlled regression fixtures. These checks are not real Minecraft world/plugin shutdown or operating-system sleep testing. Actual server shutdown/restart, long-running schedules and native macOS/Linux tray behavior still require acceptance in the target environment. Commands are sent to the managed server console; success does not certify plugin completion.

Formal distributions use public update channels with independent application identities and data. Windows x64, macOS x64/arm64, Linux x64 and experimental FreeBSD packages share version 1.4.7. Native non-Windows execution remains unverified for this release; FreeBSD is server/tools-only. Packages are unsigned and macOS is not notarized. Source archives exclude build-injected credentials and private test assets.

# 1.4.6 release verification

Release baseline: merged AMBER PR #2 (`45761325c41021ce8be28a165195e75aef54b57a`), reviewed task head `742f58b497e939528eb4e31a1323e6d73ef518a1`. The release synchronizes this shared implementation into AMBER and AmberE; changes after the merge are release versioning, documentation, source-export inclusion of the acceptance runner and packaging metadata.

The release regression run passed all 464 tests, with four static-serving tests, production builds, 2,427 bilingual message checks and source/license checks. Both public-channel edition stages passed isolated Windows desktop onboarding checks: account setup leaves onboarding pending, refreshing preserves continuation, returning selects step 3, and choosing existing-game import clears the pending state. The PR's earlier broader acceptance is recorded separately in docs/ONBOARDING-FEEDBACK-ACCEPTANCE.md. See LOCAL-TEST-1.4.6.md for the checklist. Tests use temporary synthetic profiles, not personal accounts or worlds.

Formal packages use the public update channel. Windows x64, macOS x64/arm64, Linux x64 and experimental FreeBSD packages are built from the shared release source. Packaging is not native device acceptance: macOS/Linux/FreeBSD execution remains unverified for this release; FreeBSD is server/tools-only. Packages are unsigned and macOS is not notarized. No new certification of real PCL/HMCL layouts, actual accounts, gameplay or player-submitted feedback is claimed. Feedback redaction remains best effort and manual review is required before sharing.

# 1.4.5 release verification

Close-button follow-up: Windows native hit testing across 15 points of the screenshot viewer close button passed at 1300×900, 1280×720 and 1100×800 (125% zoom). All points are client controls; closing restores title-bar dragging. This fixes the middle strip being intercepted as a native caption drag region.

All 461 regression tests and four static-serving checks passed. Isolated native UI checks covered 1280×720, 1300×900, 1100×800 and 1920×1080 landscape layouts, portrait ordering, Nocturne/Alloy, English/Chinese, larger typography and zoom, populated metrics, modal details, fit/original-size image viewing and actual system-trash deletion of synthetic images. Landscape checks assert no page overflow or clipped metric contents.

Public-channel builds use the user-accepted implementation. Matching Windows x64, macOS x64/arm64, Linux x64 and experimental FreeBSD packages are provided. FreeBSD is server/tools-only. Packages remain unsigned and macOS is not notarized. Screenshot trash uses registered, revalidated image paths and never falls back to permanent removal. Landscape launch is bounded to the workspace; portrait layouts stack console before performance. User accounts, worlds and theme packages are not test fixtures. See LOCAL-TEST-1.4.5.md for acceptance steps. Native non-Windows trash and execution checks remain separate.

# 1.4.4 release verification

Public-channel builds use the user-accepted 1.4.4 implementation; accepted Windows local installers are preserved separately. All 456 regression tests and four static-serving checks passed. Coverage includes server update dependency pins/locks, Quilt/Fabric compatibility, verified rollback and interrupted journals, shared bandwidth and priority admission. Both Windows editions passed isolated bilingual/theme UI and packaged startup checks.

A separate Paper 1.21.1 test copy supplied real CPU, memory, TPS and MSPT samples, generated a 30-second report and stopped normally. The updated optional bridge retained player roster support. Reports are bounded local summaries, not stack profilers; unsupported core metrics remain unavailable. No user accounts or worlds were used as test fixtures.

Matching Windows x64, macOS x64/arm64, Linux x64 and experimental FreeBSD packages are provided. Native non-Windows execution remains unverified; FreeBSD is server/tools-only. Packages remain unsigned and macOS is not notarized.

# 1.4.3 release verification

Public-channel builds from the accepted 1.4.3 implementation; accepted local installers are retained separately. All 448 regression tests passed, including simultaneous rate-limited retries, shared download limits, cancellation/resume, hashes, guarded server recycling and port conflicts. Both Windows editions passed packaged startup and bilingual UI checks for themed controls and recycle/restore/permanent-delete workflows using isolated synthetic data.

Matching Windows x64, macOS x64/arm64, Linux x64 and experimental FreeBSD packages are provided. Native non-Windows execution is not verified for this release; FreeBSD remains server/tools-only. Packages remain unsigned and macOS is not notarized. Concurrency counts simultaneous files, not ranges of a single file; higher settings do not guarantee faster downloads. Prior provider/gameplay acceptance limits remain.

# 1.4.2 release verification

The accepted implementation and final connection-page spacing are built for the public release channel. Both editions publish matching Windows x64, macOS Intel/Apple Silicon, Linux x64 and experimental FreeBSD artifacts, complete source and SHA-256. Packages remain unsigned; macOS is not notarized.

Quilt 1.21.1 reached server-ready and stopped normally. Real Mod Menu 20.0.3 metadata for Minecraft 26.2 resolved Fabric API and Text Placeholder API without blockers. Native Quilt preference, Fabric fallback and exact dependency pins are covered by regression tests for client/server catalogs and CurseForge.

Sakura was tested with the user's saved account and tunnel: the public configuration API returned successfully, frpc connected, and the public tunnel returned a real Paper 26.3 Minecraft status response. The temporary test component stopped normally; server/tunnel settings were unchanged. Configuration stays in the child environment, not a plaintext file. Tests cover Chinese and split UTF-8 logs, disconnect/reconnect, startup cancellation, timeouts and cleanup. Windows packaged startup and bilingual/theme UI checks passed. The 445-check regression run had one temporary Windows file-lock failure; its full 11-test file passed on retry.

Native macOS/Linux/FreeBSD execution is not verified on target hardware. FreeBSD remains experimental server/tools-only. This is not exhaustive gameplay, mod compatibility or two-computer EasyTier/NAT acceptance. Real player Ping and full player operations retain the prior acceptance limits.

# 1.4.1 release verification

Publish the user-accepted repaired Windows installers unchanged, with matching macOS x64/arm64, Linux x64 and experimental FreeBSD packages, full source and SHA-256 checksums. Embedded local-test labels/documents are retained; these release notes supersede their no-publication wording. Signing remains deferred.

427 regression tests passed. Both packaged editions passed startup/IPC/map checks. Isolated UI checks verified local/online catalogs, both providers, local version details and installed content; player list/footer checks covered Classic/Nocturne, 1280/1920 and Chinese/English. CurseForge real API/search/download authentication and a real isolated Paper bridge startup were verified. Remote-player Ping and full real-player operations remain for runtime acceptance; no fabricated latency is shown. macOS/Linux target-device acceptance is pending, and FreeBSD remains experimental server/tools-only. No real accounts or worlds were used.

# 1.4.0 release verification

User-accepted Windows x64 installers are published unchanged. Local-build labels and embedded testing-stage documents are retained; these release notes supersede embedded local-only wording. Signing remains deferred. Other platforms remain at 1.3.5.

420 regression tests passed, including server backup deduplication, retention, pinning, independent restores and failure blocking. Both editions passed packaged startup/IPC/map checks. Isolated UI checks covered Classic/Nocturne at 1280/1920 widths, Chinese/English and server backup policy saving; earlier 1.4.0 checks covered five themes. No real accounts or worlds were used. This is not exhaustive gameplay or cross-machine networking validation.

# 1.3.6 release verification

The user accepted both Windows x64 installers and authorized stable GitHub releases and Pages updates. Preserve accepted installer bytes, including local-build labels and embedded testing-stage documents; current release notes supersede embedded local-only wording. No 1.3.6 macOS/Linux/FreeBSD packages were produced; those downloads remain at 1.3.5. Signing remains deferred.

407 regression tests and 2398 bilingual-message checks passed. Both products passed isolated packaged startup/IPC/map checks, five-theme account layout checks at normal/large widths, and UI checks for server catalog pagination and log import. Log fixtures check dependency errors, multiple findings, unknown/normal logs and exclusion of old reports. These are not exhaustive gameplay or crash-cause guarantees. No real accounts or worlds were used.

# 1.3.5 verification

The user accepted the local packages and authorized stable paired releases and Pages publication. Windows/Linux/FreeBSD package bytes are preserved. macOS ZIPs add Electron/Chromium license notices; all existing application files, local-build labels and embedded testing-stage documents remain unchanged. Current release notes and this source documentation supersede embedded local-only wording. Signing remains deferred; no endorsement or exhaustive platform/gameplay acceptance is claimed.

407 regression tests and 2398 bilingual message checks passed. Both Windows products passed packaged startup, credential encryption, IPC and native seed-engine checks; isolated account UI passed in five themes and normal/large windows. Real Authlib 6.0.54 and 10.0.77 parsed local skin profiles/signatures with synthetic identities. No real account or world was used by automation.

Linux runtime and map engines ran in Ubuntu/WSL for both final packages; real Java 21 download, verification, extraction and discovery passed. WSL lacks a usable desktop keyring, so full account/desktop acceptance did not pass. macOS has checksum/architecture/package validation only, without a Mac runtime test. FreeBSD is an untested server/tools experiment; client launch is explicitly unavailable. See [platform setup](PLATFORMS-1.3.5.md).

# 1.3.4 verification

The user accepted both 1.3.4 installers and authorized stable publication. Preserve the accepted installer bytes and informational local-build label; update checks remain enabled. Both editions retain their existing account rules, identities, update repositories and data locations. No real accounts or worlds were used by automation.

394 regression tests passed, including signed 64-bit/text seeds, a 26.3 Dappled Forest fixture, three-dimension map output, bounded NBT parsing, inherited/custom gameDir import, verified cache reuse, source preservation, account exclusion, link/cycle rejection, mixed text formatting and old works. Both editions passed isolated native UI checks for maps/markers, palette editing, import entry, English quick search and Classic/Nocturne/Alloy/Harvest/Verdant layouts; Nocturne also checked at 920×680 and 2560×1440. Synthetic import tests verify preparation and file integrity, not Minecraft gameplay.

Seed-map feedback verification: both editions show changing map pixels while the pointer remains held, retain the camera on release, handle pointer cancellation and preserve marker placement after panning. Filters and marker controls stay above the map without overflow in five themes, including narrow and maximized windows; local/server modes and English labels checked. Queue tests cover serialized generation, coalescing, stale failures, retry and disposal.

Manual acceptance: compare known world locations against the matching generator version; test a disposable copy of an original launcher profile and its selected worlds/mods. The source remains intact. Unsupported custom launch profiles are not executed. Direct shared-folder launch is not included. Map structure prediction does not guarantee terrain placement, and shaded height is approximate. Bedrock and custom world generators are not supported.

If an import is cancelled, the source is retained and the partial new instance remains visible. If copying was interrupted, import again into a fresh instance before removing the partial copy. Stop games during copying. Java can be prepared using the existing launch controls.

# 1.3.3 verification

The user accepted both 1.3.3 installers and authorized stable publication. Preserve accepted installer bytes, including their informational local-build label; update checks remain enabled. Changes cover shared bottom task feedback, bounded catalog layout, local screenshot scope and workspace-aware quick search. Installer identities, account policies, themes and game/server data locations remain unchanged.

380 automated regression tests passed. Both editions passed isolated native UI checks for task completion/five-second dismissal, concurrent tasks, failure retention, screenshot retry and workspace-aware search. Catalog geometry passed Classic, Alloy, Nocturne, Harvest and Verdant at 1280×840 and 2560×1440, plus Nocturne at 920×680. English search labels were verified. Installer startup and checksums are verified at delivery. Native UI checks use isolated --qa-ui data, synthetic catalogs/tasks and disposable instances; they do not download user content or access real accounts/worlds. Retain the 1.3.2 server/network testing limitations below.

Final refinement checks passed in both editions: stable title-bar ordering in three themes at two window sizes, automatic and manual notification dismissal without replay, opacity fade and reduced-motion behavior, packaged startup and SHA-256 checks.

Manual acceptance: complete simultaneous local/server downloads; verify completion disappears after five seconds, manual close removes the notification, and history remains in Tasks. Check failed tasks, narrow/maximized windows, theme switching, screenshot refresh and Ctrl+K destinations in both modes. Stop servers and games before installing or rolling back to 1.3.2; retain worlds and configuration backups.

# 1.3.2 verification

1.3.2 feedback revision: local and online modes now share navigation icons, software settings/About/tools, page transitions and reduced-motion rules. Servers have a separate searchable instance list; creation moves there after the first instance. Server settings and installed content are instance-detail tabs. The Modrinth catalog shares filters, icon rows and version controls with local mode, with automatic required-dependency preview. Server tools use server logs/configuration; screenshots remain shared local-game screenshots. EULA checkbox/text/link alignment is corrected.

374 automated tests passed, including per-instance queues and cancellation, shared transfer limits, SHA512 download verification, properties conflicts/backups, isolated world copies and invitation validation. Both editions passed isolated native desktop checks: synthetic Java process console/commands/save-and-stop, continued operation across mode switches, retained settings drafts, five themes (Classic, Alloy, Nocturne, Harvest, Verdant), 1280×840 and 2560×1440 windows, and English UI. The title-bar switch stays in its title row.

Actual official Vanilla, Paper and Fabric core/Java downloads passed. A Modrinth server plugin passed download/hash verification and removal/recovery. Actual EasyTier 2.6.4 host/guest TCP forwarding passed through a local relay; access to an unrelated host TCP port was blocked. Minecraft itself was not started during this automated verification: process tests used an explicitly identified synthetic fixture. Plugin gameplay compatibility and two-computer cross-network/NAT/reconnect behavior remain user acceptance items. Five themes at two window sizes do not cover every Windows DPI configuration.

The user accepted both installers and authorized stable publication. Start with a new disposable server, review the EULA, inspect generated visual settings, send a console command and save/stop; then test your intended mods/plugins. With two computers, check LAN first, then an EasyTier invitation on different networks, reconnects and mode switching. Preserve existing worlds before testing upgrades. Spigot/CraftBukkit require importing a trusted BuildTools-generated JAR; they are not automatically redistributed.

The release preserves the accepted installer bytes and informational local-build label; update checks remain enabled. AmberX and existing theme packages are unchanged. Installation keeps the existing product identities and data locations. See the server guide for lifecycle, configuration, recovery and network limitations.

# 1.3.1 verification

365 automated tests passed. Both products passed isolated desktop checks with Classic, Alloy, Nocturne, Harvest and Verdant; 1280×840 and 2560×1440 windows; 100%, 125% and 150% page zoom; selection styles, output formats, undo/redo, saved works, checkbox/backup alignment and English UI. Both packaged programs passed startup/IPC and checksum checks. The user accepted the installers.

Page zoom does not cover every Windows system-DPI configuration. Actual game/plugin font rendering was not verified. Plugin output needs compatible plugins; JSON is a text component, not a command. The accepted installers retain their informational local build label; update checks remain enabled. Publication preserves the accepted installer bytes.
