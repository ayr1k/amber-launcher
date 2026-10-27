# 贡献指南

[English](../../CONTRIBUTING.md)

使用 Windows x64、Node.js 24 与 pnpm 11.25.0，在 `prototype` 目录依次执行：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:sites
pnpm release:check
pnpm desktop:smoke
pnpm desktop
```

`pnpm dev` 仅是浏览器预览，真实文件操作和启动需使用桌面版。`pnpm package:installer` 构建 x64 NSIS 安装包。删除等破坏性操作只能在临时测试实例上验证。

`pnpm package:editions` 从同一份源码构建 AMBER 与 AmberE，输出到 `prototype/releases/beta1.8`。`node scripts/package-editions.mjs amber` 或 `ambere` 可单独构建。构建阶段设置固定版本标识、替换品牌，并从 AmberE 移除微软接口和内置 Client ID；两个安装包的应用身份与更新文件分别独立。此命令不会发布。共用功能保持在共同源码中，不维护仅用于审核的临时代码库。真实游戏测试须经过桌面版账号授权流程，命令行验证脚本不能绕过资格检查。

中英文文档同步更新。新增应用文案须加入翻译目录，保留稳定键与占位符。参见语言包指南。用户名称、文件名、项目介绍和执行参数不翻译。

保留事务回滚、路径校验、可信下载来源、哈希校验、渲染器权限隔离和凭据脱敏；行为改动应有回归覆盖。不提交账号库、个人原始日志、凭据、本地缓存或安装器。敏感漏洞按安全政策报告。

项目自有改动采用 MPL-2.0，保留依赖和素材声明。PR 说明用户可见变化、验证结果与限制，界面模拟检查不能表述为真实游戏验收。
