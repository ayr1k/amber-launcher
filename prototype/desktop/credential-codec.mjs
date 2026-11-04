// SPDX-License-Identifier: MPL-2.0
// Keeps the account-file format unchanged; old DPAPI ciphertext remains readable.
export function credentialCodec(storage){return {
 isEncryptionAvailable:async()=>await storage.isAsyncEncryptionAvailable()&&storage.getSelectedStorageBackend?.()!=='basic_text',
 encryptString:value=>storage.encryptStringAsync(value),
 decryptString:async value=>{const result=await storage.decryptStringAsync(value);return result.result;}
};}
