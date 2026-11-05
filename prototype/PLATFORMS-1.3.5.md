# 1.4.1 local packages / 本地测试包

Both editions now produce matching 1.4.1 artifacts through `pnpm package:all`. The user authorized 1.4.1 publication after Windows acceptance. Windows automated tests pass; macOS/Linux need target-machine acceptance. FreeBSD remains experimental server/tools-only. The historical 1.3.5 verification below describes earlier runtime checks, not 1.4.1 native acceptance. Signing remains deferred.

# 1.3.5 platform packages / 多平台安装包

The user accepted the packages and authorized GitHub releases and Pages publication. Windows/Linux/FreeBSD package bytes are preserved. macOS ZIPs add the missing Electron and Chromium license notices, with all existing application files unchanged. Signing remains deferred. Existing 1.3.4 installers remain available for rollback. Accounts, instances, saves, theme packages, website, promotional assets and AmberX are preserved.

| Platform | Release artifact | Verification and limits |
| --- | --- | --- |
| Windows x64 | AMBER / AmberE Setup EXE | Automated regression, isolated native UI with five themes; unsigned |
| macOS Intel / Apple Silicon | Separate mac-x64 / mac-arm64 ZIP containing the app | Official Electron runtime checksum and package structure checked; no Mac available for launch/gameplay testing. Unsigned and not notarized; Gatekeeper may block the download |
| Linux x64 | DEB, Debian/Ubuntu | Runtime and native seed engine executed in Ubuntu/WSL; real Java 21 download/extraction/detection checked. WSL has no usable desktop keyring, so full account-encryption/desktop acceptance did not pass; a target desktop and gameplay test are still required |
| FreeBSD amd64 | Experimental application TAR.GZ | Requires community Electron, OpenJDK and a system keyring. Build the seed engine with included build-map.sh. No FreeBSD runtime test; Minecraft client launch is not supported yet because compatible LWJGL natives are not bundled. Server/tools are the experimental scope |

macOS: extract the app and move it to Applications. Linux: install the DEB with the distribution package manager so dependencies are resolved. FreeBSD: unpack into a user-owned directory, install a compatible Electron port and OpenJDK, set AMBER_ELECTRON to the installed executable if it is version-suffixed, run build-map.sh, then launch.sh. None of these packages carries a trusted publisher signature.

macOS 请按芯片选择 ZIP，解压后将应用移入“应用程序”；Linux 使用软件包管理器安装 DEB 及依赖。FreeBSD 为实验应用包，需要系统提供 Electron、OpenJDK、密钥库和 C 编译器；先运行 build-map.sh，再运行 launch.sh。FreeBSD 不能作为完整 Minecraft 客户端支持发布。

## Offline identity / 离线身份

AMBER still requires a verified Microsoft owner and the existing maximum seven-day offline lease. The offline name and local PNG skin can be edited independently; the original UUID is retained. AmberE retains independent offline/third-party accounts. Name-based servers may associate a renamed player with different data despite the retained local UUID.

Skin import accepts 64×64 or classic 64×32 PNG, re-encodes the bitmap, and stores it inside the encrypted account record. The local texture service binds only to loopback and serves one launch identity; it does not authenticate players or join online servers. Older Authlib uses the hash-verified authlib-injector component, cached for later offline use. Minecraft 26.3 uses its discovery interface with a local signing key and texture allowlist. Actual Authlib 6.0.54 and 10.0.77 texture/signature parsing were exercised with synthetic identities; this is not a gameplay test. Keep the launcher running while using custom skins; other players do not automatically see them.

AMBER 的资格验证和最长 7 天缓存不变。改名保留原 UUID；名称型服务端仍可能把新名称视为新玩家。皮肤仅在本机提供，支持标准和窄手臂；不会修改微软账号的在线皮肤。游戏期间保持启动器运行，其他玩家不一定可见。首次兼容组件下载完成后可复用缓存。

Linux/FreeBSD must have a secure credential backend. The basic_text fallback is deliberately rejected; installing a package does not automatically configure a desktop keyring. Account stores encrypted on another operating system cannot be copied as portable login credentials.

## Local builds

From prototype: `node scripts/package-editions.mjs` builds both Windows installers; `--stage-only` prepares product-specific app trees without publishing. `node scripts/build-platform-engines135.mjs` uses AMBER_ZIG to build Linux/macOS map engines. `python scripts/package-platforms135.py --cache <directory>` verifies official Electron ZIPs against SHASUMS256.txt and creates macOS ZIP/Linux DEB/FreeBSD experimental bundles from those stages. The cache needs the exact Electron version in package.json. The release directory includes per-file SHA-256 checksums. Never label the experimental packages as verified gameplay support.
