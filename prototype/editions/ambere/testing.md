# AmberE Beta 1.8 testing / 测试说明

Version / 版本：1.0.0-beta.9. Windows x64 prerelease, unsigned installer.

AmberE provides offline and third-party accounts only. It contains no built-in Microsoft Client ID and exposes no Microsoft sign-in API. Game ownership is not granted by an offline identity. Third-party passwords are sent only to the HTTPS authentication address entered by the user; saved tokens use Windows user encryption.

AmberE uses `%APPDATA%/AmberE` and its own program directory. Keep separate game libraries when other launcher distributions are installed. Use instance backup/restore to transfer instances deliberately; accounts are not automatically transferred. Updates use only `https://github.com/ayr1k/AmberE`. Earlier local Beta 1.8 testers must install the published package manually once to update this location.

The shared regression suite and packaged startup/IPC/background/encryption checks run against both distributions. Interface checks cover Chinese/light and English/dark onboarding and account pages. Update tests reject wrong repositories and products. Mocked authentication tests are not evidence of live provider acceptance. The user accepted the local test build; no claim of exhaustive game/mod compatibility or security coverage is made.

AmberE 仅提供离线与第三方账号，不内置微软 Client ID，不暴露微软登录接口。离线身份不授予游戏所有权。第三方密码只发送到用户填写的 HTTPS 认证地址；保存的令牌使用 Windows 用户加密。

使用 `%APPDATA%/AmberE` 与独立程序目录；与其他发行版并存时不要共用游戏库。需要转移实例时使用备份恢复，账号不会自动迁移。更新仅来自 `https://github.com/ayr1k/AmberE`；此前本地 Beta 1.8 测试包需手动安装发布包一次以更新地址。

共用回归测试及打包程序启动、接口、背景和加密检查会分别针对两版运行。界面检查覆盖中文浅色及英文深色引导和账号页；更新测试拒绝错误仓库与产品。模拟认证不等于真实服务验收。用户已确认本地测试通过，但不宣称穷尽游戏、模组组合或所有安全风险。
