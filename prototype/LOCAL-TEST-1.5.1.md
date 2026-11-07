# 1.5.1 task test build / 任务测试包

This task fixes existing `.minecraft` import compatibility in AMBER and AmberE. It stops at a draft PR and paired Windows x64 test installers. No merge, stable Release or Pages deployment is authorized. Continue all fixes on `codex/1.5.1-minecraft-import` and its single PR.

本任务修复 AMBER / AmberE 已有 `.minecraft` 导入兼容性，仅交付草稿 PR 与双款 Windows x64 测试安装包。由小岚独立审核，用户手动验收并决定合并；不发布正式 Release、不部署 Pages。

## Behavior / 行为

- Previously, the terminal inherited JSON `id` was always treated as the official Minecraft version, and profiles without `gameDir` always used the shared root. A merged custom profile could therefore report “Base version unavailable in official catalog” and an isolated profile could show zero files from the wrong directory.
- IDs and display names now remain distinct from base game and loader versions. Evidence includes the inheritance chain, explicit `clientVersion`, Fabric intermediary coordinates, Forge/NeoForge coordinates and `--fml.mcVersion`. Names are never suffix-stripped. The official catalog and loader catalog remain mandatory. Missing/conflicting base evidence asks for an explicit official-version selection; unknown entry classes, damaged/cyclic/missing inheritance and conflicting loader versions remain blocked. Catalog access failures are shown separately from an unsupported verified combination.
- Explicit profile/JSON `gameDir` and literal `--gameDir` are checked; absent configuration, allowlisted content in shared and selected-version directories provides candidates. Multiple candidates require selection. An OS folder picker permits explicit correction. Placeholder commands, JARs and scripts are never executed to identify a source.
- Preview reports actual source, source ID, resolved game/loader, selected content, count and bytes. Zero-file imports require runtime-only consent. Shared-root data may intentionally be shared by several profiles; the user must confirm that this is the desired content. Other version directories and top-level account files are never traversed by content copying.
- Preview binds the exact file manifest, SHA-256, sizes and timestamps. Changed metadata, added/deleted/changed selected files, stale previews and unapproved directory paths fail before copying. Copying rechecks source hashes and verifies destination bytes. Link/junction, path, overlap, space, cancellation and retained partial-instance protections remain.

旧逻辑把继承链末端的自定义 ID 当作基础版本，缺少 `gameDir` 时固定读取共享根目录。新流程分别识别基础版本、加载器、显示名和实际游戏数据目录；证据不足或冲突时要求确认，网络不可验证与已确认不支持分开显示。零文件必须确认仅创建运行环境，不宣称完整迁移。预览与执行之间校验文件清单、内容、时间戳及版本配置；所有结果均只读源目录，失败或取消保留新实例中已复制内容。

## Verification / 验证

`node --test --test-concurrency=2` over the package test list, `pnpm build`, `pnpm test:sites`, `pnpm release:check`, desktop smoke, and `scripts/qa-import151.cjs` are the relevant checks. The PR records exact results and tested commits. New tests use isolated temporary synthetic data only; permission/space failures are injected at importer I/O boundaries, while file mutations, copying and Windows junction tests use real temporary files.

Desktop interaction checks use the same application code and packaged Windows executable with synthetic source data and synthetic official-network responses. The runner asserts the isolated userData and library paths before any mutation, covers both languages, built-in themes, small windows, large text, long names/paths, directory selection, ambiguous version confirmation, zero-file consent and successful copy. This is real desktop interaction with synthetic data, not real-user-directory or gameplay acceptance.

## Installation and data / 安装与数据

Both installers use channel **local**. Normal startup still uses `%APPDATA%/AMBER` or `%APPDATA%/AmberE`, respectively, and the existing configured library. **Each test package shares data with the corresponding formal product by default. A different installation directory does not isolate data.** AMBER and AmberE retain separate identities, account policies and update repositories. Use a separate Windows user/VM for manual testing when isolation is required. QA uses the existing local-build `--qa-ui` plus an explicit temporary `AMBER_SMOKE_ROOT`; it asserts the effective path before writing. This QA option is not the normal installer behavior.

测试包默认与对应产品正式版共享用户数据与已配置资料库；更换安装目录不等于数据隔离。AMBER 与 AmberE 相互仍保持身份、账号、资料与更新渠道独立。人工测试需要隔离时使用独立 Windows 用户或虚拟机。安装包、截图和原始测试日志不进入源码提交。

## Remaining acceptance / 尚待验收

The user's real version JSON and directory structure have not been obtained. No particular original launcher or metadata format is claimed to be confirmed. Unknown client formats beyond recognized metadata need an explicit version or may remain unsupported; only recognized clients are recreated from official runtime sources, not arbitrary original JVM behavior. Huge personal libraries and adversarial concurrent filesystem replacement are not covered by the synthetic suite; keep the original game closed throughout import. Native macOS/Linux behavior and live gameplay are outside this Windows task.

用户真实实例尚未验证。必要时由小岚请求最小样本：所选版本 JSON（及它实际引用的父版本 JSON）、删除个人路径信息后的相关 `lastVersionId`/`gameDir` 配置片段，以及只包含目录名的简短结构。不要索要整个 `.minecraft`、账号文件、访问令牌或存档内容。

PR artifacts include `TEST-REVISION.txt`, per-installer provenance and SHA-256. The downloadable package must match the final PR head; file names alone are not provenance. GitHub Actions artifacts expire after the repository's current 30-day retention period.

Independent review follow-up: missing, moved or unreadable configured game directories remain selectable when version metadata is valid. The original path and reason are shown and explicit directory correction is required, without fallback to shared/isolated data. Link rejection, approved-path selection and preview binding remain unchanged. / 独立审核修复：失效或无权限的显式游戏目录单独提示，保留有效版本的选择入口，必须明确重新选择数据来源，不静默回退；链接、路径与预览绑定保护保持。
