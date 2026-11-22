// SPDX-License-Identifier: MPL-2.0
import {copyFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {createRequire} from 'node:module';

// Production packages exclude node_modules. Use the standalone distribution
// from the locked dependency in every desktop packaging entry point.
export async function stageJavaVerifier(desktop){
 const pkg=resolve(dirname(createRequire(import.meta.url).resolve('openpgp')),'../..');
 await copyFile(join(pkg,'dist/openpgp.min.mjs'),join(desktop,'vendor/openpgp.mjs'));
 await copyFile(join(pkg,'LICENSE'),join(desktop,'vendor/LICENSE-openpgp'));
}
