# 1.2.3 verification

[简体中文](zh-CN/TESTING.md)

The release includes local MRPACK/content ZIP import, retained installation recovery, pack provenance and reorganized Java/log tools. Existing theme formats and account boundaries are unchanged.

353 automated regression tests passed, including 17 local-pack checks for archive paths, corruption, optional choices, known loader/version mismatches, cancellation/restart recovery and file protection. Isolated desktop checks covered both editions, five themes, compact windows and bilingual layouts. Both packaged applications passed startup and IPC smoke checks. These checks use synthetic installation fixtures and do not establish compatibility for every third-party modpack. Live game, account and provider combinations require separate validation.

Test a real pack with the author-required versions, verify optional files and configs, then test cancellation and continuation from Tasks after restart. Existing instances must remain unchanged. Inspect Java/log tools and mod-list export in your usual theme.

Archives are limited to 300 MB compressed, 600 MB expanded, 256 MB per file and 10000 entries. MRPACK embedded overrides additionally use the existing reader's 100 MB per-file limit. ZIP64, encrypted/split archives and arbitrary launcher folders are unsupported. CurseForge manifests are recognized but downloads are not integrated. Local imports do not track whole-pack updates.

See the [rollback guide](ROLLBACK.md) before downgrading. Version 1.2.2 cannot continue 1.2.3 local-pack installation records.
