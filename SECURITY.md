# Security policy

[简体中文](docs/zh-CN/SECURITY.md) · [Privacy](PRIVACY.md) · [Review scope](docs/SECURITY-REVIEW.md)

## Report a vulnerability

Use the repository's [private vulnerability reporting page](https://github.com/ayr1k/amber-launcher/security/advisories/new) when available. If GitHub does not offer private reporting, open a public issue asking only for a private contact channel; do not include exploit details or personal information. No response-time guarantee is established.

Include the affected AMBER version, platform, impact, reproducible steps with synthetic data, and a proposed fix if available. Never publish passwords, access/refresh tokens, account stores, private logs or real user files. Do not test against other people's accounts or production services without authorization.

## Supported scope

The current Beta 1.6 Windows x64 prerelease is the active maintenance target. Older releases should be upgraded. This is not a security certification or guarantee of absence of vulnerabilities.

The renderer is sandboxed with Node integration disabled, context isolation enabled, restrictive CSP and sender-validated IPC. Downloads use trusted HTTPS origins and integrity checks. Language packs are validated text-only JSON, never scripts. Credentials use Windows user encryption; the public Microsoft Client ID is intentionally distributed. Minecraft and mods run as the user and are outside an application sandbox. Install only trusted content.

Microsoft allow-list rejection is an access-review outcome, not evidence that a particular vulnerability was found in AMBER. Live Microsoft login remains unverified until approval.
