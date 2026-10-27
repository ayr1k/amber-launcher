# Changelog

[简体中文](docs/zh-CN/CHANGELOG.md)

## Beta 1.12 — 1.0.0-beta.13 (prerelease)

- Refine the mod-update toolbar and enlarge aligned quick-search and guided-dialog close icons.
- Add an instance workspace with distinct installation, file-check and user-confirmed gameplay states, plus contextual repair and after-installation guidance.
- Create independent trial copies with a disk-space preview and optional independent world copies. Review selected configuration changes before applying them to the original; content and its manifest move together. Changed originals block promotion, and world progress/account selection are never merged.
- Record content operations and launch/visual configuration changes with verified recovery files. Detect external changes, mark a manually confirmed working state, and restore only when current files still match the recorded result.
- Recover interrupted application transactions after checking each file; refuse to overwrite unexpected external changes. Correlate explicit local log evidence with recent changes without claiming every crash can be diagnosed.
- Widen guided creation, use list/detail layouts for downloads and installed content, preserve browsing/navigation state, add a persistent task shortcut and Ctrl+K instance/action search.
- Import and export validated, text-only local recommendation preference templates. Applying an imported template still requires fresh recommendation and compatibility checks.
- Keep both editions synchronized and preserve separate authentication/data/update identities. Microsoft live acceptance remains deferred. The user accepted the local installers and authorized prerelease publication.
- Preserve the tested Beta 1.11 installers, source and pre-change workspace snapshot with SHA-256 checksums for rollback. Program downgrade does not undo gameplay changes.

## Beta 1.11 — 1.0.0-beta.12 (prerelease)

- Apply consistent non-selectable app chrome across dialogs, popovers and window controls while keeping inputs, logs, paths and errors copyable.
- Group guided questions and advanced choices, compare tier differences first and collapse shared content and the full editable list.
- Add cancellable recommendation stages and distinguish network/rate-limit failures from compatibility results.
- Autosave separate creation and addition drafts; retain preferences and review file changes when refreshing expired recommendations.
- Add local preference templates with fresh compatibility checks on use and explicit deletion.
- Group addition previews into new, existing, disabled and conflicting content; recheck changes before installing.
- Add post-install configuration guidance, content and recovery entry points for both editions. Microsoft live acceptance remains deferred.

## Beta 1.10 — 1.0.0-beta.11 (prerelease)

- Expand guided creation with functional equivalents and dependency-aware version matching, preserving exact required projects and server constraints.
- Add aggressive, balanced and conservative tiers with separate vanilla-change and resource-load indicators; balanced is selected by default.
- Expand convenience, performance, visual and explicitly selected gameplay themes, with substitution reasons and usage guidance.
- Pin inspected shader / distant-terrain combinations and author presets; unknown hardware stays conservative and existing settings are preserved.
- Add recommendations for existing instances without replacing installed versions, disabled choices, settings or worlds; retain transaction recovery and resumable tasks.
- Group content details, automatically recheck edits, retain instance names, and update both languages and custom-language templates.
- Microsoft live authentication acceptance remains deferred pending approval. Metadata and source inspection are not gameplay or GPU certification.

## Beta 1.9 — 1.0.0-beta.10 (prerelease)

- Add guided creation with a saved questionnaire, local hardware information and explained, editable setup recommendations; preserve manual creation and add direct Modrinth modpack creation.
- Apply server version/loader constraints, required projects, client environment, dependencies, declared incompatibilities, shader support and resource budgets before ranking whole setups.
- Keep required dependencies selected by default with explicit opt-outs and risk acknowledgement; allow optional dependencies and root removal with a new combined check.
- Pin file versions, hashes and sizes for resumable installation across restarts. Separate mod, resource-pack and shader stages; allow an explicit skip of remaining visual packs.
- Retain the creation plan in instance management, suggest per-instance memory and support Chinese/English text, themes and keyboard navigation.

Recommendations use curated rules and live metadata, not automated gameplay testing. Visual packs are downloaded only and must be enabled in game. Windows installers are unsigned. Windows installer, source archive and SHA-256 checksums accompany this prerelease. Microsoft live acceptance remains deferred pending approval.

## Beta 1.8 — 1.0.0-beta.9 (prerelease)

- First independent AmberE publication, derived from the shared AMBER Beta 1.8 core. The version number follows the shared core; it does not imply earlier independent AmberE releases.
- Use the approved gold-accented logo and separate Windows identity, installer, shortcuts and user-data directory.
- Provide offline and third-party accounts only. Remove Microsoft sign-in controls and exposed APIs; ship no Microsoft Client ID. Preserve instance installation, mod management, recovery, graphics preferences and other shared features.
- Direct update checks, release links and installer-origin validation exclusively to `ayr1k/AmberE`; reject cross-repository or wrong-product installers.
- Keep Chinese/English onboarding, settings and account pages aligned with actual capabilities. Brand substitution preserves user names and paths.

Windows x64 installer, source archive and SHA-256 checksums are attached. Installer unsigned. Local testers must manually install this published build once because the earlier test package used the previous update location. Offline accounts do not grant Minecraft ownership. Third-party live-service validation remains provider-specific. AmberE has no Microsoft sign-in and makes no claim of Microsoft API approval.
