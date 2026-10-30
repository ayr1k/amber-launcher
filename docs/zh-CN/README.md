# AMBER

[English](../../README.md) · [下载 Release](https://github.com/ayr1k/amber-launcher/releases) · [使用指南](USER-GUIDE.md)

AMBER 是独立的 Windows Minecraft Java 版启动器，将实例隔离、游戏安装、模组管理、恢复和启动设置集中在同一界面。项目自有源码采用 MPL-2.0。

## 1.0.0

适用于 Windows x64 的正式版。[下载安装包、源码和校验文件](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0)。支持实例管理、内容推荐、模组更新、备份与异常恢复。

- 一体化标题栏、独立窗口边框设置、窗口位置恢复与重新组织的隐私设置。

- 原生简体中文与英文，即时切换，支持导入纯文本语言包。
- 原版、Fabric、Forge、NeoForge、LiteLoader 和 OptiFine 安装及显式兼容检查，实际支持取决于游戏版本和官方文件。
- Modrinth 兼容搜索、分类与排序，依赖选择、模组更新、版本锁定及批量管理。
- 本地模组导入、跨版本清单迁移、内容操作恢复、实例备份与恢复、回收站与受保护的彻底删除。
- 收藏、排序、最近启动、实例检查、安装任务跨重启继续和数据位置迁移。
- 主题、直角或圆角控件、自定义布局、本地背景及启动面板透明度。

## 安装

从 Release 下载 Windows x64 Setup 安装包，校验 SHA-256 后运行。安装器可选中英文。升级前退出游戏及 AMBER，备份重要存档。卸载程序不会自动删除游戏数据。当前预发布安装器未进行代码签名。

## 账号状态

启动时继续验证游戏资格；这不代表 Mojang 或 Microsoft 官方背书。 AMBER 内置公开 Microsoft Client ID，认证失败不会静默切换离线身份。微软及关联的第三方账号在启动时在线验证官方资格；主动创建的已验证离线身份沿用官方角色名称和 UUID，资格加密保存，最多缓存七天。这是产品策略，不代表 Mojang 已批准的例外。旧的未验证离线账号不能在主版启动；原有实例和存档仍保留。

第三方账号需单独进行真实服务验收。离线模式不授予游戏所有权或在线服务权限。

## 文档

[使用指南](USER-GUIDE.md) · [语言包](LANGUAGE-PACKS.md) · [隐私](PRIVACY.md) · [安全](SECURITY.md) · [更新日志](CHANGELOG.md) · [测试](TESTING.md) · [贡献](CONTRIBUTING.md) · [第三方声明](THIRD-PARTY-NOTICES.md)

AMBER 非 Mojang 或微软官方产品。Minecraft、下载组件及第三方项目保留各自权利与许可。

[回滚说明](ROLLBACK.md)

## 产品系列

| 项目 | 定位 |
| --- | --- |
| [AMBER](https://github.com/ayr1k/amber-launcher) | 日常使用，Microsoft 登录与正版资格验证 |
| [AmberE](https://github.com/ayr1k/AmberE) | 离线和第三方认证；不授予游戏所有权或正版服务器权限 |
| [AmberX](https://github.com/ayr1k/AmberX) | 目标式操作、方案比较与试用体验的实验项目 |

三个项目的数据目录和更新渠道独立。
