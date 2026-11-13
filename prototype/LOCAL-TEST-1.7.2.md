# 1.7.2 formal release / 正式发布

PR #17 merged as `4d17809f54d0b55142ab0c9da8e15ff562a65fb4`; accepted task head: `3ff64d95bf11c7382ec02cab67f7675e32401b42`. The user authorized complete formal publication on 2026-11-13 (America/New_York). Official packages use **1.7.2/public**. AriaXiaoLan independently reviewed this exact head, reran 21 focused tests, inspected representative native-window captures and verified CI installer hashes/provenance. CI runs 43502280039 / 43502279865 passed; Windows covered the full suite, Linux only a subset. This main chat relies on the existing review and approved merge without repeating content review.

Original p1/p2 images were not locally pixel-reviewed on Windows; prior cloud source-image analysis is separate evidence. Default-browser navigation was not exercised end to end: native URL handoff and failure recovery used stubs. Theme-import independence used cancelled dialogs. Full installation/upgrade, gameplay/server networking, real multi-NIC connectivity, every Windows DPI setting and native non-Windows runtime remain unverified for this change.

用户已批准合并 PR #17 并明确授权 1.7.2 正式发布。独立复核覆盖同一最终提交，核验了定向测试、代表性原生窗口截图、CI 测试包与来源；Windows 为全量回归，Linux 仅为子集。下方本地测试／不得发布描述保留原阶段语境。本会话不重复内容审核；默认浏览器导航、真实安装升级、游戏／服务端联网、多网卡连接和全部 DPI 等仍保留原验收限制。正式验证见 RELEASE-ACCEPTANCE.md。

# AMBER / AmberE 1.7.2 test installers / 测试安装包

Local test channel, not a formal release. Adds individual server-address copy buttons and a Theme store shortcut beside theme import. The shortcut opens https://ayr1k.github.io/#/themes in the system browser. Server behavior and theme import are unchanged.

本地测试渠道，非正式发布。新增单个服务器地址复制按钮，并在主题导入旁增加“主题商城”官网入口。使用系统浏览器打开，不改变服务端行为或主题导入。

The installers retain normal product identities and may upgrade an existing installation and use existing data directories. Stop running games/servers and back up launcher data, settings and worlds before installing. Prefer a disposable Windows profile and copied test data. Building, source review and packaged startup checks do not establish installation/upgrade or actual gameplay acceptance.

安装包沿用正常产品身份，可能覆盖现有安装并使用原数据目录。安装前停止游戏与服务端，备份启动器数据、设置与世界；建议在独立 Windows 用户和数据副本中测试。构建、源码审核和打包启动检查不等于真实安装、升级或游戏验收。

Manual checks: copy local and each LAN address separately; verify clipboard contents, repeated clicks, keyboard activation and failure feedback. Compare light/dark/custom themes, narrow windows and zoom. Open Theme store and confirm the exact official route, then verify .ambtheme import still works. No merge, release or website deployment is authorized by this test build.

手动检查：分别复制本机及各网卡地址，核对剪贴板、重复点击、键盘操作和失败提示；检查浅色/深色/自定义主题、窄窗与缩放。打开主题商城核对官网路由，再验证 .ambtheme 导入。测试构建不代表允许合并、发布或部署官网。
