# Existing-game onboarding and feedback acceptance

## Scope

AMBER and AmberE share these changes. The final onboarding step offers an existing-game entry alongside creating an instance and skipping setup. It opens a choice between the existing `.minecraft` importer and local modpack importer. Copies remain independent; source folders/archives are retained. Account rules remain edition-specific.

Settings → Language/privacy and About now include a feedback form. Steps, expected result and actual result are required. Diagnostics are optional and unchecked until the user inspects them and explicitly selects inclusion. Generating a draft applies the existing best-effort secret redaction; the user reviews and copies it before opening the edition's GitHub issue page. Opening the browser sends no draft or diagnostic content in the URL and does not submit an issue. Editing fields or changing diagnostic consent invalidates the previous preview.

## Test installer delivery

Open the PR's **PR test installers** check, then download its `pr-test-installers-<head SHA>` artifact from the Actions run. GitHub login is required. It contains both Windows x64 installers, SHA-256 files and `TEST-REVISION.txt`. Confirm the recorded commit equals the PR head before testing. Artifacts expire after 30 days; rerun the workflow if needed. These use the local test channel and do not publish a Release or update Pages. Installers are never source files.

## Manual acceptance

1. Use Settings → Storage → onboarding to reopen onboarding, or use a fresh isolated test profile. On step 3 choose “I already play Minecraft”. Check both routes, cancellation and returning to normal instance management. Existing creation and skip options should still work.
2. With a disposable supported `.minecraft` folder, inspect the detected version and actual game directory, select content, and import. Confirm the source remains unchanged and imported saves/settings are independent. Do not infer PCL/HMCL compatibility from a launcher name: inspect each actual layout. Their real-world layouts were not newly certified by this task.
3. Try a supported MRPACK/content ZIP and an unsupported archive. Confirm the existing format guidance, file review and recovery remain available.
4. In About or Settings → Language/privacy, fill the feedback fields. Preview without diagnostics, inspect diagnostics, explicitly include them, and preview again. Inspect copied content. Uncheck inclusion or edit a field: the old draft must disappear until regenerated.
5. Open GitHub only when ready. Confirm AMBER targets `ayr1k/amber-launcher`, AmberE targets `ayr1k/AmberE`, and nothing is submitted automatically. Browser failure must not erase the copied draft.
6. Check Chinese/English, keyboard focus and short-window scrolling. Raw user-entered text may still contain personal information; best-effort redaction does not replace review.

## Validation boundary

Local regression suite: 464 passed, 0 failed. Build, locale validation, source checks, desktop smoke and four Sites tests passed. Isolated desktop UI checks passed for onboarding, both import routes and cancellation, optional diagnostics, redacted preview, clipboard/preview equality and invalidating an old preview after consent changes. Tests use synthetic fixtures, not personal accounts or real gameplay. Windows installers are built from the shared source; macOS/Linux runtime acceptance, actual player submissions, remote-network gameplay and real PCL/HMCL collections are outside this task's verified scope. No PR merge or formal release is authorized by this delivery.

---

# 现有游戏引导与反馈验收

AMBER 与 AmberE 共用本次改动。首次引导第三步增加“我已经在玩 Minecraft”，可进入现有游戏目录或本地整合包导入。原文件保留，导入副本独立，账号规则保持各版本原有约束。

在“关于”或“设置 → 语言与隐私”填写操作步骤、预期结果和实际结果。诊断摘要需要先检查再主动勾选；生成预览会进行尽力脱敏。检查并复制后才可打开对应版本的 GitHub 问题页，网址不携带反馈内容，也不会自动提交。修改表单或诊断选择会使旧预览失效。

安装包：打开 PR 的 **PR test installers** 检查，在 Actions 运行页面下载 `pr-test-installers-<head SHA>`，需要 GitHub 登录。压缩包包含两款 Windows x64 安装包、SHA-256 与 `TEST-REVISION.txt`；确认提交号与 PR 最新提交一致。产物保留 30 天，过期后可重跑。使用本地测试渠道，不创建正式 Release，不更新 Pages。

手动验收：重新打开首次引导，检查两条导入路径、取消、返回、创建和跳过；使用可丢弃的游戏目录与整合包验证复制和格式提示；检查反馈默认不附诊断、主动勾选、预览与复制一致、修改后旧预览消失；检查中英文、键盘操作与小窗口滚动。GitHub 的提交按钮仍由用户自行操作。

本地完整回归 464 项通过，构建、语言目录、源码检查、桌面冒烟及 4 项 Sites 测试通过。隔离桌面测试验证了首次引导、两条导入路径及取消、可选诊断、脱敏预览、复制内容与预览一致、改变授权后旧预览失效。测试不代表真实账号、实际游戏、跨网联机或全部 PCL/HMCL 布局验收；macOS/Linux 真机验收也未包含在本任务中。自由输入仍需用户检查隐私。交付不包含合并 PR 或正式发布授权。
