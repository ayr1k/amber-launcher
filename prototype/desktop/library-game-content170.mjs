// SPDX-License-Identifier: MPL-2.0
import {packPath} from './modpacks.mjs';
const folders=new Set(['mods','config','resourcepacks','shaderpacks','saves','defaultconfigs','kubejs','scripts','screenshots']);
const privateNames=/^(?:\.?amber(?:e)?-session(?:\..*)?|launcher[_-].*|(?:accounts?|tokens?|sessions?|credentials?|authentication|auth|launcher_profiles|launcher_settings|hmcl_accounts|hmcl|pcl|preferences|storage|instance|content|modpack|installation|launch-preferences|last-run)\.(?:json|json5|cfg|ini|dat|properties)(?:\..*|~)?)$/i;
export function safeGameName170(name){return typeof name==='string'&&name.length<=1000&&!/[\x00-\x1f]/.test(name)&&!name.includes('\\')&&!name.split('/').some(p=>!p||p==='.'||p==='..'||p.includes(':')||privateNames.test(p));}
// Existing external roots may contain launcher/account files. Never enumerate
// their bytes merely because the general incoming-pack format accepts JSON.
export function retainedGame170(name,isDir){return safeGameName170(name)&&(folders.has(name.split('/')[0])||!isDir&&/^(?:options[^/]*\.txt|servers\.dat(?:_old)?)$/.test(name));}
// An explicit incoming pack can legitimately declare additional root game files.
// Keep that contract separate from the conservative external-retention policy.
export function incomingGame170(name,isDir=false){if(!safeGameName170(name))return false;if(isDir)return folders.has(name.split('/')[0]);if(name.startsWith('screenshots/'))return true;try{return !!packPath('external-pack',name);}catch{return false;}}
const text=(v,max)=>typeof v==='string'&&v.length<=max&&!/[\x00-\x1f]/.test(v)?v:undefined;
export function sanitizePackBaseline170(value){
 if(value==null)return null;if(typeof value!=='object'||Array.isArray(value)||!Array.isArray(value.files)||value.files.length>200000)throw Error('Invalid pack management state');
 const files=[],seen=new Set();for(const f of value.files){if(!f||!incomingGame170(f.relative))continue;const key=f.relative.toLowerCase();if(seen.has(key)||!/^[a-f0-9]{40}$/.test(f.hash)||!Number.isSafeInteger(f.size)||f.size<0)throw Error('Invalid pack management file identity');seen.add(key);files.push({relative:f.relative,hash:f.hash,size:f.size});}
 const result={schema:1,files},title=text(value.title,200);if(title!==undefined)result.title=title;
 if(typeof value.versionId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value.versionId))result.versionId=value.versionId;
 if(value.localReport){const packVersion=text(value.localReport.packVersion,100);if(packVersion!==undefined){result.localReport={schema:1,source:'local',kind:'mrpack',title:text(value.localReport.title,200)||title||'',packVersion,files:files.map(({relative,size})=>({relative,size}))};if(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(value.localReport.sourceHash))result.localReport.sourceHash=value.localReport.sourceHash;if(typeof value.localReport.importedAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(value.localReport.importedAt)&&Number.isFinite(Date.parse(value.localReport.importedAt)))result.localReport.importedAt=new Date(value.localReport.importedAt).toISOString();}}
 return result;
}
export function managementState170(pack){return {schema:1,pack:sanitizePackBaseline170(pack)};}
export function readManagementState170(value){if(value==null)return {schema:1,pack:null};if(value.schema!==1||typeof value!=='object'||Array.isArray(value))throw Error('Unsupported backup management state');return managementState170(value.pack);}
