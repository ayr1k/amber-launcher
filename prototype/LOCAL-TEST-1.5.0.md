# 1.5.0 task test build / 任务测试包

This task stops at a draft PR and test installers. It does not authorize merging, a stable Release, or GitHub Pages deployment. Final test evidence and installer hashes belong in the PR and its workflow artifacts; a versioned filename alone is not provenance. `desktop/build-provenance.json` records commit, dirty state, product, channel and workflow.

测试包可能与对应产品的正式版共享用户数据。更换安装目录不代表数据隔离。建议独立 Windows 用户或虚拟机、可丢弃实例，并先备份。AMBER 与 AmberE 仍使用独立应用身份、资料目录及更新仓库，不自动迁移账号或存档。

## Changes and boundaries

- Ports and optional local MySQL appear in the existing online instance manager. Viewing a different instance does not stop services. The main port is read from `server.properties`; additional records describe intended plugin configuration, not successful plugin installation or public connectivity. TCP and UDP are distinct.
- Sakura stays on its existing page. Each association owns its process, state and redacted log. Create remote tunnels in the application using the official API, or associate existing IDs. Public-game use, TCP/UDP capability, node availability, membership and quota are checked. Provider-side deletion requires a separate explicit confirmation and retains the local association; removing only an AMBER association never deletes a remote tunnel. Unknown mutation results persist a reconciliation record and are never automatically retried. Provider protocol, node and quota restrictions remain authoritative.
- The utility entry includes an offline enchantment merge calculator; account details include skinview3d and local account runtime statistics.
- Microsoft skin upload exists only in AMBER and requires refreshed entitlement. Compatible third-party providers must advertise `uploadableTextures=skin`; upload and refreshed credentials remain at the stored authentication base. Unsupported providers get a site link. Real-account uploads and production tunnels are not part of synthetic tests.
- Offline renaming retains the stored UUID. Servers that identify players by name can behave differently. Local skins do not guarantee visibility to other players.

## Database architecture and recovery

One verified MySQL program installation is shared, with a separate process, data directory, port and random credentials per instance. Processes consume memory independently (64 MiB InnoDB buffer pool plus server overhead), but can be stopped independently and do not share database privileges or lifecycle. This favors isolation and straightforward recovery over a smaller shared-server memory footprint.

MySQL Community 8.4.13 Windows x64 is downloaded only after explicit preparation from Oracle's official CDN. It is not included in launcher installers. Archive size: 281154912 bytes. SHA-256: `e9cd98b1d23f122987b1afca26ad942efec5891481103d48ae3cde237fa3ea54`. Official published MD5 also matched during integration; a detached signature was not verified. The component manifest verifies extracted files before use. Official binary and full license/third-party notices remain separate; no replacement database product is used.

Sources: [Oracle downloads](https://dev.mysql.com/downloads/mysql/8.4.html), [8.4 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.4/en/), [source archives](https://dev.mysql.com/downloads/mysql/8.4.html?os=src), [Oracle GPL information](https://www.mysql.com/about/legal/licensing/opensource-license.html). MySQL is GPLv2 with additional permissions and bundled third-party notices; its original LICENSE file is retained. Do not repackage the database in launcher binaries without satisfying applicable source/notice obligations.

No Windows service, firewall rule or system MySQL installation is changed. Initialization uses a local named pipe with networking disabled; normal service binds only 127.0.0.1. Plugins receive a distinct restricted `plugin` account for the `plugins` database, never root. Credentials are encrypted by the existing OS credential codec; they are absent from command arguments and logs. The same Windows user still controls these files/processes; this is not an OS security boundary against malware.

Interrupted initialization retains data and can move it to an `incomplete-*` recovery copy before retry. A cancelled shared component download may finish, but the cancelled instance does not initialize afterwards. Launcher restart checks recorded process identity before adopting a running database. Unverifiable recovery metadata blocks destructive operations for that instance. Backup and restore require a stopped database; backup hashes are checked before swapping data, and `before-restore-*` retains the replaced data. Backups are local to this instance/OS credential context, not portable password-free exports. Instance deletion uses the existing recycle bin and is blocked while its database is active. Server snapshots, automatic exit snapshots and server copies exclude MySQL; database backups are separate.

## Data migration and calculator scope

Old Sakura single-instance bindings are read as main-port associations and converted on the next explicit modification. Existing encrypted credentials are retained. Port records are new per-instance files; no existing plugin configuration is rewritten.

New launch sessions capture the immutable local account record ID at authorization. Changing the current account, refreshing a token, or offline renaming does not reassign earlier records. Existing journal entries without an account ID remain historical/unassigned and are included in original instance totals. Concurrent sessions count independently. Only observed intervals are added; failed launches, sleep and unknown restart gaps do not invent time. Runtime can include idle time and is not Microsoft's cross-device playtime. The existing privacy switch still controls recording.

The calculator pins iamcal/enchant-order commit `9345bd097a300266e347d874feb46ef7e1bd4158`, including its data snapshot (mace and spear entries). It models Java-style survival anvil book-to-item combinations with a 39-level per-operation ceiling, fresh equipment/books, and zero prior-work penalty. It does not validate against a selected installed game version, Bedrock or modded rules, repair/rename costs, existing enchantments, or combining lower-level books. Users must choose enchantments available in their game. It displays merge steps, level costs and XP; XP conversion assumes each operation starts at zero levels. Inputs with incompatible enchantments are rejected. At most ten enchantments are accepted; computation can be cancelled and is time bounded.

## Verification commands and desktop isolation

Run repository regression tests, `pnpm build`, `pnpm test:sites`, `pnpm release:check`, and both packaged smoke tests. `scripts/qa-mysql150.mjs` additionally runs real Oracle processes using random temporary directories; set `AMBER_MYSQL_ARCHIVE` to the pinned downloaded archive. Its synthetic credential codec is test-only and is not shipped as a product option.

Local-channel packaged test builds accept `--qa-ui` with `AMBER_SMOKE_ROOT` for isolated desktop acceptance. Public-channel packages do not enable this interactive test switch. The runner must assert Electron's actual userData path and the game-library path before inserting synthetic data. Do not point it at real profiles. This is a testing mechanism, not a promise that installing to another directory isolates normal user data.

Pending final evidence must distinguish automated pass/fail, actual packaged desktop interaction, untested environments and real external services awaiting authorization. Independent review is coordinated by 小岚; neither implementation nor a green CI substitutes for that review or user acceptance.

Sakura API contract: [official OpenAPI](https://github.com/natfrp/api/blob/fab03fc7470b95ce0064d3067570eb01d1298258/openapi.yaml). Creation uses POST `/v4/tunnels` (201); deletion uses POST `/v4/tunnel/delete` and examines both deleted and failed-disconnection IDs. Nodes requiring mandatory access authentication are explicitly unsupported in this creation panel. Raw user-info responses, which include a token, never cross into the renderer.

## Independent-review recovery fixes

The 64-link Sakura limit is checked and reserved in the same serialized configuration transaction before a remote creation POST. A pending creation blocks new local associations; removal of unrelated stopped local links remains available to free capacity. Reconciliation checks capacity without losing its pending record. Older oversized lists and invalid entries remain visible and can be explicitly removed locally; no remote deletion or silent truncation occurs.

MySQL cancellation owns an abort controller before waiting for the instance lock and cancels that queued operation. Active and recycled databases reserve their ports together; initialization and recycle transitions share the allocation queue. Restoring an older conflicting recycled database selects a free port, preserves its data and credentials, and displays the old/new port with instructions to update plugin connection settings. The restore confirmation explains this behavior in advance. Database backup restore preserves the current connection port instead of reverting to an obsolete backup port.

Packaged desktop verification reproduced context loss on an offline skin/model revision. The preview now gives each revision a new canvas while disposing the old viewer and GPU resources. Acceptance checks repeated skin/model changes, error states, context loss, re-entry and offscreen pause in both editions.

The follow-up review scopes third-party skin models and revisions to each provider profile UUID. A profile without model metadata uses automatic preview detection; switching profiles does not reuse another profile's cached skin on refresh failure. Preview light/dark backgrounds are neutral surfaces derived from the active theme's surface color, separate from its text color. They affect preview only.

Additional packaged checks: `scripts/qa-graphics150.cjs` disables WebGL to verify the fallback and AmberE Microsoft isolation; `scripts/qa-smoke150.cjs` checks both local-channel packages and source provenance; `scripts/qa-tray-schedules147.cjs` accepts `AMBER_QA_PACKAGED=1` to exercise the actual packaged executable. Desktop skin selection supplies synthetic PNG paths through a test file-dialog substitute; image decoding, account persistence, UI model changes and 3D rendering still run through the packaged application.

## Database backup retention after permanent instance deletion

Independent MySQL backups now live at `<library>/database-backups150/<instance-id>/<backup-id>`, outside both active instances and the server recycle bin. Old in-instance backups are copied with their recorded hashes and committed before recycle/purge may proceed. Migration conflicts or corruption preserve the old files and block deletion; interrupted staging directories are not advertised as valid backups. Credential ciphertext, MySQL version, source instance identity and display metadata remain in each manifest. Whole-library storage moves also include this directory.

The existing online instance list contains an independent database backup library, including when no server instances remain. Active or recycled owners are opened/restored through the original instance. An orphaned backup can recreate an empty database recovery instance using the original instance ID, after checking that neither an active nor recycled instance occupies it. Recovery verifies all data before publishing the new directory, retains the original backup, preserves the matching encrypted credentials, chooses conflict-free game/database ports, and leaves the database stopped. The confirmation explicitly says it restores no world, plugin or original server files. Reusing the original ID prevents a second concurrent clone with shared credentials. Recovery still requires the original OS credential context.

Permanent deletion removes unbacked-up current database data but preserves committed independent database backups. Its confirmation explains this distinction and that ordinary server snapshots exclude databases. `scripts/qa-mysql-backups150.mjs` exercises real Oracle data through legacy migration, recycle/restore, permanent deletion and orphan recovery; the packaged desktop runner covers cancelling the deletion dialog and recovering through the backup-library UI.
