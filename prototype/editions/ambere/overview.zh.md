<h1 align="center">AmberE</h1>

<p align="center"><strong>离线与第三方身份，独立的冒险空间。</strong></p>

<p align="center">
  <a href="https://github.com/ayr1k/AmberE/releases/tag/v1.4.8"><img src="https://img.shields.io/badge/release-1.4.8-e9b53d?style=flat-square" alt="Release" /></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MPL--2.0-527b68?style=flat-square" alt="License" /></a>
  <a href="https://github.com/ayr1k/AmberE/actions/workflows/windows.yml"><img src="https://github.com/ayr1k/AmberE/actions/workflows/windows.yml/badge.svg" alt="Build" /></a>
  <a href="https://ayr1k.github.io/"><img src="https://img.shields.io/badge/website-AMBER-527b68?style=flat-square" alt="Website" /></a>
</p>

<p align="center"><a href="https://ayr1k.github.io/">官网</a> · <a href="https://ayr1k.github.io/#/download?product=ambere">下载</a> · <a href="USER-GUIDE.md">使用指南</a> · <a href="https://ayr1k.github.io/#/themes">主题商城</a> · <a href="../../README.md">English</a></p>

独立的 Minecraft Java 版启动器，将实例、内容、主题和服务端管理集中在同一工作区。

## 软件截图

<table>
  <tr><th>Alloy</th><th>Nocturne</th></tr>
  <tr>
    <td width="50%"><a href="../../docs/images/launcher-alloy.png"><img src="../../docs/images/launcher-alloy.png" alt="AMBER Alloy theme home screen" width="100%" /></a></td>
    <td width="50%"><a href="../../docs/images/launcher-nocturne.png"><img src="../../docs/images/launcher-nocturne.png" alt="AMBER Nocturne theme home screen" width="100%" /></a></td>
  </tr>
</table>

截图来自公开的 AMBER 1.2.1 主题展示，使用演示数据；主题同样适用于 AmberE。点击可查看大图，当前功能与平台范围以 1.4.8 说明为准。

## 项目简介

AmberE 是面向 Minecraft Java 版的独立发行项目，提供离线和第三方账号。基于 AMBER 共用代码维护，采用 MPL-2.0，并使用独立应用身份、数据目录和更新仓库。不提供微软登录，不内置微软应用 Client ID。

## 1.4.8

启动时显示轻量进度提示，跟随真实准备阶段更新，并在首轮数据、语言和界面就绪后立即显示主窗口。符合条件的大文件可使用最多四路可续传分段请求，共享原有连接与限速设置，保留来源回退及最终哈希校验。

Windows/macOS/Linux/FreeBSD 均提供 1.4.8；macOS/Linux 待对应真机验收，FreeBSD 仅实验性服务端/工具。

提供 Windows x64 正式安装包及其他平台下载。[下载安装包、源码和校验文件](https://github.com/ayr1k/AmberE/releases/tag/v1.4.8)。支持实例管理、内容推荐、模组更新、备份与异常恢复。

- 离线身份与 HTTPS 第三方认证，保存的凭据由系统密钥库保护。
- 独立游戏实例、Java 与加载器安装、模组搜索、依赖选择、更新和批量管理。
- 备份恢复、内容操作恢复、回收站、任务恢复、收藏与最近启动。
- 中英双语、纯文本自定义语言包、主题、背景与一体化窗口控制。
- 使用独立的 `%APPDATA%/AmberE` 数据目录，更新只来自 `ayr1k/AmberE`。

## 安装与更新

校验 SHA-256 后运行 Setup 安装包。使用独立程序目录，升级前退出 AmberE 与 Minecraft。安装器可选中英文，目前未签名；卸载保留游戏数据。

离线和第三方身份不授予游戏所有权或官方在线服务权限，请合法取得游戏；第三方服务可能有自己的要求。AmberE 非 Mojang 或微软官方产品，不宣称已获微软 API 批准。

## 平台下载与验证范围

Windows x64：EXE；macOS Intel / Apple Silicon：独立 ZIP；Linux x64：DEB。macOS 尚未实机测试，Linux 尚需完整桌面/密钥库及游戏测试。FreeBSD amd64 仅为服务端与工具实验包。全部包未签名，macOS 未公证。查看[安装步骤与已知限制](../../prototype/PLATFORMS-1.3.5.md)及 [多平台下载页](https://ayr1k.github.io/#/download?product=ambere)。

## 文档

[使用指南](USER-GUIDE.md) · [语言包](LANGUAGE-PACKS.md) · [隐私](PRIVACY.md) · [安全](SECURITY.md) · [更新日志](CHANGELOG.md) · [测试](TESTING.md) · [贡献](CONTRIBUTING.md)

[回滚说明](ROLLBACK.md) / [Rollback guide](../ROLLBACK.md)

[官方主题商城](https://ayr1k.github.io/#/themes) · [主题使用帮助](THEMES.md) · [主题格式规范](AMBTHEME-FORMAT.md)

Alloy、Nocturne、Harvest 与 Verdant 均为独立下载的免费官方主题，适用于 AMBER 和 AmberE 1.2.1 及以上版本，不预置在软件内。

[服务端与联机指南](SERVERS.md)（异地房间为测试功能）。
