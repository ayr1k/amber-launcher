// SPDX-License-Identifier: MPL-2.0
// Real-game acceptance must use the desktop's account authorization flow.
export async function verificationIdentity(){
 throw Error('Use the desktop account flow to verify ownership and launch. Headless real-game launch is disabled; authentication cannot be bypassed by verification scripts.');
}
