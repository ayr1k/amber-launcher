// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createHash} from 'node:crypto';
import {completeClientLibraries} from '../desktop/loaders.mjs';
import {configureLiteOverlay} from '../desktop/legacy-combinations.mjs';
import {digest} from '../desktop/download.mjs';
import {liteVersions,liteProfile} from '../desktop/liteloader.mjs';
import {createRequire} from 'node:module';
const {zipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
import {InstanceManagement} from '../desktop/instance-management.mjs';
import {Workflows,Settings,validateSettings} from '../desktop/workflows.mjs';
import {mergeLite} from '../desktop/legacy-combinations.mjs';
import {canCombine,instanceLoaders} from '../desktop/compatibility.mjs';
import {validateLayout,defaultLayout} from '../desktop/layout-schema.mjs';
import {defaultInstanceName} from '../desktop/appearance.mjs';

async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),'amber-lifecycle-')),id=randomUUID(),dir=join(root,'instances',id);
 t.after(()=>rm(root,{recursive:true,force:true}));await mkdir(join(dir,'saves','World'),{recursive:true});
 await writeFile(join(dir,'instance.json'),JSON.stringify({id,name:'Original',game:'1.12.2',loader:'forge'}));
 await writeFile(join(dir,'saves','World','level.dat'),'irreplaceable world');
 const core={root,jobs:[],running:false,metadata:async key=>{assert.equal(key,id);return {dir,item:JSON.parse(await readFile(join(dir,'instance.json'),'utf8'))};},requireStopped:async()=>{core.workflowGuard?.();if(core.running)throw Error('游戏正在运行');}};
 const workflows=new Workflows(core,{});return {root,id,dir,core,workflows,manager:new InstanceManagement(core,workflows)};
}
test('rename, recycle and restore preserve instance identity and world bytes',async t=>{
 const {manager,id,dir}=await fixture(t);assert.equal((await manager.rename(id,' New name ')).name,'New name');
 await manager.setIcon(id,'pickaxe');await assert.rejects(manager.setIcon(id,'../../file'),/图标/);
 await manager.remove(id);await assert.rejects(readFile(join(dir,'instance.json')),/ENOENT/);
 const trash=await manager.list();assert.equal(trash.length,1);assert.equal(trash[0].name,'New name');
 assert.equal((await manager.restore(id)).id,id);assert.equal((await manager.list()).length,0);
 assert.equal(JSON.parse(await readFile(join(dir,'instance.json'),'utf8')).icon,'pickaxe');
 assert.equal(await readFile(join(dir,'saves','World','level.dat'),'utf8'),'irreplaceable world');
});
test('instance mutations reject running games, tasks and invalid names',async t=>{
 const {manager,id,core,dir}=await fixture(t);await assert.rejects(manager.rename(id,' '));await assert.rejects(manager.rename(id,'a'.repeat(61)));
 core.running=true;await assert.rejects(manager.remove(id),/运行/);await assert.rejects(manager.rename(id,'X'),/运行/);
 core.running=false;core.jobs.push({state:'running'});await assert.rejects(manager.remove(id),/等待/);
 assert.equal(JSON.parse(await readFile(join(dir,'instance.json'),'utf8')).name,'Original');
});
test('restore rejects traversal and refuses to overwrite an existing instance',async t=>{
 const {manager,id,dir}=await fixture(t);await assert.rejects(manager.restore('../instances'));
 await manager.remove(id);await mkdir(dir);await writeFile(join(dir,'keep.txt'),'keep');
 await assert.rejects(manager.restore(id),/覆盖/);assert.equal(await readFile(join(dir,'keep.txt'),'utf8'),'keep');assert.equal((await manager.list()).length,1);
});
test('layout upgrades old settings, persists order, strips arbitrary code and rejects broken layouts',async t=>{
 const {root}=await fixture(t),settings=new Settings(root);
 await writeFile(join(root,'preferences.json'),JSON.stringify({theme:'dark'}));assert.deepEqual((await settings.get()).layout,defaultLayout);
 const layout=validateLayout({...defaultLayout,navigation:'right',homeSections:['launch','details','activity','shortcuts'],hiddenSections:['activity'],html:'<script/>'});
 assert.equal(layout.html,undefined);await settings.save({...await settings.get(),layout});assert.deepEqual((await settings.get()).layout,layout);
 for(const bad of [{homeSections:['launch','launch','activity','details']},{hiddenSections:['launch']},{navigation:'floating'},{sidebarWidth:999}])assert.throws(()=>validateSettings({layout:bad}));
 assert.deepEqual((await settings.get()).layout,layout);
});
test('UI style upgrades old preferences and persists only supported choices',async t=>{
 const {root}=await fixture(t),settings=new Settings(root);
 await writeFile(join(root,'preferences.json'),JSON.stringify({theme:'dark'}));assert.equal((await settings.get()).uiStyle,'square');
 await settings.save({...await settings.get(),uiStyle:'rounded'});assert.equal((await new Settings(root).get()).uiStyle,'rounded');
 await assert.rejects(settings.save({...await settings.get(),uiStyle:'custom-script'}));assert.equal((await settings.get()).uiStyle,'rounded');
 assert.equal(defaultInstanceName('1.21.4',['fabric']),'1.21.4-fabric');
 assert.equal(defaultInstanceName('1.12.2',['optifine','liteloader','forge']),'1.12.2-forge+liteloader+optifine');
});
test('legacy compatibility permits only relevant combinations and exposes both loaders to content filtering',()=>{
 assert.equal(canCombine('1.12.2',['forge','optifine'],'liteloader'),true);
 assert.equal(canCombine('1.8.9',['optifine'],'liteloader'),true);
 for(const [game,chosen,next] of [['1.21.1',['forge'],'liteloader'],['1.12.2',['fabric'],'forge'],['1.21.1',['neoforge'],'optifine'],['1.12.2',['forge'],'neoforge']])assert.equal(canCombine(game,chosen,next),false);
 assert.deepEqual(instanceLoaders({loader:'forge',liteVersion:'snapshot'}),['forge','liteloader']);
});
test('Lite overlay keeps Forge launch arguments and installer files while resolving duplicate libraries',()=>{
 const base={mainClass:'net.minecraft.launchwrapper.Launch',minecraftArguments:'--username ${auth_player_name} --tweakClass net.minecraftforge.fml.common.launcher.FMLTweaker',libraries:[{name:'net.minecraft:launchwrapper:1.11'},{name:'net.minecraftforge:forge:1.12.2'}],amberExtra:[{path:'generated.jar'}]};
 const lite={arguments:{game:['--tweakClass','com.mumfrey.liteloader.launch.LiteLoaderTweaker']},libraries:[{name:'net.minecraft:launchwrapper:1.12'},{name:'com.mumfrey:liteloader:1.12.2:release'}]};
 const merged=mergeLite(base,lite);assert.match(merged.minecraftArguments,/FMLTweaker.*LiteLoaderTweaker/);assert.equal(merged.libraries.length,3);assert.equal(merged.libraries[0].name,'net.minecraft:launchwrapper:1.12');assert.deepEqual(merged.amberExtra,base.amberExtra);assert.equal(base.libraries.length,2);
 const modern=mergeLite({...base,minecraftArguments:undefined,arguments:{jvm:['-Xmx3G'],game:['--demo']}},lite);assert.deepEqual(modern.arguments.jvm,['-Xmx3G']);assert.equal(modern.arguments.game[0],'--demo');assert.throws(()=>mergeLite({...base,mainClass:'cpw.mods.modlauncher.Launcher'},lite),/LaunchWrapper/);
});
test('combined OptiFine uses the companion tweaker without changing the standalone base',()=>{
 const base={mainClass:'net.minecraft.launchwrapper.Launch',libraries:[],minecraftArguments:'--version ${version_name} --tweakClass optifine.OptiFineTweaker'};
 const merged=mergeLite(base,{libraries:[],arguments:{game:['--tweakClass','com.mumfrey.liteloader.launch.LiteLoaderTweaker']}});
 assert.match(merged.minecraftArguments,/optifine.OptiFineForgeTweaker/);assert.match(base.minecraftArguments,/optifine.OptiFineTweaker/);
});
test('removing Lite overlay restores the verified base and rejects a changed backup',async t=>{
 const {core,id,dir}=await fixture(t),base={mainClass:'net.minecraft.launchwrapper.Launch',libraries:[],minecraftArguments:'original'};
 await writeFile(join(dir,'loader-base.json'),JSON.stringify(base));await writeFile(join(dir,'loader.json'),'{}');
 const item={...(await core.metadata(id)).item,liteVersion:'snapshot',liteBaseSha1:await digest(join(dir,'loader-base.json')),loaderSha1:await digest(join(dir,'loader.json'))};
 await writeFile(join(dir,'instance.json'),JSON.stringify(item));core.startJob=async(id,type,fn)=>fn({},new AbortController().signal);
 await writeFile(join(dir,'loader-base.json'),'changed');await assert.rejects(configureLiteOverlay(core,id,null),/校验/);
 await writeFile(join(dir,'loader-base.json'),JSON.stringify(base));await configureLiteOverlay(core,id,null);
 const restored=(await core.metadata(id)).item;assert.equal(restored.liteVersion,undefined);assert.equal(restored.status,'metadata-ready');assert.deepEqual(JSON.parse(await readFile(join(dir,'loader.json'),'utf8')),base);
});
test('legacy client libraries exclude server-only files and verify missing downloads',async t=>{
 const {root,core}=await fixture(t),bytes=Buffer.from('legacy client'),hash=createHash('sha1').update(bytes).digest('hex'),requests=[];
 core.fetcher=async url=>{requests.push(url);return new Response(url.endsWith('.sha1')?hash:bytes);};
 const profile={libraries:[{name:'net.minecraft:launchwrapper:1.12'},{name:'jline:jline:2.13',clientreq:false}]};
 await completeClientLibraries(core,root,profile,new AbortController().signal);assert.equal(profile.libraries.length,1);assert.equal(requests.length,2);
 assert.deepEqual(await readFile(join(root,'libraries/net/minecraft/launchwrapper/1.12/launchwrapper-1.12.jar')),bytes);
 await completeClientLibraries(core,root,profile,new AbortController().signal);assert.equal(requests.length,2);
});
test('Ivy LiteLoader uses stable version identity and verifies the embedded official release before caching',async t=>{
 const {root}=await fixture(t),bytes=Buffer.from('official fixture release'),md5=createHash('md5').update(bytes).digest('hex');
 const release={version:'1.7.10_04',stream:'RELEASE',md5,tweakClass:'com.mumfrey.liteloader.launch.LiteLoaderTweaker',libraries:[]};
 const metadata={versions:{'1.7.10':{repo:{type:'ivy'},artefacts:{'com.mumfrey:liteloader':{latest:release}}}}};
 const fetcher=async url=>url.endsWith('versions.json')?Response.json(metadata):new Response(zipSync({'liteloader-1.7.10.jar':bytes}));
 assert.deepEqual(await liteVersions('1.7.10',fetcher),[{version:'1.7.10_04',stable:true}]);
 const p=await liteProfile('1.7.10','1.7.10_04',fetcher,new AbortController().signal,root),artifact=p.libraries[0].downloads.artifact;
 assert.equal(artifact.url,'amber-cache:'+createHash('sha1').update(bytes).digest('hex'));
 assert.deepEqual(await readFile(join(root,'loader-cache',artifact.sha1)),bytes);
 release.md5='0'.repeat(32);await assert.rejects(liteProfile('1.7.10','1.7.10_04',fetcher,new AbortController().signal,root),/校验/);
});
