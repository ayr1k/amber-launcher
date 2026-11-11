# 1.7.1 task test build / 任务测试版本

This is a development candidate, not an approved release. The previous 1.7.0 test records do not establish acceptance of this candidate.

## Changes / 改动

- Keep the instance page heading above external scan status and library errors.
- Align external component fields and checkbox text; remove hardcoded green dialog backdrops.
- Preserve inherited server-adapter overrides without replacing the selected client library's metadata, stopped-state and job methods. This fixes native AMBER content/search routing into `servers/<client ID>`; external libraries were not the reported broken path.

实例页标题位于扫描/状态提示上方；外部组件三个字段与复选框排列统一；弹窗遮罩使用中性透明黑色，保留当前主题背景。原生库故障是服务端适配器覆盖了默认客户端方法，并非实例或模组文件消失；修复不会重建、清空或搬迁库。

## Data and installation / 数据与安装

Installers use the existing AMBER / AmberE application identities and may replace installed versions and share their normal data. Back up data first. QA uses explicit isolated userData and library directories; test builds are not inherently isolated or portable. Both products retain their separate account policies and update channels. No merge, formal release or website deployment is authorized by this task.

安装包沿用现有安装身份，可能覆盖已安装版本并使用原有数据。请先备份；测试包不是天然隔离版或便携版。验收由用户决定，不自动合并或发布。

## Verification status / 验证状态

The local native-library reproduction uses a private verified copy, never the original library. All 2,419 original files checked after testing still match the initial hashes. It reproduces the server-path error before the change and lists 39 content items after the fix. The actual desktop graph lists the same items after reload; a live Modrinth search for the copied 1.21.4 Fabric instance returns 33 matches (20 on the first page). Synthetic regressions exercise inherited adapters, fresh instance creation, same-ID libraries, repeated selection/service reconstruction, search, verified file download destinations, disabled files and update locks. Download regression bytes are controlled fixtures, not a claim of a live mod install.

Desktop QA renders the application with synthetic external libraries in 24 combinations: English/Chinese, light/dark/custom blue-purple theme, 1366×768 and 1920×1080 at 100%, 1000×720 at 125%, and 1366×768 at 150%. Checks cover heading order, three-field alignment or narrow stacking, inner-container overflow and neutral dialog backdrops. PNG captures are retained privately; representative final light, dark and custom-theme images were pixel-reviewed. These are real desktop-rendering tests with synthetic game metadata, not game launch or installer acceptance tests. Exact final test results, revision and installer hashes belong in the delivery record.

旧原生库副本完成真实桌面服务测试：内容列表恢复，重载后保持一致，在线 Modrinth 搜索成功。原始 2,419 个已记录文件测试后哈希一致。下载写入测试使用合成文件；不等同真实游戏启动。24 组真实桌面布局测试覆盖中英、明暗及自定义主题、两种常用分辨率与窄窗缩放；PNG 保留在本地，已查看代表性最终截图。

Outstanding at preparation: the official Library helper fails on Windows (`os.setxattr` unavailable), so the five supplied reference images have not been locally materialized or pixel-reviewed. GitHub credentials must be verified as the specifically authorized account before push/PR actions. No successful UI, installer or user acceptance is implied by this document until its accompanying delivery record confirms it.

准备阶段限制：Library 官方 helper 在 Windows 缺少 `os.setxattr`，五张原始参考图尚未完成本地物化及像素核验。远端写入必须核对指定授权身份。具体检查、UI、安装包、哈希与未验证项目以同一修订的交付记录为准，不能以旧版结果替代。
