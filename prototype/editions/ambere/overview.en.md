<h1 align="center">AmberE</h1>

<p align="center"><strong>Offline and third-party identities. Your own adventure.</strong></p>

<p align="center">
  <a href="https://github.com/ayr1k/AmberE/releases/tag/v1.5.0"><img src="https://img.shields.io/badge/release-1.5.0-e9b53d?style=flat-square" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-527b68?style=flat-square" alt="License" /></a>
  <a href="https://github.com/ayr1k/AmberE/actions/workflows/windows.yml"><img src="https://github.com/ayr1k/AmberE/actions/workflows/windows.yml/badge.svg" alt="Build" /></a>
  <a href="https://ayr1k.github.io/"><img src="https://img.shields.io/badge/website-AMBER-527b68?style=flat-square" alt="Website" /></a>
</p>

<p align="center"><a href="https://ayr1k.github.io/">Website</a> · <a href="https://ayr1k.github.io/#/download?product=ambere">Downloads</a> · <a href="docs/USER-GUIDE.md">User guide</a> · <a href="https://ayr1k.github.io/#/themes">Themes</a> · <a href="docs/zh-CN/README.md">简体中文</a></p>

An independent Minecraft: Java Edition launcher bringing instances, content, themes and server management into one workspace.

## Screenshots

<table>
  <tr><th>Alloy</th><th>Nocturne</th></tr>
  <tr>
    <td width="50%"><a href="docs/images/launcher-alloy.png"><img src="docs/images/launcher-alloy.png" alt="AMBER Alloy theme home screen" width="100%" /></a></td>
    <td width="50%"><a href="docs/images/launcher-nocturne.png"><img src="docs/images/launcher-nocturne.png" alt="AMBER Nocturne theme home screen" width="100%" /></a></td>
  </tr>
</table>

Public AMBER 1.2.1 theme previews using demonstration data; these themes also work with AmberE. Click to enlarge. See the 1.5.0 notes below for current features and platform availability.

## Overview

AmberE is an independent distribution for Minecraft: Java Edition, providing offline and third-party accounts. It is maintained from the shared AMBER codebase under MPL-2.0, with its own application identity, data directory and update repository. It does not offer Microsoft sign-in or include a Microsoft application Client ID.

## 1.5.0

Manage instance ports and optional local MySQL, independent Sakura tunnels, account details with 3D skins and local play statistics, and an offline enchantment-order calculator. Database preparation currently supports Windows x64 and is downloaded on demand.

Windows/macOS/Linux/FreeBSD packages share version 1.5.0. Native macOS/Linux acceptance is pending; FreeBSD is experimental server/tools-only.

Windows x64 release with additional platform downloads. [Download the installer, source and checksums](https://github.com/ayr1k/AmberE/releases/tag/v1.5.0). Includes instance management, content recommendations, mod updates, backups and recovery.

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
