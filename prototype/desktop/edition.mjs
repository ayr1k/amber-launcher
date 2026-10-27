// SPDX-License-Identifier: MPL-2.0
// Build-time identity. The AmberE packager writes its own copy in an isolated stage.
// Never select an edition from renderer input, environment variables or saved settings.
export const EDITION = 'amber';
export const IS_AMBERE = EDITION === 'ambere';
export const PRODUCT_NAME = IS_AMBERE ? 'AmberE' : 'AMBER';
export const REPOSITORY_NAME = IS_AMBERE ? 'ayr1k/AmberE' : 'ayr1k/amber-launcher';
export const REPOSITORY_URL = 'https://github.com/' + REPOSITORY_NAME;
export const OFFLINE_LEASE_MS = 7 * 24 * 60 * 60 * 1000;
