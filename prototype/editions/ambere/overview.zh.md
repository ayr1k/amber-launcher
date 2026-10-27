# AmberE

[English](../../README.md) · [下载 Release](https://github.com/ayr1k/AmberE/releases) · [使用指南](USER-GUIDE.md)

AmberE 是面向 Minecraft Java 版的独立 Windows 发行项目，提供离线和第三方账号。基于 AMBER 共用代码维护，采用 MPL-2.0，并使用独立应用身份、数据目录和更新仓库。不提供微软登录，不内置微软应用 Client ID。

## Beta 1.12

Beta 1.12 新增实例工作台、独立试用副本、受保护的回写与变更恢复，优化本地异常排查、引导和内容布局，支持 Ctrl+K 全局搜索及推荐偏好模板导入导出。试用回写不合并存档进度或账号选择。下载 [Windows x64 安装包、源码包和 SHA-256 校验文件](https://github.com/ayr1k/AmberE/releases/tag/v1.0.0-beta.13)。


- 离线身份与 HTTPS 第三方认证，保存的凭据由 Windows 当前用户加密保护。
- 独立游戏实例、Java 与加载器安装、模组搜索、依赖选择、更新和批量管理。
- 备份恢复、内容操作恢复、回收站、任务恢复、收藏与最近启动。
- 中英双语、纯文本自定义语言包、主题、背景与一体化窗口控制。
- 使用独立的 `%APPDATA%/AmberE` 数据目录，更新只来自 `ayr1k/AmberE`。

## 安装与更新

校验 SHA-256 后运行 Setup 安装包。使用独立程序目录，升级前退出 AmberE 与 Minecraft。安装器可选中英文，目前未签名；卸载保留游戏数据。关于页检查本仓库的 Release，校验安装包后由用户确认安装。

离线和第三方身份不授予游戏所有权或官方在线服务权限，请合法取得游戏；第三方服务可能有自己的要求。AmberE 非 Mojang 或微软官方产品，不宣称已获微软 API 批准。

## 文档

[使用指南](USER-GUIDE.md) · [语言包](LANGUAGE-PACKS.md) · [隐私](PRIVACY.md) · [安全](SECURITY.md) · [更新日志](CHANGELOG.md) · [测试](TESTING.md) · [贡献](CONTRIBUTING.md)

[回滚说明](ROLLBACK.md) / [Rollback guide](../ROLLBACK.md)
