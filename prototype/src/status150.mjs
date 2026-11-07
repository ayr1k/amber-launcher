// SPDX-License-Identifier: MPL-2.0
import {t as translateText} from '../desktop/localization.mjs';
export function status150(value){const labels={disabled:'未启用',working:'处理中',initializing:'初始化中',incomplete:'初始化未完成',ready:'已就绪',starting:'启动中',running:'运行中',stopped:'已停止',failed:'失败',detached:'已接管运行进程',stopping:'正在停止'};return labels[value]?translateText(labels[value]):value||'—';}
