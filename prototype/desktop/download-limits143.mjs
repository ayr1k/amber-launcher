// SPDX-License-Identifier: MPL-2.0
export const MAX_DOWNLOADS = 128;
export const DOWNLOAD_OPTIONS = [...Array.from({length:16},(_,i)=>i+1),24,32,48,64,96,128];
export const validDownloadLimit = n => Number.isInteger(n) && n >= 1 && n <= MAX_DOWNLOADS;
