// SPDX-License-Identifier: MPL-2.0
export function shouldHideToTray(behavior,serverActive,explicitQuit=false){
  return !explicitQuit&&(behavior==='tray'||behavior==='server'&&serverActive);
}
