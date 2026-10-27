# Changelog

[简体中文](docs/zh-CN/CHANGELOG.md)

## Beta 1.9 — 1.0.0-beta.10 (prerelease)

- Add guided creation with a saved questionnaire, local hardware information and explained, editable setup recommendations; preserve manual creation and add direct Modrinth modpack creation.
- Apply server version/loader constraints, required projects, client environment, dependencies, declared incompatibilities, shader support and resource budgets before ranking whole setups.
- Keep required dependencies selected by default with explicit opt-outs and risk acknowledgement; allow optional dependencies and root removal with a new combined check.
- Pin file versions, hashes and sizes for resumable installation across restarts. Separate mod, resource-pack and shader stages; allow an explicit skip of remaining visual packs.
- Retain the creation plan in instance management, suggest per-instance memory and support Chinese/English text, themes and keyboard navigation.

Recommendations use curated rules and live metadata, not automated gameplay testing. Visual packs are downloaded only and must be enabled in game. Windows installers are unsigned. Windows installer, source archive and SHA-256 checksums accompany this prerelease. Microsoft live acceptance remains deferred pending approval.

## Beta 1.8 — 1.0.0-beta.9 (prerelease)

- First independent AmberE publication, derived from the shared AMBER Beta 1.8 core. The version number follows the shared core; it does not imply earlier independent AmberE releases.
- Use the approved gold-accented logo and separate Windows identity, installer, shortcuts and user-data directory.
- Provide offline and third-party accounts only. Remove Microsoft sign-in controls and exposed APIs; ship no Microsoft Client ID. Preserve instance installation, mod management, recovery, graphics preferences and other shared features.
- Direct update checks, release links and installer-origin validation exclusively to `ayr1k/AmberE`; reject cross-repository or wrong-product installers.
- Keep Chinese/English onboarding, settings and account pages aligned with actual capabilities. Brand substitution preserves user names and paths.

Windows x64 installer, source archive and SHA-256 checksums are attached. Installer unsigned. Local testers must manually install this published build once because the earlier test package used the previous update location. Offline accounts do not grant Minecraft ownership. Third-party live-service validation remains provider-specific. AmberE has no Microsoft sign-in and makes no claim of Microsoft API approval.
