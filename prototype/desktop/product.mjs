// SPDX-License-Identifier: MPL-2.0
import pkg from '../package.json' with {type:'json'};
export const VERSION=pkg.version;
export const displayVersion = version => /^1\.0\.0-beta\.\d+$/.test(version) ? 'Beta 1.'+(Number(version.split('beta.')[1])-1) : version;
export const DISPLAY_VERSION=displayVersion(VERSION);
export const MICROSOFT_REVIEW='AMBER 支持微软账号登录，启动时验证 Minecraft 游戏资格。AMBER 是独立项目，不代表 Mojang 或 Microsoft 官方。';
