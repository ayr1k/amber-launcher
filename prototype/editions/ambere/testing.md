# 1.2.1 release verification / 版本验证

The appearance update covers export-field validation, minimal calendars, independent panels, draft recovery and top-navigation/footer layout. Automated coverage includes legacy themes and new panel round-trips. Native checks use synthetic data and cover both products, Chinese/English, normal/wide/narrow windows, calendar dialogs and focus restoration, library saves, draft recovery and About navigation.

Run `pnpm test`, `pnpm build`, `pnpm test:sites`, `pnpm release:check` and `pnpm desktop:smoke` from `prototype`. These checks do not certify every hardware, game or mod combination. Real Microsoft login was previously accepted by the maintainer and is not re-tested as part of this appearance change. AmberE exposes no Microsoft sign-in.

本次覆盖主题导出校验、精简日历、独立面板、草稿恢复和顶部导航/底栏。自动回归包含旧主题兼容与新面板导入导出；原生界面检查使用隔离模拟数据，覆盖两款产品、中英文、正常/宽/窄窗口、日历弹窗与焦点返回、主题保存、草稿恢复及关于入口。不代表所有硬件、游戏或模组组合均已验证。

Installers are unsigned. Close the game and launcher before upgrading; back up important worlds. Uninstalling preserves game data. Windows user encryption does not protect against malicious software running as the same user.

安装包未签名。升级前关闭游戏与启动器并备份重要存档。卸载保留游戏数据；Windows 用户加密不能抵御以同一用户身份运行的恶意软件。
