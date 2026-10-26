# Beta 1.5 security review

[简体中文](zh-CN/SECURITY-REVIEW.md)

Scope: account storage and IPC exposure, displayed/copied errors, diagnostics, response/file size limits, desktop isolation, download origins and integrity, archive/path defenses, recovery transactions, custom language packs and release contents. This is a focused engineering review, not an independent penetration test or certification.

## Changes verified

- Known in-memory credentials and common token, email and user-directory patterns are removed from shared error paths and runtime log tails before delivery to the interface. Copying applies redaction again. Existing raw game/mod logs are not rewritten.
- Account-store reads reject non-regular/linked files and enforce a 2 MB limit. Authentication responses are bounded while streaming to 1 MB; update catalogs to 2 MB. Oversized streams are cancelled.
- Account encryption uses Electron's asynchronous system APIs. The on-disk schema is unchanged; the desktop smoke test verifies decryption of legacy synchronous ciphertext and asynchronous round trips.
- Language packs are bounded, validated JSON with known keys and matching placeholders. They cannot execute scripts, define HTML, change permissions or choose network destinations. React escapes their rendered text.
- Clipboard cleanup is conditional on still owning the copied code. Diagnostic exports retain their field allowlist. Optional cleanup only targets downloaded app updates or pre-upgrade configuration copies, with confirmation and link rejection.
- Regression tests retain traversal, archive, trusted-source, checksum, cancellation, rollback, dependency and recycle-bin protections. The renderer remains sandboxed and isolated, with Node integration disabled, restricted navigation and sender-validated IPC.

The dependency audit of the locked dependency tree reported no known advisories at review time. This result depends on the advisory database and is not evidence that all dependencies are free of defects. CI and the source scan supplement, rather than replace, manual review.

## Remaining boundaries

Minecraft, third-party loaders and mods execute as the user. Raw logs, command-line arguments and user-supplied content can expose information outside AMBER's controlled export path. Redaction is best-effort and must not replace reviewing a report. Windows user encryption does not protect against same-user malware. Removing an active account does not revoke provider authorization or delete historical backups automatically. The installer is unsigned. Microsoft real-account acceptance remains deferred because API access is not approved.

References: [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security/) and [safeStorage API](https://www.electronjs.org/docs/latest/api/safe-storage). Apply changes against the installed Electron version and rerun compatibility tests.
