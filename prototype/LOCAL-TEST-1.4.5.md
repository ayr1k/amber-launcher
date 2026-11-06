# 1.4.5 本地测试 / Local testing

此文档保留已验收的 Windows 本地测试清单；用户已授权 1.4.5 正式发布，发布验证见 RELEASE-ACCEPTANCE.md。

- 截图查看器：顶部文件信息、独立图片视口、固定操作栏。支持适应窗口、100% 原始尺寸、缩放、拖动、左右键切换及 Esc 关闭，样式跟随主题。
- 修复大图关闭按钮中间无法点击：打开面板时停用背后标题栏的原生拖动区域，关闭面板后恢复。
- 截图列表和大图内均可删除单张图片。确认后移入系统回收站；失败不永久删除。删除当前图片后切换邻图，最后一张删除后退出查看器。
- 联机启动页：横向布局控制台在左、2×2 性能趋势在右、核心与启动设置在底部，主页面无滚动。日志只在控制台内部滚动。窄／纵向布局按控制台、性能、设置排列。
- 性能说明、报告、核心维护与复制通过独立面板打开，不撑长横向主页面。性能采集、指令发送和实例运行规则保持原有行为。

请重点测试实际服务端持续输出时的跟随日志与指令输入，主题／窗口尺寸切换，以及真实截图的缩放、删除与系统回收站恢复。测试删除前可使用一张无关紧要的截图。

This checklist describes the accepted Windows local candidates. The viewer uses a bounded image viewport and themed controls. Deletion uses system trash without a permanent-delete fallback. Landscape server launch keeps the main page fixed, with an internally scrolling console and separate details panels. Portrait/narrow layouts stack console before metrics. Platform-specific trash behavior on macOS/Linux and native non-Windows execution have not been tested in this delivery.
