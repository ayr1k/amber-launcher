# Release verification

Run `pnpm test`, `pnpm build`, `pnpm test:sites`, `pnpm release:check` and `pnpm desktop:smoke` from prototype. Automated coverage includes update selection, checked downloads, backups, interrupted transactions, account boundaries, recommendation compatibility and local data recovery. Synthetic instances do not certify every game/mod/GPU combination.

Production dependencies are checked for known advisories. Credentials use Windows user encryption; this does not protect against malicious software running as the same user. Installers are unsigned. Back up worlds before upgrades or content changes. Uninstalling the program preserves game data.

# 版本验证

自动检查覆盖更新、下载校验、备份、事务恢复、账号边界、推荐兼容和本地数据恢复。模拟实例不代表所有游戏、模组和显卡组合均已验证。Windows 用户加密无法抵御同一用户下的恶意软件。安装包未签名；升级或更改内容前请备份存档。卸载程序保留游戏数据。

## 1.2.0


安装 AMBER 或 AmberE 对应的 Windows x64 安装包。两款程序仍使用各自的数据目录；Alloy 需单独下载并导入。

1. 设置 → 外观与主题 → 主题库：导入 `AMBER-Alloy-1.2.0.ambtheme`，应用并确认。再切换经典和同一 Alloy，检查重复应用无需倒计时确认。
2. 首页查看日历、最近启动、新闻及快捷工具。日历支持关闭记录、导出和清除；历史记录不显示虚构时长。
3. 点击编辑首页，调整模块、选择预设；打开更多设置和高级编辑检查原有细项。
4. 新闻点击刷新，切换综合/更新/快照，测试断网后的缓存。Java 更新说明为官方英文纯文本。
5. 存储分析可取消并重新扫描；截图工具可按实例和日期筛选、复制并打开文件夹。
6. 检查浅色/深色、Alloy、中英文、较窄窗口、缩放与字体纵向偏移。

Run the same checks in both editions. Calendar durations describe observed runtime, not verified active play. Sleep or closed-launcher gaps remain unknown. News network behavior depends on reachability of the official service. Existing account policy remains unchanged.


Validation includes 314 automated tests, packaged startup checks for both editions, legacy theme import/export, Chinese/English layouts, 1280–2560 px window widths, section scrolling, keyboard navigation and screenshot date filtering/preview. These checks do not certify every hardware or game-content combination.

验证范围包括 314 项自动测试、两款打包程序启动、旧主题导入导出、中英文布局、1280–2560 像素窗口宽度、分区滚动、键盘操作以及截图日期筛选和预览。以上不代表所有硬件和游戏内容组合均已验证。
