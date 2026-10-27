# AmberE

[简体中文](docs/zh-CN/README.md) · [Releases](https://github.com/ayr1k/AmberE/releases) · [User guide](docs/USER-GUIDE.md)

AmberE is an independent Windows distribution for Minecraft: Java Edition, providing offline and third-party accounts. It is maintained from the shared AMBER codebase under MPL-2.0, with its own application identity, data directory and update repository. It does not offer Microsoft sign-in or include a Microsoft application Client ID.

## Beta 1.11

Beta 1.11 fixes accidental UI text selection, improves guided layouts and tier comparisons, and adds cancellable recommendation checks, autosaved drafts, expiry recovery, local preference templates and post-install guidance. Additions preserve installed versions, settings and worlds. Download the [Windows x64 installer, source archive and SHA-256 checksums](https://github.com/ayr1k/AmberE/releases/tag/v1.0.0-beta.12).


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
