// SPDX-License-Identifier: MPL-2.0
import {t as translateText} from '../desktop/localization.mjs';

// An authenticated room probe is not a Minecraft join and can expire silently.
export function hostRecentActivity177(guestSeen) {
  return guestSeen === true ? translateText("最近检测到朋友") : translateText("近期未检测到朋友");
}
