# AMBER / AmberE 1.5.2 — room client synchronization test build

This is a task test build, not a formal release. Do not merge or deploy Pages without the user's separate decision.

## Behavior

- Connections → EasyTier room → Client environment synchronization. Sharing starts disabled for each room. Hosts select a stopped, existing client instance and individually select files, review compatibility/privacy, and affirm redistribution permission where host transfer is needed.
- Both sides retain their normal edition-specific accounts, storage and update channels. Launch uses the existing account authorization boundary and server authentication.
- Minecraft and common single loaders (vanilla, Fabric, Quilt, Forge, NeoForge) use the existing official setup workflow. Server/client Minecraft and recognized Fabric/Quilt server loader mismatches are rejected. Other compatibility and dependencies require host review; this is not an automatic mod-conflict solver.
- Selected Modrinth-recognized mods download from current original-platform metadata with exact content verification. Known CurseForge files reuse the existing official API route and original download URL. Exact provenance, SHA-1 and size must match. Missing API credentials, absent download URLs and explicit distribution restrictions fail without any host-transfer fallback. Client applicability may be unknown on CurseForge and remains a host review responsibility. Quilt accepts Fabric-tagged mods using the existing shared compatibility rule. Unrecognized manually installed mods require the host's explicit redistribution permission and compatibility review.
- Host transfer candidates are mod JARs and top-level text files in `config`. No server directory is copied. Saves, logs, accounts, databases, launch settings, disabled mods, resource/shader packs, nested configurations and unsupported loader combinations are excluded. Suspicious configuration names/content are blocked. This filter is not a proof that arbitrary configuration is public: the host must inspect selected files and must not affirm privacy or redistribution permission without checking.
- Guests see the pinned snapshot, versions, source of every file and calculable bytes, then explicitly confirm. Game/Java/loader extra download sizes are not included. A changed snapshot requires a fresh preview and confirmation.
- Every accepted revision creates a new independent instance. No existing saves or personal preferences are overwritten or copied. Content cache entries are keyed and checked by SHA-256, so unchanged selected files do not download again. The existing game/loader cache also remains in use. This deliberately trades some disk space for preserving existing instances during updates.
- Disabling sharing immediately rejects requests and disconnects current HTTP transfers, while leaving EasyTier and the game forwarding endpoint alive. Guest heartbeat detects withdrawn/updated sharing and cancels setup (up to the request timeout during network loss). Leaving, process failure and invitation expiry revoke access. Completed instances remain ordinary local instances.
- After failure/cancellation, preview again and confirm. Verified cache survives app restart; partial host file transfers restart. Retry creates a new instance; incomplete instances remain for inspection/removal and cannot launch as complete. No automatic deletion of user data. The current preview diff is session-local; after restarting the app, all files appear as additions on the first preview.

## Protocol and trust

The previous EasyTier integration had game TCP forwarding only, not a file service. This adds a separate loopback HTTP endpoint, a narrowly whitelisted EasyTier TCP port, and a guest loopback forwarding port. EasyTier 2.6.4 supports multiple port forwards; encryption is supplied by the overlay. No public HTTP listener or arbitrary URL/file proxy is introduced.

The invitation carries a random synchronization access token and an Ed25519 host public key. Signed immutable manifests bind the room, runtime, revision and selected file hashes. The invitation must be obtained from the intended host over a trusted channel. Anyone holding it is a room participant; there is no per-player identity/ban list. Hashes establish file consistency, not publisher safety or game ownership. Mods execute code and a trusted signature does not make malicious mods safe.

Files are identified by snapshot revision and content hash, never a remote filesystem path. Validation bounds file counts (500), individual files (64 MiB), total selected content (1 GiB), paths, duplicate/case-colliding names, source identities and metadata. Source links/hardlinks are rejected; copied bytes are checked. Authentication, sharing state and snapshot membership are enforced on every host request.

## Validation and limits

Automated tests use isolated temporary synthetic fixtures. They cover off-by-default sharing, confirmation, cancellation, candidate changes, server mismatch, independent instances, update diffs, cache reuse, integrity failures, signed host identity, revocation, retry, private paths, arbitrary reads, malicious/oversized manifests and platform restrictions. The full project regression suite, source/license checks, locale checks and production frontend build are required alongside them.

Real two-machine cross-network gameplay, NAT/relay combinations, actual modpack compatibility, real-account login and actual game launch/join are **not** claimed by these tests. Local protocol tests are not cross-network acceptance. Windows installer startup verifies packaging, not gameplay. No guaranteed direct connection or speed.

PR CI provides paired Windows x64 installers, SHA-256 files and clean-source build provenance in the `pr-test-installers-<head SHA>` artifact (GitHub sign-in may be required; retention is 30 days). The PR records the exact tested head and run/download link. Generated installers remain outside source commits.

## 中文验收提示

房间内展开“客户端环境同步”，先由房主选择已有客户端、逐项选文件并确认隐私与再分发许可，再开放分享。玩家预览版本、文件、来源和大小，明确确认后创建新实例。关闭分享不关闭游戏联机；未完成同步可以重新预览和确认，复用已经校验的缓存。未知模组兼容性及配置是否含私密信息仍须房主检查。CurseForge 已接入原平台下载；缺失凭据、下载地址或平台限制会明确阻止，不转由房主传输。此首版不支持复杂加载器组合、资源包／光影包与嵌套配置；不会绕过平台限制。未完成真实双机跨网络和实际游戏验收，不能将临时数据自动测试当成实测。

### Recorded local checks

- Full regression: 617 passed, zero skipped; static serving checks: 4 passed. Locale check: 2857 entries; source/license check passed.
- Real unpackaged Electron, isolated userData: preview, explicit cancel before download, long names, normal and narrow windows; screenshots inspected. The room is a synthetic UI fixture. An initialization-order issue found by this check was fixed before delivery.
- Real EasyTier 2.6.4 dual-process test on one Windows machine: signed preview and file bytes forwarded successfully; disabling sharing rejected sync while the separate synthetic game endpoint stayed reachable. This does not establish dual-machine, cross-network, relay or gameplay success.

### Independent review corrections

- Corrected the real Workflows creation path to invoke its initialization callback before Java/loader/game preparation. A durable room-sync-required marker is part of the initial instance commit, in addition to the pending receipt and setup record. Missing receipts no longer make room-created instances launchable.
- Generic Task Center retry of incomplete room-created setup is explicitly blocked: return to the room, preview and confirm again. The existing incomplete instance remains preserved; verified cache is reused by the new confirmed instance. A restart cannot lose a callback and silently mark base-game-only setup complete.
- Real Workflows/VanillaLauncher instance-creation integration tests inject failures at Java, loader and game preparation, instantiate fresh core/workflow objects, exercise Task Center retry, check the actual shared launch guard with absent receipts/records, then reconfirm and complete an independent instance. Only external runtime provisioning is replaced with fixtures.
- Added Modrinth/CurseForge Quilt-with-Fabric-tagged content tests on both host publication and guest reception. Restricted or unavailable platform downloads remain blocked even when a matching cache entry exists. Live CurseForge key/service acceptance was not performed.
- Added real Electron host-side candidate/publish/disable IPC checks, with an isolated client directory and a synthetic room/server boundary: default off, explicit selection, private-file exclusion, redistribution refusal/consent, disabling while room remains running, long names and light-square/dark-rounded narrow layouts. Player UI checks repeated for source-label changes.

### Completed-instance recovery correction

The room-specific retry guard now applies only while its setup is incomplete. A completed setup still requires a valid ready receipt, then falls through to ordinary content/download recovery. Real Workflows tests cover failed and cancelled content, game-file and Java tasks after successful synchronization, fresh workflow objects after restart, and missing/malformed/pending receipts. Incomplete original setup remains blocked. This correction passed 51 focused tests (room sync, setup recovery and network task journals); unrelated UI/feature review was not repeated.
