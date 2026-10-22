# Contributing to AMBER

Use Node.js 24 and pnpm 11.25.0. The desktop app lives in `prototype/`.

```powershell
cd prototype
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:sites
pnpm desktop:smoke
```

`pnpm dev` opens the browser prototype; only Electron (`pnpm desktop`, after building) has real filesystem, download and launch access. UI fixtures are explicitly labeled and must not be presented as successful installations.

Keep source changes under MPL-2.0, preserve dependency notices, and do not bundle Minecraft, Java, OptiFine or downloaded mods. The Java bridges include their source; `node scripts/build-java-bridge.mjs <java17-or-newer>` recompiles them using the pinned ECJ compiler. Compiler download is verified and excluded from distribution.

Test filesystem operations in temporary directories. Do not delete real user instances for automated verification. Permanent deletion must verify containment, reject links, and require the exact recycled instance name. Microsoft live authentication is a separate acceptance gate; no borrowed application IDs or embedded secrets.

Use a small focused PR with the concrete behavior change and validation performed. Do not commit `.env`, logs, credentials, app data, local QA screenshots, `node_modules`, `dist` or release directories. GitHub Actions builds an artifact for review; it does not publish a GitHub Release.
