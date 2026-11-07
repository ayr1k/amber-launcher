# AMBER desktop source

[English overview](../README.md) · [简体中文](../docs/zh-CN/README.md)

React interface in `src/`; Electron main-process services in `desktop/`; tests in `tests/`; installer resources in `build/`. Run pnpm commands here. See the [contribution guide](../CONTRIBUTING.md), [language-pack interface](../docs/LANGUAGE-PACKS.md) and [testing guide](../docs/TESTING.md).

React 界面位于 `src/`，Electron 主进程服务位于 `desktop/`，测试位于 `tests/`，安装器资源位于 `build/`。在此目录运行 pnpm。参阅[贡献指南](../docs/zh-CN/CONTRIBUTING.md)、[语言包接口](../docs/zh-CN/LANGUAGE-PACKS.md)和[测试指南](../docs/zh-CN/TESTING.md)。

Official paired installers: `node scripts/package-editions.mjs --public` from `prototype`. Without `--public`, the paired build is marked as a local test build. Theme format and examples: [English](../docs/AMBTHEME-FORMAT.md) / [简体中文](../docs/zh-CN/AMBTHEME-FORMAT.md).

1.5.0 is the current release. Produce paired all-platform distributions with `node scripts/package-all141.mjs --public`. Native non-Windows validation limits are documented in RELEASE-ACCEPTANCE.md. Set `AMBER_CURSEFORGE_API_KEY` when building distributions; injected credentials are excluded from public source. The seed engine is bundled at `desktop/bin/seed-engine.exe`. Rebuild it on Windows using Zig 0.14.1: set `AMBER_ZIG` to `zig.exe`, then run `node scripts/build-seed-engine.mjs`. Pinned engine sources and licenses are included.

[Platform packages, build commands and limits / 平台包、构建与限制](PLATFORMS-1.3.5.md).
