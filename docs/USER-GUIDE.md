# User guide

[简体中文](zh-CN/USER-GUIDE.md)

**First run:** choose a language and game-data location. AMBER directs you to Accounts to verify official Minecraft Java eligibility; you can skip this step to manage instances but cannot launch without eligibility. AmberE can create an offline identity immediately and also supports third-party accounts. It has no Microsoft sign-in. The editions use separate data directories. Minecraft API access for AMBER has been approved. Launch continues to verify eligibility. Approval is not an endorsement by Mojang or Microsoft.

**AMBER account eligibility:** Microsoft and linked third-party launches verify the official account online. After successful verification you may explicitly create an offline identity with the official UUID and an editable offline name. Its encrypted eligibility cache lasts at most seven days, does not renew offline, and is invalidated by a detected clock rollback or subsequent definitive authorization/ownership denial. Removing the linked owner blocks use. Legacy unverified offline accounts remain listed but cannot launch; existing instances and saves remain intact. This cache policy is not approval from Mojang. See [testing and limitations](TESTING.md).

**Install:** select Create, choose a Minecraft version, then compatible loader components and an instance name. Disabled choices explain incompatibility. AMBER prepares Java and verifies downloads. Keep the task center open if an installation fails; retry reuses verified files. Interrupted complete installation plans can be continued after restart.

**Content:** select the target instance before browsing Modrinth. Search, categories and sort preserve game/loader compatibility. Required dependencies start checked but may be deselected with a warning; optional dependencies start unchecked. Review the change preview before confirming. Shaders need a compatible shader loader. Third-party metadata cannot guarantee all runtime combinations.

**Manage:** filter installed content, toggle or remove selected items in batches, import local JAR/LiteMod files and check compatible updates. Version locks prevent accidental replacement. Content history can restore applicable operations while preserving external file changes. This legacy content history does not restore worlds or configuration; the instance workspace separately records supported configuration changes.

**Protect worlds:** back up before migration or bulk changes. Restore backups as new instances. Keep another copy on a different disk. Removed instances enter AMBER's recycle bin; permanent deletion requires the exact name and cannot be undone.

**Launch:** choose an account and memory; instance-specific values override global defaults. Run Check instance for Java, files, known dependencies and account-selection issues. Follow the error's action button. Review logs before sharing; prefer the diagnostic summary preview in Settings.

**Language and appearance:** Settings provides instant language switching, language-pack import, themes, rounded controls, local backgrounds, opacity, layout and reduced-motion support. User/project names remain unchanged. Search settings by localized keywords.

**Updates:** About checks the official GitHub release feed. AMBER verifies the installer before offering a confirmed handoff. Close games and tasks first. No automatic background installation is performed.

## Window appearance and privacy tools

Settings → Appearance and background → Window offers square/system-rounded outer corners and title-bar colors. Corner changes apply on the next start; control corner style is independent. Windows 11 supports rounded outer corners; earlier Windows uses square corners. Drag empty title-bar space to move the window, double-click to maximize/restore, and use Win + arrow keys to snap. The custom maximize button does not show the native hover Snap Layouts menu. Size, normal position and maximized state are remembered; a missing monitor triggers recovery to a visible display. Alt no longer reveals an application menu. Ctrl+A/C/X/V/Z/Y and Ctrl+Shift+Z/V remain available for editing.

Settings → Language and privacy groups data locations, diagnostic previews and maintenance. Copy a path with its adjacent button. Preview a diagnostic summary before exporting. Cleanup prompts name the affected copies and leave active accounts, instances, worlds and instance backups intact. A cancelled action is reported without claiming completion.

## Graphics preference (Beta 1.7)

Settings → Game launch and the home page’s expandable launch options expose the same global graphics preference. Choose high performance or power saving to apply a current-user Windows preference to the actual Java executable at the next game launch. This does not change AMBER’s renderer. Java runtimes shared by instances also share the OS preference. Newly selected Java paths are handled on subsequent launches.

“Follow system” restores preferences previously changed by AMBER when possible. The explicit restore action also clears remaining managed preferences. Changes made externally are preserved. Recovery metadata is stored locally as `graphics-preferences.json` under AMBER’s user-data directory. Do not remove that record before restoring if you want the original values back; uninstall preserves user data.

Automatic application uses Windows’ per-user application graphics preference store and requires Windows 10 2004 or newer. Enterprise restrictions or future Windows changes may prevent it. The system-settings button and copied Java path provide a fallback. Actual GPU selection depends on Windows, drivers and hardware. Renderer reporting reads recognized game-log lines; “not detected” is not a failure to launch or evidence of integrated graphics. Switching hardware was not verified by the synthetic registry integration check.

## Beta 1.12 workspace and trials

Open an instance → Overview and checks. Installation status, file/dependency checks and “I played, confirmed working” are separate: marking a successful play session is your confirmation, not an automatic compatibility certification.

Choose **Create trial copy** (also available from mod updates or recommendation additions). Review disk space and optionally copy worlds. The trial uses independent files; it does not share writable worlds. Choose its account separately. Regenerate recommendations or check mod updates in the copy before installing them.

After testing, choose **Preview applying to original**. Configuration files can be selected individually and are replaced as whole files. Changed content files and their manifest are one group to preserve dependency consistency. Accounts, worlds and world progress are excluded. If the original or previewed files change, application stops instead of forcing an overwrite. A recovery record is created before application. You can keep the trial as an independent normal instance instead.

**Change records** cover supported content operations and launch/visual settings. External modifications are listed, but changes without a prior backup cannot be restored automatically. Restore is available only when files and the game/loader still match the record. Interrupted application is recovered after file checks; unexpected external changes stop recovery. Do not delete recovery files while an operation is active. Local crash hints show recognized log evidence and recent changes separately; they are clues, not guaranteed causes.

Press **Ctrl+K** or the title-bar search icon to find instances and actions. Use arrow keys and Enter, or Escape to dismiss. Content browsing keeps its filters and uses list/detail views when there is enough space.

In guided creation or recommendation additions, expand **Local recommendation templates** to save, import or export a preference JSON file. Only questionnaire preferences are exchanged, not installed mods, accounts or worlds. Import validates the file before confirmation; applying a template still requires generating a fresh compatible plan. Invalid, oversized or duplicate templates are rejected.

See [rollback instructions](ROLLBACK.md) before reinstalling an older version. The published installer is the unchanged user-tested build and may still display “Local test build”; that label does not select a different update repository.

## Updates and maintenance (Beta 1.14)
In Settings → Download, choose Stable releases or Preview and stable releases. A beta defaults to preview unless you explicitly saved another channel; a fresh final release defaults to stable. Changing channels never downgrades or installs anything. Download, verify and confirm installation separately; finish games and active tasks first.

Settings → Storage and welcome → Storage and maintenance scans major folders only when requested. Counts are estimates, not guaranteed reclaimable disk space. Cleanup is restricted to downloaded app updates or upgrade configuration backups and requires a second confirmation. Shared libraries and active instances are not cleaned here. Use instance backups and recycle-bin controls for those operations.

In instance Backups, Verify backup checks retained file hashes without creating an instance. Restore creates a new instance and leaves the original intact. Keep important world backups on another disk as well.

If the configured game disk disappears, the startup recovery dialog offers Retry, Locate library and Quit. Reconnect the disk or select the original library containing instances. It does not silently replace the missing library. After an interrupted migration, reconnect the original directory; the original is retained until copying and verification complete.

Diagnostics export writes the exact last preview, without automatically attaching raw logs or account data. Review third-party logs manually before sharing.

## Appearance and themes

Use Settings → Appearance & themes to edit colors, controls, backgrounds and home layouts. Import portable `.ambtheme` files from Theme library in either AMBER or AmberE. Apply a theme directly from the library. First application and major usability changes require confirmation within 30 seconds; otherwise the previous appearance is restored. Preview and editing remain optional. Ctrl+Shift+F12 restores classic. See [theme help](THEMES.md) and [format reference](AMBTHEME-FORMAT.md).

## Personal home and tools (1.2.0)

Use Edit home in the title bar to arrange modules or choose Simple, Daily or Information presets. Normal-size windows prefer one screen, with independently scrolling launch, calendar and news sections. Smaller or zoomed windows fall back to page scrolling. More settings → Layout offers the scrolling preference; Advanced editing exposes columns, tabs and section-level scrolling.

The calendar shows locally observed runtime, which may include idle time; it is not active-play measurement. Select a date for records or open the calendar more menu for totals and recording settings. Disable, export or clear history without inventing durations for old launches. News refresh is manual by default, with categories, optional automatic refresh and offline caches. News and release notes never block game launching.

Tools provides Java inspection, log shortcuts and local PNG screenshot browsing. Filter screenshots by instance/date, preview, copy or show them in their folder; no image is uploaded. Storage and maintenance scans disk usage on demand, supports cancellation and retains confirmation and active-data protections for cleanup.

Appearance & themes starts with Basics; reveal More settings or Advanced editing as needed. Apply themes directly from the library, with optional preview/edit. Download and import the new Alloy separately; see [theme help](THEMES.md).


## Theme editing and calendar (1.2.1)

Get official themes in the [theme store](https://ayr1k.github.io/#/themes). Import and apply, or edit first. The appearance editor retains unapplied drafts; recovering a draft still requires explicit application. Save to library creates a separate theme without switching appearance; duplicate names require renaming. Export requires a nonempty name.

The calendar initially shows only its month and dates. Select a date for records, or use its more button for filters and recording controls. Top navigation has a dedicated About entry instead of repeated footers on every page.

## Download connections (1.2.2)

Settings → Downloads → Download connections offers **Automatic**, **Official sources first**, and **Mainland China optimized**. Automatic compares lightweight connection probes and caches the choice for ten minutes; it does not detect location or promise a speed increase. Official-first and Mainland-China modes use the other source on failure unless fallback is disabled under More download settings. Only explicitly supported Minecraft metadata, assets and Maven URLs are mirrored. Modrinth, Java providers and authentication retain their own sources; CurseForge is not integrated.

The task center shows source, transferred bytes, current speed and file details. Pause acts on active download stages, retaining the install lock and downloaded fragments. Resume continues the task; Cancel also works while paused. Preparation, extraction and installation finalization cannot be paused. Speed is an observation, not a guaranteed rate; totals can grow as later installation stages are discovered.

Partial files end in `.amber-<hash>.part` and stay beside their intended downloaded file. A matching range response can resume them; unsupported ranges restart that file. Expected size and hash are verified before a partial becomes an installable file. A failed checksum discards the partial. Cancelling does not delete completed files. Closing the app does not automatically restart tasks at next launch: use Continue in the task center. Complete setup/content plans and standalone game/Java tasks are recoverable; one-off content updates may require returning to the instance to check updates again.

Check download connections probes public Minecraft, BMCLAPI, Modrinth and Fabric endpoints. It sends no account or instance information and does not test all downloads. The copied report contains only service names, status and elapsed time. Normal network providers still observe connection metadata. Use the alternative-source continue action for applicable failed game/loader tasks, or change the strategy in the expanded task-center settings. Adaptive concurrency reduces subsequent parallel requests after repeated connection failures; it does not change the saved maximum.

Mirror service and routing reference: [BMCLAPI by bangbang93](https://bmclapidoc.bangbang93.com/). Availability and content completeness depend on the provider.

## Local modpacks, mod lists and backups (1.2.3)

Choose Import modpack beside Import local mods under installed content, or from instance creation. Imports always create independent instances. MRPACK pins the author's game and loader versions (vanilla, Fabric, Forge or NeoForge); unsupported combinations are rejected. Optional client files are off by default, and server-only entries are excluded.

Content ZIPs can include mods, config, resourcepacks, shaderpacks, saves, defaultconfigs, kubejs, scripts, options*.txt and servers.dat, optionally inside one wrapper/.minecraft root. Confirm the author's game and loader requirements when no standard manifest exists. Known loader mismatches, explicit game versions and duplicate mod IDs are checked, not every dependency or gameplay combination. The launcher does not execute archived installation scripts. Mods and game scripts can run when the game starts; use trusted sources.

Limits: 300 MB compressed, 600 MB expanded, 256 MB per file and 10,000 entries. ZIP64, split and encrypted archives are unsupported. Displayed sizes cover pack content only. Space checks include the retained archive, content cache and installed copies plus a 1 GB allowance; game/Java/loader requirements may exceed that allowance. Authors can slim oversized packs before exporting again.

MRPACK may need network downloads from trusted sources; files are verified before installation. The original is retained at .amber-setup/local-pack.zip in the new instance. Keep it while installation is incomplete. Resume explicitly in Tasks after restart, even if the originally selected file was moved. Failed instances stay recoverable instead of being marked ready; resume, inspect or recycle them.

Instance overview shows provenance, import date and skipped items; modpack.json stores the complete installed content list. Local packs do not automatically track whole-pack updates. Try individual mod updates in a trial copy first.

A mod list records project identities, version hints and enabled states to find compatible mods again. It contains no JARs, configurations or worlds and cannot reproduce a whole pack. Use Mod migration to import/export lists. Backups restore selected instance data through Backup & recovery. CurseForge manifests are recognized but downloads are not integrated. Other launchers' full instance archives are unsupported here.

Java tools provide detection, path copying and explicitly configured instance references; this is not an exhaustive list of automatically resolved runtimes. Log tools select an instance and distinguish viewing logs from opening their folder. Pinning changes home shortcuts only.

## Visual tools and configuration editing (1.3.0)

Accounts show the skin head with its hat layer; click the avatar to refresh. Failed requests retain a matching cache or default avatar. Third-party textures are restricted to the provider host or Minecraft textures host.

Tools → Screenshots shows all or one instance, sorts by file time, and groups by date or instance. Open a thumbnail for zoom, previous/next, copying or locating the original. Groups do not move files.

Instance content → Dependencies opens the themed draggable graph. Search, zoom, filter required/optional/conflict declarations and reset placement. Lines point from a mod to its dependency. Fabric/Quilt declarations and recorded install relationships are shown; unsupported or unresolved declarations are unknown, not proof of compatibility. Dragging never changes installed mods.

Tools → File editor opens config/defaultconfigs/kubejs/scripts and supported root text files. Tabs retain edits; Ctrl+S saves, Ctrl+F searches, and the search panel supports replacement. Line numbers, syntax colors and undo/redo are available. JSON formatting and save validation apply only to JSON. UTF-8 text up to 2 MB is supported; NBT and script execution are excluded. Stop games before saving. External changes block overwrite. Each save creates an adjacent .bak file; Backups previews old content in the editor, and Save explicitly restores it. Backups may contain private configuration values: review before sharing.

Tools → Gradient text supports multiple color stops and positions, reversal, bold text and local presets. JSON is a text component; MiniMessage and hex color codes require compatible plugins. Copy or export the output. Chinese and combined emoji are segmented together.

Existing themes retain their navigation and docking positions. In large windows the side and bottom tracks are bounded, leaving extra room for the background. Theme packages are not converted.

## Selection formatting (1.3.1)

Select text in Tools → Gradient text, then apply solid color, a local gradient, bold, italic, underline or strikethrough. Clicking formatting controls preserves the selection. Mixed styles are marked in the toolbar. With no selection, formatting is disabled; enable Apply to all text explicitly to affect the document. Making a new selection returns to selection-only mode.

Clear formatting restores the base gradient and normal type. Local colors remain when the base gradient changes; applying a local gradient restarts its endpoints within the selection. Undo/redo covers typing, formatting and color changes. Pasting inserts plain text. Text is limited to 4000 UTF-16 units; combined emoji are formatted as complete graphemes.

Enter a name under Color presets & works. Save colors retains the old palette format; Save complete work includes text and styles. Works stay on this device. Loading replaces the current text after confirmation and can be undone. Save work before leaving the tool.

JSON is a Java text component, without a command. MiniMessage and hex codes depend on compatible plugins. If literal text contains plugin color codes, hex export is blocked: use JSON or MiniMessage to preserve it. Preview uses the launcher font; the game's font and rendering may differ.

## 1.3.2

[Server and online workspace guide](SERVERS.md)

1.3.3: download feedback is shown in a bottom panel and fades out five seconds after success, with a manual close button. Use Tasks for history. Ctrl+K searches the active local/server workspace; mode switching keeps servers running. Screenshots in either mode belong to local game instances.

## Seed map, gradient studio and original-launcher import (1.3.4)

**Seed map:** open Tools → Seed map in either workspace. Enter a numeric/text seed, select the matching Java generator version and dimension, and use X/Z to locate a position; Y selects the biome slice. View map applies these fields. Drag to move continuously, use the wheel or +/− to zoom, and read the scale at the lower left. Surrounding areas generate in the background. Biome selection (with searchable options), structure filters and marker controls are above the map. Enter a marker name, choose Add marker and click the map. Saved markers jump to their coordinates and can be exported/imported as JSON (up to 500). Read level.dat loads the seed and spawn without modifying the world; confirm the version when it cannot be matched.

The map predicts supported Java vanilla generation, not explored chunks. It includes three dimensions and selected versions from 1.7.10 to 26.3, not Bedrock or custom generators. Relief is approximate height shading, not block-accurate terrain. Structure placement may differ with terrain, datapacks, mods and mixed-version worlds. Zoom in for slime chunks and dense structures. The bundled Cubiomes/xpple engine works offline; seed and marker data stay local.

**Gradient studio:** edit text on the left and colors/output on the right (stacked on narrow windows). Use the color square and hue bar, edit HEX colors, import HEX/CSS palettes or try random colors. Existing selection formatting, local gradients, undo/redo and saved works remain available. Choose one of seven output formats and copy or export. Plugin formats require the target plugin; preview colors do not imply support by every Minecraft version.

**Import .minecraft:** in Local → Instances, choose Import .minecraft, then select the original launcher folder and a recognized profile. Review the game, loader, source game directory and content groups, name the new instance, and choose Copy and install. Supported Vanilla/Fabric/Forge/NeoForge profiles are rebuilt from trusted metadata; verified local libraries/assets are reused. Custom gameDir and inherited versions are recognized. Close the source game before copying. Accounts, credentials and arbitrary launch arguments are not imported. The original folder stays intact; this is an independent copy, not a linked/shared game directory. Unknown custom clients are reported as unsupported.

Cancellation or a later download failure preserves source files and may leave a partial new instance. For interrupted copying, import into a fresh instance before removing the partial copy. Prepare Java through the usual launch controls. Keep independent world backups; launcher import checks do not establish mod/game compatibility.

## 1.3.5: offline names, skins and platforms

Expand an offline identity's Edit name and skin controls in Accounts. Names use 3–16 ASCII letters, digits or underscores. Saving preserves the UUID. Import 64×64 or classic 64×32 PNG; slim arms require 64×64. Change the model or reset to the default skin. Name-based servers may treat a renamed player as a new character.

AMBER still requires linked ownership and a valid offline lease; AmberE has no Microsoft sign-in. Skins are stored in the encrypted account record and served locally to the game. The compatibility component downloads on first use and is cached thereafter. Keep the launcher running; other players do not automatically see the skin.

Use EXE on Windows, the matching CPU ZIP on macOS, and the package manager for the Linux DEB and dependencies. Linux requires a configured desktop keyring. FreeBSD is a server/tools experiment without full game-client support. See [platform setup and validation](../prototype/PLATFORMS-1.3.5.md). Encrypted accounts cannot be copied across operating systems as portable credentials.


## 1.3.6 crash analysis

In Tools → Logs & diagnostics, select an instance and choose Analyze latest run, or import a .log / .txt file up to 2 MB. Abnormal exit views also show analysis. Expand Log evidence to inspect the source. Unknown errors remain explicitly undiagnosed.

Rules cover Fabric missing/incompatible dependencies, required dependency messages, plugin dependencies, Java versions, memory reservation/exhaustion, port binding, damaged JARs, graphics initialization and declared conflicts. Mixin failures are only possible causes. Run timestamps exclude old logs; import manually when no run record exists. Analysis never installs/deletes mods or changes settings.

## 1.4.0 protection and server management

Local Instances → Manage → Backup and restore offers daily pre-launch, normal-exit and pre-mod/loader-update snapshots. Online Instances → Manage → Backups & client offers daily pre-start, normal-stop and pre-core/mod/plugin-install/update full snapshots. Policies are opt-in and per instance. Running worlds are never copied; forced or failed exits do not trigger normal-stop backups.

Set count and capacity retention; pin important records. Manual/pinned snapshots are retained and at least the newest automatic snapshot is kept. Backup failure blocks the protected launch/update. Refresh backups to see new records. Restore creates an independent instance; restored servers get a different port and disabled automatic protection. Same-disk backups do not replace an off-device copy.

Upgrade a local MRPACK or a known Modrinth pack after reviewing local edit/deletion conflicts; preparation creates a new instance and can resume after failure. Server player actions and saved commands use the console; verify its response. Link a client to compare recognized environment declarations, preview missing dependencies and launch into the local server. Shared manifests contain versions and mod sources, without worlds, accounts, server addresses or room secrets; imports create independent instances. Unknown content requires manual review; declared dependencies do not prove full compatibility.

Crash dependency repair opens compatible search and installation previews for user confirmation; nothing is silently installed.

## 1.4.1

Choose Modrinth or CurseForge in Content. Compatible files and dependencies are previewed before installation. Author restrictions are respected; CurseForge manifest ZIPs import into independent instances.

Online → Players refreshes on entry and periodically while visible. Only the roster scrolls; the fixed footer adds a name to the whitelist without requiring the player to join first. Actions require a running server. Choose a row action and Execute; review console feedback. Avatars use public skins for known UUIDs, with placeholders on failure. Real Ping needs the optional Paper/Spigot/CraftBukkit bridge: stop, install, then restart. Vanilla/Fabric or no bridge shows Unavailable.
