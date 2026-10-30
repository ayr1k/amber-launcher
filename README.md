# AMBER

[简体中文](docs/zh-CN/README.md) · [Releases](https://github.com/ayr1k/amber-launcher/releases) · [User guide](docs/USER-GUIDE.md)

AMBER is an independent Windows launcher for Minecraft: Java Edition. It keeps game instances separate and brings installation, mod management, recovery and launch settings into one workspace. Project-owned source is licensed under MPL-2.0.

## 1.0.0

Stable release for Windows x64. [Download the installer, source and checksums](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0). Includes instance management, content recommendations, mod updates, backups and recovery.

- Integrated title bar, independent window corners, remembered window placement and reorganized privacy settings.

- Native Simplified Chinese and English, with instant language switching and importable text-only language packs.
- Vanilla, Fabric, Forge, NeoForge, LiteLoader and OptiFine workflows with explicit compatibility checks. Support depends on the game version and official artifacts.
- Compatible Modrinth search, categories and sorting; selectable dependencies; mod updates, version locks and bulk content management.
- Local mod import, cross-version mod-list migration, content recovery history, instance backup and restore, recycle bin and guarded permanent deletion.
- Favorites, sorting, recent launches, instance checks, restart-resumable installation plans and data-location migration.
- Themes, square or rounded controls, custom layout, local backgrounds and adjustable launch-panel opacity.

## Install

Download the Windows x64 Setup executable from [Releases](https://github.com/ayr1k/amber-launcher/releases), verify its SHA-256 checksum and run it. The installer offers Chinese and English. Close games and AMBER before upgrading; retain backups of important worlds. Uninstalling the program does not automatically remove game data. The prerelease installer is unsigned.

## Account status

Minecraft API access for AMBER has been approved. The user has successfully tested Microsoft licensed sign-in. Launch continues to verify eligibility. Approval is not an endorsement by Mojang or Microsoft. AMBER includes its public Microsoft Client ID. Login failure never silently switches to offline mode. AMBER requires online official eligibility verification for Microsoft and linked third-party launches. Explicitly created verified offline identities retain the official name and UUID with a maximum seven-day encrypted eligibility cache; this is a product policy, not a Mojang-approved exception. Legacy unverified offline accounts cannot launch in AMBER. Existing game instances and saves are preserved.

Third-party services require separate live validation. Offline mode does not grant Minecraft ownership or online-service access.

## Documentation

- [User guide](docs/USER-GUIDE.md) / [使用指南](docs/zh-CN/USER-GUIDE.md)
- [Language packs](docs/LANGUAGE-PACKS.md) / [语言包制作](docs/zh-CN/LANGUAGE-PACKS.md)
- [Privacy](PRIVACY.md) / [隐私说明](docs/zh-CN/PRIVACY.md)
- [Security policy](SECURITY.md) / [安全政策](docs/zh-CN/SECURITY.md)
- [Release notes](CHANGELOG.md) / [更新日志](docs/zh-CN/CHANGELOG.md)
- [Testing and limitations](docs/TESTING.md) / [测试与限制](docs/zh-CN/TESTING.md)
- [Build and contribute](CONTRIBUTING.md) / [构建与贡献](docs/zh-CN/CONTRIBUTING.md)
- [Third-party notices](prototype/THIRD_PARTY_NOTICES.md) / [第三方声明](docs/zh-CN/THIRD-PARTY-NOTICES.md)

AMBER is not an official Mojang or Microsoft product. Minecraft, downloaded components and third-party projects retain their respective rights and licenses.

[Rollback guide](docs/ROLLBACK.md) / [回滚说明](docs/zh-CN/ROLLBACK.md)

## Product family

| Project | Purpose |
| --- | --- |
| [AMBER](https://github.com/ayr1k/amber-launcher) | Everyday use with Microsoft sign-in and eligibility verification |
| [AmberE](https://github.com/ayr1k/AmberE) | Offline and third-party identities; does not grant game ownership or authenticated server access |
| [AmberX](https://github.com/ayr1k/AmberX) | Experimental goal-based workflows, comparison and trials |

Each project uses separate data and update channels.
