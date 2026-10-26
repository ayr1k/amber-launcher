# Beta 1.7 test guide / 测试指南

Package / 包版本: **1.0.0-beta.8**. Prerelease / 预发布。

## 中文

1. 关闭 AMBER 和游戏，再运行同目录的 Windows 安装包。使用原安装位置可升级；游戏数据与设置保留。
2. 检查顶部无边框按键与实例选择器对齐，四种实例图标正确显示，鼠标和键盘都能切换。缩小窗口、切换中英文及深浅主题再检查。
3. 首页反复展开/收起启动选项，背景与半透明卡片大小应保持不变。修改内存后有保存提示；实例重开后保留。
4. 设置 → 游戏启动选择显卡偏好，再启动游戏。确认显示的 Java 路径是游戏实际运行路径。共用 Java 的实例共用此系统设置。
5. 在 Minecraft F3 调试画面核对实际 GPU；AMBER 只在日志可识别时显示渲染设备，不能把“偏好已应用”当成使用独显的保证。检查高性能、节能以及恢复跟随系统。
6. 显卡偏好写入失败不阻止游戏启动；在启动选项中查看结果，使用 Windows 图形设置与复制 Java 路径入口。
7. 无实例时打开内容下载，说明和创建按钮应有明显间距。

已验证：核心回归、语言目录、浏览器布局与交互、Windows 专用测试值的写入/恢复。多显卡真实游戏的选择效果仍需实机验收；微软账号登录继续等待审批。安装包未签名。

## English

Close AMBER and games before installing. Upgrade in the existing install location to retain game data and preferences. Check header alignment, icon-bearing instance choices, keyboard selection, both languages/themes and narrow windows. Opening launch options must not resize the scenery or translucent dock. Memory choices should save per instance.

Choose a global graphics preference and launch a game, then verify its actual GPU using Minecraft’s F3 screen. Instances sharing Java share the OS preference. Test high performance, power saving and restoring system preferences. If automatic application fails, the game can still launch; inspect the recorded result and use Windows graphics settings with the copied Java path. Renderer detection is log-based and may be unavailable.

Core regression, catalog checks, browser UI and synthetic Windows preference write/restore are verified. Actual multi-GPU game behavior needs hardware acceptance. Microsoft live authentication remains deferred pending approval. The installer is unsigned.
