# Guided recommendation evidence / 推荐依据

The runtime directory is `desktop/guided-catalog.mjs`. Exact visual file IDs, shader SHA-1 and author presets are in `desktop/guided-visuals.json`. Evidence was checked on 2026-10-27. Runtime checks still fetch file and dependency metadata and verify downloads; future releases do not automatically enter the visual allowlist.

光影规则只表示核对了作者声明、集成代码和文件身份，不是游戏实测认证。缺少组合时保守降级，不伪造性能分数或帧率。玩法主题须明确选择；多人普通客户端推荐排除需要服务器配合的玩法项目。补装固定现有文件，只新增内容。

- https://modrinth.com/shader/complementary-reimagined/version/Bqen1mJX — r5.9.3; inspected shader archive includes DH programs, Voxy programs and VERYLOW / LOW / MEDIUM / HIGH author profiles.
- https://modrinth.com/mod/distanthorizons — author compatibility guidance.
- https://modrinth.com/mod/voxy — OpenGL 4.6 and explicit shader support requirements.
- https://raw.githubusercontent.com/IrisShaders/Iris/1.21.1/common/src/main/java/net/irisshaders/iris/config/IrisConfig.java — properties keys used by the configuration writer.

Profile output is limited to the inspected shader file and generated only for newly created instances. Existing different configuration files are preserved. Required dependency opt-outs remain explicit and do not count as fully satisfied dependencies. Known renderer conflicts are checked in addition to platform declarations.

Automated tests use synthetic file fixtures; real metadata/download checks do not launch Minecraft. Live Microsoft account acceptance remains deferred. Users should test visual results on their actual game GPU.
