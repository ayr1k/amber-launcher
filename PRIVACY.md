# Privacy and local data

[简体中文](docs/zh-CN/PRIVACY.md)

AMBER does not automatically upload diagnostic reports, raw logs, worlds or local mod files. Requested downloads and searches contact Mojang/Microsoft, Modrinth, loader providers, Adoptium or GitHub as needed. Those services receive ordinary network request information. Optional local-mod identification sends the file's SHA-1 hash to Modrinth, not its contents.

Microsoft authorization takes place on Microsoft's website. AMBER does not collect Microsoft passwords. Third-party account passwords are sent to the HTTPS authentication address entered by the user and are not persisted. Tokens are stored using system credential protection in `accounts.json`; the public Client ID is not a secret. This encryption does not protect against malicious programs running under the same operating-system identity.

Settings → Language and privacy lists local storage locations. Instances include game/mod logs, worlds and configuration. Pre-upgrade backups may retain encrypted account data after an account is removed from the active store. Local removal does not revoke authorization with the account provider.

AMBER and AmberE use separate application data roots, `%APPDATA%/AMBER` and `%APPDATA%/AmberE`. AMBER stores official profile identifiers, eligibility timestamps and linked-account references inside the encrypted account store. AmberE does not offer Microsoft authentication or contain a built-in Microsoft Client ID. No accounts or game data are automatically transferred between editions. Third-party passwords and tokens are handled as described above in both editions.

Diagnostic export uses an allowlist and excludes account data, tokens, instance names, personal paths and raw logs. Review the preview before exporting. Error display and copy apply best-effort redaction; arbitrary mod output cannot be guaranteed safe. Raw game logs and process arguments can contain personal information. Do not publish them without review.

Automatic login-code copying can be disabled. When AMBER is still running, an expiry timer clears the clipboard only if it still contains that code; later user clipboard content is preserved. Language packs and imported backgrounds are stored locally and not uploaded. A language pack may change prompt wording: import trusted sources only.

Game data remains after uninstall. Use the app's recycle bin and backup tools before removing data manually. Logs and caches are local files; do not delete them while a game, installation or recovery is active.

Settings offers confirmed cleanup of downloaded app updates and old pre-upgrade configuration backups. It never targets active accounts, worlds or instance backups.

Trial copies and change-recovery snapshots stay in the selected local game library. Copies may include worlds when explicitly selected; configuration snapshots can contain personal data written by games or mods. They are not automatically uploaded or included in preference-template exports. Template JSON contains questionnaire preferences only; review it before sharing. Global quick search searches local instances/actions and sends no search query to a server.

## Home modules (1.2.0)

The play journal is local and enabled by default. Its calendar settings let you disable, export or clear it. It records instance identifiers and observed runtime, which may include idle time; concurrent instance durations add together. Missing observations are marked incomplete. Old launch records carry unknown duration. Exported history contains instance identifiers and timestamps: review before sharing.

News refresh is manual by default. Optional automatic refresh runs while its module is mounted and the document is visible, at most every 30 minutes. Requests reach `launchercontent.mojang.com`; opening general articles uses the system browser. Article text is not translated automatically and remote HTML is never executed. News and release-note caches remain local. Screenshot browsing reads local PNGs; Copy image writes the selected image to the system clipboard. No screenshot is uploaded. Storage analysis caches estimates locally and does not delete files automatically.

## Download connections (1.2.2)

Automatic source selection and manual connection diagnostics contact public Minecraft and BMCLAPI endpoints; diagnostics also contact Modrinth and Fabric. Requests send ordinary connection metadata (including your IP address and a launcher user-agent), not account tokens, instance names or local paths. Automatic selection caches a source choice for ten minutes without geolocation. Supported file downloads may use BMCLAPI and its public CDN nodes; third-party servers apply their own privacy policies. Account authentication is never routed through the download mirror. The copied diagnostic summary contains service names, statuses and elapsed times only. Partial files and task recovery records remain in the local game library.

## Local modpack import (1.2.3)

Selected archives and import choices are retained in the new instance’s `.amber-setup` folder to support recovery. Archives, embedded configuration files and worlds are not uploaded by the importer. MRPACK downloads contact the permitted content hosts in its manifest; game, Java and loader preparation contact their normal providers. Import reports contain relative file names and pack metadata. Backups of the instance may include this retained content; review it before sharing.

## 1.3.0 local tools

Skin requests send a profile identifier to the identity provider and allowed texture hosts; images are cached locally. Screenshots, configurations, backups, graph positions and gradient presets are not automatically uploaded. Adjacent .bak configuration backups may contain server addresses or private data.

## Styled text works (1.3.1)

Color presets and complete styled works stay in this product’s local browser storage. They may contain text entered by the user. They are not automatically uploaded. Copy writes generated markup to the clipboard; Export saves a text file at the user’s request. Review text before sharing it.

## Server workspaces (1.3.2)

Server worlds, settings, console logs, downloaded content, recovery copies and Java selections are stored locally under the selected game-data directory. Server configuration and its backups may contain plain-text RCON or management credentials. Room invitations contain a shared secret and are held for the active room; copy/share them only deliberately. Optional EasyTier downloads contact GitHub; configured discovery/relay peers can observe network addresses and traffic metadata. Server cores and plugins make their own network requests. No server data is uploaded to AMBER by this feature.

## 1.3.4

The seed map computes offline and stores seeds/markers locally; reading level.dat does not upload or modify worlds. Gradient text and palettes stay local. Original-launcher import copies only selected game data to a new instance and excludes account stores; metadata/download requests use the existing providers. The source directory is retained. Copied configurations and worlds may contain personal information; review before sharing.

## 1.3.5 local identities and platforms

Custom offline names and PNG skins remain in the encrypted account store. A loopback-only texture service serves one launch identity; it does not authenticate online or automatically upload skins. First use downloads and verifies the compatibility component from the official authlib-injector source.

Credentials use Windows user protection, macOS Keychain or a secure Linux/FreeBSD keyring. The basic_text fallback is rejected. Default configuration roots are `%APPDATA%/<product>`, `~/Library/Application Support/<product>`, and `$XDG_CONFIG_HOME/<product>` (or `~/.config/<product>`); the game library is user-selected. System-bound account ciphertext is not portable authentication data.

## 1.3.6 log analysis

Analysis runs locally without external AI services or log uploads. It reads bounded excerpts matching the selected instance run, or a manually selected log. Existing redaction rules are applied to evidence but cannot guarantee removal of all private information; review before sharing.

## 1.4.1

Choosing CurseForge sends search/version/file requests and the application API key to its API/CDN, without account tokens or worlds. Player avatars query Mojang public skin endpoints by known UUID. Player actions are sent to the selected local server console.

## Sakura Frp (1.4.2)

Sakura connections contact its official API to read tunnel/node information and configuration using the saved access token, then connect to the selected node. The token is encrypted using system credential storage; configuration and credentials are passed in the frpc child environment, while the temporary disk file contains only a template. The template is removed on exit. Logs are bounded and redact the access token. Sakura and its nodes can observe account/tunnel identity, network addresses and traffic metadata. No account or server data is sent to an AMBER-operated service.

## Feedback drafts (1.4.6)

Feedback is prepared locally from your input. Diagnostics are excluded unless you inspect and explicitly include them. Preview and copy the best-effort redacted draft before opening GitHub; the URL carries no draft or diagnostic content and the app does not submit an issue. Sharing happens when you manually submit it on GitHub. Review free text for personal information.

## Server schedules (1.4.7)

Task names, target server identifiers, frequency, console commands and last results are stored in the local game library. Scheduling does not upload this configuration. A command is sent to the selected managed server console when its task runs. Closing to the tray keeps the launcher and eligible schedules running until you explicitly quit.

## Startup appearance cache (1.4.8)

The small local startup cache stores display preferences and localized loading labels only. It does not choose a game-library location and is not uploaded. Download ranges contact the selected existing download source; partial fragments remain local until assembly and cleanup.

## Instance services and account tools (1.5.0)

Optional MySQL preparation downloads the pinned program from Oracle. Database credentials remain encrypted locally; each instance binds only to localhost. Independent database backups retain encrypted credentials and may contain plugin/player data; permanent instance deletion does not delete those independent backups. Recovery needs the original OS credential context. Sakura requests contact the configured provider only for requested operations; remote deletion and local removal are distinct. Skin uploads are explicit and go to the corresponding supported account service. Account runtime statistics stay local, retain their original account association, and follow the history privacy switch. The enchantment calculator runs offline.

## Existing installation import (1.5.1)

Import previews read version metadata and hash selected local content to bind a later copy. These file manifests stay local; source files are not uploaded for identification. Official catalogs are contacted to verify game/loader versions. Source directories remain read-only, top-level account files are not copied as content, and failed/cancelled copies may retain selected files in the new local instance.

## Room sharing (1.5.2)

Sharing is off by default. Enabling it exposes the explicitly selected snapshot and allowed files to invitation holders through the room overlay. Invitations contain an access token and pinned host key; share them only with intended participants. The host must inspect selected configuration for private information. Known content/icons contact their original platforms; local paths, account stores and configuration are not sent for icon discovery. Disabling sharing revokes sync access but does not erase files already received by guests. Independent guest instances and verified caches remain local until removed.

## Persistent room recovery (1.5.3)

Local revision history is bound to the room name and host public key; it stores no invitation token or account data. Verified caches, interrupted transfer fragments and preserved instances can remain on disk across restarts. They are not automatically cleaned up. Selected archives/configuration may contain personal information: hosts must inspect them before sharing. Revocation prevents further access, but cannot erase already received copies.
