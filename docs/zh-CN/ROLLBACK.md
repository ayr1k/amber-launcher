# 从 1.1.0 回退

更换版本前，在设置 → 外观与主题中导出当前外观，单独保存 `.ambtheme` 文件，再按 Ctrl+Shift+F12 恢复经典。1.0.0 不支持 1.1.0 的主题系统。

备份重要实例与存档，关闭启动器和 Minecraft。下载对应产品的 [1.0.0 安装包和校验文件](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0)，核对 SHA-256 后安装到原程序目录，保留用户数据。不要混用 AMBER 和 AmberE 的安装或数据目录。主题包可以跨这两款产品使用，账号库和游戏数据目录不能直接混用。

回退程序不会撤销模组、配置或存档变化；需要时将实例备份恢复到独立实例。主题文件仍保存在本地，但旧版可能规范化其不认识的设置，因此重新升级前请保留导出的主题，不要依赖旧版继续保存主题偏好。

安装前检查会在适用时保留旧程序，位置记录在 `%LOCALAPPDATA%/AMBER/previous-program.txt`；这不是存档备份。账号加密需要原 Windows 用户。

如需从 1.0.0 继续回退，[Beta 1.14](https://github.com/ayr1k/amber-launcher/releases/tag/v1.0.0-beta.15) 仍可下载，同样需要备份并区分产品。
