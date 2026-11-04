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
