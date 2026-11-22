// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir,lstat,rm,symlink,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,parse} from 'node:path';
import {discoverJava,installJava} from '../desktop/java.mjs';
import {hostPlatform} from '../desktop/platform135.mjs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {MinecraftImport,scanMinecraft,resolveProfile,collectImportFiles} from '../desktop/minecraft134.mjs';
import {validateImportVersion,directoryChoices,identifier,localVersionId} from '../desktop/import-identify151.mjs';
import {Libraries170} from '../desktop/libraries170.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';
const sha=b=>createHash('sha1').update(b).digest('hex');
const vanilla=id=>({id,mainClass:'net.minecraft.client.main.Main',libraries:[]});
const fabric=(id='1.21.11-Fabric',game='1.21.11')=>({...vanilla(id),mainClass:'net.fabricmc.loader.impl.launch.knot.KnotClient',libraries:[{name:'net.fabricmc:fabric-loader:0.18.0'},{name:'net.fabricmc:intermediary:'+game}]});
async function snapshot(root){const out={};async function walk(p){for(const e of await readdir(p)){const file=join(p,e),st=await lstat(file);if(st.isSymbolicLink()){out[relative(root,file)]='link';continue}if(st.isDirectory())await walk(file);else out[relative(root,file)]={bytes:(await readFile(file)).toString('base64'),mtime:st.mtimeMs};}}await walk(root);return out;}
async function fixture(t,meta=vanilla('1.21.11'),sourceParent=tmpdir(),libraryParent){
 const root=await mkdtemp(join(sourceParent,'amber151-')),source=join(root,'source'),library=libraryParent?await mkdtemp(join(libraryParent,'amber179-data-')):join(root,'library');if(libraryParent)t.after(()=>rm(library,{recursive:true,force:true}));await mkdir(source);t.after(()=>rm(root,{recursive:true,force:true}));
 const put=async(p,value)=>{const path=join(source,p);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,typeof value==='string'?value:JSON.stringify(value));return path};
 const version=async m=>put(`versions/${m.id}/${m.id}.json`,m);await version(meta);
 const client=Buffer.from('synthetic client, never executed'),index=Buffer.from('{"objects":{}}');
 const official={...vanilla('1.21.11'),type:'release',javaVersion:{majorVersion:21},arguments:{game:[]},assetIndex:{id:'test',url:'https://piston-meta.mojang.com/index.json',sha1:sha(index),size:index.length},downloads:{client:{url:'https://piston-data.mojang.com/client.jar',sha1:sha(client),size:client.length}}};
 const body=JSON.stringify(official),fetcher=async url=>{
  if(url.includes('version_manifest_v2'))return new Response(JSON.stringify({versions:['1.21.11','1.21.1'].map(id=>({id,type:'release',url:'https://piston-meta.mojang.com/meta.json',sha1:sha(body)}))}));
  if(url.endsWith('/meta.json'))return new Response(body);
  if(url.endsWith('/index.json'))return new Response(index);
  if(url.endsWith('/client.jar'))return new Response(client);
  if(url.includes('meta.fabricmc.net')||url.includes('meta.quiltmc.org'))return new Response(JSON.stringify([{loader:{version:'0.18.0',stable:true}}]));
  if(url.endsWith('maven-metadata.xml'))return new Response('<metadata><version>1.21.11-61.0.0</version><version>21.11.0</version></metadata>');
  throw Error('Unexpected fixture URL '+url);
 };
 const core=new VanillaLauncher(library,{fetcher});await core.init();const importer=new MinecraftImport(core);return {root,source,library,put,version,core,importer,key:'version:'+meta.id};
}
async function ready(f,groups=['options.txt'],options={}){const scan=await f.importer.scan(f.source),preview=await f.importer.preview(scan.id,f.key,groups,options);return {scan,preview,input:{name:'Imported',groups,previewId:preview.id}};}
for(const [label,meta,expected] of [
 ['vanilla',vanilla('1.21.11'),'vanilla'],['merged Fabric custom ID',fabric(),'fabric'],
 ['Quilt',{...fabric('quilt-custom'),mainClass:'org.quiltmc.loader.impl.launch.knot.KnotClient',libraries:[{name:'org.quiltmc:quilt-loader:0.18.0'},{name:'net.fabricmc:intermediary:1.21.11'}]},'quilt'],
 ['Forge',{...vanilla('forge-custom'),mainClass:'cpw.mods.bootstraplauncher.BootstrapLauncher',libraries:[{name:'net.minecraftforge:forge:1.21.11-61.0.0:universal'}]},'forge'],
 ['NeoForge',{...vanilla('neo-custom'),mainClass:'cpw.mods.bootstraplauncher.BootstrapLauncher',libraries:[{name:'net.neoforged:neoforge:21.11.0'}]},'neoforge']]){
 test(label+' identifies base independently and validates the loader combination',async t=>{const f=await fixture(t,meta),before=await snapshot(f.source);const p=await resolveProfile(f.source,meta.id),v=await validateImportVersion(f.core,p);assert.equal(v.state,'ready');assert.equal(v.game,'1.21.11');assert.equal(p.loader,expected);assert.deepEqual(await snapshot(f.source),before)});
}
test('standard inheritance retains original IDs and resolves vanilla parent',async t=>{const f=await fixture(t);await f.version({id:'custom-display',inheritsFrom:'1.21.11',mainClass:'net.fabricmc.loader.impl.launch.knot.KnotClient',libraries:[{name:'net.fabricmc:fabric-loader:0.18.0'}]});const p=await resolveProfile(f.source,'custom-display');assert.deepEqual(p.chain,['custom-display','1.21.11']);assert.equal((await validateImportVersion(f.core,p)).game,'1.21.11')});
test('custom ID is never suffix-stripped; absent evidence requires explicit official choice',async t=>{const m={...fabric(),libraries:[{name:'net.fabricmc:fabric-loader:0.18.0'}]},f=await fixture(t,m),p=await resolveProfile(f.source,m.id);assert.equal((await validateImportVersion(f.core,p)).state,'needs-version');assert.equal((await validateImportVersion(f.core,p,'1.21.11')).state,'ready');assert.equal((await validateImportVersion(f.core,p,'1.21.11-Fabric')).state,'unsupported')});
test('conflicting base evidence requires confirmation; conflicting loaders are rejected',async t=>{const m={...fabric(),clientVersion:'1.21.1'},f=await fixture(t,m),p=await resolveProfile(f.source,m.id);assert.equal((await validateImportVersion(f.core,p)).state,'needs-version');m.libraries.push({name:'net.fabricmc:fabric-loader:0.17.0'});await f.version(m);await assert.rejects(resolveProfile(f.source,m.id),/冲突/)});
test('FML game arguments are evidence; unknown main class remains unsupported',async t=>{const m={...fabric(),libraries:[{name:'net.fabricmc:fabric-loader:0.18.0'}],arguments:{game:['--fml.mcVersion','1.21.11']}},f=await fixture(t,m);assert.equal((await validateImportVersion(f.core,await resolveProfile(f.source,m.id))).game,'1.21.11');await f.version({...m,mainClass:'unknown.CustomClient'});assert.equal((await scanMinecraft(f.source)).rows[0].supported,false)});
for(const [label,meta] of [['missing parent',{id:'broken',inheritsFrom:'missing'}],['cycle',{id:'broken',inheritsFrom:'broken'}],['traversal',{id:'broken',inheritsFrom:'..'}],['bad libraries',{id:'broken',libraries:{}}]])test(label+' cannot be imported',async t=>{const f=await fixture(t,meta),before=await snapshot(f.source);assert.equal((await scanMinecraft(f.source)).rows[0].supported,false);assert.deepEqual(await snapshot(f.source),before)});
test('damaged JSON is reported without affecting other profiles',async t=>{const f=await fixture(t);await f.put('versions/broken/broken.json','{');const rows=(await scanMinecraft(f.source)).rows;assert.equal(rows.find(r=>r.versionId==='broken').supported,false);assert.equal(rows.find(r=>r.versionId==='1.21.11').supported,true)});
test('network failure differs from a verified unsupported loader combination',async t=>{const f=await fixture(t,fabric()),p=await resolveProfile(f.source,'1.21.11-Fabric');f.core.versions=async()=>{throw Error('offline')};assert.equal((await validateImportVersion(f.core,p)).state,'unavailable');f.core.versions=async()=>{f.core.catalog=[{id:'1.21.11'}]};f.core.fetcher=async()=>{throw Error('offline')};assert.equal((await validateImportVersion(f.core,p)).state,'unavailable');f.core.fetcher=async()=>new Response('[]');assert.equal((await validateImportVersion(f.core,p)).state,'unsupported')});
test('isolated version data selected without copying sibling instances or credentials',async t=>{const f=await fixture(t);await f.put('versions/1.21.11/options.txt','chosen');await f.version(vanilla('1.21.1'));await f.put('versions/1.21.1/options.txt','sibling');await f.put('launcher_accounts.json','credential fixture');const before=await snapshot(f.source),{scan,preview,input}=await ready(f);assert.equal(preview.gameDir,join(f.source,'versions','1.21.11'));const result=await f.importer.create(scan.id,f.key,input),dest=await f.core.instancePath(result.instance.id);assert.equal(await readFile(join(dest,'options.txt'),'utf8'),'chosen');assert.deepEqual(await snapshot(f.source),before);assert.equal((await readdir(dest)).includes('launcher_accounts.json'),false)});
test('shared and isolated data require a choice; switching directories invalidates previous preview',async t=>{const f=await fixture(t);await f.put('options.txt','shared');await f.put('versions/1.21.11/options.txt','isolated');const scan=await f.importer.scan(f.source);assert.equal(scan.rows[0].gameDir,null);assert.equal((await f.importer.preview(scan.id,f.key,['options.txt'])).needsDirectory,true);const one=await f.importer.preview(scan.id,f.key,['options.txt'],{gameDir:f.source});const chosen=await f.importer.chooseDirectory(scan.id,f.key,join(f.source,'versions','1.21.11'));await assert.rejects(f.importer.create(scan.id,f.key,{name:'old',groups:['options.txt'],previewId:one.id}),/失效/);const two=await f.importer.preview(scan.id,f.key,['options.txt'],{gameDir:chosen.path});assert.equal(two.bytes,8)});
test('explicit profile and JSON gameDir are respected; conflicting paths require selection',async t=>{const f=await fixture(t,{...vanilla('1.21.11'),gameDir:'instance-a'});await f.put('instance-a/options.txt','a');await f.put('instance-b/options.txt','b');await f.put('launcher_profiles.json',{profiles:{p:{name:'Display name',lastVersionId:'1.21.11',gameDir:'instance-b'}}});const row=(await scanMinecraft(f.source)).rows[0];assert.equal(row.gameDir,null);assert.equal(row.directories.length,2);assert.equal(row.name,'Display name')});
test('zero files require explicit runtime-only consent and preserve source',async t=>{const f=await fixture(t),before=await snapshot(f.source),{scan,preview,input}=await ready(f);assert.equal(preview.files,0);await assert.rejects(f.importer.create(scan.id,f.key,input),/仅创建/);const r=await f.importer.create(scan.id,f.key,{...input,allowEmpty:true});assert.equal(r.copiedFiles,0);assert.deepEqual(await snapshot(f.source),before)});
for(const kind of ['content','added','removed','metadata'])test('preview detects '+kind+' changes before creating an instance',async t=>{const f=await fixture(t);const file=await f.put('options.txt','aaaa'),{scan,input}=await ready(f,['options.txt','saves']);if(kind==='content'){const st=await lstat(file);await writeFile(file,'bbbb');await utimes(file,st.atime,st.mtime)}if(kind==='added'){await f.put('saves/new/level.dat','new')}if(kind==='removed')await rm(file);if(kind==='metadata')await f.version({...vanilla('1.21.11'),clientVersion:'1.21.1'});const before=await snapshot(f.source);await assert.rejects(f.importer.create(scan.id,f.key,input));assert.equal((await f.core.listInstances()).length,0);assert.deepEqual(await snapshot(f.source),before)});
test('changes during copy fail verification and do not change other source files',async t=>{const f=await fixture(t);const source=await f.put('options.txt','original'),{scan,input}=await ready(f),copy=f.importer.copyContent.bind(f.importer);f.importer.copyContent=async(a,b)=>{await copy(a,b);await writeFile(source,'external edit')};await assert.rejects(f.importer.create(scan.id,f.key,input),/verification|校验/);assert.equal(await readFile(source,'utf8'),'external edit')});
test('cancel then retry completes a new copy while source stays byte-identical',async t=>{const f=await fixture(t);await f.put('options.txt','keep');const before=await snapshot(f.source),{scan,input}=await ready(f),create=f.core.createInstance.bind(f.core);f.core.createInstance=async x=>{const item=await create(x);f.importer.cancel();return item};await assert.rejects(f.importer.create(scan.id,f.key,input),/cancelled/);assert.equal(f.importer.busy,false);f.core.createInstance=create;const r=await f.importer.create(scan.id,f.key,input);assert.equal(r.copiedFiles,1);assert.deepEqual(await snapshot(f.source),before)});
for(const kind of ['space','permission','install'])test(kind+' failure leaves source unchanged and permits retry',async t=>{const f=await fixture(t);await f.put('options.txt','keep');const before=await snapshot(f.source),{scan,input}=await ready(f),original={space:f.importer.availableSpace,permission:f.importer.copyContent,install:f.core.install};if(kind==='space')f.importer.availableSpace=async()=>({bavail:0,bsize:4096});if(kind==='permission')f.importer.copyContent=async()=>{throw Object.assign(Error('synthetic EACCES'),{code:'EACCES'})};if(kind==='install')f.core.install=async()=>{throw Error('synthetic install offline')};await assert.rejects(f.importer.create(scan.id,f.key,input),kind==='space'?/space/:kind==='permission'?/EACCES/:/offline/);assert.deepEqual(await snapshot(f.source),before);f.importer.availableSpace=original.space;f.importer.copyContent=original.permission;f.core.install=original.install;await f.importer.create(scan.id,f.key,input);assert.deepEqual(await snapshot(f.source),before)});
test('junction boundaries and arbitrary IPC paths cannot select or traverse unrelated data',async t=>{const f=await fixture(t),outside=join(f.root,'outside');await mkdir(outside);await writeFile(join(outside,'keep'),'keep');await symlink(outside,join(f.source,'mods'),'junction');await assert.rejects(collectImportFiles(f.source,['mods']),/link/i);await assert.rejects(collectImportFiles(f.source,['../outside']),/selection/);const scan=await f.importer.scan(f.source);await assert.rejects(f.importer.preview(scan.id,f.key,[],{gameDir:outside}),/again/);await assert.rejects(f.importer.chooseDirectory(scan.id,f.key,join(f.source,'mods')),/link/i);assert.equal(await readFile(join(outside,'keep'),'utf8'),'keep')});
test('source containing destination is refused without writing to it',async t=>{const f=await fixture(t);await f.put('options.txt','keep');const {scan,input}=await ready(f);f.core.root=join(f.source,'library');const before=await snapshot(f.source);await assert.rejects(f.importer.create(scan.id,f.key,input),/contain/);assert.deepEqual(await snapshot(f.source),before)});

test('execution requires a current validated preview, not only a scan token',async t=>{const f=await fixture(t);await f.put('options.txt','keep');const scan=await f.importer.scan(f.source);await assert.rejects(f.importer.create(scan.id,f.key,{name:'no preview',groups:['options.txt']}),/失效/);assert.equal((await f.core.listInstances()).length,0)});

for(const origin of ['launcher profile','version JSON'])test(origin+' missing gameDir stays selectable without a fallback; corrected directory previews and copies unchanged source',async t=>{
 const f=await fixture(t,origin==='version JSON'?{...vanilla('1.21.11'),gameDir:'missing-original'}:vanilla('1.21.11'));
 if(origin==='launcher profile'){await f.put('launcher_profiles.json',{profiles:{moved:{name:'Moved',lastVersionId:'1.21.11',gameDir:'missing-original'}}});f.key='moved'}
 await f.put('options.txt','shared must not copy');await f.put('versions/1.21.11/options.txt','isolated chosen');const before=await snapshot(f.source),scan=await f.importer.scan(f.source),row=scan.rows.find(r=>r.key===f.key);
 assert.equal(row.supported,true);assert.equal(row.gameDir,null);assert.deepEqual(row.directories,[]);assert.equal(row.directoryIssues[0].path,join(f.source,'missing-original'));assert.match(row.directoryIssues[0].reason,/不存在/);
 const pending=await f.importer.preview(scan.id,f.key,['options.txt']);assert.equal(pending.needsDirectory,true);assert.equal(pending.id,undefined);await assert.rejects(f.importer.preview(scan.id,f.key,['options.txt'],{gameDir:f.source}),/again/);
 const selected=await f.importer.chooseDirectory(scan.id,f.key,join(f.source,'versions','1.21.11')),preview=await f.importer.preview(scan.id,f.key,['options.txt'],{gameDir:selected.path});assert.equal(preview.files,1);assert.equal(preview.gameDir,selected.path);
 const result=await f.importer.create(scan.id,f.key,{name:'Corrected',groups:['options.txt'],previewId:preview.id});assert.equal(await readFile(join(await f.core.instancePath(result.instance.id),'options.txt'),'utf8'),'isolated chosen');assert.deepEqual(await snapshot(f.source),before);
});
test('inaccessible configured directory requires correction even alongside a valid configured candidate',async t=>{
 const f=await fixture(t);await f.put('valid/options.txt','keep');const profile={versionId:'1.21.11',explicitGameDir:'denied',directories:['valid']};const result=await directoryChoices(f.source,profile,['options.txt'],async path=>{if(path===join(f.source,'denied'))throw Object.assign(Error('synthetic denied'),{code:'EACCES'})});
 assert.equal(result.gameDir,null);assert.equal(result.directories.length,1);assert.match(result.directoryIssues[0].reason,/权限/);
});
test('configured junction remains blocked rather than becoming a recoverable missing-directory warning',async t=>{
 const f=await fixture(t);await f.put('target/options.txt','keep');await symlink(join(f.source,'target'),join(f.source,'linked'),'junction');await f.put('launcher_profiles.json',{profiles:{p:{lastVersionId:'1.21.11',gameDir:'linked'}}});const before=await snapshot(f.source),row=(await scanMinecraft(f.source)).rows[0];assert.equal(row.supported,false);assert.match(row.reason,/link/i);assert.deepEqual(await snapshot(f.source),before);
});


const secondVolume=process.env.AMBER_TEST_SECOND_VOLUME;
const locations=[['same volume',tmpdir(),tmpdir()]];
if(secondVolume)assert.notEqual(parse(secondVolume).root.toLowerCase(),parse(tmpdir()).root.toLowerCase(),'Choose a distinct test volume');
if(secondVolume)locations.push(['primary to secondary',tmpdir(),secondVolume],['secondary to primary',secondVolume,tmpdir()]);
for(const [label,sourceParent,dataParent] of locations)test('both Minecraft entry services: '+label,async t=>{
 const f=await fixture(t,undefined,sourceParent,dataParent);
 await f.put('versions/1.21.11/options.txt','selected');
 const before=await snapshot(f.source);
 t.diagnostic('Source '+parse(f.source).root+'<fixture>/source; game versions/1.21.11 inside source; application data '+parse(f.library).root+'<separate fixture>.');
 const registry=new Libraries170(f.library);
 const registration=await registry.preview(f.source);
 const entry=await registry.add(registration.token,'External',true);
 assert.equal((await registry.scan(entry.id)).rows[0].id,'1.21.11');
 const {scan,preview,input}=await ready(f);
 assert.equal(preview.gameDir,join(f.source,'versions','1.21.11'));
 const result=await f.importer.create(scan.id,f.key,input);
 assert.equal(await readFile(join(await f.core.instancePath(result.instance.id),'options.txt'),'utf8'),'selected');
 assert.deepEqual(await snapshot(f.source),before);
});


for(const id of ['FPScraft X','中文 游戏'])test('local version ID remains separate from display and official ID: '+id,async t=>{
 const m={...fabric(id),inheritsFrom:'',patches:[{id:'game',version:'1.21.11'}]};
 const f=await fixture(t,m);
 await f.put('launcher_profiles.json',{profiles:{display:{name:'任意显示名',lastVersionId:id}}});
 const [row]=(await f.importer.scan(f.source)).rows;
 assert.equal(row.name,'任意显示名');assert.equal(row.versionId,id);assert.equal(row.supported,true);
 assert.equal((await validateImportVersion(f.core,row)).game,'1.21.11');
 const external=(await new Libraries170(f.library).preview(f.source)).rows[0];
 assert.deepEqual([external.id,external.game,external.loader],[id,'1.21.11','fabric']);
 assert.equal(identifier(id),false);
});
test('local filename restrictions and folder/JSON correspondence',async t=>{
 for(const id of ['', '.', '..','CON.txt','LPT²','COM1 .txt','a:ads','bad.','bad ','../a','a/b','c:\\\\bad','a*','x\\n','x'.repeat(151)])assert.equal(localVersionId(id),false,id);
 const f=await fixture(t);
 await f.put('versions/Alias X/Alias X.json',{...vanilla('other')});
 assert.match((await f.importer.scan(f.source)).rows.find(p=>p.versionId==='Alias X').reason,/mismatch/);
});
test('explicit choice that left the catalog can be replaced, offline selection can retry',async t=>{
 const f=await fixture(t,fabric()),scan=await f.importer.scan(f.source);
 const options={game:'old-selection'};
 const stale=await f.importer.preview(scan.id,f.key,[],options);
 assert.equal(stale.validation.state,'unsupported');assert.ok(stale.validation.versions.includes('1.21.11'));
 const online=f.core.versions.bind(f.core);f.core.versions=async()=>{throw Error('offline')};
 assert.equal((await f.importer.preview(scan.id,f.key,[],options)).validation.state,'unavailable');
 f.core.versions=online;
 assert.equal((await f.importer.preview(scan.id,f.key,[],{game:'1.21.11'})).validation.state,'ready');
});
test('both entry services reject equality, nested roots and linked aliases',async t=>{
 const f=await fixture(t);
 const scan=await f.importer.scan(f.source);
 const nested=join(f.source,'sub'),alias=join(f.root,'alias');
 await mkdir(nested);await symlink(f.source,alias,'junction');
 for(const dataRoot of [f.source,nested,f.root,alias]){
  const registry=new Libraries170(dataRoot);
  await assert.rejects(registry.preview(f.source),/overlap|link/i);
  f.core.root=dataRoot;
  await assert.rejects(f.importer.preview(scan.id,f.key,[]),/contain|link/i);
 }
});

// Trust is supplied independently of the files put in the fixture.
const runtimeFiles={'bin/java.exe':'fixture binary','bin/server/jvm.dll':'fixture library'};
const fixturePin=createHash('sha256').update(JSON.stringify(Object.entries(runtimeFiles)
 .map(([name,bytes])=>[name,Buffer.byteLength(bytes),sha(bytes)]))).digest('hex');
async function putRuntime(appData,files=runtimeFiles){
 const home=join(appData,'.minecraft','runtime','java-runtime-beta','windows-x64','java-runtime-beta');
 for(const [name,bytes] of Object.entries(files)){
  const path=join(home,name);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,bytes);
 }
 return home;
}
function discoveryFixture(appData,probe){
 return {host:hostPlatform('win32','x64'),system:async()=>[],appData,probe,candidates(runtimeRoot,arch,major){
  assert.equal(arch,'x64');assert.equal(major,17);
  return [{home:join(runtimeRoot,'java-runtime-beta','windows-x64','java-runtime-beta'),hash:fixturePin,major:17}];
 }};
}

for(const mode of ['unverified','missing','cancel during preparation','wrong major','wrong architecture','cancel during probe','reuse compatible'])test('Forge Java preflight: '+mode,async t=>{
 const meta={...vanilla('Forge 中文'),inheritsFrom:null,mainClass:'cpw.mods.bootstraplauncher.BootstrapLauncher',
  javaPath:'profile-supplied-path',libraries:[{name:'net.minecraftforge:fmlloader:1.18.2-40.2.9'}],arguments:{game:['--fml.mcVersion','1.18.2']}};
 const f=await fixture(t,meta);
 await f.put('options.txt','keep');const before=await snapshot(f.source);
 const body=JSON.stringify({...vanilla('1.18.2'),javaVersion:{majorVersion:17}});
 const previous=join(f.library,'instances','previous-copy');await mkdir(previous);const previousFile=join(previous,'options.txt');await writeFile(previousFile,'previous copy marker');
 let runtimeRequests=0,copies=0;
 f.core.versions=async()=>{f.core.catalog=[{id:'1.18.2',url:'https://piston-meta.mojang.com/base.json',sha1:sha(body)}]};
 f.core.fetcher=async(url,{signal}={})=>{
  if(url.endsWith('/base.json'))return new Response(body);
  if(url.endsWith('maven-metadata.xml'))return new Response('<version>1.18.2-40.2.9</version>');
  if(url.startsWith('https://api.adoptium.net/')){
   runtimeRequests++;
   if(mode==='cancel during preparation'){
    const stopped=new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
    f.importer.cancel();return stopped;
   }
   throw Error('test runtime download failed');
  }
  throw Error('Unexpected URL');
 };
 const appData=join(f.root,'appdata');
 if(!['missing','cancel during preparation'].includes(mode))await putRuntime(appData);
 if(mode==='unverified')await putRuntime(appData,{'bin/server/jvm.dll':'changed library'});
 let probeCalls=0,abortedProbes=0,checkedPath;
 const discovery=discoveryFixture(appData,async(path,signal)=>{
  probeCalls++;checkedPath=path;
  assert.equal(path,join(f.library,'runtimes','mojang-'+fixturePin,'bin','java.exe'));
  if(mode==='cancel during probe'){
   const stopped=new Promise((_,reject)=>signal.addEventListener('abort',()=>{abortedProbes++;reject(signal.reason);},{once:true}));
   f.importer.cancel();return stopped;
  }
  return {major:mode==='wrong major'?21:17,architecture:mode==='wrong architecture'?'aarch64':'amd64',version:'17',path:'self-reported-path'};
 });
 f.core.scanJava=options=>{assert.equal(options.purpose,'import');return discoverJava(f.library,options,discovery);};
 const copy=f.importer.copyContent.bind(f.importer);
 f.importer.copyContent=async(...args)=>{
  const {item}=await f.core.metadata(f.importer.instanceId);assert.equal(item.javaPath,checkedPath);copies++;
  return copy(...args);
 };
 f.core.configureLoader=async()=>{throw Error('test ended at loader handoff')};
 const {scan,input}=await ready(f);
 for(let attempt=0;attempt<(mode==='reuse compatible'?1:2);attempt++){
  await assert.rejects(f.importer.create(scan.id,f.key,input),mode==='reuse compatible'?/loader handoff/:mode.startsWith('cancel')?/cancelled/:/Check Java/);
 }
 assert.equal(copies,mode==='reuse compatible'?1:0);
 assert.equal(runtimeRequests,['reuse compatible','cancel during probe'].includes(mode)?0:2);
 assert.equal(probeCalls,['unverified','missing','cancel during preparation'].includes(mode)?0:mode==='reuse compatible'?1:2);
 assert.equal(abortedProbes,mode==='cancel during probe'?2:0);
 assert.equal(await readFile(previousFile,'utf8'),'previous copy marker');
 assert.deepEqual(await snapshot(f.source),before);
});

test('automatic scans bound simultaneous probes and cancel queued and running work',{timeout:10000},async t=>{
 const f=await fixture(t),appData=join(f.root,'appdata');
 await putRuntime(appData);
 let started=0,active=0,peak=0;
 const admitted=Promise.withResolvers(),controller=new AbortController();
 const deps=discoveryFixture(appData,async(path,signal)=>{
  started++;active++;peak=Math.max(active,peak);
  if(active===2)admitted.resolve();
  try{await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}
  finally{active--;}
 });
 const scans=Promise.allSettled([1,2,3,4].map(n=>discoverJava(join(f.root,'data'+n),{major:17,signal:controller.signal},deps)));
 await admitted.promise;controller.abort(Error('cancel scans'));
 assert.ok((await scans).every(result=>result.status==='rejected'&&result.reason===controller.signal.reason));
 assert.deepEqual([started,peak,active],[2,2,0]);
});

test('automatic preparation probes only the checked archive even with an existing checksum directory',{skip:process.platform!=='win32'},async t=>{
 const f=await fixture(t),{zipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
 const bytes=Buffer.from(zipSync({'jre/bin/java.exe':Buffer.from('fixture java')}));
 const checksum=createHash('sha256').update(bytes).digest('hex'),parent=join(f.library,'runtimes');
 const cache=join(parent,checksum,'jre','bin'),downloads=join(parent,'downloads');
 await mkdir(cache,{recursive:true});await writeFile(join(cache,'java.exe'),'unverified bytes');
 await mkdir(downloads,{recursive:true});await writeFile(join(downloads,checksum+'.zip'),bytes);
 let probes=0;
 const info=await installJava(f.library,17,{transferred:0},new AbortController().signal,
  async url=>{
   assert.ok(url.startsWith('https://api.adoptium.net/'));
   return Response.json([{binary:{package:{checksum,size:bytes.length,name:'test.zip',link:'https://github.com/test.zip'}}}]);
  },async(path,signal)=>{
   signal.throwIfAborted();probes++;assert.equal(await readFile(path,'utf8'),'fixture java');
   return {major:17,architecture:process.arch==='arm64'?'aarch64':'amd64',path:'ignored'};
  },{pins:{17:checksum}});
 assert.equal(probes,1);assert.equal(await readFile(info.path,'utf8'),'fixture java');
 assert.equal(await readFile(join(cache,'java.exe'),'utf8'),'unverified bytes');
 await writeFile(info.path,'changed after preparation');
 const rows=await discoverJava(f.library,{major:17,purpose:'import'},{appData:null,probe:async()=>{probes++;}});
 assert.deepEqual(rows,[]);assert.equal(probes,1);
});
