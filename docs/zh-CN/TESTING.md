# 1.2.2 release verification / 版本验证

Scope: regional download strategies, retained/resumable partial files, bounded retries, task pause/cancel/recovery and connection diagnostics. CurseForge is not integrated. AmberX remains separate.

336 automated tests and four site-build checks passed. Packaged startup checks passed for both products. Automated checks cover upgrade defaults, theme/account compatibility, range responses, fallback, hash rejection, cancellation, pause/resume, restart journals, DNS/redirect boundaries and pool cleanup. Native UI checks use isolated fixtures for AMBER and AmberE; they never use production account data. Public-endpoint checks verify only the sampled files and current connection. They do not establish Mainland China performance or universal mirror availability.

本版检查地区下载、文件续传、重试、任务暂停/取消/恢复及连接诊断。原生检查仅使用隔离测试数据。公开文件抽检不代表所有下载或中国大陆网络性能均已验证。原有微软登录验收结果保持不变，本次不重新测试真实账号；AmberE 不提供微软登录。

Run `pnpm test`, `pnpm build`, `pnpm test:sites` and `pnpm release:check` from prototype. Keep the 1.2.1 installers and important world backups. Installers are unsigned; close games and tasks before upgrading. Uninstall preserves user data. Existing .ambtheme files remain compatible and are not modified or bundled.

保留 1.2.1 安装包与重要存档备份，升级前退出游戏和任务。安装包未签名；卸载保留用户数据。现有主题文件保持兼容，本版不修改或预置主题。
