## 1.3.4

- Offline Java seed map (selected generator versions from 1.7.10 through 26.3): pan/zoom, scale, X/Z navigation, Y biome slice, three dimensions, biome/structure filtering, slime chunks, saved markers with import/export, and read-only level.dat seed import. Terrain relief is approximate; modded/datapack generation and mixed-version terrain may differ.
- Seed-map controls and filters now sit above the map, with aligned marker fields and responsive structure options. Dragging moves cached map areas on animation frames while a coalesced background queue generates surrounding coverage; releasing the pointer preserves its position.
- Larger gradient text studio with theme-aware color selection, hue/saturation/brightness picker, HEX/CSS color import, random palettes, seven output formats, and preserved selection formatting/undo/redo/local works. MIT character/color adapters adapted from tuanzisama's generator.
- Import original .minecraft installations into isolated instances. Detect launcher profiles, custom gameDir and version inheritance; reconstruct supported Vanilla/Fabric/Forge/NeoForge setups from trusted metadata, copy selected content, and reuse hash-verified libraries/assets. Source files and account credentials are not changed or imported. Unknown custom clients are reported as unsupported. In-place shared-directory launching is not included.
- Stable release of the accepted Windows installers, complete source and checksums. AmberX and theme artwork are unchanged.

## 1.3.3

- Keep the title-bar mode switch before Edit home so it stays in place across pages.
- Shared bottom task feedback for local and server downloads. Successful notifications fade out after five seconds and can be closed manually; parallel activity and failures remain visible, with history in Tasks.
- Keep content catalogs within the available viewport, with separate scrolling results/details, accessible pagination and spaced completion actions.
- Remove a legacy screenshot request using server instance IDs. Both modes browse local game screenshots; refresh clears resolved errors and one unavailable instance does not hide other results.
- Ctrl+K follows the active workspace, searches server instances and commands, and supports explicit mode switching without stopping servers.
- Existing themes, account rules and data locations remain unchanged. Stable release with the accepted Windows installers, complete source archives and checksums.

## 1.3.2

- Two concurrent installation tasks with per-instance cancellation, shared-file locks and a shared transfer limit. Long setup dialogs can continue in the background.
- Local / Online title-bar switch with running-state indicators; switching modes keeps servers running. Both workspaces share navigation icons, themes, page transitions, software settings, tools and About.
- Separate server instances and version-isolated worlds/configuration. Create servers from Instances; manage server properties and installed content in detail tabs.
- Official Vanilla, stable Paper and Fabric core downloads; trusted Spigot/CraftBukkit JAR import, independent Java/memory, and upgrades in a copy that preserves the original.
- Explained visual server.properties settings, source editing, external-change checks, backups and restoration. Live console/commands, process CPU/working-set memory, graceful stop and minimize-to-continue.
- Server Modrinth catalog reuses local filters, project icons and compatible-version selection, automatically previews required dependencies, verifies downloads and retains removed content for recovery.
- LAN connections and optional hash-verified EasyTier 2.6.4 no-TUN rooms. Remote rooms remain a testing feature: two-computer NAT/reconnection and plugin combinations need independent acceptance; public relay availability is not guaranteed.
- Fix the homepage right-edge background seam and EULA alignment. Existing theme packages and artwork remain unchanged.

## 1.3.1

- Align local-import checkboxes and backup controls; tools share the left page origin used elsewhere.
- Apply solid colors, gradients, bold, italic, underline and strikethrough to selected text, with mixed states, clear formatting and undo/redo.
- Styled editing, preview and serializers share one document model, including plain-text paste, combined characters, explicit style boundaries and escaping.
- Retain existing color presets and save complete styled works separately; enter save names directly in the page.
- Both editions retain existing theme compatibility. Stable 1.3.1 release for Windows x64.

## 1.3.0

- Skin-head avatars with hat layers, local cache and manual refresh.
- Screenshot thumbnails across instances, date/instance grouping, time sorting, zoom, copy and folder access.
- Draggable themed dependency graphs, saved positions and recognized Fabric/Quilt declarations alongside installation records.
- Configuration editor with tabs, line numbers, syntax colors, search/replace, undo/redo, JSON formatting, conflict checks and backup preview/restore.
- Gradient text with adjustable color stops, local presets, JSON/MiniMessage/plugin output, copy and export.
- Large-window home modules stay docked to theme edges with bounded auxiliary widths/heights. Existing theme packages need no conversion.

## 1.2.3

- Import local Modrinth MRPACKs and supported content ZIPs into independent instances from content management or creation. Review pinned versions, files and optional client content; fill in and confirm missing ZIP version requirements.
- Retain the archive and import choices in each instance, with verified downloads, cancellation and explicit restart recovery. Reject unsafe paths, links, duplicate archive names, corruption and unsupported layouts before installation; never overwrite an existing instance.
- Recognize CurseForge manifests, mod lists and instance backups without installing them as incomplete packs. CurseForge downloads are not integrated.
- Show pack provenance and import reports; warn before individual mod updates diverge from a pack. Local imports do not track whole-pack updates automatically.
- Reorganize Java and log tools with consistent heading, action and result areas; add detected Java path copying, log-instance selection and a log-folder shortcut.
- Clarify mod lists versus modpacks and backups. Improve export heading/description/button spacing and group local mod source lookup options separately.
- Preserve existing themes, account policies and edition-specific data/update sources.

## 1.2.2

- Add Automatic, Official sources first and Mainland China optimized download strategies. Supported Minecraft metadata, assets and Maven files can use BMCLAPI, with optional official/mirror fallback. Automatic selection uses temporary connection probes, not location tracking.
- Preserve hash-specific partial downloads across pause, cancellation and restart. Resume only when the server returns a valid range; otherwise restart the current file. Completed files are reused, and final size/hash checks remain mandatory.
- Add pause/resume for active game, Java and content download stages, with cancellation still available while paused. Extraction and installation finalization are not pause points.
- Extend restart recovery to standalone game/Java preparation tasks. Keep complete installation/content plans and explicit continuation in the task center.
- Show download source, byte progress, current transfer speed and connection details. Add connection diagnostics and a copyable summary in Settings and the task center, with an alternative-source retry for applicable game/loader stages.
- Bound retries, honor rate-limit delays, reduce subsequent concurrency on unstable connections and cancel remaining pool requests after a terminal failure. Reject unsafe mirror redirects and preserve file integrity checks.
- Keep Modrinth as the integrated content provider; this version adds no CurseForge integration. Preserve existing themes, account policies, separate product data/update sources and the previous installer for rollback.

## 1.2.1

- Fix theme export field alignment, responsive spacing and inline metadata validation.
- Simplify the play calendar to its heading, month and dates; open records, filters, totals and recording settings on demand.
- Add optional section corners, all-edge borders and bounded shadows while preserving existing theme defaults.
- Correct two-row top navigation sizing, retain its About entry and remove the duplicate About/version footer.
- Add appearance draft recovery, saved local themes, change summaries and category resets. Duplicate names cannot overwrite themes; recovered drafts require explicit application.
- Add the standalone Nocturne theme and update Alloy calendar proportions without changing its artwork. Existing 1.1.x and 1.2.0 themes remain compatible.

## 1.2.0

- Align screenshot instance and date filters with consistent labels, field heights and spacing; stack the filters in narrow windows.

- Use unobtrusive home-section scrollbars with transparent tracks, no arrow buttons and reserved spacing beside content. Keep calendar date targets compact and constrain calendar/news reading width on wide windows.

- Add optional home modules for a local play calendar, official Minecraft news, storage summary and favorite tools. Edit module order and visibility, choose Simple/Daily/Information presets, or expand Advanced editing for detailed columns and sections. Existing module selections remain available.
- Fit normal-size home views to one workspace with independent section scrolling and utility tabs. Keep page scrolling as an option and automatically use it for smaller viewports. Move Edit home into the title bar and collapse calendar legends and counting explanations by default.
- Record observed game runtime locally. View days and instances, export or clear history, and disable recording. Sleep, launcher downtime and missing exit times are marked incomplete rather than estimated as playtime; historical launch records have no invented duration.
- Read official news and Java release/snapshot notes with category filters, manual refresh and optional automatic refresh. Cached content stays available offline; news never blocks launching games.
- Simplify appearance settings into Basics, More settings and Advanced editing. Add group reset, setting search and independent sidebar-instance/About visibility without changing the `.ambtheme` schema.
- Apply themes directly from the library. First-time themes and major visual changes retain a 30-second recovery confirmation; an unchanged, previously confirmed theme applies in one step. Preview/edit remains optional, with discard and restore controls.
- Add cancellable storage analysis, category totals and per-instance world/mod/resource-pack/shader/screenshot/log sizes. Cleanup retains the existing confirmation and protection for active data.
- Add Java inspection, log/recovery shortcuts and local PNG screenshot browsing by instance/date, with copy and show-in-folder actions. Pin tools to the home module.
- Update the separate Alloy theme with the new home modules, a visible About entry and existing text alignment. Preserve the approved artwork bytes and support for 1.1.x themes.
- Share these changes between AMBER and AmberE while preserving separate account policies, application data and update sources.

## 1.1.2

- Add vertical control-text offset (−3 to +3 px), with preview, reset and theme round-trip support. Update the standalone Alloy text alignment while preserving its artwork.
- Center launch-option rows, single-line fields and choice labels vertically; reserve scrollbar space to prevent horizontal background shifts when settings expand.
- Keep viewport section backgrounds continuous while scrolling or expanding launch settings, without resizing or replacing the existing Alloy artwork.
- Refine themed instance headers with consistent spacing and accent-colored active tabs; remove obsolete opaque filter backgrounds.
- Align installed-content search, filters and counts, with wrapping layouts for smaller windows.
- Reduce stacked home-page spacing and heading size in shorter windows so the primary launch action remains accessible.
- Scale vector and image instance icons consistently beside launch headings.
- Preserve existing 1.1.0 and 1.1.1 themes, saved preferences, instances and edition-specific authentication and update sources.

## 1.1.1

- Refine header logo sizing and keep instance icons square; provide the AMBER Alloy theme as a separate download.
- Compose the launch area vertically, with adjustable control width, heading size, button height, top spacing and surface opacity.
- Customize section backgrounds, image placement, padding, separators and gaps. Continuous viewport backgrounds keep their size when launch settings expand.
- Configure title-bar height, navigation icon size and sidebar extras; choose compact quick actions. Hidden About remains available through global search.
- Edit these options in Appearance & themes → Layout with draft preview, undo/redo and existing trial recovery.
- Import existing 1.1.0 themes without conversion. New composition themes declare a required capability so unsupported clients reject them clearly.
- Keep account validation, instance data and edition-specific update sources unchanged.

## 1.1.0

- Refine rounded menu options, accent title-bar search contrast, 72px icon sidebars and consolidated layout settings.
- Appearance Studio: custom colors, typography, control sizes, menu/list styles, local backgrounds, panel opacity and whole-window opacity.
- Arrange the home page with stacks, two-column sections and tabs. Move modules, resize columns and undo or redo draft edits. Narrow windows stack columns automatically.
- Import and export declarative `.ambtheme` packages across AMBER and AmberE, with selective color, background or layout import, metadata and compatibility notices.
- Preview before applying. A 30-second trial reverts unless confirmed; interrupted trials recover on restart. Restore the previous appearance or press Ctrl+Shift+F12 to return to classic.
- Existing appearance choices remain the default after upgrading. Themes exclude accounts and instance data, accept local PNG assets, and cannot execute scripts or arbitrary CSS.
- Bilingual authoring documentation and an open versioned format. Account rules and update repositories remain product-specific.

## 1.0.0

- Stable release for Windows x64, with separate AMBER and AmberE installations and update repositories.
- Stable and preview update channels; preserve explicit channel preferences when upgrading from Beta.
- Verified configuration backups include update-channel and window preferences. Library reconnection rejects linked parent directories and preserves the previous location on failure.
- Instance backups, trial copies, change history and recovery help protect existing worlds and configurations.
- Unified version display and feature information, with Simplified Chinese and English interfaces.

Upgrading: close the launcher and Minecraft, back up important instances, then install over the matching product. Game data is retained. Installers are unsigned.

## Beta 1.14 — prerelease (1.0.0-beta.15)

- Separate stable and preview update channels, persisted across restarts; no automatic downgrade, and stable 1.0 remains eligible from beta versions.
- Check configured library availability before initialization. Reconnect an existing library or retry after reconnecting a drive; never silently create a replacement empty library.
- On-demand bounded storage estimates, link-safe scan failures, cleanup preview with target and size, and a shortcut to upgrade backups. No automatic cleanup of instances or shared game files.
- Verify backup files without restoring; restoration still creates an independent instance. Export exactly the previewed diagnostic snapshot; redact device user codes in shared errors.
- Let online accounts refresh at launch instead of treating expired offline eligibility as a permanent launch failure. Task errors link back to retry or the relevant instance/account controls.
- Improve keyboard selection focus, responsive maintenance/backup actions, release-note wrapping and focus visibility.
- AMBER and AmberE share applicable changes, retain independent update and identity rules. AmberX is unchanged.

## Beta 1.13 — prerelease (1.0.0-beta.14)

 Eligibility enforcement remains in place; no official endorsement claimed.
- Repeated login clicks reuse the active request. Cancellation, expiry, success and failure clear temporary device credentials.
- Authentication service/network failures are distinguished from ownership problems, with direct retry and account-management actions.
- Launch checks running instances before authentication, including games recovered after launcher restart. Removed account bindings never silently fall back.
- Account removal confirmation, readable account state, responsive actions and bilingual recovery messages.
- Bilingual READMEs link AMBER, AmberE and AmberX. AmberE shares applicable fixes and retains its own offline/third-party identity and updater. AmberX is unchanged.
 Existing instances, saves, account bindings and eligibility policy are preserved.

# Changelog

[简体中文](docs/zh-CN/CHANGELOG.md)

## Beta 1.12 — 1.0.0-beta.13 (prerelease)

- Refine the mod-update header and toolbar, align the preview-version checkbox, and enlarge the quick-search and guided-dialog close icons with 44px interaction targets.

- Create independent trial copies with a disk-space preview and optional independent world copies. Review selected configuration changes before applying them to the original; content and its manifest move together. Changed originals block promotion, and world progress/account selection are never merged.
- Record content operations and launch/visual configuration changes with verified recovery files. Detect external changes, mark a manually confirmed working state, and restore only when current files still match the recorded result.
- Recover interrupted application transactions after checking each file; refuse to overwrite unexpected external changes. Correlate explicit local log evidence with recent changes without claiming every crash can be diagnosed.
- Widen guided creation, use list/detail layouts for downloads and installed content, preserve browsing/navigation state, add a persistent task shortcut and Ctrl+K instance/action search.
- Import and export validated, text-only local recommendation preference templates. Applying an imported template still requires fresh recommendation and compatibility checks.
- Keep both editions synchronized and preserve separate authentication/data/update identities.
- Preserve the tested Beta 1.11 installers, source and pre-change workspace snapshot with SHA-256 checksums for rollback. Program downgrade does not undo gameplay changes.

## Beta 1.11 — 1.0.0-beta.12 (prerelease)

- Apply consistent non-selectable app chrome across dialogs, popovers and window controls while keeping inputs, logs, paths and errors copyable.
- Group guided questions and advanced choices, compare tier differences first and collapse shared content and the full editable list.
- Add cancellable recommendation stages and distinguish network/rate-limit failures from compatibility results.
- Autosave separate creation and addition drafts; retain preferences and review file changes when refreshing expired recommendations.
- Add local preference templates with fresh compatibility checks on use and explicit deletion.
- Group addition previews into new, existing, disabled and conflicting content; recheck changes before installing.
- Add post-install configuration guidance, content and recovery entry points for both editions.

## Beta 1.10 — 1.0.0-beta.11 (prerelease)

- Expand guided creation with functional equivalents and dependency-aware version matching, preserving exact required projects and server constraints.
- Add aggressive, balanced and conservative tiers with separate vanilla-change and resource-load indicators; balanced is selected by default.
- Expand convenience, performance, visual and explicitly selected gameplay themes, with substitution reasons and usage guidance.
- Pin inspected shader / distant-terrain combinations and author presets; unknown hardware stays conservative and existing settings are preserved.
- Add recommendations for existing instances without replacing installed versions, disabled choices, settings or worlds; retain transaction recovery and resumable tasks.
- Group content details, automatically recheck edits, retain instance names, and update both languages and custom-language templates.
 Metadata and source inspection are not gameplay or GPU certification.

## Beta 1.9 — 1.0.0-beta.10 (prerelease)

- Add guided creation with a saved questionnaire, local hardware information and explained, editable setup recommendations; preserve manual creation and add direct Modrinth modpack creation.
- Apply server version/loader constraints, required projects, client environment, dependencies, declared incompatibilities, shader support and resource budgets before ranking whole setups.
- Keep required dependencies selected by default with explicit opt-outs and risk acknowledgement; allow optional dependencies and root removal with a new combined check.
- Pin file versions, hashes and sizes for resumable installation across restarts. Separate mod, resource-pack and shader stages; allow an explicit skip of remaining visual packs.
- Retain the creation plan in instance management, suggest per-instance memory and support Chinese/English text, themes and keyboard navigation.

Recommendations use curated rules and live metadata, not automated gameplay testing. Visual packs are downloaded only and must be enabled in game. Windows installers are unsigned. Windows installer, source archive and SHA-256 checksums accompany this prerelease.

## Beta 1.8 — 1.0.0-beta.9 (prerelease)

- Enforce ownership at AMBER's actual game-launch boundary. Block anonymous and unverified legacy offline starts; verify official ownership and profile for Microsoft launches and the linked owner for third-party launches. Authentication failures never silently downgrade to offline play.
- Add explicit verified offline identities retaining the official name and UUID, with encrypted eligibility cached for at most 7 days. Expiry, detected clock rollback, owner removal and subsequent definitive authorization/ownership denial invalidate eligibility. This is a product policy, not a Mojang-approved exception.
- Add ownership status, linking/re-verification and purchase/recovery entry points. Update onboarding, settings, privacy text, bilingual messages and the game launcher version metadata. Existing instances and saves are preserved.
- Windows installer, source archive and SHA-256 checksums accompany this prerelease. Microsoft allowlist approval and live sign-in/gameplay acceptance remain pending. Automated authentication tests use simulated responses.

## Beta 1.7 — 1.0.0-beta.8 (prerelease)

- Align the comfortable 72px header, 44px instance picker and borderless window controls. Show each instance’s existing icon in the picker and its menu. Keep the picker visible in narrow windows.
- Move launch options into a separate panel below the scenery. Expanding memory and graphics settings no longer stretches the translucent launch dock or rescales the background. Add saved feedback and improve empty-download spacing.
- Add opt-in Windows graphics preferences for the actual game Java executable: system default, high performance or power saving. Preserve other graphics flags, journal the original value before changes, and provide restoration. External changes are preserved.
- Show the Java path, shared configured runtimes, requested graphics preference and renderer identified from game logs. Provide Windows graphics settings and Java-path copying when automatic application is unavailable.
- Extend Chinese/English translations and preserve older preferences and custom language-pack fallbacks.

Windows x64 prerelease. Installer, source archive and SHA-256 checksums are attached to the Release. Windows x64 installer: `AMBER-1.0.0-beta.8-Setup-x64.exe`. Graphics preferences require Windows 10 2004 or newer and are shared by instances using the same Java executable. Changes apply to later launches, not running games. Windows and the driver decide the GPU actually used; a saved preference is not proof of switching. Missing renderer log lines remain “not detected.” The installer is unsigned.

## Beta 1.6 — 1.0.0-beta.7

- Replace the separate system title bar with integrated AMBER window controls. Remove the default application menu so Alt no longer reveals it; retain explicit editing shortcuts and normal close protection.
- Add independent square/system-rounded window corners (next start), live theme/accent title-bar colors, and persisted window size, position and maximized state. Recover windows when a display is disconnected or its work area changes.
- Keep window controls available in onboarding and instance dialogs. Preserve edge resizing, title-bar dragging and double-click maximize/restore.
- Align checkboxes and wrapped descriptions using shared settings rows. Reorganize privacy into data locations, diagnostics/sharing and cleanup/maintenance; add path copying and clear saved/cancelled/completed feedback.
- Improve narrow-window navigation, long English text, keyboard focus and dialog spacing. Extend the Chinese/English catalog; older custom language packs fall back to English for new entries.

Windows x64 prerelease. System-rounded outer corners require Windows 11; earlier Windows uses square corners. The setting does not offer arbitrary corner radii. Standard Win + arrow snapping remains available; the custom maximize button does not provide the native Windows 11 hover Snap Layouts menu. The installer remains unsigned.

Download `AMBER-1.0.0-beta.7-Setup-x64.exe` to install or upgrade. Source and `SHA256SUMS.txt` are attached separately. Close AMBER and games before upgrading; existing data and preferences are retained.

## Beta 1.5 — 1.0.0-beta.6

- Choose Simplified Chinese or English during first-run setup and in Settings. Language changes apply without restarting or discarding screen state. Dates follow the selected locale.
- Import a text-only JSON language pack, export the complete translation template, or remove the custom pack. Unknown keys, invalid placeholders, oversized files and unsafe metadata are rejected; missing entries fall back to English.
- Translate interface controls, application messages and custom installer pages. Keep player names and third-party project descriptions in their original language.
- Add privacy and data information, diagnostic preview, and configurable automatic sign-in code copying. Code expiry only clears the clipboard if it still contains that code.
- Redact known credentials and common personal-information patterns from displayed runtime errors and copied details. Bound credential-file and authentication/update-response reads. Move credential storage to asynchronous system encryption while retaining the account-file format.
- Publish paired English and Chinese documentation, language-pack authoring instructions and a security review summary.
- Fix the first-run offline-name validator to match the account service's 3–16 character rule.

This release also includes the locally delivered Beta 1.4 improvements: instance favorites and sorting, recent launch records, instance health checks, local mod imports, content operation history and recovery, and grouped choice-list states.

### Compatibility and limits

Windows x64 prerelease. Existing instance data and settings are retained. Microsoft API access is not approved; real-account Microsoft sign-in, refresh and authenticated launch remain unverified. Third-party account services require their own live validation. Diagnostic redaction is best-effort; raw game/mod logs and process arguments may contain personal data. System encryption does not protect against malware running as the same Windows user. The installer is not code-signed. Do not treat checksums as a publisher signature.

### Downloads

Use `AMBER-1.0.0-beta.6-Setup-x64.exe` to install or upgrade. The source archive is for building from source. Verify each attachment against `SHA256SUMS.txt`. Close games and AMBER before upgrading; back up important worlds first.

## Earlier releases

- **Beta 1.4 (1.0.0-beta.5, local delivery):** Instance workspace and health checks; local mod import; content history and recovery; favorites, sort order and recent process launches; better choice-list and cancellation states. Included in the Beta 1.5 public release.
- **Beta 1.3 (1.0.0-beta.4):** Unified searchable choices, instance account/memory overrides, retained store filters, grouped tasks, settings search and dependency-aware bulk management.
- **Beta 1.2 (1.0.0-beta.3):** Fixed version-list overflow, dialog padding, first-run spacing and creation navigation.
- **Beta 1.1 (1.0.0-beta.2):** Windows installer, explicit device-code copy/open, verified update downloads and confirmed installer handoff, compatible mod updates with backups and rollback.
- **Beta 1.0 (1.0.0-beta.1):** Required dependencies selected by default but user-adjustable; optional dependencies opt-in; restart recovery, backups, first-run guide, data relocation and personalization.
- **Alpha series:** Vanilla and loader installation, account storage, Java management, Modrinth browsing, migration, instance recovery and desktop interface foundations.

Release-specific source and notes remain available under their immutable release tags. The Chinese historical log retains the detailed chronology.
