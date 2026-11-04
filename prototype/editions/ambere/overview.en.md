# AmberE

1.3.5 adds theme-aware account tabs, editable offline names and local PNG skins, and platform packages for Windows, macOS and Linux. FreeBSD is an experimental server/tools bundle, not a supported game client.

[简体中文](docs/zh-CN/README.md) · [Releases](https://github.com/ayr1k/AmberE/releases) · [User guide](docs/USER-GUIDE.md)

AmberE is an independent distribution for Minecraft: Java Edition, providing offline and third-party accounts. It is maintained from the shared AMBER codebase under MPL-2.0, with its own application identity, data directory and update repository. It does not offer Microsoft sign-in or include a Microsoft application Client ID.

## 1.3.5

Windows x64 release with additional platform downloads. [Download the installer, source and checksums](https://github.com/ayr1k/AmberE/releases/tag/v1.3.5). Includes instance management, content recommendations, mod updates, backups and recovery.

- Offline identities and HTTPS third-party authentication, with system credential protection for saved credentials.
- Isolated game instances; Java and loader installation; mod search, dependencies, updates and bulk management.
- Backups and restore, recoverable content operations, recycle bin, task recovery, favorites and launch history.
- Chinese and English, text-only custom language packs, themes, backgrounds and integrated window controls.
- Separate `%APPDATA%/AmberE` data and updates from `ayr1k/AmberE` only.

## Install and update

Verify the SHA-256 checksum and run the Setup executable. Use a separate program folder and close AmberE and Minecraft before upgrading. The installer offers Chinese and English and is currently unsigned. Uninstalling preserves game data.

Offline and third-party identities do not grant Minecraft ownership or official online-service access. Obtain the game legitimately. Third-party providers may have their own requirements. AmberE is not an official Mojang or Microsoft product and does not claim Microsoft API approval.

## Platforms and verification

Windows x64: EXE; macOS Intel / Apple Silicon: separate ZIPs; Linux x64: DEB. macOS needs device testing; Linux needs full desktop/keyring and gameplay testing. FreeBSD amd64 is an experimental server/tools bundle only. Packages are unsigned and macOS is not notarized. See [setup and limitations](prototype/PLATFORMS-1.3.5.md) and the [platform downloads](https://ayr1k.github.io/#/download?product=ambere).

## Documentation

[User guide](docs/USER-GUIDE.md) · [Languages](docs/LANGUAGE-PACKS.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [Testing](docs/TESTING.md) · [Build and contribute](CONTRIBUTING.md)

[Rollback guide](docs/ROLLBACK.md) / [回滚说明](docs/zh-CN/ROLLBACK.md)

[Official theme store](https://ayr1k.github.io/#/themes) · [Theme help](docs/THEMES.md) · [Theme format](docs/AMBTHEME-FORMAT.md)

Alloy, Nocturne, Harvest and Verdant are free official themes for AMBER and AmberE 1.2.1 or newer, available separately and not preinstalled.

[Server and connection guide](docs/SERVERS.md) (remote rooms are a testing feature).
