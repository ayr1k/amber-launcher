# AMBER / AmberE 1.7.10 Windows x64 test builds

Base `1fc895d47541400bbb8f79e9c084b87430e963ad` includes merged import PR #24. The Draft PR records the final tested head, installer hashes and its paired measurement against this baseline. The two editions use their existing local test channels and account policies.

## Runtime changes

- Managed instance lookup checks the exact directory entry, type and requested instance's schema/ID commit marker each time. Looking up one instance previously loaded every sibling's JSON, including when the status and recovery services checked multiple files for each instance.
- The launch preparation overlay takes an initial snapshot and wakes on launch start, finish and window restore. It retains its 150 ms refresh for visible, active launch preparation. Task Center and floating task feedback request current data when the window becomes visible again.

## Windows benchmark

Run `node scripts/qa-runtime1710/run.mjs <edition-win-unpacked> <installed-QA-library-A> <installed-QA-library-B> <output.json>` from `prototype`. Supply a local-channel packaged build and disposable QA installs only. The driver validates the product and seeds a fresh temporary profile for each run. Private instrumentation is applied to a temporary copy of the packaged files and removed afterwards. The distributed installers contain standard production assets.

Both input libraries used here are independently prepared Minecraft 1.18.2 / Forge 40.2.9 QA installations. Official version metadata SHA-1 is `1a561f13f2d007d968f01636e726bbb5aabbf01f`. To recreate the layout, supply two isolated library roots each containing one installed Forge instance. The driver copies their real caches, manifests, loader files, installed content and natives. It assigns three fixed instance identities per input, plus one vanilla instance for the controlled download. Account records, save directories, Java path overrides and original app profiles are excluded.

Measurements used Windows 11 build 26200, Ryzen 9 9950X3D, 32 logical processors, Electron 45 and default launcher settings except for the controlled source selection (official, fallback off in both fixtures). For each build, three fresh launcher processes exercised the home page, an OS-minimized home window, and an active Task Center install with speed history expanded. Each scenario used 3 seconds of warm-up and an 8-second measurement window. The final benchmark keeps the test window above other windows for visible scenes and rejects any visibility transition during a sample. The minimized scene requires the OS-minimized window and a hidden document. The same 24 MiB payload was served over loopback in 32 KiB writes on a 32 ms timer. Actual transfer pacing depends on the Windows timer. The regular task queue, downloader, file verification, diagnostics and UI handled the transfer. The source declines ranges. The expected route is piston-data.mojang.com and the observed mode is single-stream.

The external Windows sampler follows the process tree by parent PID roughly every 500 ms. CPU is total CPU-time delta divided by elapsed time (100% = one logical CPU). Private memory is the sum of private committed bytes. Working set is summed RSS and can count shared pages multiple times. Both memory measures are averaged over each window. IPC counts are incoming launcher handler calls by channel. UI frequency counts DOM mutation batches under the React root, which can exclude React commits with no DOM changes. Cold startup means process creation to a visible navigation control and the app's startup-committed mark on a new Chromium profile. OS disk caches were left intact. Throughput uses payload bytes divided by the time from install invocation to the launcher's verified terminal job timestamp.

### Initial three-run AMBER hotspot baseline

Each cell lists runs 1, 2 and 3. These initial runs used automatic source selection. The Draft PR contains the final paired measurements for both editions with the source pinned.

| Scene | CPU % | Private MiB | Working set MiB | IPC/s | DOM batches/s |
|---|---|---|---|---|---|
| Home | 22.67 / 21.58 / 22.28 | 435 / 451 / 465 | 549 / 552 / 608 | 12.49 / 12.63 / 12.62 | 2.25 / 2.25 / 2.25 |
| Minimized | 20.13 / 15.69 / 13.11 | 429 / 442 / 457 | 544 / 546 / 601 | 5.86 / 6.24 / 5.38 | 2.25 / 2.50 / 1.88 |
| Download | 22.74 / 24.23 / 20.80 | 400 / 442 / 445 | 531 / 578 / 621 | 13.61 / 14.25 / 13.99 | 3.25 / 3.38 / 3.37 |

Cold startup took 2416 / 1502 / 1489 ms. The 24 MiB install took 36.990 / 33.980 / 34.470 s and delivered 0.649 / 0.706 / 0.696 MiB/s. The home page issued 51 prelaunch-state requests in each 8-second sample. It loaded full instance lists 715 / 692 / 685 times.

## Regression scope

- The opt-in `--links` scenario exercises page mount/unmount, ongoing downloads, pause/resume, independent concurrent failure, cancel and both native tunnel paths before, during and after OS minimization. It expects `AMBER_EASYTIER_EXE` (upstream Windows 2.6.4 package with Packet.dll), `AMBER_QA_FRPC` (Sakura 0.51.0-sakura-15.1) and `AMBER_QA_FRPS` (FRP 0.51.0 Windows amd64). All bind addresses are loopback. The test supplies provider metadata and uses a local HTTP echo target. Fresh responses on both forwarded ports and unchanged native worker PIDs establish continuity.
- The existing suite covers ranged resume, cancellation and restart recovery, source and concurrency accounting, cross-volume import and PCL2 merged profiles. The Windows renderer import driver checks both library registration and copy in C-to-C, C-to-E and E-to-C configurations. The Java restart driver exercises initial discovery, saved client/server selections and reuse of the same installed JDK with network access denied to its fixture.
- Testing scope excludes real account login, user libraries or saves, public Sakura provisioning, cross-WAN gameplay, non-Windows performance measurements and a manual interactive installer upgrade. The Draft PR and its installer workflow carry final run results.
