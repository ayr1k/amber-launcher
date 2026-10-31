# Contributing

[简体中文](docs/zh-CN/CONTRIBUTING.md)

Use Windows x64, Node.js 24 and pnpm 11.25.0. Run from `prototype`:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:sites
pnpm release:check
pnpm desktop:smoke
pnpm desktop
```

`pnpm dev` is a browser preview; real file operations and launches require the desktop app. `pnpm package:installer` builds the x64 NSIS installer. Never test destructive actions against personal instances; use temporary fixtures.

`pnpm package:editions` builds both AMBER and AmberE from the same source into `prototype/releases/1.1.0`. `node scripts/package-editions.mjs amber` or `ambere` builds one edition. Staging sets an immutable edition constant, replaces branding, and removes Microsoft API methods and the built-in Client ID from AmberE. Both installers have independent application identities and update assets. The command never publishes. Keep shared features in the common source; do not maintain a separate audit-only codebase. Real-game verification must use the desktop account authorization flow; headless verification scripts cannot bypass eligibility checks.

Keep English and Chinese documentation synchronized. Add translation entries for new application text, retain stable keys and preserve placeholders. See the language-pack guide. Do not translate user names, filenames, project descriptions or executable arguments.

Preserve transaction rollback, path checks, trusted download origins, checksums, isolated renderer permissions and secret redaction. Add regression coverage for behavioral changes. Do not include account stores, raw personal logs, credentials, local caches or generated installers in source commits. Report sensitive vulnerabilities through the security policy.

Project-owned changes use MPL-2.0. Preserve all dependency and asset notices. Pull requests should explain the user-visible change, validation and remaining limitations. Do not label simulated UI checks as successful real-game tests.

