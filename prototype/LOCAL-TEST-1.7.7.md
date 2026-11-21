# AMBER / AmberE 1.7.7 multiplayer acceptance

Development channel. Use only disposable server instances and test accounts. See the bilingual user guide for the room and tunnel workflows.

| Surface | Regression coverage | Interactive acceptance |
| --- | --- | --- |
| EasyTier | Built-in, custom and old invitations, room lifecycle, host challenge and game status, opt-in client sync | Host and guest on separate networks must complete an actual Minecraft join |
| SakuraFRP | Provider catalog, saved nodes, bindings, restrictions, lost responses and reconciliation against fixtures | Provider account, billing quota, real frpc and public gameplay require a test account |
| Instances and content | Libraries, imports, loaders, compatibility, updates, backups and recycle bin | Real game and modpack launch pending |
| Accounts and appearance | Edition policy, accounts, skins, themes, languages, preferences | Live login and skin upload pending |
| Servers and tools | Core installs, EULA, configuration, players, ports, MySQL, map/editor, launch plans, schedules | Live server administration pending |
| Tasks, network and storage | Queue, downloads, sources, resumability, storage migration, transfer and recovery | Long-running live traffic pending |
| Desktop and updates | Startup, tray, memory, privacy, local/public update channels | Clean Windows installation and in-place upgrade from 1.7.6 pending for both editions |

1.7.6 source inspection identified a stale default and a failed-room retry dead end. The new UI offers an explicit return to settings. A listening TCP port alone must never mark a guest ready. A successful Minecraft status reply indicates availability for a join attempt. Gameplay acceptance requires a client entering the world.

## Follow-up acceptance for the four corrections

1. Open Online → Connections on the same server instance at the same display scale. Compare the first content row of EasyTier and Sakura Frp in a wide window and after resizing to a narrow window. On EasyTier, the two task cards should wrap without hiding host, join, LAN or advanced settings.
2. Start a disposable EasyTier room. Compare the host label before a guest check, just after a check, and after the guest leaves the launcher page or uses an older launcher. The label is about recent detection, not entering or leaving the Minecraft server.
3. In the Sakura node card's remote creation dialog, try an ineligible node. Confirm the exact reason is visible beside Create with no hover. Switch to an eligible node in the same dialog; name, instance port and audience should stay selected, and a manually entered remote port should be checked against the new node. Leave the remote port blank to request automatic assignment.
4. With an authorized provider test account, verify separate tunnel associations for Minecraft and an appropriate extra plugin port. Cancel before submission, then retry after a known error; ensure duplicate clicks do not create duplicate tunnels. Reconcile uncertain provider results before any retry.

Native Windows clean installation and in-place upgrade, two-network Minecraft gameplay, and live Sakura changes require a suitable test system and account. Check the current handoff for the exact tested commit and results; the original baseline evidence below does not certify these follow-up changes.

## Original 1.7.7 baseline results on Linux x64

- The Chromium renderer fixture exercised host creation and copying, guest failure and returning with the invitation retained, a ready guest address, node dialog cancellation, creation, association, failure/retry, and rapid repeat submission. Sakura used synthetic service data.
- The repository suite reported 967 passed, 9 failed and 1 skipped. All nine failures also reproduced on the unchanged 1.7.6 base on this Linux runner. Seven Windows-installer update cases expect Windows assets, one vanilla rule case expects Windows platform matching, and one room-sync fixture creates a filename longer than the host filesystem's byte limit. No new suite failures were observed.
- The real Linux x64 EasyTier 2.6.4 core matched the repository's SHA-256. Two local processes carried a signed room snapshot and a synthetic game-port request. This run used one network and did not launch Minecraft. The application distributes its pinned component through its component manager.
- No separate-network Minecraft client pair or Sakura provider test account was available. Native Windows installer, upgrade, desktop startup, macOS and FreeBSD runtime validation remain pending. Linux Electron desktop startup was blocked when Chromium tried to create its Unix socket. The same renderer controls ran in Chromium Headless Shell.
- Both NSIS development installers use the edition staging script, verified Windows Electron 45.0.0 distribution, and the locked electron-builder. On Linux, its own UninstallerReader extracted the compiled NSIS uninstaller for the final compiler pass. Check the per-file hash and provenance sidecars. Native Windows CI uses its normal uninstaller generation.
