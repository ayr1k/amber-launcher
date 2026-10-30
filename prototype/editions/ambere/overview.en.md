# AmberE

[简体中文](docs/zh-CN/README.md) · [Releases](https://github.com/ayr1k/AmberE/releases) · [User guide](docs/USER-GUIDE.md)

AmberE is an independent Windows distribution for Minecraft: Java Edition, providing offline and third-party accounts. It is maintained from the shared AMBER codebase under MPL-2.0, with its own application identity, data directory and update repository. It does not offer Microsoft sign-in or include a Microsoft application Client ID.

## Beta 1.14

Beta 1.14 adds stable/preview update channels, library recovery, storage maintenance and backup verification, with recovery and interface alignment improvements. Download the [Windows installer, source and checksums](https://github.com/ayr1k/AmberE/releases/tag/v1.0.0-beta.15).


- Offline identities and HTTPS third-party authentication, with Windows user encryption for saved credentials.
- Isolated game instances; Java and loader installation; mod search, dependencies, updates and bulk management.
- Backups and restore, recoverable content operations, recycle bin, task recovery, favorites and launch history.
- Chinese and English, text-only custom language packs, themes, backgrounds and integrated window controls.
- Separate `%APPDATA%/AmberE` data and updates from `ayr1k/AmberE` only.

## Install and update

Verify the SHA-256 checksum and run the Setup executable. Use a separate program folder and close AmberE and Minecraft before upgrading. The installer offers Chinese and English and is currently unsigned. Uninstalling preserves game data. About checks this repository's releases; installers are verified before the user confirms installation.

Offline and third-party identities do not grant Minecraft ownership or official online-service access. Obtain the game legitimately. Third-party providers may have their own requirements. AmberE is not an official Mojang or Microsoft product and does not claim Microsoft API approval.

## Documentation

[User guide](docs/USER-GUIDE.md) · [Languages](docs/LANGUAGE-PACKS.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md) · [Testing](docs/TESTING.md) · [Build and contribute](CONTRIBUTING.md)

[Rollback guide](docs/ROLLBACK.md) / [回滚说明](docs/zh-CN/ROLLBACK.md)
