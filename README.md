# AMBER Launcher

An independent Minecraft: Java Edition desktop launcher with isolated instances, compatible content discovery and user-controlled appearance.

AMBER 是一款 Windows x64 桌面启动器。当前预发布版本为 **beta 1.3（1.0.0-beta.4）**，操作说明见 [Beta 1.3 测试说明](prototype/BETA13-TESTING.md)。这是预发布测试版本；微软真实授权等验收边界见下文。

beta 1.3 Windows 安装包、完整源码包及 SHA-256 校验文件：[AMBER beta 1.3](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0-beta.4)。运行 Setup 安装程序；旧便携版用户请安装到新的程序目录，保留原游戏数据位置。

beta 1.1 安装和新增功能见 [测试说明](prototype/BETA11-TESTING.md)。

Beta 1.3 新增统一选择列表、实例独立账号与内存、商城浏览状态保留、设置 / 任务整理和可恢复的模组批量操作。

## 当前功能

- 官方版本目录、完整游戏下载与校验、并发下载、失败重试、取消与缓存修复；Java 检测及自动安装。
- 实例隔离、图标、重命名、回收与恢复；输入完整名称后可彻底删除回收实例。
- 原版、Fabric、Forge、NeoForge、LiteLoader、OptiFine 安装路径；支持的历史组合显式校验，不承诺任意版本组合。
- Modrinth 分类、排序与兼容版本搜索；依赖预览、一键安装、内容启停、MRPACK 和本地地图 ZIP 导入。
- 跨版本模组清单迁移：重新匹配兼容发行版，跳过无法匹配的项目并生成报告。
- 背景、面板透明度、主题、圆角、字号及布局设置；任务中心、错误解决入口、本地精简诊断导出。
- 安装计划跨重启继续、必需依赖默认勾选、可选依赖默认不勾选，均可调整、实例备份与恢复为新实例、首次引导及校验后迁移数据位置。

## 账号与验证边界

微软登录内置项目公开 Client ID，用户无需注册 Azure 应用；设备码在微软网站完成授权，不收集微软密码。Windows 系统加密保存令牌，账号密码不持久保存。微软 API 审核及真实账号登录、刷新和启动仍待验收；第三方 Yggdrasil 账号也需要真实服务验收。登录失败不会自动切换离线身份。

离线账号与第三方账号是独立模式，不提供微软认证服务。若模组作者没有声明冲突，启动器无法保证提前发现；未知崩溃会保留日志和解决入口。历史组件实测范围见 [验证记录](prototype/VALIDATION.md)。3D 场景导航按计划延后。

## 从源码运行

需要 Windows x64、Node.js 24 和 pnpm 11.25.0。命令在 `prototype` 目录执行：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:sites
pnpm desktop
```

`pnpm dev` 仅启动浏览器设计预览；真实安装与启动使用 Electron 桌面版。

```sh
pnpm desktop:smoke
pnpm package:desktop
pnpm release:check
pnpm release:source
```

桌面目录包位于 `prototype/releases`，运行时保留整个目录。源码导出采用明确的文件清单，排除本地账号、游戏库、缓存、QA 图片、node_modules 和构建产物；同时生成 ZIP、SHA-256 与逐文件清单。脚本不会推送代码或创建 GitHub Release。

## 测试与反馈

Windows CI 会测试和构建工作流产物，执行结果见仓库 Actions。当前 Windows 程序包未签名；干净机器、真实账号及标识分发许可等验收状态见 [beta 发布清单](prototype/BETA-RELEASE-CHECKLIST.md)。请先备份重要实例，再参与测试。

贡献说明：[CONTRIBUTING.md](CONTRIBUTING.md)；安全问题：[SECURITY.md](SECURITY.md)。问题反馈请勿附带密码、令牌或私人账号资料。

## License

项目自有源码采用 **Mozilla Public License 2.0**，见 [LICENSE](LICENSE)。第三方软件、字体与图像保留其各自许可，见 [第三方声明](prototype/THIRD_PARTY_NOTICES.md)。游戏文件从其官方来源下载，不随源码分发。

AMBER 与 Mojang、Microsoft 没有隶属、认可或官方产品关系。Minecraft 名称和商标属于各自权利人。

统一更新日志与 GitHub Release 正文：[CHANGELOG.md](CHANGELOG.md)。
