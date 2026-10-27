# Privacy and local data

[简体中文](docs/zh-CN/PRIVACY.md)

AMBER does not automatically upload diagnostic reports, raw logs, worlds or local mod files. Requested downloads and searches contact Mojang/Microsoft, Modrinth, loader providers, Adoptium or GitHub as needed. Those services receive ordinary network request information. Optional local-mod identification sends the file's SHA-1 hash to Modrinth, not its contents.

Microsoft authorization takes place on Microsoft's website. AMBER does not collect Microsoft passwords. Third-party account passwords are sent to the HTTPS authentication address entered by the user and are not persisted. Tokens are stored using Windows user encryption in `accounts.json`; the public Client ID is not a secret. This encryption does not protect against malicious programs running under the same Windows identity.

Settings → Language and privacy lists local storage locations. Instances include game/mod logs, worlds and configuration. Pre-upgrade backups may retain encrypted account data after an account is removed from the active store. Local removal does not revoke authorization with the account provider.

AMBER and AmberE use separate application data roots, `%APPDATA%/AMBER` and `%APPDATA%/AmberE`. AMBER stores official profile identifiers, eligibility timestamps and linked-account references inside the encrypted account store. AmberE does not offer Microsoft authentication or contain a built-in Microsoft Client ID. No accounts or game data are automatically transferred between editions. Third-party passwords and tokens are handled as described above in both editions.

Diagnostic export uses an allowlist and excludes account data, tokens, instance names, personal paths and raw logs. Review the preview before exporting. Error display and copy apply best-effort redaction; arbitrary mod output cannot be guaranteed safe. Raw game logs and process arguments can contain personal information. Do not publish them without review.

Automatic login-code copying can be disabled. When AMBER is still running, an expiry timer clears the clipboard only if it still contains that code; later user clipboard content is preserved. Language packs and imported backgrounds are stored locally and not uploaded. A language pack may change prompt wording: import trusted sources only.

Game data remains after uninstall. Use the app's recycle bin and backup tools before removing data manually. Logs and caches are local files; do not delete them while a game, installation or recovery is active.

Settings offers confirmed cleanup of downloaded app updates and old pre-upgrade configuration backups. It never targets active accounts, worlds or instance backups.
