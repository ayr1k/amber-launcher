// SPDX-License-Identifier: MPL-2.0
// Deterministic experiment against the immutable 1.6.2 release. Synthetic files only.
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const root=await mkdtemp(join(tmpdir(),'amber163-baseline-'));
await mkdir(join(root,'config'));
const target=join(root,'config','sample.txt');
await writeFile(target,'original');
let source=execFileSync('git',['show','912b90b33b24810c8bfc9f6463eacae6dade4848:prototype/desktop/editor130.mjs'],{encoding:'utf8'});
source=source.replace("'./download.mjs'",JSON.stringify(new URL('../desktop/download.mjs',import.meta.url).href));
source=source.replace('await rename(tmp,p);',"await writeFile(p,'external-after-final-check');await rename(tmp,p);");
const {InstanceEditor}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const editor=new InstanceEditor({instancePath:async()=>root});
const doc=await editor.read('synthetic','config/sample.txt');
await editor.save('synthetic',{...doc,text:'editor-buffer'});
const backups=await Promise.all((await readdir(join(root,'config'))).filter(n=>n.endsWith('.bak')).map(n=>readFile(join(root,'config',n),'utf8')));
assert.equal(await readFile(target,'utf8'),'editor-buffer');
assert.deepEqual(backups,['original']);
console.log(JSON.stringify({baseline:'912b90b33b24810c8bfc9f6463eacae6dade4848',fixture:root,injection:'after final hash check, before replacement',disk:'editor-buffer',backups,externalBytesPreserved:false,conflictReported:false}));
