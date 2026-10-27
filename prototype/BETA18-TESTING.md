# AMBER Beta 1.8 / 测试说明

Version / 版本：1.0.0-beta.9. Windows x64 prerelease. Installer unsigned.

AMBER verifies Minecraft Java eligibility at the actual game-launch boundary. Microsoft launches check official ownership and profile online. Third-party launches first check the linked official account and then the server identity. Authentication failures never silently switch to offline play. Anonymous and unverified legacy offline starts are blocked; existing instances and saves remain intact.

Explicitly created verified offline identities retain the official name and UUID. Eligibility is encrypted and cached for at most seven days, without offline renewal. Expiry, detected clock rollback, owner removal or a later definitive authorization/ownership denial blocks use. Seven days is a product policy, not a Mojang-approved exception.

Microsoft allowlist approval has not been obtained. Live Microsoft login, refresh, subscription expiry and official-account gameplay remain unaccepted; automated authentication tests use simulated responses. The user accepted the local Beta 1.8 build. Use temporary data for testing and retain world backups before upgrading. Third-party live services require provider-specific testing.

AMBER 在实际游戏启动入口验证 Minecraft Java 版正版资格。微软启动在线检查所有权和角色；第三方启动先检查关联的官方资格，再验证服务器身份。失败不静默降级为离线；无账号和旧未验证离线身份不能启动，原实例和存档保留。

主动创建的已验证离线身份沿用官方名称和 UUID，资格加密缓存最多七天，不会离线续期。到期、检测到时钟回退、移除资格账号或后续明确的授权/资格拒绝时停止使用。七天为产品策略，不代表 Mojang 已批准例外。

微软 API 尚未获批，真实登录、刷新、订阅到期及正版账号游戏启动仍待验收；自动认证测试使用模拟响应。用户已确认本地 Beta 1.8 测试通过。测试使用临时数据，升级前保留世界备份；第三方真实服务需按提供方验收。Windows 安装器未签名。
