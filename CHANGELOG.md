# Changelog

[简体中文](docs/zh-CN/CHANGELOG.md)

## Beta 1.9 — 1.0.0-beta.10 (prerelease)

- Add guided creation with a saved questionnaire, local hardware information and explained, editable setup recommendations; preserve manual creation and add direct Modrinth modpack creation.
- Apply server version/loader constraints, required projects, client environment, dependencies, declared incompatibilities, shader support and resource budgets before ranking whole setups.
- Keep required dependencies selected by default with explicit opt-outs and risk acknowledgement; allow optional dependencies and root removal with a new combined check.
- Pin file versions, hashes and sizes for resumable installation across restarts. Separate mod, resource-pack and shader stages; allow an explicit skip of remaining visual packs.
- Retain the creation plan in instance management, suggest per-instance memory and support Chinese/English text, themes and keyboard navigation.

Recommendations use curated rules and live metadata, not automated gameplay testing. Visual packs are downloaded only and must be enabled in game. Windows installers are unsigned. Windows installer, source archive and SHA-256 checksums accompany this prerelease. Microsoft live acceptance remains deferred pending approval.

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

Windows x64 prerelease. Installer, source archive and SHA-256 checksums are attached to the Release. Windows x64 installer: `AMBER-1.0.0-beta.8-Setup-x64.exe`. Graphics preferences require Windows 10 2004 or newer and are shared by instances using the same Java executable. Changes apply to later launches, not running games. Windows and the driver decide the GPU actually used; a saved preference is not proof of switching. Missing renderer log lines remain “not detected.” The installer is unsigned. Microsoft live authentication remains deferred pending approval.

## Beta 1.6 — 1.0.0-beta.7

- Replace the separate system title bar with integrated AMBER window controls. Remove the default application menu so Alt no longer reveals it; retain explicit editing shortcuts and normal close protection.
- Add independent square/system-rounded window corners (next start), live theme/accent title-bar colors, and persisted window size, position and maximized state. Recover windows when a display is disconnected or its work area changes.
- Keep window controls available in onboarding and instance dialogs. Preserve edge resizing, title-bar dragging and double-click maximize/restore.
- Align checkboxes and wrapped descriptions using shared settings rows. Reorganize privacy into data locations, diagnostics/sharing and cleanup/maintenance; add path copying and clear saved/cancelled/completed feedback.
- Improve narrow-window navigation, long English text, keyboard focus and dialog spacing. Extend the Chinese/English catalog; older custom language packs fall back to English for new entries.

Windows x64 prerelease. System-rounded outer corners require Windows 11; earlier Windows uses square corners. The setting does not offer arbitrary corner radii. Standard Win + arrow snapping remains available; the custom maximize button does not provide the native Windows 11 hover Snap Layouts menu. Real Microsoft sign-in remains deferred pending API approval. The installer remains unsigned.

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
