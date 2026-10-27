// SPDX-License-Identifier: MPL-2.0
// Export a separately buildable AmberE project from the shared source release.
import {cp,readFile,writeFile,mkdir,access,copyFile,unlink} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {EDITION} from '../desktop/edition.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
if(EDITION!=='amber')throw Error('This is already an edition export; use pnpm release:source.');
const source=join(root,'releases',`AMBER-${pkg.version}-github-source`),target=join(root,'releases',`AmberE-${pkg.version}-workspace`),app=join(target,'prototype'),stage=join(root,'releases/beta1.12/stages/AmberE');
try{await access(target);throw Error('Edition export exists; preserve it before regenerating.');}catch(e){if(e.code!=='ENOENT')throw e;}
await access(join(stage,'desktop/edition.mjs'));await cp(source,target,{recursive:true});await unlink(join(target,'SOURCE-MANIFEST.json'));
for(const folder of ['desktop','public','build'])await cp(join(stage,folder),join(app,folder),{recursive:true});
const metadata={...pkg,name:'ambere-launcher',description:'AmberE Minecraft Java launcher',scripts:{...pkg.scripts,'package:editions':'pnpm package:installer'}};
await writeFile(join(app,'package.json'),JSON.stringify(metadata,null,2)+'\n');
let config=await readFile(join(app,'electron-builder.yml'),'utf8');config=config.replace('io.github.ayr1k.amber','io.github.ayr1k.ambere').replaceAll('AMBER','AmberE');await writeFile(join(app,'electron-builder.yml'),config);
await copyFile(join(stage,'index.html'),join(app,'index.html'));
const replacements={'README.md':'overview.en.md','docs/zh-CN/README.md':'overview.zh.md','CHANGELOG.md':'changelog.en.md','docs/zh-CN/CHANGELOG.md':'changelog.zh.md','prototype/BETA112-TESTING.md':'testing.md'};
for(const [dest,template] of Object.entries(replacements))await copyFile(join(root,'editions/ambere',template),join(target,dest));
const brand=text=>text.replaceAll('https://github.com/ayr1k/amber-launcher','https://github.com/ayr1k/AmberE').replaceAll('AMBER','AmberE');
for(const path of ['prototype/README.md','docs/LANGUAGE-PACKS.md','docs/zh-CN/LANGUAGE-PACKS.md']){
 try{await writeFile(join(target,path),brand(await readFile(join(target,path),'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
}
// Preserve upstream license/copyright files; product guides describe the exported build.
for(const path of ['docs/USER-GUIDE.md','docs/zh-CN/USER-GUIDE.md']){
 const zh=path.includes('zh-CN'),text=await readFile(join(target,path),'utf8'),rest=text.slice(text.indexOf(zh?'**安装：**':'**Install:**'));
 const intro=zh?'# 使用指南\n\n[English](../USER-GUIDE.md)\n\n**首次使用：** 选择语言和游戏库位置，创建离线身份，或稍后在账号页添加第三方身份。AmberE 不提供微软登录，离线身份不授予游戏所有权。更新只来自 ayr1k/AmberE。\n\n':'# User guide\n\n[简体中文](zh-CN/USER-GUIDE.md)\n\n**First run:** choose a language and game-data location, then create an offline identity or add a third-party account later. AmberE does not offer Microsoft sign-in. Offline identities do not grant game ownership. Updates come only from ayr1k/AmberE.\n\n';
 await writeFile(join(target,path),intro+brand(rest));
}
const privacyEN='# Privacy and local data\n\n[简体中文](docs/zh-CN/PRIVACY.md)\n\nAmberE does not offer Microsoft sign-in or include a Microsoft Client ID. Third-party passwords are sent to the HTTPS authentication address entered by the user and are not persisted. Saved tokens use Windows user encryption; it does not protect against malicious software running as the same Windows user.\n\nData is stored separately in `%APPDATA%/AmberE`, with a configurable game-library location. No automatic account transfer occurs. Local account removal does not revoke server-side authorization. Upgrade backups may retain encrypted account records.\n\nSearches and downloads contact game, loader, Java, mod and GitHub providers as requested. Updates use only `ayr1k/AmberE`. No diagnostic reports, logs, worlds or local mod files are automatically uploaded. Optional local-mod identification sends a file hash to Modrinth. Diagnostics use an allowlist; review all logs before sharing. Language packs and backgrounds stay local.\n\nUninstall preserves game data. Confirmed cleanup targets downloaded updates or old configuration backups, not active accounts or worlds.\n';
const privacyZH='# 隐私与本地数据\n\n[English](../../PRIVACY.md)\n\nAmberE 不提供微软登录，不内置微软 Client ID。第三方密码发送到用户填写的 HTTPS 认证地址，不保存密码；令牌使用 Windows 用户加密，无法防范以同一用户身份运行的恶意程序。\n\n使用独立的 `%APPDATA%/AmberE` 数据目录，游戏库位置可调整，不自动迁移账号。本地移除不撤销服务端授权，旧升级备份可能仍保留加密账号记录。\n\n搜索下载按需联系游戏、加载器、Java、模组及 GitHub 服务，程序更新仅来自 `ayr1k/AmberE`。不自动上传诊断、日志、存档或本地模组；可选本地模组识别向 Modrinth 发送文件哈希。诊断采用白名单，分享日志前仍需检查。语言包和背景保存在本地。\n\n卸载保留游戏数据。带确认的清理仅针对更新下载或旧配置备份，不删除活动账号和存档。\n';
await writeFile(join(target,'PRIVACY.md'),privacyEN);await writeFile(join(target,'docs/zh-CN/PRIVACY.md'),privacyZH);
for(const [path,zh] of [['CONTRIBUTING.md',false],['docs/zh-CN/CONTRIBUTING.md',true]]){
 let text=await readFile(join(target,path),'utf8');text=text.split('\n').filter(line=>!line.startsWith('`pnpm package:editions`')).join('\n');
 text+='\n'+(zh?'本仓库默认构建 AmberE；`pnpm package:installer` 生成独立安装包，`pnpm release:source` 导出源码。共用核心来自 AMBER，保留上游版权与许可证；同步功能改动时保留本项目的认证限制、应用身份、品牌和更新仓库。':'This repository builds AmberE by default. `pnpm package:installer` creates its installer; `pnpm release:source` exports source. Shared core changes originate in AMBER; retain upstream copyrights and licenses, and preserve AmberE authentication restrictions, application identity, branding and update repository when synchronizing features.')+'\n';await writeFile(join(target,path),text);
}
const securityEN='# Security\n\n[简体中文](docs/zh-CN/SECURITY.md)\n\nDo not publish tokens, passwords, account stores, private logs or exploit details in public issues. Open an issue in ayr1k/AmberE without sensitive information to request a private contact channel with the maintainer.\n\nUse temporary data when testing. No exhaustive security audit or certification is claimed. Preserve MPL-2.0 and upstream notices when reporting or fixing shared-core issues.\n';
const securityZH='# 安全说明\n\n[English](../../SECURITY.md)\n\n请勿在公开 Issue 中发布令牌、密码、账号库、私人日志或漏洞利用细节。可在 ayr1k/AmberE 提交不含敏感信息的联系请求，与维护者确认私密沟通渠道。\n\n测试使用临时数据，不宣称穷尽安全审计或认证。共用核心的问题修复保留 MPL-2.0 与上游声明。\n';
await writeFile(join(target,'SECURITY.md'),securityEN);await writeFile(join(target,'docs/zh-CN/SECURITY.md'),securityZH);
for(const [path,zh] of [['docs/TESTING.md',false],['docs/zh-CN/TESTING.md',true]])await writeFile(join(target,path),zh?'# 测试\n\n[English](../TESTING.md)\n\n参见 [Beta 1.12 验证说明](../../prototype/BETA112-TESTING.md)。在此仓库运行 `pnpm test`、`pnpm build`、`pnpm test:sites`、`pnpm release:check` 及 `pnpm desktop:smoke`。微软流程只作为共用核心的模拟回归存在，AmberE 产品不暴露微软登录。第三方真实服务需分别验收。\n':'# Testing\n\n[简体中文](zh-CN/TESTING.md)\n\nSee [Beta 1.12 validation](../prototype/BETA112-TESTING.md). Run `pnpm test`, `pnpm build`, `pnpm test:sites`, `pnpm release:check` and `pnpm desktop:smoke` in this repository. Microsoft tests are shared-core mock regression coverage; AmberE exposes no Microsoft sign-in. Live third-party providers require separate acceptance.\n');
const {readdir}=await import('node:fs/promises');for(const name of await readdir(join(target,'.github/workflows'))){const file=join(target,'.github/workflows',name);await writeFile(file,brand(await readFile(file,'utf8')).replaceAll('amber-windows-development','ambere-windows-development'));}
for(const path of ['docs/ROLLBACK.md','docs/zh-CN/ROLLBACK.md'])await writeFile(join(target,path),brand(await readFile(join(target,path),'utf8')));
await writeFile(join(target,'PRIVACY.md'),privacyEN+"\nTrial copies and change-recovery snapshots stay in the selected local game library. Copies may include worlds when explicitly selected; configuration snapshots can contain personal data written by games or mods. They are not automatically uploaded or included in preference-template exports. Template JSON contains questionnaire preferences only; review it before sharing. Global quick search searches local instances/actions and sends no search query to a server.\n");
await writeFile(join(target,'docs/zh-CN/PRIVACY.md'),privacyZH+"\n试用副本和变更恢复快照保存在所选本地游戏库；主动选择时副本会包含存档。配置快照可能保留游戏或模组写入的个人信息，不自动上传，也不包含在推荐模板导出中。模板 JSON 仅包含问卷偏好，分享前仍应检查。全局快捷搜索在本地查找实例和操作，不向服务器发送搜索词。\n");
console.log('AMBERE_SOURCE_WORKSPACE',target);
