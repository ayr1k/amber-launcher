# Update sources 1.7.5

GitHub global is the existing/default choice, generally suitable overseas; mainland China connectivity may be limited. The official Hong Kong, China mirror provides another route for mainland China and nearby regions. Speed depends on the network and synchronization can lag. There is no IP routing, automatic source switch or speed promise.

## Protocol and trust

The custom updater remains in `prototype/desktop/app-updates.mjs`; it does not use electron-updater. Protocol 1 is a GitHub-authorized byte mirror. The public `/mirror/v1/index.json` is never fetched by the updater and cannot authorize updates. There is no new website deployment prerequisite.

1. Read the product-specific GitHub Releases API with HTTPS, bounded responses, a 20-second request timeout, no redirects and no-store. Stable additionally queries `/latest`. Choose the highest eligible version; do not downgrade or silently skip a newer release whose installer/digest is unavailable.
2. Require exact product, platform/architecture filename, uploaded state, bounded positive size, SHA-256 digest from GitHub, and exact product repository release asset URL. Supported in-app targets: Windows x64, macOS x64/arm64, Linux x64. FreeBSD and other architectures explicitly fail.
3. For the stable-only mirror, derive the fixed HTTPS URL `/mirror/v1/{amber|ambere}/{version}/{filename}`. Probe HEAD without redirects and compare size to GitHub. A missing/lagging asset fails; it is never called up to date. Mirror response metadata and any mirror digest are not an authenticity authority.
4. Refresh authority and compare candidate identity before each download/retry and before installation. Downloads have bounded bytes, hash-specific partial files, SHA-256 verification, cancellation and no mirror redirects. A replaced/revoked release requires a new check. Installation verifies local bytes again; candidates older than 15 minutes (or clock reversal) require another check/download. The main process repeats verification after the confirmation dialog and config backup.

This trusts the product GitHub repository/release permissions, GitHub API integrity and TLS. A digest from the same mirror origin would not be an independent signature, and is not accepted. There is no offline signing key, signed metadata or offline update guarantee. GitHub outages prevent checking, refreshing and installation even when mirror files are reachable. TLS/no-store plus revalidation limits stale reuse but cannot prove global freshness or prevent an authority from serving old metadata. Preview retains the existing latest-30 release listing scope.

## Settings and races

`update-channel.json` schema 2 stores `channel` and `source` independently. Schema 1 retains its channel and defaults to GitHub. Invalid settings produce an explicit error without blocking startup. Source selection never changes the channel. Mirror + preview fails explicitly. Switching clears candidates. Settings writes, checks, downloads and installation validation cannot overlap; cancel settles before switching. Retries never silently use another source. A completed cache is used only after refreshing metadata and verifying bytes.

## Validation and delivery

`prototype/tests/update-sources175.test.mjs` uses synthetic bytes and mocked GitHub/mirror responses, not real releases. It checks identity/platform binding, settings upgrade, unsupported combinations, unavailable authority/mirror, tampering, replacement, expiration, cancellation and switching races. Live endpoint probes, when recorded separately, prove connectivity/metadata only, not an installed upgrade. Native UI, actual installer runs, and real 1.7.4→1.7.5 upgrade remain separate acceptance limits; formal publication is authorized. Existing GitHub repository, Release and feedback links remain meaningful and are preserved.

See [中文](zh-CN/UPDATE-SOURCES-1.7.5.md).
