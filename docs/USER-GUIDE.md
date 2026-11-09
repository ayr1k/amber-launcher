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

Settings → Downloads → Download connections offers **Automatic**, **Official sources first**, and **Mainland China optimized**. Automatic compares lightweight connection probes and caches the choice for ten minutes; it does not detect location or promise a speed increase. Official-first and Mainland-China modes use the other source on failure unless fallback is disabled under More download settings. Only explicitly supported Minecraft metadata, assets and Maven URLs are mirrored. Modrinth, Java providers and authentication retain their own sources; CurseForge content is available alongside Modrinth.

The task center shows source, transferred bytes, current speed and file details. Pause acts on active download stages, retaining the install lock and downloaded fragments. Resume continues the task; Cancel also works while paused. Preparation, extraction and installation finalization cannot be paused. Speed is an observation, not a guaranteed rate; totals can grow as later installation stages are discovered.

Partial files end in `.amber-<hash>.part` and stay beside their intended downloaded file. A matching range response can resume them; unsupported ranges restart that file. Expected size and hash are verified before a partial becomes an installable file. A failed checksum discards the partial. Cancelling does not delete completed files. Closing the app does not automatically restart tasks at next launch: use Continue in the task center. Complete setup/content plans and standalone game/Java tasks are recoverable; one-off content updates may require returning to the instance to check updates again.

Check download connections probes public Minecraft, BMCLAPI, Modrinth and Fabric endpoints. It sends no account or instance information and does not test all downloads. The copied report contains only service names, status and elapsed time. Normal network providers still observe connection metadata. Use the alternative-source continue action for applicable failed game/loader tasks, or change the strategy in the expanded task-center settings. Adaptive concurrency reduces subsequent parallel requests after repeated connection failures; it does not change the saved maximum.

Mirror service and routing reference: [BMCLAPI by bangbang93](https://bmclapidoc.bangbang93.com/). Availability and content completeness depend on the provider.

## Local modpacks, mod lists and backups (1.2.3)

Choose Import modpack beside Import local mods under installed content, or from instance creation. Imports always create independent instances. MRPACK pins the author's game and loader versions (vanilla, Quilt, Fabric, Forge or NeoForge); unsupported combinations are rejected. Optional client files are off by default, and server-only entries are excluded.

Content ZIPs can include mods, config, resourcepacks, shaderpacks, saves, defaultconfigs, kubejs, scripts, options*.txt and servers.dat, optionally inside one wrapper/.minecraft root. Confirm the author's game and loader requirements when no standard manifest exists. Known loader mismatches, explicit game versions and duplicate mod IDs are checked, not every dependency or gameplay combination. The launcher does not execute archived installation scripts. Mods and game scripts can run when the game starts; use trusted sources.

Limits: 300 MB compressed, 600 MB expanded, 256 MB per file and 10,000 entries. ZIP64, split and encrypted archives are unsupported. Displayed sizes cover pack content only. Space checks include the retained archive, content cache and installed copies plus a 1 GB allowance; game/Java/loader requirements may exceed that allowance. Authors can slim oversized packs before exporting again.

MRPACK may need network downloads from trusted sources; files are verified before installation. The original is retained at .amber-setup/local-pack.zip in the new instance. Keep it while installation is incomplete. Resume explicitly in Tasks after restart, even if the originally selected file was moved. Failed instances stay recoverable instead of being marked ready; resume, inspect or recycle them.

Instance overview shows provenance, import date and skipped items; modpack.json stores the complete installed content list. Local packs do not automatically track whole-pack updates. Try individual mod updates in a trial copy first.

A mod list records project identities, version hints and enabled states to find compatible mods again. It contains no JARs, configurations or worlds and cannot reproduce a whole pack. Use Mod migration to import/export lists. Backups restore selected instance data through Backup & recovery. CurseForge manifest ZIPs can be downloaded/imported with dependency previews; author download restrictions are respected. Other launchers' full instance archives are unsupported here.

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

**Import .minecraft:** in Local → Instances, choose Import .minecraft, then select the original launcher folder and a recognized profile. Review the game, loader, source game directory and content groups, name the new instance, and choose Copy and install. Supported Vanilla/Quilt/Fabric/Forge/NeoForge profiles are rebuilt from trusted metadata; verified local libraries/assets are reused. Custom gameDir and inherited versions are recognized. Close the source game before copying. Accounts, credentials and arbitrary launch arguments are not imported. The original folder stays intact; this is an independent copy, not a linked/shared game directory. Unknown custom clients are reported as unsupported.

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

## 1.4.2: Quilt and Sakura Frp

Choose Quilt in guided/manual creation, loader setup, supported pack imports or server creation. Quilt mod catalogs and dependency resolution also accept Fabric builds, preferring native Quilt builds while preserving author-pinned dependency versions. This does not guarantee every Fabric mod or mod combination works on Quilt.

Online → Connections offers EasyTier and Sakura Frp tabs. For Sakura, create a TCP tunnel on its dashboard targeting 127.0.0.1 and the server port. Download the official component, save your access token and this instance’s tunnel ID, start the server, then start the tunnel. The token is encrypted locally. The launcher obtains configuration through the official API with TLS verification and passes it to frpc without storing plaintext configuration. Wait for Connected before sharing the public address. Check connection tests the API, installed component and saved tunnel configuration; detailed logs remain available. Stop the tunnel before changing its saved configuration.

## 1.4.3: download concurrency and server recycling

In Settings, choose up to 128 simultaneous file downloads. The default remains 8; existing settings are retained. Tasks share one budget, and new tasks receive available slots fairly. Limits decrease after network failures or rate limiting and recover after successful files. This does not split one file into multiple ranges; try a lower value if the connection or provider becomes slower. Server content and dependencies download in parallel before the existing verified installation step.

In Online → Instances, Delete moves an instance into the application recycle bin. Stop the server and its tunnel and finish or cancel associated jobs first. In Recycle bin, restore the instance; if its port is in use or assigned elsewhere, choose another port. Restoration does not start the server. Permanent deletion requires the exact instance name and removes its worlds, configuration and content. Separate backups and shared Java/download caches are retained.

## 1.4.4: server updates, performance and download controls

In Online → Instances → Content → Check updates (also available under Content downloads → Installed content), check compatible Modrinth/CurseForge updates, lock versions and preview selected changes and dependencies. Stop the server before installation or restoration. The configured automatic backup policy applies; verified recovery copies retain previous content. Direct recovery requires unchanged post-update files and does not restore configuration or worlds. Manual files without source records require manual management.

The online launch page shows ten minutes of CPU, working-set memory and supported TPS/MSPT trends. Stop the server to install/update the performance/player component, then restart it. Paper supplies real tick metrics; unsupported cores show unavailable values. Collect a 30-second local report and explicitly export JSON when needed. Reports contain bounded numeric samples and event categories, are not automatically uploaded, and cannot prove which plugin caused lag.

Settings / Task center provides global bandwidth in KiB/s (0 means unlimited), actual active/queued transfer counts and priority. Priority takes the next available slots without interrupting current transfers. The limit applies to file download bodies, not all application network traffic.

## 1.4.5: screenshot viewer and server launch layout

Tools → Screenshot browser opens images in a themed viewer with a fixed header and toolbar. Choose Fit to see the complete image or 100% for original pixels; zoom, pan, use arrow keys to switch images and Esc or Close to exit. Delete is available on screenshot cards and in the viewer. After confirmation, the image goes to the operating system trash; recover it there if needed. Failed deletion leaves the file intact. Deleting the current image selects its neighbour; deleting the last image closes the viewer. Screenshots stay local.

In landscape windows, the online launch page keeps the console on the left, four compact performance cards in a 2×2 grid on the right and core/launch settings below. Only the console scrolls internally. Open performance explanations, reports and maintenance in separate panels. Narrow/portrait windows stack the console before performance and settings, with normal page scrolling.

## 1.4.6: existing-game setup and feedback

On first run, choose “I already play Minecraft” to import an existing game folder or supported local modpack. Review the detected version, game directory and selected content. Import creates an independent copy and preserves the source. If you leave setup to configure an account, use “Continue to create or import a game” on the account page; this remains available after restarting. Creating/importing a game or explicitly skipping completes onboarding. Account eligibility rules still apply.

Open About or Settings → Language/privacy to prepare feedback. Fill in steps, expected result and actual result. Diagnostics are excluded by default: inspect the summary and explicitly select inclusion if needed. Generate and review the redacted preview, copy it, then open GitHub and submit it yourself. Each edition opens its own feedback repository. No draft or diagnostic content is sent in the URL. Changing an input or consent clears the old preview. Redaction is best effort; review personal details before sharing.

## 1.4.7: tray behavior and server schedules

In Settings → Data & onboarding, choose what closing the window does: keep the launcher in the tray while a server is active (default), always use the tray, or quit. Restore the window or choose Quit from the tray menu. Explicit quit still uses the existing shutdown protections. Linux and systems where tray creation fails minimize to a taskbar entry so the window remains accessible. Schedules require the launcher to keep running; closing to the tray does not stop them.

Open Tasks → Server schedules and add a task. Choose a server, name, action (normal restart or one console command) and frequency: one-shot, daily local time such as 12:00, or a fixed interval in minutes. Save, edit, pause/enable or delete from the task card. The panel shows the current time zone, next run and last result. Daily schedules follow the computer's time zone; interval countdowns restart when the launcher starts or the task is saved. Exiting the launcher or sleeping the computer prevents execution, and missed occurrences are not replayed. Offline targets and busy instances are skipped rather than queued.

A scheduled restart sends a normal stop and waits up to two minutes for exit and automatic exit backup. Backup runs without holding the restart lock; the original run is revalidated before launch. Timeout, cancellation, backup failure, manual stop, application exit or a replacement run prevents automatic restart. Pause aborts pending restarts, but a command already sent cannot be withdrawn. Commands are one line sent to the server console, never operating-system shell commands; a successful result confirms submission only. Inspect the effects of your chosen commands on players and worlds. Library migration pauses and drains scheduling; sleep/resume cannot bypass that hold. Real world/plugin shutdown and long-running scheduling need acceptance in the intended server environment.

## 1.4.8: startup feedback and large downloads

The launcher shows a small loading window before the main application starts. Its text describes real preparation stages rather than a simulated percentage. The main window appears once initial data, language and rendering are ready; no minimum animation time is imposed. If the configured game library is missing, use the existing retry, locate or quit choices. The startup window does not create a replacement library. Its appearance follows cached display preferences and localized labels; that cache cannot choose your game-data location.

Eligible files with a declared hash and known size of at least 32 MiB can download in up to four resumable ranges. These requests share the existing connection count and overall speed limit with other downloads. Small/unknown files, an existing serial partial, a single-connection budget or insufficient temporary space use the serial path. Servers that ignore or reject ranges, invalid range metadata or transfer failures fall back safely. Every completed file still requires final integrity verification.

Keep enough free space: assembly can temporarily need about twice the file size. Pause, resume, cancellation, retry and source fallback remain available. Known fragments for the current file hash are removed after success; a cleanup failure does not discard a verified download or trigger a redownload. Automatic segmentation does not promise a speed increase when server total bandwidth or the application speed cap is the bottleneck. The task's controlled benchmark and startup evidence are linked from [the 1.4.8 acceptance record](../prototype/LOCAL-TEST-1.4.8.md); they do not measure all networks, real CDNs or OS cold starts.

## 1.5.0: instance services, tunnels and account tools

Open an online instance's management page to record additional TCP/UDP ports or prepare its local database. The main game port comes from server.properties. Port records do not configure plugins, open firewall rules or prove public connectivity. MySQL Community 8.4.13 is an optional Windows x64 download of about 268 MiB; no system service or existing system MySQL is modified. It binds only to localhost and supplies a restricted plugin account. Each instance has its own process, port, data and encrypted credentials. Copy the displayed connection details into the intended plugin configuration yourself; switching the viewed instance does not stop its services.

Stop the database before backing it up or restoring it. Database backups are separate from ordinary server/exit snapshots and instance copies. Independent backups under database-backups150 remain after permanent instance deletion; unbacked-up current data does not. The instance list's database backup library can restore an orphaned backup into an empty instance with the original ID, retaining the backup and leaving the database stopped. This restores no world, plugin or original server files. The original OS user's credential context is required; backups are not portable password-free exports. Restore retains the replaced data. If recovery assigns a conflict-free port, update the plugin's connection port as directed. Corrupt, redirected or unrecognized migration staging is retained and reported rather than silently discarded.

Use the existing Sakura page to associate individual tunnels or explicitly create a remote tunnel. Select a compatible instance port and provider node/protocol. Provider membership, quota and authentication requirements remain authoritative. Removing a local association does not delete the provider tunnel; remote deletion requires its own confirmation. When a remote result is uncertain, use the retained operation record to reconcile it before retrying. Local checks and simulated tests do not establish public connectivity or prove a real provider mutation succeeded.

Account details show account type, available operations, a 3D skin preview and locally observed playtime. Local skins are not guaranteed to be visible to others. Upload is initiated explicitly and requires a supported account/provider; AmberE exposes no Microsoft login or upload bridge. Offline renaming retains the UUID, though name-based servers may behave differently. New launch sessions retain their original local account ID; selecting another account, renaming or refreshing tokens does not reassign history. Older unassigned records remain historical. Observed runtime can include idle time and is not official cross-device playtime; the existing history privacy switch still applies.

The offline enchantment calculator in Utilities uses a pinned upstream snapshot, fresh equipment/books and zero prior-work penalty. Choose at most ten compatible enchantments; it returns merge order, levels and XP with a 39-level ceiling for each operation. XP assumes each operation starts at zero levels. It does not automatically match the selected game's version, combine lower-level books, or model existing enchantments, repairs, renaming, Bedrock or modded rules. Computation can be cancelled and is time bounded. Source, licenses, migration details and original acceptance limits are recorded in [the 1.5.0 task record](../prototype/LOCAL-TEST-1.5.0.md).

## 1.5.1: importing an existing .minecraft directory

Keep the original game and launcher closed throughout import. Choose the source .minecraft directory and version/profile. Custom IDs and display names are not assumed to be official Minecraft versions: recognized JSON, inheritance and loader evidence identify the base version, which is still checked against official game/loader catalogs. If evidence is absent or conflicting, explicitly select an official version. A catalog connection failure is different from a verified unsupported combination. Unknown entry classes, broken/cyclic/missing inheritance and conflicting loaders remain blocked; the importer does not execute original scripts or JARs to guess a version.

Confirm the data source separately. A configured gameDir, shared root and selected-version directory are different candidates. Multiple candidates require a choice. When a configured folder is missing, moved or unreadable, the version remains selectable and shows its original path/reason, but no alternative is silently selected. Correct the folder using the OS picker and obtain a fresh preview. Unsafe links/junctions remain blocked. Shared data may belong to several profiles: confirm the displayed source before copying.

Review the resolved game/loader, chosen content, file count and exact bytes. Zero selected files require explicit consent to create only the runtime; this is not a completed data migration. Execution must use a current preview whose version metadata, selected files, sizes, timestamps and hashes still match. If anything changes, preview again. Copying reads the source and verifies both source hashes and destination bytes; failure/cancellation leaves partial content in the newly created instance for recovery rather than altering the original. Other version directories and top-level account files are not traversed as selected content.

Recognized clients are recreated from official runtimes; arbitrary original JVM/client modifications are not replayed. Existing synthetic Windows acceptance does not confirm your real installation, huge libraries or live gameplay. Preserve the original files. Behavior, fixtures and limitations are documented in [the 1.5.1 task record](../prototype/LOCAL-TEST-1.5.1.md).

## 1.5.2: room client environment synchronization

In Connections → EasyTier room, expand Client environment synchronization. It starts disabled. The host chooses a stopped existing client and selected mod JARs/top-level text config, checks compatibility/private data and affirms redistribution permission where host transfer is required. Select all mods adds only eligible mods and retains config choices; it changes nothing if all additions cannot fit the 500-file total (including config). At capacity, remove selected entries to free slots. Do not drop necessary dependencies to fit. Limits are 64 MiB per file and 1 GiB total selected content.

Guests must obtain the invitation from the intended host, preview versions, per-file sources and content bytes, then confirm. Runtime/Java/loader downloads add to that displayed content size. Identified files use the original platform with exact verification; missing credentials, download URLs or distribution restrictions block transfer, without a host fallback. Trust the host and review files: signatures and hashes do not make mods safe. Invitation holders can access the room; there is no per-player ban list.

Each confirmed revision creates a new instance; it does not overwrite an existing instance, save or personal configuration. Verified caches survive restart. After failure/cancellation, return to the room and preview/confirm again; partial host files restart, a new instance is created and the incomplete one remains for inspection/removal. Generic retry cannot bypass unfinished synchronization. Completed valid instances use ordinary task recovery. Preview differences currently last only for the session.

Disabling sharing revokes synchronization and cancels incomplete setup while retaining game forwarding; completed instances remain local. Normal account authorization still applies to launching/joining. Common single loaders, selected mod JARs and top-level text config are supported. Saves, accounts, databases, logs, launch settings, disabled mods, resource/shader packs and nested config are excluded. Real cross-network/gameplay and live platform-service acceptance remain outside the existing synthetic/local evidence. See [the 1.5.2 task record](../prototype/LOCAL-TEST-1.5.2.md).

## 1.5.3: expanded sharing and restart recovery

This section updates the 1.5.2 content and capacity limits above. Both peers should use 1.5.3 for the expanded content/limits; older peers may safely reject them. Sharing remains off by default, with individual host selection/review and guest preview/confirmation. You can now select resourcepacks/*.zip, shaderpacks/*.zip and text config in JSON/TOML/properties/CFG/INI/YAML/YML formats up to six nested directories. Archives are copied intact, not extracted or enabled. Inspect every file/archive for private content, compatibility and distribution rights. Original-platform category/game-version checks and mod loader checks still apply; restricted/unavailable downloads never fall back to host transfer, even from cache.

The limits are 2,000 total selected files, 256 MiB per file, 4 GiB selected content, 1 MiB per config file and a 4 MiB signed transmission envelope. Source scanning is bounded to 20,000 entries and paths to 200 JavaScript string units. Both host snapshot and guest preparation check free space plus 64 MiB headroom; runtime/Java/loader downloads need extra space. The total shown is selected content, not the entire eventual installation size.

After interruption or cancellation, preview and explicitly confirm the current signed revision again. Verified caches and hash-keyed partial downloads persist across restart; host transfers resume supported ranges and install only after complete size/SHA-256 verification. Withdrawal, expiry, departure or a changed revision still cancels setup. Generic Task Center retry cannot bypass unfinished room authorization.

For the same revision, an unfinished instance can resume only if receipt, setup plan, runtime and selected destination files remain consistent. Conflicts, missing/corrupt records or changed selected files block automatic reuse. Explicitly choose to preserve the original and create an independent instance; nothing silently overwrites those local edits. An interrupted local copy with conflicting destination bytes also needs that choice. New revisions always use independent instances; differences are measured against the last completed environment across restart. Keep the previous instance for rollback. History contains no invitation token or account data. Instances, caches and snapshots are not automatically deleted. Real cross-network/gameplay/live-platform and full 4 GiB modpack acceptance remain unverified; see [1.5.3 task evidence](../prototype/LOCAL-TEST-1.5.3.md).

## 1.5.4: storage maintenance and filtered lists

In Settings → Data & onboarding, scan storage before using update-cache cleanup. Totals include room synchronization, server instances and server recycle storage, deduplicate hardlinks, and exclude unlisted/inaccessible paths and link targets. Incomplete rows keep their warning. Logical file bytes and expected removed bytes do not guarantee an equal change in physical free space.

Only complete updates recorded by the new downloader qualify: a valid receipt must match the file size, SHA-256, product, filename and a version no newer than the installed application. Existing downloads without receipts may leave nothing eligible until a later download/upgrade. Partial downloads, future installers and unknown files stay. Inspect the exact file list and redownload consequences in the native confirmation dialog. Active tasks or ready-to-install updates block cleanup; every file is checked again at execution. Cancellation and failures can leave partial completion, which is reported explicitly.

There is no automatic cleanup. Worlds, instances, accounts/settings, backups, databases, runtimes, recycle bins, room snapshots/recovery journals/fragments and content/loader caches with uncertain references remain protected. Existing explicit recycle operations are separate. Do not use storage subtotals as proof that unrelated folders can be deleted.

Installed-content selection clears when search, type, state or instance changes. Select-all covers the entire filtered result, excludes missing files and retains the 200-item limit. A missing record can still use its own explicit Remove action and confirmation. Filter changes invalidate existing and delayed previews; refresh preserves still-present selections. Instance, content and task density are independent and remembered; task search matches names/phases. Only the short density label or actual selector opens its menu. The shared-environment import control appears immediately below the instance heading.

Existing acceptance used isolated synthetic data, not real game/account data or cleanup of personal libraries. Native non-Windows desktop, every custom theme/DPI, actual installer upgrades and physical disk-space accounting remain unverified. See [1.5.4 task evidence](../prototype/LOCAL-TEST-1.5.4.md).

## 1.6.0: launch plans, component choices and memory

Settings → Operation & memory stores the default Local/Online workspace and startup page; incomplete onboarding recovery takes priority. Memory optimization is Windows-only, manual and off after restart. Conservative trims only the launcher main process; Aggressive includes its owned Electron children and requires a Cancel-default warning both on selection and each execution. Identity/creation-time checks reject missing, reused, exited or denied targets. It does not target games, Java, servers, databases or other applications; it does not elevate, terminate processes or purge system caches. Memory may return immediately, with page faults, stutters or disk pressure. It cannot promise FPS improvements, permanent savings or JVM leak repair. The feature was suggested by Bilibili user @萨拉赫蒙-十恶不赦 (UID 2003495984).

Use Server launch → Launch program planner to add, reorder and save 1–128 modules per instance: selected Sakura tunnel, MySQL, server startup/readiness, 0–3600-second delay, one server command or normal stop followed by verified backup. Existing service choices migrate without deleting the old file; copied instances do not inherit plans or service bindings. Server/tunnel/command readiness and normal-stop waits accept 1–3600 whole seconds, default 120. These timeouts do not cover entire downloads, MySQL internal startup, external calls or an ongoing verified backup copy. There is no arbitrary step resumption, script or loop support.

Start uses the saved sequence and reserves the instance against conflicting work. Failure/timeout skips later steps; late readiness never automatically resumes or repeats commands/backups. Cancel interrupts waits; in-flight safe start/copy operations finish, leaving already-started services unchanged. Use normal service controls afterward. Restarting the launcher does not resume/replay the plan. Tunnel connection is distinct from server readiness and remote gameplay. Command status means sent, not verified effect.

The backup module requires normal server shutdown and completed saving, then creates the existing hash-verified snapshot; stop failure/timeout skips copying. MySQL data uses its separate database backup workflow. Cancellation during copying waits for snapshot completion. Restart requires an explicit later server module. This is not live-world backup. Default window close goes to tray when a server or network connection is active and exits otherwise; explicit Quit and custom policies remain. Exit waits for normal saving/backups before cleaning up owned services; errors prevent falsely reporting completion.

Server creation/Core maintenance expose upstream game versions and Paper/Fabric/Quilt selections, subject to actual available artifacts, game compatibility and verification. EasyTier versions must have verified official artifacts and pass a local capability probe before switching; this does not certify multiplayer compatibility. Active/pending rooms block switching; failures retain the existing choice. MySQL's curated Windows x64 catalog currently offers 8.4.13 and 8.4.11 for new databases; it is not the full set of usable 8.4 releases. Existing databases/backups retain their creation version, with no in-place upgrade/downgrade. Other entries require verified official archive metadata. Sakura historical binary selection remains incomplete, not established as unsupported by the provider.

Existing separate task review used isolated fixtures, UI checks and selected real component checks. These do not establish live cross-network gameplay, production commands, long-term service/memory benefits, native non-Windows behavior or installer-over-stable migration. See [1.6.0 task evidence](../prototype/LOCAL-TEST-1.6.0.md).

## 1.6.1: map, gradient and editor workspaces

Wheel zoom keeps the world location under the pointer anchored; toolbar zoom remains centered. Keyboard movement uses the current camera and clamps the same world edges as pointer movement. Camera precision remains fractional, but coordinate input drafts are rounded/clamped integers; explicit submission applies the displayed values. Manual fractional coordinates remain invalid. This permits changing seed or generation version after zoom without an invalid integer-input step.

Imported world metadata preserves a spawn height of zero and explicitly distinguishes missing spawn coordinates. Imports switch to the Overworld; approximate generation-version matches are labeled, and unsupported versions need manual selection. Relief is estimated from engine samples, with two-dimensional distance-normalized shading. It is not measured terrain from an existing save.

Structure filters depend on generation version and dimension; unsupported choices are disabled. Current-scene/view results are deduplicated and distance-sorted, with at most 100 displayed rows. Click a result to center the map. Empty, hidden or incomplete results do not prove no structure exists. Turning off all supported filters skips structure searching; reduced calculations and small local timing samples do not establish general speed or FPS gains. Always verify predictions in the actual game.

Map basics span the top; wide windows place the map beside internally scrolling settings. Gradient output format sits beside the title, with editing/preview/local color left and base gradient/output right. The overview band remains 16px high, and notices remain separate from output. Narrow windows stack and scroll to preserve access. The file editor retains its existing arrangement, adapting to remaining height with minimum usable space and scrolling.

Existing task review and scoped evidence are retained without another content review. No personal world was opened or modified in those checks; real-world generation, multiplayer, installer-over-stable migration and native non-Windows runtime are not established. Cubiomes keeps its MIT notices; no Axolotl GPL application code/assets were copied. See [task evidence](../prototype/LOCAL-TEST-1.6.1.md) and [layout evidence](QA-1.6.1-LAYOUT.md).

## 1.6.2: structure navigation and saved map markers

Select a structure icon or a keyboard-accessible result to view details, copy its coordinates, center the map or save a marker. Overlapping points offer a choice. Coordinates are predictions, not scans of saved terrain. Copy/export and saved markers preserve native coordinates up to ±31,000,000; map navigation alone clamps the camera to ±29,899,999 and explains the adjustment. Actual borders, terrain, mods and datapacks can differ.

In the Overworld, Locate nearest stronghold chooses the nearest biome-validated staircase chunk from all 3 pre-1.9 or 128 newer-version candidates, including candidates outside the viewport. It does not locate the portal room. Enable at least one structure filter for calculation. Click a sampled biome legend entry to highlight it, and click again to clear; small biomes may not appear in the sample.

Read each structure type's status before interpreting results. A region grid above 1600 is skipped, and reaching 1200 total features truncates remaining scans. Loading, failure, incomplete coverage, unsupported types and completed empty scans are distinct. The visible list separately caps at 100 nearest matches. None of the incomplete states proves absence.

New markers belong to a seed, generation version and dimension. Switching context hides unrelated markers without deleting them. Legacy markers stay saved but require explicit linking to a version before map display; export them before linking if you need the original metadata. Repeatedly saving the same named point is idempotent. See [the task guide](../prototype/LOCAL-TEST-1.6.2.md) for original evidence and limits.

## 1.6.3: compare and recover instance-file edits

Tools → File editor shows full paths, unsaved state, UTF-8/BOM and line-ending details. Same-name tabs are disambiguated. Refresh files updates the tree without replacing open drafts; Go to line navigates the current document. Existing allowed paths, the 2 MB size limit and running-instance protections still apply. Mixed line endings are view-only: normalize externally, then reload if needed.

Compare disk / reload displays the current draft beside disk and identifies the first differing line. Cancel keeps the draft; reload requires confirmation. Backups also compare before confirmed loading, and loading does not write the file until Save. Restore previous draft can recover a replaced buffer during the current editor session only; closing the tab or leaving the editor discards that history. This is not a persistent crash-recovery journal. Manually combine wanted changes; there is no automatic merge or force-overwrite control.

Backup history uses the creation timestamp encoded in valid legacy or UUID backup names, without rewriting older backup bytes or mtime. Narrow windows and wrapped toolbars allow comparisons to flow below the editor; scroll to reach both panes and their actions. Stale reads must not select or change another tab.

Save checks expected content and preserves the displaced file before exclusively creating the replacement. Stop other writers: this is not absolute cross-process locking or a power-loss transaction. The destination is briefly absent between displacement and commit; a crash can require manually restoring the adjacent `.amber-edit-<time>-<uuid>.bak`. Filesystems without hard-link support fail safely and retain a recovery copy. Do not infer real IME, full installation/upgrade, abrupt-power-loss or non-Windows desktop acceptance from the automated checks. See [task guide](../prototype/LOCAL-TEST-1.6.3.md) and [existing evidence](EDITOR-1.6.3-EVIDENCE.md).
