# User guide

[简体中文](zh-CN/USER-GUIDE.md)

**First run:** choose a language and game-data location. AMBER directs you to Accounts to verify official Minecraft Java eligibility; you can skip this step to manage instances but cannot launch without eligibility. AmberE can create an offline identity immediately and also supports third-party accounts. It has no Microsoft sign-in. The editions use separate data directories. Minecraft API access for AMBER has been approved. The user has successfully tested Microsoft licensed sign-in. Launch continues to verify eligibility. Approval is not an endorsement by Mojang or Microsoft.

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
