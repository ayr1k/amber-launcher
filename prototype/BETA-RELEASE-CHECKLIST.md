# Beta 1.0 release preparation

Current build: **1.0.0-beta.1** (display name: beta 1.0), as requested by the project owner. A prerelease version does not imply all external acceptance is complete.

No GitHub upload is authorized for this iteration.

## Ready locally

- Isolated installs, Java, vanilla and supported loader paths; Modrinth search, categories, sorting, dependencies and migration.
- Recycle/restore and explicit permanent deletion, with typed-name confirmation, path/link checks and running-task protection.
- Version grouping, task center, download-safe close, optional background and square/rounded layouts.
- Persistent setup/content plans, optional dependencies, backup/restore as new instance, onboarding, verified storage copy and launch panel opacity.
- Privacy-limited local diagnostic export; errors have recovery entry points.
- pnpm lockfile, Node 24 / pnpm 11.25.0 build, full dependency license texts, MPL-2.0 source.
- GitHub Windows CI, issue templates, contribution/security guidance, allowlisted source export and SHA-256 manifest. The workflow builds downloadable artifacts, not public releases.
- Dependency advisory check returned zero known vulnerabilities after Vite 6.4.4 / fflate 0.8.3 upgrades and removal of the legacy tracing tool. Source and packaged desktop smoke both passed locally.

## Still to verify before beta publication

- Microsoft Minecraft Services approval and real owned-account sign-in/refresh/launch. Third-party account flow also needs live acceptance with an intended provider.
- Installer/signing/SmartScreen strategy and clean-machine Windows acceptance. Current output is an unsigned portable development directory.
- POP mark: supplied for inclusion by the project initiator; document public redistribution terms. Previously downloaded mod-project preview icons are excluded from the prepared source and desktop package. Live Modrinth project icons are fetched from provider URLs when browsing.
- Recheck dependency advisories at publication time and review the limited secret scan results; a simple pattern scan is not a comprehensive security review.
- Validate the new workflow on GitHub after source upload; local testing cannot establish that hosted CI passed.
- Alpha.10 persistent setup/content recovery, backup/restore and verified storage relocation pass local filesystem tests. Still perform clean-machine long-running install interruption and real cross-volume migration acceptance. Legacy records cannot recover missing plans; repair only prepares the current component configuration.
- Manual/unregistered mod conflicts and arbitrary crashes cannot all be diagnosed. No guarantee is made for every historical loader combination or long gameplay sessions.

## Next publication steps

1. Inspect the prepared source directory/ZIP and its `SOURCE-MANIFEST.json`. No account library, caches, QA screenshots, release executables, node_modules or unreviewed preview mod icons are included.
2. Import source into a branch based on the existing `ayr1k/amber-launcher` `main`, preserving the published README/license history. Do not force-push the unrelated local initial Git repository.
3. Run hosted Windows CI and review the artifact. Resolve remaining acceptance items above before public distribution.
4. Create a prerelease and attach the Windows artifact plus exact matching source and checksums. Retain MPL and all third-party notices. No tag, push, GitHub Release or public upload is performed by the preparation scripts.

Actions references: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [pnpm setup](https://github.com/pnpm/action-setup), [artifact upload](https://github.com/actions/upload-artifact). Workflow actions are pinned to observed commits.
