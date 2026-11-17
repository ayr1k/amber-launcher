# 1.7.5 formal release / 正式发布

The user approved merged PR #20 and authorized full formal publication on 2026-11-17 (America/New_York). Merge: `407069c56755d31787b5d1d8c98f40f15ce6ceb2`; final task head: `08f55cce12077e04e5b1d3147971a76ca7519741`. Both final-head PR workflows passed (44173254520, 44173254578). The PR description and original candidate document below retain earlier pending/local-only status; they do not override the later approved merge and formal-release request. No additional content review is performed here. Formal packages use 1.7.5/public with fresh build provenance, source manifests and checksums. Existing native UI, real upgrade/rollback, live-network/gameplay and non-Windows acceptance limits remain; synthetic updater tests are not real installed upgrades.

用户已批准合并并授权完整正式发布；下方验收候选阶段的禁止发布／待完成文字保留为历史记录。本次生成 1.7.5/public 正式包并独立记录发布验证，不把测试夹具或 CI 构建视为真实安装升级验收，也不重复内容审核。

# AMBER / AmberE 1.7.5 acceptance candidate / 验收候选

Not a formal release. No merge, publication or deployment is authorized. Packages, when built, must use the local build channel and record the exact source commit and SHA-256. This document does not claim installers already exist.

非正式发布；不得合并、发布或部署。验收包应使用 local 构建渠道，记录准确提交与 SHA-256；本文不表示已产出安装包。

Updates use GitHub metadata for both sources. The Hong Kong mirror transports stable installer bytes only. Neither source works independently of GitHub for checks or installation. See docs/UPDATE-SOURCES-1.7.5.md in the source repository for the protocol and limitations.

两源均依赖 GitHub 元数据；香港镜像只传输正式版安装包。检查及安装均需 GitHub 可达，详见源码 docs/UPDATE-SOURCES-1.7.5.md。

Test installers retain normal product identities and may replace the stable installation. Use a separate Windows user and disposable data, or back up the product user-data directory and all selected game libraries first. A different installation directory does not isolate user data. AMBER and AmberE must remain separate.

验收包沿用正常产品身份，可能覆盖正式版；建议独立 Windows 用户及可丢弃数据。否则先备份对应产品应用数据与所有游戏库；安装到不同目录并不隔离数据。两产品数据不可混用。

Pending: native desktop appearance (both locales/themes), Windows installer acceptance, actual 1.7.4→1.7.5 upgrade and rollback, and macOS/Linux native acceptance. No fake release may be used to simulate a production upgrade.

待验收：中英文及主题原生界面、Windows 安装、真实升级回退及 macOS/Linux 原生行为。不得用虚假正式 Release 测试。
