# Testing and release acceptance

[简体中文](zh-CN/TESTING.md)

## Beta 1.8 checks

188 core regression tests and 4 Sites tests pass, with 1,447 bilingual messages validated. Ownership, expiry, revocation, linked accounts, repository-specific update selection and packaged startup are covered. Microsoft responses in tests are simulated; live Microsoft authentication remains deferred pending allowlist approval. The user accepted the local Beta 1.8 test build. Installers remain unsigned.

## Beta 1.7 checks

177 core regression tests and 4 Sites compatibility tests pass; 1405 bilingual messages validate. The packaged Windows application passes startup, IPC, background and system-encryption smoke checks. Browser checks cover the aligned icon-bearing picker, borderless controls, stable scenery during launch-option expansion, keyboard switching, Chinese/English, dark/light themes and narrow windows.

Graphics-preference tests cover preserving other Windows flags, restoring original values, external changes, interrupted mode switches and writes with an unknown outcome. A Windows integration check writes and restores only a new synthetic Java-path value. Actual multi-GPU game selection must still be checked in Minecraft’s F3 screen; detected adapters or an applied preference are not proof of the renderer used. Microsoft live authentication remains deferred.

Run the commands in CONTRIBUTING.md. Automated checks cover downloads and integrity, cancellation/retry, path traversal, archive extraction, transaction recovery, dependency-aware content operations, backup/restore, instance lifecycle, language packs, redaction and bounded reads. Use temporary data for tests.

For each language, verify first-run setup, version selection, loader compatibility, content search/dependency preview, instance settings, task errors and diagnostics. Change language with unfinished form input and confirm state survives. Check a small window, large text, dark/light themes and keyboard-only selection. Imported project names must remain unchanged.

Test valid, partial, malformed, oversized and placeholder-mismatched language packs. Remove the custom pack and restart. Test copying disabled, expired codes and preservation of later clipboard content using synthetic authentication responses.

The packaged desktop smoke test checks application startup, IPC, local backgrounds and system encryption compatibility. Browser fixtures are interface checks only, not evidence of real game installation. Prior game and mod integration results do not imply all loader/version combinations work. Microsoft live sign-in, refresh and authenticated launch remain deferred; third-party providers need separate live testing. No claim of exhaustive security coverage is made.

## Beta 1.6 window checks

Regression tests cover multi-monitor geometry, disconnected displays, 100–200% equivalent work areas, corrupt/oversized/linked placement files, queued persistence, settings migration, explicit window actions and editing shortcuts. A local Electron integration check covers Alt-menu removal, maximize/restore, close-event cancellation and persisted geometry. The desktop smoke also exercises the new window-state IPC.

Verify Chinese/English in light/dark themes at 100%, 125%, 150% and 200% display scaling, with minimum-size windows and long paths. Test the outer-corner preference after restarting, dragging, edge resizing, double-click, Win+arrow snapping, minimize/restore, a disconnected display, dialogs and cancellation during installation. Browser responsive previews exercise layout but do not replace real multi-monitor/DPI hardware acceptance. Microsoft live acceptance remains deferred.
