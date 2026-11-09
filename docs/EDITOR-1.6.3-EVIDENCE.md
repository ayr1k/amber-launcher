# 1.6.3 editor evidence

The task starts from published main `912b90b33b24810c8bfc9f6463eacae6dade4848`, after merged PR #12 and release documentation. The original workspace exposed no Git history or remote; a separate checkout preserves it unchanged. One task branch is used: `task/1.6.3-instance-editor`.

## Reproduction before fixes

- `scripts/reproduce-editor163.mjs` loads the immutable 1.6.2 backend through `git show` and injects an external write immediately after the final hash check and before rename. On disposable Windows files the save returned success; disk held `editor-buffer`, the backup held `original`, and `external-after-final-check` was lost. This was reproduced, not inferred from static code. Its first sandbox run hit EPERM on synthetic replacement; the supported elevated run completed the experiment.
- `scripts/qa-editor-races163.cjs --baseline` was run against the built 1.6.2 UI with explicitly synthetic delayed IPC responses after asserting isolated userData/storage. Releasing B before A selected `a.txt`; completing A's backup after switching to B put `BACKUP A` into B. Initial test teardown emitted a dialog-close error after recording these assertions; the runner was corrected to handle teardown and the fixed cases are run without the baseline flag.

## Verification

- Full local regression: 749 passed, zero failed/skipped, bounded concurrency 2. Includes 13 new editor/session tests. Source/license check, 3,097 bilingual catalog entries and four static-serving checks passed. New editor strings use the editor's existing inline bilingual convention, outside the catalog count.
- Targeted backend regression after exclusive recovery fallback: 16 passed (13 new and 3 existing workspace tests). Covers pre-save/preparation/final-check races, competing creation, replacement identity, read-only/missing files, retry, running protection, path/instance/token boundaries, Chinese/BOM/CRLF, unique backups and temporary-file cleanup.
- `qa-editor-races163.cjs`: corrected response order selects B, stale backup cannot change B. `qa-editor163.cjs` passes nine native UI case groups with no renderer errors: metadata/path, same-name tabs, jump and synthetic Chinese composition; external conflict/compare/cancel/reload/draft recovery; backup comparison/cancel/restore/BOM/CRLF; read-only/missing-file retention, cancelled close and refresh; mixed-ending read-only; and four Chinese/English light/dark window configurations (requested 800/1024/1440/1600 widths; native minimum width still applies). Evidence and screenshots are in ignored `prototype/review163`.
- Production build succeeds with the existing large-bundle warning. No new dependency is added to the application. pnpm 11.25.0 and Node 24 are retained. Playwright is installed only under the ignored task QA directory.

## Guarantees and residual risks

Final screenshot inspection identified a shared sizing observer resetting scroll after comparison opened. The editor now opts out of that reset and measures its unscrolled position; other consumers retain the existing default. The UI runner asserts the complete comparison panel remains visible after layout settles. Dark-mode cases also use rounded controls, disabled app motion and reduced-motion media. Installers from the earlier `c45f739` head are superseded by the final follow-up commit; use only the final provenance described in the delivery.

See [bilingual test guide](../prototype/LOCAL-TEST-1.6.3.md). Preserving the actual displaced entry addresses the demonstrated final-check overwrite window; exclusive creation avoids clobbering a recreated target. A failed commit attempts exclusive copy recovery and retains the recovery filename. There is still a brief missing-target interval and no crash journal, universal filesystem locking or power-loss durability guarantee. The UI has session-only previous-draft recovery, explicit confirmations, metadata and stale-response checks. Real OS IME, full install/upgrade and non-Windows desktop acceptance remain separate.
