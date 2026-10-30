# Release verification

Run `pnpm test`, `pnpm build`, `pnpm test:sites`, `pnpm release:check` and `pnpm desktop:smoke` from prototype. Automated coverage includes update selection, checked downloads, backups, interrupted transactions, account boundaries, recommendation compatibility and local data recovery. Synthetic instances do not certify every game/mod/GPU combination.

Production dependencies are checked for known advisories. Credentials use Windows user encryption; this does not protect against malicious software running as the same user. Installers are unsigned. Back up worlds before upgrades or content changes. Uninstalling the program preserves game data.

# 版本验证

自动检查覆盖更新、下载校验、备份、事务恢复、账号边界、推荐兼容和本地数据恢复。模拟实例不代表所有游戏、模组和显卡组合均已验证。Windows 用户加密无法抵御同一用户下的恶意软件。安装包未签名；升级或更改内容前请备份存档。卸载程序保留游戏数据。
