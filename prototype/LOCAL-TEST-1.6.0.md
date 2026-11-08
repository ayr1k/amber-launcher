# AMBER / AmberE 1.6.0 task candidate

This is a local-channel test build, not a formal release. **The installers share installation identity and data directories with the corresponding stable editions and may replace those applications. Back up your data first.** No merge, Release or Pages deployment is authorized here.

## Current changes

- Settings → Operation & memory: default Local/Online workspace and Launch/Instances/Tasks/Tools page. Onboarding recovery takes priority. Existing layout, list density and Ctrl K shortcuts remain intact.
- Server launch → Launch program planner / 启动程序规划: a per-instance ordered list of graphical modules. Add, remove and move modules up/down. The Start button runs the saved sequence. Supported modules: selected Sakura tunnel, MySQL, server startup/readiness, wait 0–3600 seconds, one server command, normal stop plus verified backup. No arbitrary scripts or loops; 1–128 steps.
- Existing `services160.json` choices migrate on read to MySQL (if selected) → server → selected tunnels, preserving order and the original file. Saving writes `launch-plan160.json`. Legacy `legacy-<server UUID>` bindings retain ownership checks. Copying an instance does not inherit its launch plan or service bindings.
- Server and tunnel modules wait for reported readiness/connection, with a 120-second limit. A command step waits for server readiness and reports **sent, effect unverified**. Provider connection is never presented as remote gameplay verification. FRP can start before the target server; copying an established tunnel address does not require target readiness.
- A run reserves the instance lock. Duplicate Start, plan edits during execution, scheduled work and conflicting mutations cannot interleave. Nested operations in the same owned run can use that lock; the ownership expires when the run ends. Unrelated instances remain independent.
- Failure stops the sequence and marks later steps skipped. Cancel interrupts waits and skips later steps; in-flight database/start/copy operations finish safely. Services already started remain in their current state, with no hidden rollback, force termination or automatic restart. Use their normal controls after cancellation finishes. Run results are session-local; a launcher restart does not resume/replay a plan.
- Backup explicitly stops the server normally, waits for clean exit/finalization, then uses the existing hash-verified server snapshot implementation. No live-world copying. MySQL data is excluded and retains its separate database backup workflow. Stop failure/timeout skips copying. Cancellation during copying waits until the verified snapshot finishes; subsequent steps are skipped. Restart requires an explicit later server module. Detached processes are rejected by existing stopped-instance validation. No online-backup claim is made.

## Closing behavior — latest user instruction

- Default: closing the window goes directly to the tray while either servers or networking are active, including networking without a server. If neither is active it exits. Always-tray and Quit settings remain available; explicit Quit overrides tray behavior. Tray double-click restores the window, and its menu includes Quit.
- Explicit exit waits for normal server saving/exit backups before stopping owned EasyTier, Sakura and MySQL resources. Cleanup errors prevent exit approval and are reported with service names. EasyTier leave waits for its pending preflight, prevents late spawn, and reports stop timeout without falsely declaring the child stopped. No process-name enumeration or external-process termination is used.
- tests/close160.test.mjs covers all server/network combinations, custom policies, explicit quit, clean shutdown ordering, failures, stored-child ownership and late-spawn prevention. These are isolated injected-process tests, not live-provider shutdown acceptance.

## Download version choices

- Existing client game/loader and content-store version selectors are retained; they already allow non-default versions and re-resolve dependencies.
- Server game catalogs now retain upstream snapshots/other versions, showing type and a recommended default. Upstream may provide no server artifact for some historical versions; installation reports that actual absence.
- New-server creation and Core maintenance both expose Paper build, Fabric Loader/Installer and Quilt Loader choices. The launcher’s stable-first default is identified as a launcher choice, not upstream endorsement, and is not the only option. Upstream experimental/prerelease versions remain selectable and visibly labeled. Selected IDs are validated against current upstream catalogs and carried to installation. Successful selections (and selections validated before a failed install) are retained for retry/repair.
- Necessary constraints remain: edition/account boundaries, game-specific loader availability, official download origins, available server artifacts, checksums, real runtime requirements, and content dependencies. Spigot/CraftBukkit still use official BuildTools-produced JAR import. Java can be selected separately through the existing runtime picker.
- Managed auxiliary components (MySQL, Sakura client and EasyTier) still use their existing versioned component manifests. This change does not add arbitrary binary-version replacement or database format migration. Do not describe it as supporting every release of those managed components.

Official references: [Paper downloads service](https://docs.papermc.io/misc/downloads-service/), [Fabric server launcher](https://fabricmc.net/use/server/), [Quilt Meta API](https://meta.quiltmc.org/).

## Memory behavior retained

Manual, session-only and Off on restart. Conservative targets only the launcher main process; Aggressive targets its Electron children too. Selecting Aggressive and every aggressive run require the native warning with Cancel default. No game/Java/server/database/other-app targeting, periodic cleanup, elevation, process termination or system-cache purge.

Targets carry trusted Electron creation times. The helper checks creation time and liveness on the same process handle used for EmptyWorkingSet; missing/conflicting/reused/exited/denied targets fail closed. It cannot guarantee permanent RAM savings, higher FPS or JVM leak repair. Pages may return immediately, with page faults, stutters and disk pressure. PCL is an interaction reference, not a claim to reproduce its private implementation.

References: https://github.com/Meloong-Git/PCL ; https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-emptyworkingset ; https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes . Rights used: SYNCHRONIZE, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SET_QUOTA.

## Verification and limits

- `tests/launch-plan160.test.mjs`: migration, ordering, tunnel-before-server, readiness timeout, cancellation, duplicate admission, schedule contention, scoped-lock isolation/expiration, clean-stop rejection, copy cancellation, real isolated backup hashes, bounded commands/steps, snapshot catalog, and selected Paper/Fabric/Quilt installer paths. External services are injected fixtures; downloads are not claimed as live acceptance.
- Related server, scheduler, network/database, Sakura and backup suites validate the affected shared behavior. Existing layout/memory review remains applicable except the replaced fixed-services modal.
- `scripts/qa-planner160.cjs`: actual isolated Electron UI, eight English/Chinese, light/dark and wide/narrow cases; module reorder/save/readback/cancel and non-default core selection handed to IPC. The core catalog/install response is explicitly mocked. No real server/database/tunnel is started. Screenshots and geometry: `.qa/planner160/`. `qa-flow-layout160.cjs` now forwards to this replacement QA.
- Existing `qa-memory-identity160.cjs` verifies fake native permission/identity cases and a newly spawned owned Electron fixture. No user process is targeted.
- Real cross-network gameplay, live Sakura/provider permissions, real loader/game sessions, production commands, long-running service operation, arbitrary managed-component versions, non-Windows native acceptance and installer-over-stable migration remain unverified. The original user's failure was compatible with the reproduced legacy-ID defect; their actual configuration was never read.
- Use only the latest PR-head artifact and verify TEST-REVISION.txt, installer .sha256 and provenance. Prior 1cc43e1, 01a1696 and 73087a9 packages do not contain the graphical planner. Generated installers/screenshots are not source commits.

## Manual acceptance

1. Back up stable data and use disposable instances. Confirm startup preferences and memory warning cancel/confirm behavior.
2. Open Launch program planner. Inspect migrated choices, reorder modules, save, reopen and verify. Start a controlled plan; verify each status, failure, wait cancellation and services left running.
3. Confirm a tunnel can connect before server startup while target readiness remains false. Independently verify actual remote gameplay.
4. Test the explicit stop-and-backup module on disposable data, inspect the backup manifest, and verify no restart unless a subsequent server module exists.
5. Choose a non-default available core build/loader/installer and verify the installed version. Test real loader compatibility separately.

Preserve all existing acknowledgements and AMBER/AmberE account, data and update-channel boundaries. AmberX is unchanged.
