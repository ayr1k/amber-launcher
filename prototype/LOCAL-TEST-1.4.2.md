# 1.4.2 验证记录 / Validation record

Quilt 兼容修正：模组搜索、版本与依赖支持 Fabric 回退，优先 Quilt 原生版本；保留精确依赖要求，覆盖本地、联机、引导与导入流程。

用户已验收并授权 1.4.2 公开发布；最终安装包使用公开发布渠道。

- Quilt：手动与引导创建、加载器安装、MRPACK/CurseForge 整合包识别、原版目录导入、服务端、内容管理与环境清单。
- Sakura Frp：联机连接内二级标签；按系统和架构下载经校验的官方 frpc；加密保存密钥、实例隧道绑定、端口检查、启动/停止、地址与日志。先在 Sakura 官网创建指向本机服务端端口的 TCP 隧道。
- 玩家增强组件区分已安装与已启用，停止服务端时不再误显示安装按钮。
- 旧主题包的版本选中底色及窗口按钮悬停底色随重点色更新。

Quilt 1.21.1 真实服务端启动通过；Windows Sakura 官方组件下载、校验和版本执行通过。Sakura 已使用实际账号与隧道验证：官方配置 API、节点连接、公网端口及公网 Minecraft 状态查询（Paper 26.3）均通过，测试组件正常停止。macOS/Linux/FreeBSD 组件文件与架构已核对，仍待对应真机测试。FreeBSD 游戏客户端限制不变。安装包未签名。

Both editions share these changes and preserve independent account/update identities. Public release authorized after local acceptance. Quilt server startup and Windows Sakura component execution were tested; Sakura public tunnel connectivity and Minecraft status were verified against a real Paper 26.3 server; non-Windows native execution still requires acceptance.

Sakura 修正：配置通过官方公开 API 安全获取，交由 frpc 本地模板加载；配置与密钥仅放入子进程环境，磁盘不保存明文配置。识别中英文连接状态，补充连接检查、失败说明、启动取消和超时清理。
