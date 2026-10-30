// SPDX-License-Identifier: MPL-2.0
import pkg from '../package.json' with {type:'json'};
export const VERSION=pkg.version;
export const displayVersion = version => /^1\.0\.0-beta\.\d+$/.test(version) ? 'Beta 1.'+(Number(version.split('beta.')[1])-1) : version;
export const DISPLAY_VERSION=displayVersion(VERSION);
export const MICROSOFT_REVIEW='AMBER 已获准访问 Minecraft API，微软正版登录已由用户实测通过。启动时仍会验证游戏资格；这不代表 Mojang 或 Microsoft 官方背书。';
