# AMBER / AmberE 1.6.3 — instance file editor test

This is a local-channel task build, not a stable release. Both installers use the normal product identities and data locations. They can replace an existing installation of the same product and read its existing data. Use a disposable Windows profile or VM and copied synthetic fixtures. They are **not** isolated side-by-side test editions. Back up existing data before installation. AMBER and AmberE retain separate accounts, identities, data and update repositories.

Base: `912b90b33b24810c8bfc9f6463eacae6dade4848` (published 1.6.2). See the PR artifact's `TEST-REVISION.txt`, installer `.provenance.json` and `.sha256` files for the exact tested head, clean/dirty state, local channel, bytes and digests. Generated installers are not committed. User acceptance decides merging; this task does not publish a Release or Pages.

## Test checklist

1. In Tools → File editor, open disposable UTF-8 configuration files. Check full path, unsaved marker, UTF-8/BOM, LF/CRLF/CR/no-newline metadata, two same-name files, Refresh files and Go to line. Refresh must not replace open edits.
2. Edit a file, then change it externally. Save must report a conflict and keep your draft. Compare disk / reload shows both texts and the first differing line. Cancel keeps the draft. Reload requires confirmation; Restore previous draft recovers the replaced buffer during this editor session. Manually merge desired changes before saving; there is no force-overwrite button or automatic merge.
3. Open Backups and select a version. Compare before loading it. Cancel makes no changes. Loading requires confirmation and does not write until Save. Verify BOM and line endings after saving. The previous draft recovery is session-only, not a persistent recovery journal; closing a tab or leaving the editor discards that history.
4. Try Chinese input with your actual IME, undo/redo, rapid A/B/A switching, switching during backup loading, repeated requests, closing with unsaved changes and cancellation. An older response must not select or change another file.
5. Use synthetic read-only files, removed/replaced files and a stopped disposable instance to check errors and retry. Do not edit real running games as a test. Verify both Chinese/English, narrow/wide windows, themes, rounding and reduced-motion settings.

## Scope and limitations

- UTF-8 only, existing allowed paths and 2 MB limit remain. Mixed line endings are reported and view-only to prevent silent normalization; normalize with an external tool, then reload. The comparison is two selectable text panes with a first-difference location, not a line-by-line merge tool.
- Save serializes this editor's writes, checks running state and the expected hash, preserves the actual displaced directory entry, then exclusively creates the destination. The deterministic final-check race now reports conflict, retains the editor buffer and preserves external bytes in both the restored path and backup. A competing recreated destination is never overwritten by the exclusive commit. New backup names include a UUID; old backups remain readable.
- This is **not absolute cross-process locking or a power-loss transaction**. The destination is briefly absent between displacement and exclusive creation. A crash in that interval can require restoring the adjacent `.amber-edit-<time>-<uuid>.bak` manually. Other processes holding old file handles can keep modifying the preserved entry, and writes after the post-commit check are ordinary later external changes. Stop external writers. Filesystems without hard-link support fail safely and retain a recovery copy rather than falling back to unchecked replacement. Permissions, filesystem behavior and abrupt power failure are not universally certified.
- Native QA asserts unpackaged Electron `--qa-ui` userData and storage match disposable fixtures before mutation. Packaged `--qa-ui` is not isolation. Packaged startup uses the existing dedicated smoke-test mode.
- Automated composition events and Chinese text insertion do not certify a real operating-system IME. Complete installation/upgrade, real account/gameplay, macOS desktop and all Windows DPI combinations are separate acceptance items. No real accounts, worlds or private theme assets are used.

## 中文测试说明

这是本地测试渠道，不是正式发行版。安装身份与数据目录沿用对应产品，可能覆盖现有安装并读取已有数据；**不是可隔离并行安装的测试版**。请使用一次性 Windows 用户/虚拟机与复制的合成实例，安装前备份数据。AMBER 与 AmberE 的账号政策、身份、数据和更新仓库保持独立。

基线为已发布的 1.6.2 提交 `912b90b33b24810c8bfc9f6463eacae6dade4848`。完整版本来源、最终提交、dirty 状态、本地渠道和校验值见 PR 下载工件内的 `TEST-REVISION.txt`、`.provenance.json` 与 `.sha256`。本任务不合并、不正式发布、不部署官网。

1. 打开合成 UTF-8 配置，检查完整路径、未保存状态、BOM 与换行信息、同名标签、文件列表刷新、跳转行。刷新不得丢弃编辑内容。
2. 编辑后在外部修改文件。保存应报告冲突并保留草稿；“比较磁盘 / 重载”显示两份文本与第一处差异行。取消保留草稿，重载需确认，可用“恢复替换前草稿”找回。需要的修改请手动合并，无强制覆盖或自动合并。
3. 历史备份先比较再载入。取消不修改，载入需确认，保存前不写磁盘。验证 BOM/换行保持。替换前草稿仅在当前编辑会话有效，关闭标签或离开编辑器后不会持久保存。
4. 用实际中文输入法检查输入、撤销/重做、快速切换、读取备份时切换、重复操作及关闭取消。旧响应不得抢回焦点或串写其他文件。
5. 用合成只读、消失和被替换文件检查失败原因、草稿保留与重试。覆盖中英文、窄宽窗口、主题、圆角与减少动效。不要把真实账户、存档或运行中的游戏作为测试夹具。

限制：保留 UTF-8、允许路径和 2 MB 上限；混合换行只读，避免静默转换。比较是双文本窗格与首差异定位，不是逐行合并器。保存会保留实际移出的文件，再排他创建目标，确定性的最终核验后外部写入已可检测和恢复；但不是绝对跨进程锁或掉电事务。移出与提交之间目标短暂不存在，崩溃可能需要手动恢复相邻 `.bak`；旧文件句柄仍可继续写入备份，最终检查后的写入属于后续外部修改。请停止外部写入者。不支持硬链接的文件系统会安全失败并保留恢复副本，不退回无检查覆盖。

原生 UI 自动化仅使用断言隔离路径后的未打包 Electron；打包成品忽略 `--qa-ui`，不能以此保证隔离。自动中文文本/组合事件不等同真实系统输入法验收。完整安装升级、真实游戏、macOS 运行和全部 Windows DPI 组合未认证。
