# AMBER / AmberE 1.4.8 task candidate

This is a PR test delivery, not a formal release. The task branch is
`codex/1.4.8-startup-download`, based on main `31802fa`. All subsequent task
changes stay on this branch until merge or explicit abandonment. Nothing in
this document authorizes a merge, stable Release or Pages deployment.

## Changes

- A lightweight Electron entry point paints the loading window before importing
  the main application. Status follows actual data-location checks, transaction
  recovery, account/settings loading, instance recovery and interface creation.
  There are no percentages, simulated progress or minimum animation duration.
- The main window remains hidden until locale, initial settings/library data
  (or a visible recoverable error) and React rendering are ready. It then replaces
  the loading window immediately. Only the existing single-instance process can
  create windows. Loading failures/renderer crashes report failure rather than
  silently leaving a blank window; missing libraries retain the original
  retry/locate/quit flow and never create an empty replacement library.
- The small startup appearance cache contains display preferences and localized
  labels only; it cannot select a data directory. Classic light/dark/system,
  custom palette, radius, motion/reduced-motion and Chinese/English are supported.
  Custom-language messages use the existing catalog after locale initialization
  and on subsequent cached starts. Low-contrast status text gets readable ink.
- Hash-declared files of at least 32 MiB can use four fixed, resumable ranges.
  The capability request and every range share the existing fair connection
  budget and bandwidth limiter. No nested admission tickets are held.
- Unknown/small files, existing serial partials, a one-connection budget, or
  insufficient temporary space keep serial downloading. Invalid/ignored ranges,
  changed validators, encoded range responses and transfer errors drain peer
  requests and fall back. Strong ETags use If-Range; every range validates exact
  offsets/total length, and only a fully hash-verified assembled file is published.
  Existing source fallback, retry/backoff, pause/resume and cancellation remain.
  Segments temporarily need approximately twice the file size during assembly;
  available space is checked before selecting this mode.
- Every successful download/cache path removes the current hash's assembled
  partial and four known range sidecars. Cancellation after assembly remains
  resumable by a fresh process without network requests. Cleanup never follows
  linked paths or recursively deletes directories; a cleanup error preserves the
  verified destination and does not cause a redownload. A final-verification
  pause releases the shared transfer slot before waiting to publish.
- Review correction: the main UI signals readiness after the initial data/locale
  and React commit, without hidden-window animation-frame waits. Initial page
  entrance is suppressed so its text is readable immediately; later navigation
  keeps the existing global motion. The loading window remains until the main
  window is shown. No minimum display time or background-throttling override.

## Local verification

Windows, Node 24.22.1, pnpm 11.25.0, Electron 45.0.0. Synthetic temporary profiles
and temporary download roots only; no personal accounts, libraries or worlds.

- Full regression: 513/513 passed, no skips (494 existing + 19 task checks).
- Build, four Sites compatibility checks, 2,481 bilingual messages and source
  checks passed. The existing large JavaScript bundle warning remains.
- Native Electron startup/IPC smoke passed. See the review timing evidence below
  for the corrected startup handoff; the earlier 1,630 ms readiness observation
  included the hidden-frame wait and is superseded.
- Both editions passed scripted native-window checks for light/English at
  1440×1000, dark/Chinese at 1024×768 and a custom dark/rounded/18px/no-motion theme
  at 860×640. Loading and main screens were captured; primary destinations,
  settings/download copy, reload, root overflow and disappearance of the loading
  window were checked. Software rendering was used for reproducible captures.
- Reproduction: `node scripts/qa-startup148.cjs` with an external Playwright
  installation supplied by `AMBER_PLAYWRIGHT`; `AMBER_QA_STAGE` selects an edition
  stage. Each run asserts isolated `userData` before interacting with the app.
- Failure injection (`node scripts/qa-startup-failures148.cjs`) passed for a
  disconnected data location, module evaluation failure and main navigation
  failure. Each exits with a reported error; missing data does not create a
  replacement library. An initial module-error test exposed an isolated-world
  listener gap; the pre-module main-world error listener fixes that case.
  Choosing Quit in the original missing-library dialog was separately exercised
  with a test-only dialog stub: exit code 0, no replacement library, and no
  loading-window close handler blocking the quit request.
- Both editions also reran first-run onboarding/account return and tray/schedule
  checks. Timing runs launch a real second process against the same isolated
  profile and verify it exits without creating a second main window.
- Initial restricted execution produced EPERM errors for temporary-file renames
  and the dependency-store link. The tests passed under normal execution with
  the same isolated data strategy. No tests were skipped to hide these failures.

## Review follow-up evidence

The two confirmed review findings (orphaned range files and hidden-window frame
throttling) are corrected on the same task branch. The seven added download
regressions cover assembly cancellation/new-process recovery, destination and
loader-cache hits, cancellation protection, directory/junction safety, cleanup
failure retry and pausing at verification while another download runs.

`scripts/qa-startup-timing148.cjs` uses three fresh, initialized empty libraries
per edition/rendering mode. It measures React's data-ready commit through the
native main-window `show` event, observes successive compositor surfaces, checks
initial content opacity and later page animation, and records GPU feature
status. It does not delay startup, change throttling or force a hidden frame.
Normal GPU mode means Electron's default graphics configuration on this PC,
not a claim that every adapter/driver has been tested; software mode explicitly
uses `--disable-gpu`. These are local warm launches, not OS cold-boot guarantees.

| Edition / graphics mode | Commit to show (three trials) | Show to readable main content |
| --- | --- | --- |
| AMBER / default GPU | 6.0, 6.7, 5.0 ms | 9, 9, 9 ms |
| AMBER / software | 7.3, 7.4, 6.1 ms | 9, 9, 12 ms |
| AmberE / default GPU | 5.3, 5.8, 5.8 ms | 13, 11, 9 ms |
| AmberE / software | 8.3, 7.9, 6.7 ms | 9, 11, 11 ms |

An investigative single-surface capture occasionally returned an older locale
placeholder. The final runner records a sequence for 600 ms **after** showing
the window, rather than equating a cached surface with a sustained white screen.
All final twelve runs observed readable main content in the first captured
surface within 9–13 ms of show. Header/background images may finish decoding
after text and controls; the app does not wait for decorative images. This is
not a guarantee of zero transient cached pixels on every graphics driver.

Current timing, first-frame screenshots and rerun theme evidence are stored in
`docs/evidence/review148-*`. Earlier `amber-startup148.json`,
`ambere-startup148.json` and their screenshots remain historical evidence from
the first delivery; they are not presented as measurements of this correction.
CI results and exact-head packaged smoke are recorded separately in the PR.

## Same-condition download measurements

`node scripts/benchmark-download148.mjs <output.json>` runs an isolated HTTP
fixture. The production downloader is used in both modes; `segments:false`
selects its existing single-stream path. The test-only transport maps the
allowlisted fixture URL to loopback; production URL/redirect restrictions are
unchanged. Each pair downloads the same fresh 32 MiB file, includes writes,
assembly and SHA-256 verification, uses a shared budget of 8, and alternates
order across three trials. Reported values are medians.

| Controlled condition | Serial | Automatic | Ratio |
| --- | ---: | ---: | ---: |
| Per-connection bottleneck | 3,959 ms | 1,055 ms | 3.75× |
| One shared server bandwidth bottleneck | 3,978 ms | 4,046 ms | 0.98× |
| Server ignores Range | 3,967 ms | 3,968 ms | 1.00× |
| App total limit of 8,192 KiB/s | 4,017 ms | 4,072 ms | 0.99× |

The shared-bandwidth fixture uses one server send clock, avoiding Windows timer
rounding differences between single and multiple streams. Raw trials are in
`docs/evidence/review148-download-benchmark.json`; the earlier
`download148-benchmark.json` remains historical. This demonstrates a gain for a
connection bottleneck and slight overhead/no gain elsewhere. It is **not** a
claim about every CDN, ISP, Wi-Fi link, real Internet download or NDM performance.

## Installer delivery and remaining acceptance

The PR supplies the final revision, CI results, artifact ZIP and SHA-256 values.
The PR installer workflow checks out the exact PR head, builds both products in
the local-test channel, and includes `TEST-REVISION.txt`. Installers are generated
artifacts, never source commits. GitHub artifact downloads may require sign-in
and expire after 30 days.

**Test installers share the installed product's application identity and data.**
AMBER uses `%APPDATA%/AMBER`; AmberE uses `%APPDATA%/AmberE`. Installing can replace
the same product's installation and reuse its configured library. A different
installation directory or the local-test channel does not isolate data. Use a
separate Windows user and disposable game copies for manual acceptance, or back
up both application data and the actual configured game library first. Packaged
apps ignore `--qa-ui`; automated packaged checks must use the existing isolated
`--smoke-test` mode.

Packages remain unsigned. Existing-installation upgrade wizard behavior, actual
Minecraft/gameplay, real accounts, real CDN throughput, cold boot and native
macOS/Linux acceptance are not established by these tests. Xiao Lan's review and
the user's installer acceptance are separate from automated delivery checks.
