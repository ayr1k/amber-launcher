// SPDX-License-Identifier: MPL-2.0
// Pass a Java 17+ executable; no compiler or OptiFine JAR is shipped to end users.
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {download} from '../desktop/download.mjs';
const root=resolve('.test-tools'),compiler=resolve(root,'ecj.jar');
await download({path:compiler,url:'https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.39.0/ecj-3.39.0.jar',hash:'da787c5669578ffd5324bf29c18b361904a5a1bb'},{root});
const r=spawnSync(process.argv[2]||'java',['-jar',compiler,'-source','8','-target','8','-d','desktop/java','desktop/java/AmberOptifine.java','desktop/java/AmberLegacyForge.java'],{stdio:'inherit',windowsHide:true,shell:false});
if(r.error)throw r.error;process.exitCode=r.status||0;
