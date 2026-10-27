// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Accounts} from '../desktop/accounts.mjs';
import {OFFLINE_LEASE_MS} from '../desktop/edition.mjs';
import {requireLaunchGrant} from '../desktop/launch-authorization.mjs';
import {VanillaLauncher} from '../desktop/launcher.mjs';
import {releaseCandidate} from '../desktop/app-updates.mjs';
import {explainProblem} from '../desktop/problems.mjs';
const uuid='1'.repeat(32),serverUuid='2'.repeat(32);
const codec={isEncryptionAvailable:()=>true,encryptString:s=>Buffer.from(s).map(b=>b^55),decryptString:b=>Buffer.from(b).map(b=>b^55).toString()};
async function fixture(t,edition='amber'){
 const root=await mkdtemp(join(tmpdir(),'amber-beta18-'));t.after(()=>rm(root,{recursive:true,force:true}));
 const state={now:100000,requests:[],owns:true,profile:uuid,network:false,denied:false};
 const fetcher=async(url,opts)=>{state.requests.push(url);if(state.network)throw Error('offline');if(state.denied)return Response.json({error:'invalid_grant'},{status:400});if(url.endsWith('devicecode'))return Response.json({device_code:'test-device-secret',user_code:'ABCD',verification_uri:'https://microsoft.com/link',expires_in:900});if(url.endsWith('/token'))return Response.json({access_token:'ms-token',refresh_token:'refresh'});if(url.includes('user.auth'))return Response.json({Token:'xbox'});if(url.includes('xsts'))return Response.json({Token:'xsts',DisplayClaims:{xui:[{uhs:'hash'}]}});if(url.endsWith('launcher/login'))return Response.json({access_token:'mc-token'});if(url.includes('entitlements'))return Response.json({items:state.owns?[{name:'game_minecraft'}]:[]});if(url.includes('minecraft/profile'))return Response.json({id:state.profile,name:'Owner'});return Response.json({accessToken:'skin-token',availableProfiles:[{id:serverUuid,name:'SkinUser'}],selectedProfile:{id:serverUuid,name:'SkinUser'}});};
 const a=new Accounts(root,{codec,fetcher,edition,now:()=>state.now});await a.init();if(edition==='amber'&&!a.data.clientId)a.data.clientId='11111111-2222-3333-4444-555555555555';
 return {a,state,root,fetcher,login:async()=>{await a.startMicrosoft();await a.pollMicrosoft();assert.equal(a.device.state,'done');return a.data.accounts.find(x=>x.type==='microsoft');}};
}
test('main edition blocks anonymous, legacy offline and unlinked server launch; core rejects forged identities',async t=>{
 const {a,root}=await fixture(t);await assert.rejects(a.authorizeLaunch('', 'Player'),/正版资格/);await assert.rejects(a.addOffline('Player'),/正版资格/);
 a.data.accounts.push({id:'old',type:'offline',name:'Old',uuid});await assert.rejects(a.authorizeLaunch('old'),/正版资格/);
 await a.addServer({server:'https://skin.example/api/',username:'u',password:'p'});await assert.rejects(a.authorizeLaunch(a.data.accounts.at(-1).id),/尚未关联/);
 const core=new VanillaLauncher(root);await assert.rejects(core.launch('nonexistent',{identity:{uuid,name:'Owner',accessToken:'fake'}}),/启动授权/);await assert.rejects(core.launch('nonexistent'),/启动授权/);
});
test('verified offline identity retains official UUID, survives restart, expires and rejects clock rollback',async t=>{
 const {a,state,root,fetcher,login}=await fixture(t);const owner=await login();await a.addOffline('Ignored');const offline=a.data.accounts.find(x=>x.type==='offline');assert.equal(offline.uuid,owner.uuid);assert.equal(offline.name,owner.name);
 state.network=true;const before=state.requests.length;const grant=await a.authorizeLaunch(offline.id);requireLaunchGrant(grant,true);assert.equal(state.requests.length,before);assert.throws(()=>requireLaunchGrant(grant),/启动授权/);
 const restored=new Accounts(root,{codec,fetcher,edition:'amber',now:()=>state.now});await restored.init();requireLaunchGrant(await restored.authorizeLaunch(offline.id));
 state.now+=OFFLINE_LEASE_MS;await assert.rejects(restored.authorizeLaunch(offline.id),/正版资格/);state.now=1;await assert.rejects(restored.authorizeLaunch(offline.id),/正版资格/);
});
test('server identity is separately authenticated after current official ownership and cannot fall back',async t=>{
 const {a,state,login}=await fixture(t);await login();await a.addServer({server:'https://skin.example/api/',username:'u',password:'p'});const server=a.data.accounts.at(-1);state.requests=[];const grant=await a.authorizeLaunch(server.id);assert.equal(grant.uuid,serverUuid);assert.ok(state.requests.findIndex(x=>x.includes('entitlements'))<state.requests.findIndex(x=>x.includes('authserver/refresh')));requireLaunchGrant(grant);
 state.owns=false;await assert.rejects(a.authorizeLaunch(server.id),/所有权/);assert.throws(()=>requireLaunchGrant(grant),/正版资格|已改变/);assert.equal(a.list().accounts.find(x=>x.type==='microsoft').ownership.state,'unverified');
});
test('network errors never turn a Microsoft launch into offline play; revoked grants clear cached eligibility',async t=>{
 const {a,state,login}=await fixture(t);const owner=await login();await a.addOffline();const offline=a.data.accounts.at(-1);state.network=true;await assert.rejects(a.authorizeLaunch(owner.id),/连接失败/);assert.equal(a.ownershipStatus(owner).state,'verified');state.network=false;state.denied=true;await assert.rejects(a.authorizeLaunch(owner.id),/HTTP 400/);await assert.rejects(a.authorizeLaunch(offline.id),/正版资格/);
});
test('profile substitution and account removal invalidate authorization; grants cannot be copied or reused',async t=>{
 const {a,state,login}=await fixture(t);const owner=await login();let grant=await a.authorizeLaunch(owner.id);assert.throws(()=>requireLaunchGrant({...grant}),/启动授权/);state.profile='f'.repeat(32);await assert.rejects(a.authorizeLaunch(owner.id),/身份不一致/);assert.throws(()=>requireLaunchGrant(grant),/正版资格/);state.profile=uuid;await a.verifyOwnership(owner.id);grant=await a.authorizeLaunch(owner.id);await a.remove(owner.id);assert.throws(()=>requireLaunchGrant(grant),/账号已移除/);
});
test('AmberE allows offline and third-party identities but no Microsoft method can contact the network',async t=>{
 const {a,state}=await fixture(t,'ambere');await a.addOffline('Player');requireLaunchGrant(await a.authorizeLaunch(a.data.accounts[0].id));requireLaunchGrant(await a.authorizeLaunch('','Player'));assert.equal(state.requests.length,0);
 await assert.rejects(a.startMicrosoft(),/不提供微软/);await assert.rejects(a.configure(''),/不提供微软/);await assert.rejects(a.microsoftIdentity('token'),/不提供微软/);await assert.rejects(a.verifyOwnership('id'),/不提供微软/);await a.pollMicrosoft();assert.equal(state.requests.length,0);assert.equal(a.list().clientId,'');assert.equal(a.list().defaultClientId,'');
 await a.addServer({server:'https://skin.example/api/',username:'u',password:'secret'});requireLaunchGrant(await a.authorizeLaunch(a.data.accounts.at(-1).id));assert.ok(state.requests.every(x=>x.startsWith('https://skin.example/')));
 a.data.accounts.push({id:'imported-ms',type:'microsoft',uuid,name:'Owner',refreshToken:'secret'});assert.ok(!a.list().accounts.some(x=>x.id==='imported-ms'));await assert.rejects(a.authorizeLaunch('imported-ms'),/不提供微软/);
});
test('independent update channels reject cross-repository and wrong-product assets',()=>{
 const version='1.0.0-beta.10',tag='v'+version;
 const asset=(name,repo)=>({name,state:'uploaded',size:123,digest:'sha256:'+'a'.repeat(64),browser_download_url:`https://github.com/ayr1k/${repo}/releases/download/${tag}/${name}`});
 const main={tag_name:tag,assets:[asset(`AMBER-${version}-Setup-x64.exe`,'amber-launcher')]},offline={tag_name:tag,assets:[asset(`AmberE-${version}-Setup-x64.exe`,'AmberE')]};
 assert.match(releaseCandidate([main],'1.0.0-beta.9','AMBER').page,/ayr1k\/amber-launcher/);assert.match(releaseCandidate([offline],'1.0.0-beta.9','AmberE').page,/ayr1k\/AmberE/);
 assert.equal(releaseCandidate([offline],'1.0.0-beta.9','AMBER'),null);assert.equal(releaseCandidate([main],'1.0.0-beta.9','AmberE'),null);
 offline.assets[0]=asset(`AmberE-${version}-Setup-x64.exe`,'amber-launcher');assert.equal(releaseCandidate([offline],'1.0.0-beta.9','AmberE'),null);
});

test('authentication failures point to account recovery rather than a content-download error',()=>{for(const text of ['Minecraft 所有权检查失败（HTTP 403）','微软令牌交换连接失败','第三方账号尚未关联正版资格'])assert.equal(explainProblem(text).action,'accounts');});

test('re-authenticating the same official profile preserves account links and repairs a renamed offline identity',async t=>{
 const {a,login}=await fixture(t);const owner=await login();await a.addOffline();const offline=a.data.accounts.find(x=>x.type==='offline');const offlineId=offline.id;
 await login();assert.equal(a.data.licenseAccountId,owner.id);assert.equal(a.data.accounts.filter(x=>x.type==='microsoft').length,1);requireLaunchGrant(await a.authorizeLaunch(offlineId));
 owner.name='RenamedOwner';await assert.rejects(a.authorizeLaunch(offlineId),/身份不一致/);await a.addOffline();assert.equal(offline.name,'RenamedOwner');assert.equal(offline.id,offlineId);assert.equal(a.data.accounts.filter(x=>x.type==='offline').length,1);requireLaunchGrant(await a.authorizeLaunch(offlineId));
});

test('linking requires online ownership; removal and delayed launches invalidate grants',async t=>{
 const {a,state,login}=await fixture(t);await a.addServer({server:'https://skin.example/api/',username:'u',password:'p'});const server=a.data.accounts[0],owner=await login();
 state.owns=false;await assert.rejects(a.linkOwnership(server.id,owner.id),/所有权/);assert.equal(server.ownerId,'');state.owns=true;await a.linkOwnership(server.id,owner.id);const grant=await a.authorizeLaunch(server.id);state.now+=15*60*1000;assert.throws(()=>requireLaunchGrant(grant),/启动授权/);await a.remove(owner.id);await assert.rejects(a.authorizeLaunch(server.id),/尚未关联/);
});

test('AmberE branding preserves user-supplied account names and paths inside translated messages',async t=>{
 const {root}=await fixture(t,'ambere');await mkdir(join(root,'locales'));await copyFile(new URL('../desktop/localization.mjs',import.meta.url),join(root,'localization.mjs'));await copyFile(new URL('../desktop/locales/catalog.json',import.meta.url),join(root,'locales/catalog.json'));await writeFile(join(root,'edition.mjs'),'export const IS_AMBERE=true;');
 const locale=await import(pathToFileURL(join(root,'localization.mjs')).href);locale.setLocale('zh-CN');assert.equal(locale.t('迁移数据并重启 AMBER'),'迁移数据并重启 AmberE');assert.equal(locale.t('第三方 · {0}',['https://example.com/AMBER/']),'第三方 · https://example.com/AMBER/');assert.ok(locale.t('将为 {0} 创建离线身份，沿用同一角色 UUID。',['AMBER']).includes('为 AMBER 创建'));
});
