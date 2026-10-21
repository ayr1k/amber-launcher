# AMBER Launcher

An independent Minecraft: Java Edition desktop launcher, built around isolated game instances and user choice.

AMBER 是一款正在开发中的独立 Minecraft Java 版桌面启动器，提供版本隔离、游戏安装、Java 管理与账号管理。当前验证平台为 Windows x64。

## Development status

**Alpha — under active development.** This repository describes a working development project, not a feature-complete public release.

Implemented in the current development build:

- Official Minecraft version catalogue, client, libraries and assets downloads, with integrity verification.
- Concurrent file downloads, cancellation, retries and repair using verified cached files.
- Isolated game instances with separate saves, configuration and logs.
- Local Java discovery and managed Eclipse Temurin runtime installation.
- Vanilla and Fabric installation and launch.
- Local offline profiles, configurable Microsoft device-code authentication, and third-party Yggdrasil authentication flows.
- Windows OS-backed encryption of stored authentication tokens; account passwords are not persisted.

Minecraft 1.21.1 with Fabric Loader 0.19.5 and Java 21 has been launched in a Windows x64 test environment, with renderer and audio initialization confirmed. Other versions have not all been individually verified.

Microsoft authentication is implemented but **Minecraft Services application approval and live end-to-end validation are still pending**. Third-party authentication also requires live account testing. Mocked protocol tests do not establish successful production authentication.

## Microsoft sign-in

AMBER requests access to Minecraft Services to authenticate users through Microsoft, check Java Edition entitlements, retrieve Minecraft profiles and start authenticated game sessions.

- Users sign in on Microsoft's website using a device authorization code.
- AMBER does not collect Microsoft account passwords.
- Official AMBER builds are intended to include the project's own approved public application ID, so users will not need to register Azure applications.
- Offline profiles and third-party authentication are separate modes. They do not provide Microsoft authentication or access to Microsoft-authenticated multiplayer services.
- Failed Microsoft authentication is not silently replaced with an offline identity.

AMBER is not affiliated with, endorsed by or an official product of Mojang or Microsoft. Minecraft names and trademarks belong to their respective owners.

## Planned work

- Forge, NeoForge, LiteLoader and OptiFine installation paths, with explicit compatibility restrictions.
- Modrinth content browsing, compatible version selection, dependencies and mod enable/disable management.
- Content support for mods, shaders, resource packs, modpacks and worlds where supported by the provider or through explicit imports.
- Cross-version mod manifest migration, skipping unavailable compatible versions and producing a final report.
- Appearance and layout customization, portable project data and progressively open extension interfaces.

These are planned capabilities, not claims of completed functionality. Interactive 3D scene navigation is deferred until a suitable user-created scene is available.

## Source publication and releases

This initial public repository provides the project overview and license for application review. The development source is currently maintained locally and has not yet been uploaded here. There is no public binary release in this repository yet.

## License

Project-owned source code is licensed under the **Mozilla Public License 2.0**; see [LICENSE](LICENSE). Third-party software, fonts and artwork retain their respective licenses. Minecraft game files are obtained from their official sources rather than included in this repository.

## Contact

For public project questions, open a GitHub issue in this repository. Do not include passwords, authentication tokens, payment information or private account details in issues. The project maintainer supplies a private contact email separately to the application review team.
