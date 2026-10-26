// SPDX-License-Identifier: MPL-2.0
import pkg from '../package.json' with {type:'json'};
export const VERSION=pkg.version;
export const DISPLAY_VERSION='Beta 1.'+(Number(VERSION.split('beta.')[1])-1);
export const MICROSOFT_REVIEW='AMBER 的 API 申请再次被拒，尚未获得批准。微软真实登录、刷新和正版启动暂未验收。';
