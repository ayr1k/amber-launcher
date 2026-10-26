# Testing and release acceptance

[简体中文](zh-CN/TESTING.md)

Run the commands in CONTRIBUTING.md. Automated checks cover downloads and integrity, cancellation/retry, path traversal, archive extraction, transaction recovery, dependency-aware content operations, backup/restore, instance lifecycle, language packs, redaction and bounded reads. Use temporary data for tests.

For each language, verify first-run setup, version selection, loader compatibility, content search/dependency preview, instance settings, task errors and diagnostics. Change language with unfinished form input and confirm state survives. Check a small window, large text, dark/light themes and keyboard-only selection. Imported project names must remain unchanged.

Test valid, partial, malformed, oversized and placeholder-mismatched language packs. Remove the custom pack and restart. Test copying disabled, expired codes and preservation of later clipboard content using synthetic authentication responses.

The packaged desktop smoke test checks application startup, IPC, local backgrounds and system encryption compatibility. Browser fixtures are interface checks only, not evidence of real game installation. Prior game and mod integration results do not imply all loader/version combinations work. Microsoft live sign-in, refresh and authenticated launch remain deferred; third-party providers need separate live testing. No claim of exhaustive security coverage is made.
