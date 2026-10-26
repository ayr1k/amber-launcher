# Release checklist / 发布检查

- Run regression tests, build, license/source checks, desktop smoke and installer packaging. / 完成回归、构建、许可/源码检查、桌面冒烟和打包。
- Verify both languages, language packs and privacy controls. / 验证双语、语言包和隐私控件。
- Include installer, source ZIP and SHA256SUMS; verify uploaded hashes and CI. / 附上安装包、源码 ZIP 与校验文件，核对上传哈希与 CI。
- Preserve honest limits: unsigned installer, unapproved Microsoft API, best-effort redaction. / 明确未签名、微软未获批、脱敏存在边界。
- No private account data, personal logs or local paths in source archives. / 源码包不含私人账号数据、原始个人日志或本机路径。
