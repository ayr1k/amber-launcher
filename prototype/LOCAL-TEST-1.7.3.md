# 1.7.3 formal release / 正式发布

PR #18 merged as `c1c59f1e55a60d9a72b57056670a5733204b6273`; accepted task head `ded4aff8bd2b2ebfdf7d5b583b37929aea094f00`. The user authorized formal publication on 2026-11-16 (America/New_York). Official packages use **1.7.3/public**. AriaXiaoLan independently reviewed this exact head, reran nine focused tests, checked locales and five final UI captures, and independently verified CI installer hashes and provenance. CI runs 43937641169 / 43937641326 passed. Full 908-test and UI-matrix results belong to developer/CI evidence, not an independent full rerun. Independent local packaged smoke was blocked before AMBER startup by directory ACL access; it was not passed, and no ACL or Electron sandbox bypass was performed. CI packaged startup passed. Formal-release startup checks are recorded separately.

用户已批准合并并授权正式发布；下方本地渠道、等待验收及禁止发布文字保留原阶段语境。本主会话沿用最终提交的独立审核，不重复内容审核。独立本机成品复验被目录权限阻止，不能记为通过；CI 成品启动与本次正式包检查分别记录。真实联机、网卡切换、物理 DPI、实际登录／皮肤上传、完整安装升级及非 Windows 原生验收仍未覆盖。Woodland 为独立艺术家专区主题，历史记录中的“七款官方主题”应理解为现有七款商城主题。

# AMBER / AmberE 1.7.3 Windows test installers / Windows 测试安装包

Local test channel only. Based on main `a43846e` (1.7.2), on independent branch `codex/1.7.3-server-polish`. The PR links exact-head installer artifacts, provenance, checksums and verification results. Awaiting user acceptance; no merge, formal release or Pages deployment is authorized.

仅本地测试渠道。基于主分支 `a43846e`，使用独立分支；PR 提供对应提交的测试安装包、构建来源、校验值及验证结果。等待人工验收，不得自行合并、正式发布或部署官网。

Changes / 改动：

- Per-console Up/Down history, last 100 successful submissions in renderer memory only. Going down past the newest entry, sending a recalled command or clearing history restores the prior draft. Failure keeps input and history position. App restart clears history. Log filtering and following remain available.
- Manual address refresh, IPv4/IPv6 candidates and transient copy success. Loading/failure removes previous endpoints. An empty LAN result still shows this computer's loopback endpoint. No adapter ranking or reachability guarantee.
- Account rows use the same full width; the repeated offline editor is removed from the list. Offline name/skin editing remains in account details.
- 每个控制台独立内存指令历史，保留最近 100 条成功发送记录；向下返回末尾、发送历史指令或清空历史时恢复原草稿。失败保留输入及历史位置；重启清空历史。
- 地址支持手动刷新及 IPv4／IPv6，多地址全部保留；刷新中和失败不显示旧地址。无局域网地址时仍显示本机回环地址。复制成功提示会自动恢复。未排序推荐网卡，也不保证可达。
- 账号行统一宽度，移除列表重复入口，详情页仍可编辑离线用户名和皮肤。

Validation and exact tested commits are recorded in the PR and `review173` local evidence. Unit tests cover history, bounds/draft isolation, endpoint validation, port selection and errors. Native UI fixtures check keyboard input, send/copy/refresh states, account details and layout. Packaged smoke checks verify isolated startup, product identity, local channel, clean revision and installer SHA-256.

验证及对应提交见 PR；本地证据保存在 `review173`。单元测试覆盖历史、草稿、地址校验及端口等；原生 UI 使用模拟服务端与账号检查交互和布局；成品启动验证检查隔离路径、产品身份、测试渠道、干净提交及安装包校验值。

Manual acceptance / 人工验收：

1. Send harmless commands to a disposable real server. Check Up/Down, draft restoration, repeated commands, clear history and restart. Confirm selecting history never sends it and command success means submission, not verified execution.
2. Change Wi-Fi/VPN/adapters, refresh, then test each appropriate endpoint from the same computer or another device. Verify port changes after restart and IPv6 where supported. Server/plugin output can itself contain sensitive text; history being memory-only does not suppress existing server logging.
3. Test your installed themes, Windows DPI settings and long endpoints. Verify clipboard feedback expires, failures can be retried and narrow layouts scroll as needed.
4. Open account details to edit offline name/skin. Confirm selection and login with your normal account policy. UI fixtures are not real Microsoft login or skin upload acceptance.

Windows x64 installers retain normal product identities and can upgrade an existing installation and use its data. Prefer a disposable Windows profile and copied data. Back up launcher settings, accounts, instances and worlds before manual installation. Automated checks do not establish installer/upgrade, real multiplayer, hardware DPI, live login or non-Windows acceptance.

安装包沿用正常产品身份，可能升级既有安装并使用其数据。建议使用独立 Windows 用户与数据副本，安装前备份。自动检查不等于真实安装／升级、跨设备联机、硬件 DPI、真实登录或非 Windows 平台验收。
