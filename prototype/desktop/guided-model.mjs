import {utilityChoices,gameplayChoices,features} from './guided-catalog.mjs';
import {g} from './guided-text.mjs';
// SPDX-License-Identifier: MPL-2.0
// Only text/IDs and deterministic rules. No hardware data is sent to a service.
export const RULE_VERSION = 'beta1.10-r1';
export const defaults = {play:'single',serverVersion:'',serverLoader:'unknown',serverLoaderVersion:'',content:['survival'],change:'light',must:[],priority:'balanced',shaders:'auto',texture:'vanilla',hud:'balanced',experience:'new',freshness:'stable',memoryGB:0,gpu:'unknown',downloadGB:0,diskGB:0,power:false,features:['food','inventory'],gameplay:[],recipePreference:'auto',lod:'off',resolution:'unknown',fps:'60',opengl46:false,excludedFeatures:[],gpuBudget:'unknown'};
export const dimensions = {play:['single','server','both'],serverLoader:['unknown','vanilla','fabric','forge','neoforge'],content:['survival','building','exploration','technology','magic','combat'],change:['vanilla','light','expanded'],priority:['performance','balanced','visual'],shaders:['off','auto','on'],texture:['vanilla','simple','faithful'],hud:['simple','balanced','rich'],experience:['new','some','expert'],freshness:['stable','recent','preview'],gpuBudget:['unknown','entry','balanced','high'],recipePreference:['auto','jei','emi','rei'],lod:['off','auto','dh','voxy'],resolution:['unknown','1080','1440','4k'],fps:['60','120'],gpu:['unknown','integrated','dedicated']};
export function answers(value={}) {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error(g('invalidAnswers'));
  const a={...defaults,...Object.fromEntries(Object.keys(defaults).filter(k=>Object.hasOwn(value,k)).map(k=>[k,value[k]]))};
  for(const [key,choices] of Object.entries(dimensions))if(key==='content'){if(!Array.isArray(a[key])||a[key].length<1||a[key].length>3||a[key].some(v=>!choices.includes(v)))throw Error(g('invalidAnswers'));}else if(!choices.includes(a[key]))throw Error(g('invalidAnswers'));
  for(const k of ['serverVersion','serverLoaderVersion'])if(typeof a[k]!=='string'||a[k].length>80||!/^[\w.+-]*$/.test(a[k]))throw Error(g('invalidAnswers'));
  for(const k of ['memoryGB','downloadGB','diskGB'])if(!Number.isFinite(a[k])||a[k]<0||a[k]>(k==='memoryGB'?1024:100000))throw Error(g('invalidAnswers'));
  if(typeof a.power!=='boolean'||!Array.isArray(a.must)||a.must.length>12||a.must.some(x=>typeof x!=='string'||!/^[-\w]{1,100}$/.test(x)))throw Error(g('invalidAnswers'));
  for(const [key,allowed] of [['features',utilityChoices],['gameplay',gameplayChoices],['excludedFeatures',Object.keys(features)]]){if(!Array.isArray(a[key])||a[key].length>allowed.length||a[key].some(x=>!allowed.includes(x)))throw Error(g('invalidAnswers'));a[key]=[...new Set(a[key])];}if(typeof a.opengl46!=='boolean')throw Error(g('invalidAnswers'));
  a.must=[...new Set(a.must)];if(a.play==='single'){a.serverVersion='';a.serverLoader='unknown';a.serverLoaderVersion='';}return a;
}
export const directory = [
  {slug:'sodium',reason:'reasonPerformance',role:'performance',clientSafe:true},
  {slug:'lithium',reason:'reasonLogic',role:'performance',clientSafe:true},
  {slug:'modmenu',reason:'reasonMenu',role:'utility',clientSafe:true},
  {slug:'emi',reason:'reasonRecipes',role:'utility',clientSafe:true},
  {slug:'litematica',reason:'reasonBuilding',role:'building',clientSafe:false},
  {slug:'terralith',reason:'reasonExploration',role:'exploration',clientSafe:false},
  {slug:'iris',reason:'reasonShaderSupport',role:'shader-support',clientSafe:true},
  {slug:'complementary-reimagined',reason:'reasonShader',role:'shader',clientSafe:true},
  {slug:'bare-bones',reason:'reasonSimpleTexture',role:'texture',clientSafe:true},
  {slug:'faithful-32x',reason:'reasonFaithfulTexture',role:'texture',clientSafe:true},
];
export function weights(a){const w={play:30,performance:25,stability:20,visual:15,ease:10};if(a.priority==='performance'){w.performance+=15;w.visual-=10;w.play-=5;}if(a.priority==='visual'){w.visual+=15;w.performance-=10;w.play-=5;}if(a.experience==='new'){w.ease+=10;w.play-=5;w.visual-=5;}return w;}
export function score(metrics,a){const w=weights(a);return Object.entries(w).reduce((n,[k,v])=>n+v*Math.max(0,Math.min(1,metrics[k]||0)),0);}
export function memoryBudget(a,detected=0){const total=a.memoryGB||detected;return !total?3:Math.max(1,Math.min(a.change==='expanded'?6:4,Math.floor(total*.5),Math.floor(total-2)));}
export function visualAllowed(a,detected=0){return a.gpu==='dedicated'&&(a.memoryGB||detected)>=8&&!a.power&&a.priority!=='performance';}
export function desired(a,kind,detected=0){
  if(kind==='vanilla'||a.change==='vanilla')return [];
  const out=['sodium','lithium'];if(a.hud!=='simple')out.push('modmenu');
  if(kind!=='light'){
    if(a.hud==='rich'||a.content.some(x=>['technology','magic'].includes(x)))out.push('emi');
    if(a.play==='single'&&a.change==='expanded'&&a.content.includes('exploration'))out.push('terralith');
    if(a.play==='single'&&a.content.includes('building')&&a.experience==='expert')out.push('litematica');
    if(a.shaders!=='off'&&visualAllowed(a,detected))out.push('iris','complementary-reimagined');
    if(a.texture==='simple')out.push('bare-bones');
    if(a.texture==='faithful'&&visualAllowed(a,detected))out.push('faithful-32x');
  }return out;
}
export function clientAllowed(project,version,multiplayer){
  const env=version.environment||project.environment;
  const es=Array.isArray(env)?env:env?[env]:[];
  if(es.some(x=>['server_only','server_only_client_optional','dedicated_server_only'].includes(x))||!es.length&&project.client_side==='unsupported')return false;
  if(['shader','resourcepack'].includes(project.project_type))return true;
  if(!multiplayer)return true;
  if(es.length)return es.some(x=>['client_only','client_only_server_optional','client_or_server','client_or_server_prefers_both'].includes(x));
  return ['unsupported','optional'].includes(project.server_side)&&['required','optional'].includes(project.client_side);
}
export function matchVersion(project,v,target,a){
  const type=project.project_type;
  return ['mod','resourcepack','shader'].includes(type)&&Array.isArray(v.game_versions)&&v.game_versions.includes(target.game)&&(type!=='mod'||v.loaders?.includes(target.loader))&&(a.freshness==='preview'||v.version_type==='release')&&clientAllowed(project,v,a.play!=='single')&&(type!=='shader'||v.loaders?.includes('iris'));
}
export function planIssues(files,target,a){
  const errors=[],warnings=[];const projects=new Map(),paths=new Set();
  for(const f of files){if(projects.has(f.projectId)&&projects.get(f.projectId).versionId!==f.versionId)errors.push('duplicateVersion');projects.set(f.projectId,f);if(paths.has(f.relative.toLowerCase()))errors.push('duplicatePath');paths.add(f.relative.toLowerCase());}
  for(const f of files)for(const [i,d] of (f.dependencies||[]).entries()){
    const match=files.some(x=>d.version_id?x.versionId===d.version_id:x.projectId===d.project_id);
    if(d.dependency_type==='incompatible'&&match)errors.push('declaredConflict');
    if(d.dependency_type==='required'&&!match){if(f.ignoredRequired?.includes(f.versionId+':'+i))warnings.push('missingDependency');else errors.push('missingDependency');}
  }
  for(const family of [['sodium','embeddium','rubidium'],['iris','oculus'],['voxy','distanthorizons']])if(files.filter(f=>family.includes(f.slug)).length>1)errors.push('duplicateRenderer');
  if(files.some(x=>x.type==='shader')&&!files.some(x=>x.slug==='iris'))errors.push('shaderSupportMissing');
  const size=files.reduce((n,x)=>n+x.size,0),reserve=4*1073741824;
  if(a.downloadGB&&size>a.downloadGB*1073741824)errors.push('downloadLimit');
  if(a.diskGB&&size*2+reserve>a.diskGB*1073741824)errors.push('diskLimit');
  return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],size,reserve:Math.ceil(size*2+reserve)};
}
