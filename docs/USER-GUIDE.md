# User guide

[简体中文](zh-CN/USER-GUIDE.md)

**First run:** choose a language and game-data location. AMBER directs you to Accounts to verify official Minecraft Java eligibility; you can skip this step to manage instances but cannot launch without eligibility. AmberE can create an offline identity immediately and also supports third-party accounts. It has no Microsoft sign-in. The editions use separate data directories. Minecraft API access for AMBER has been approved. Launch continues to verify eligibility. Approval is not an endorsement by Mojang or Microsoft.

**AMBER account eligibility:** Microsoft and linked third-party launches verify the official account online. After successful verification you may explicitly create an offline identity with the official name and UUID. Its encrypted eligibility cache lasts at most seven days, does not renew offline, and is invalidated by a detected clock rollback or subsequent definitive authorization/ownership denial. Removing the linked owner blocks use. Legacy unverified offline accounts remain listed but cannot launch; existing instances and saves remain intact. This cache policy is not approval from Mojang. See [testing and limitations](TESTING.md).

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
