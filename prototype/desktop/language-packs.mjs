// SPDX-License-Identifier: MPL-2.0
import {join} from 'node:path';
import {rm} from 'node:fs/promises';
import {atomicJson} from './core.mjs';
import {ensureParents} from './download.mjs';
import {readBoundedFile} from './bounded-io.mjs';
import {validateLanguagePack} from './localization.mjs';
export class LanguagePacks{
 constructor(root){this.root=root;this.path=join(root,'custom-language.json');}
 async get(){try{return validateLanguagePack(JSON.parse(await readBoundedFile(this.path,2_000_000)));}catch(e){if(e.code==='ENOENT')return null;return null;}}
 async preview(path){return validateLanguagePack(JSON.parse(await readBoundedFile(path,2_000_000)));}
 async save(pack){const valid=validateLanguagePack(pack);await ensureParents(this.root,this.path);await atomicJson(this.path,valid);return valid;}
 async remove(){await ensureParents(this.root,this.path);await rm(this.path,{force:true});}
}
