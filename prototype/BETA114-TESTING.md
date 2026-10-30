# Beta 1.14 / 1.0 release acceptance

Local-only package 1.0.0-beta.15. AmberX is unchanged. Retain the adjacent beta1.13 installers; hashes are recorded in ROLLBACK-BASELINE.json. Close games, back up worlds and keep the data directory when reinstalling a prior program version. No data schema migration is introduced.

## Automated scope
Update channel filtering, upgrade ordering, cancellation/retry, configured-library disconnection/reconnection, bounded linked-directory scans, backup integrity, credential redaction, and existing install/transaction recovery use isolated fixtures. Synthetic tests do not establish real gameplay, service availability or GPU compatibility.

## Required human acceptance before 1.0
Clean install → create → install content → sign in → launch; beta1.13 upgrade preserving worlds/settings/bindings; Microsoft refresh after restart; offline/third-party login in AmberE; disconnected data disk; Windows display scaling and multi-monitor moves; recovery after interrupted install/update; backups restored to a different instance. Exercise vanilla/Fabric and separately Forge/NeoForge/legacy combinations actually intended for support. Record exact versions and observed results rather than claiming all versions work.

Installers remain unsigned. Code signing and hardware/live-account acceptance are not completed by automated packaging. A remaining critical data-loss, credential-exposure, authentication-bypass or launch-blocking issue blocks 1.0. Use another beta if needed.

## 本地验收
重点检查稳定/测试通道切换、升级不丢数据、断开原数据盘后重试或定位原库、备份校验与独立恢复、诊断预览和导出一致。AMBER 真实账号和 AmberE 第三方服务由用户分别验收。模拟测试不代表所有游戏/加载器/显卡组合通过。安装包尚未签名；正式版前仍需完成人工验收与功能冻结观察。

Automated results: 268 core regressions, 4 build checks, bilingual catalog and both isolated desktop workflows. Desktop workflows cover persisted channel, cleanup cancel/confirm, backup verification, diagnostic snapshot export and 100–200% zoom. Hardware and live Microsoft/third-party acceptance remain user checks.
