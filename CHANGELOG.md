# Changelog

[简体中文](docs/zh-CN/CHANGELOG.md)

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
