# AmberE

1.2.2 新增地区下载策略、支持的官方/镜像自动回退、下载暂停与续传、任务恢复和连接诊断。现有主题和实例保持兼容，内容下载继续使用 Modrinth。

[English](../../README.md) · [下载 Release](https://github.com/ayr1k/AmberE/releases) · [使用指南](USER-GUIDE.md)

AmberE 是面向 Minecraft Java 版的独立 Windows 发行项目，提供离线和第三方账号。基于 AMBER 共用代码维护，采用 MPL-2.0，并使用独立应用身份、数据目录和更新仓库。不提供微软登录，不内置微软应用 Client ID。

## 1.2.2

适用于 Windows x64 的正式版。[下载安装包、源码和校验文件](https://github.com/ayr1k/AmberE/releases/tag/v1.2.2)。支持实例管理、内容推荐、模组更新、备份与异常恢复。

- 离线身份与 HTTPS 第三方认证，保存的凭据由 Windows 当前用户加密保护。
- 独立游戏实例、Java 与加载器安装、模组搜索、依赖选择、更新和批量管理。
- 备份恢复、内容操作恢复、回收站、任务恢复、收藏与最近启动。
- 中英双语、纯文本自定义语言包、主题、背景与一体化窗口控制。
- 使用独立的 `%APPDATA%/AmberE` 数据目录，更新只来自 `ayr1k/AmberE`。

## 安装与更新

校验 SHA-256 后运行 Setup 安装包。使用独立程序目录，升级前退出 AmberE 与 Minecraft。安装器可选中英文，目前未签名；卸载保留游戏数据。

离线和第三方身份不授予游戏所有权或官方在线服务权限，请合法取得游戏；第三方服务可能有自己的要求。AmberE 非 Mojang 或微软官方产品，不宣称已获微软 API 批准。

## 文档

[使用指南](USER-GUIDE.md) · [语言包](LANGUAGE-PACKS.md) · [隐私](PRIVACY.md) · [安全](SECURITY.md) · [更新日志](CHANGELOG.md) · [测试](TESTING.md) · [贡献](CONTRIBUTING.md)

[回滚说明](ROLLBACK.md) / [Rollback guide](../ROLLBACK.md)

[官方主题商城](https://ayr1k.github.io/#/themes) · [主题使用帮助](THEMES.md) · [主题格式规范](AMBTHEME-FORMAT.md)

Alloy、Nocturne、Harvest 与 Verdant 均为独立下载的免费官方主题，适用于 AMBER 和 AmberE 1.2.1 及以上版本，不预置在软件内。
