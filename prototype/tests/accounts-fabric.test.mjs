import {IS_AMBERE,EDITION} from '../desktop/edition.mjs';
// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve,sep } from 'node:path';
import { createCipheriv,createDecipheriv,randomBytes } from 'node:crypto';
import { Accounts,serverURL } from '../desktop/accounts.mjs';
import { MICROSOFT_CLIENT_ID } from '../desktop/microsoft-config.mjs';
import { fabricProfile,withFabric } from '../desktop/fabric.mjs';
import { launchArguments } from '../desktop/vanilla.mjs';
const id='0123456789abcdef0123456789abcdef';
const key=randomBytes(32),iv=randomBytes(16);
const codec={isEncryptionAvailable:()=>true,encryptString:s=>{const c=createCipheriv('aes-256-cbc',key,iv);return Buffer.concat([c.update(s),c.final()]);},decryptString:b=>{const c=createDecipheriv('aes-256-cbc',key,iv);return Buffer.concat([c.update(b),c.final()]).toString();}};
async function setup(t,options={}){const root=await mkdtemp(join(tmpdir(),'amber-accounts-'));t.after(async()=>{if(!resolve(root).startsWith(resolve(tmpdir())+sep))throw Error('unsafe cleanup');await rm(root,{recursive:true,force:true});});const a=new Accounts(root,{codec,edition:'amber',...options});await a.init();return a;}
test('built-in client supports new installs, migrates empty config, preserves overrides and resets',async t=>{
 let requested;const a=await setup(t,{edition:EDITION,fetcher:async(_url,options)=>{requested=new URLSearchParams(options.body).get('client_id');return Response.json({device_code:'private',user_code:'code',verification_uri:'https://microsoft.com/link',expires_in:900});}});
 if(IS_AMBERE){assert.equal(MICROSOFT_CLIENT_ID,'');await assert.rejects(a.startMicrosoft(),/不提供微软/);assert.equal(requested,undefined);return;}
 assert.equal(a.list().clientId,MICROSOFT_CLIENT_ID);await a.startMicrosoft();assert.equal(requested,MICROSOFT_CLIENT_ID);a.cancelMicrosoft();
 a.data.accounts.push({id:'legacy',type:'offline',name:'Player',uuid:id});a.data.clientId='';await a.save();const b=new Accounts(a.root,{codec,edition:'amber'});await b.init();assert.equal(b.list().clientId,MICROSOFT_CLIENT_ID);assert.equal(b.list().accounts[0].name,'Player');
 const custom='11111111-2222-3333-4444-555555555555';await b.configure(custom);const c=new Accounts(a.root,{codec,edition:'amber'});await c.init();assert.equal(c.list().clientId,custom);await c.configure('');assert.equal(c.list().clientId,MICROSOFT_CLIENT_ID);assert.equal(c.list().accounts.length,1);
});
test('account vault roundtrips encrypted credentials and exposes only public fields',async t=>{
 const a=await setup(t,{fetcher:async()=>Response.json({accessToken:'secret-test-token',availableProfiles:[{id,name:'Player'}]})});
 await a.addServer({server:'https://skin.example/api/',username:'email',password:'never-save-this'});
 const raw=await readFile(join(a.root,'accounts.json'),'utf8');assert.ok(!raw.includes('secret-test-token'));assert.ok(!raw.includes('never-save-this'));assert.ok(!JSON.stringify(a.list()).includes('secret-test-token'));
 const b=new Accounts(a.root,{codec,edition:'amber'});await b.init();assert.equal(b.data.accounts[0].accessToken,'secret-test-token');assert.equal(b.data.accounts[0].password,undefined);
 await b.remove(b.list().accounts[0].id);assert.equal(b.list().accounts.length,0);
});
test('offline identity, server validation, and failed auth never downgrade',async t=>{
 const a=await setup(t,{edition:'ambere',fetcher:async()=>Response.json({errorMessage:'secret reflected'}, {status:401})});await a.addOffline('Player');assert.equal((await a.identity(a.list().accounts[0].id)).type,'legacy');
 assert.throws(()=>serverURL('http://skin.example/'));assert.throws(()=>serverURL('https://user:password@skin.example/'));
 await assert.rejects(a.addServer({server:'https://skin.example/',username:'x',password:'x'}),/HTTP 401/);assert.equal(a.list().accounts.length,1);
});
test('Microsoft device polling handles slow_down, ownership, refresh and profile',async t=>{
 let now=1000,polls=0;const fetcher=async(url,options)=>{
  if(url.endsWith('devicecode'))return Response.json({device_code:'private-device',user_code:'ABCD',verification_uri:'https://www.microsoft.com/link',expires_in:900,interval:5});
  if(url.endsWith('/token')){assert.ok(options.body.includes('client_id='));if(++polls===1)return Response.json({error:'slow_down'},{status:400});return Response.json({access_token:'ms-token',refresh_token:'refresh-private'});}
  if(url.includes('user.auth.'))return Response.json({Token:'xbox'});
  if(url.includes('xsts.'))return Response.json({Token:'xsts',DisplayClaims:{xui:[{uhs:'hash',xid:'xid'}]}});
  if(url.endsWith('launcher/login'))return Response.json({access_token:'minecraft-private'});
  if(url.includes('entitlements'))return Response.json({items:[{name:'game_minecraft'}]});
  return Response.json({id,name:'Player'});
 };const a=await setup(t,{fetcher,now:()=>now});await a.configure('11111111-2222-3333-4444-555555555555');await a.startMicrosoft();assert.ok(!JSON.stringify(a.list()).includes('private-device'));await a.pollMicrosoft();assert.equal(a.device.interval,10000);await a.pollMicrosoft();assert.equal(polls,1);now+=10001;await a.pollMicrosoft();assert.equal(a.list().device.state,'done');const identity=await a.identity(a.list().accounts[0].id);assert.equal(identity.type,'msa');assert.equal(identity.accessToken,'minecraft-private');assert.ok(!JSON.stringify(a.list()).includes('refresh-private'));
});
test('device cancellation and expiry do not create accounts',async t=>{let now=0;const a=await setup(t,{now:()=>now,fetcher:async()=>Response.json({device_code:'private',user_code:'code',verification_uri:'https://microsoft.com/link',expires_in:1})});await a.configure('11111111-2222-3333-4444-555555555555');await a.startMicrosoft();now=2000;await a.pollMicrosoft();assert.equal(a.list().device.state,'expired');a.cancelMicrosoft();assert.equal(a.list().device,null);assert.equal(a.list().accounts.length,0);});
test('third-party refresh binds the selected profile and rejects identity substitution',async t=>{let substitute=false;const a=await setup(t,{edition:'ambere',fetcher:async(url,options)=>{assert.equal(options.redirect,'error');if(url.endsWith('authenticate'))return Response.json({accessToken:'initial',availableProfiles:[{id,name:'One'},{id:'a'.repeat(32),name:'Two'}]});assert.equal(JSON.parse(options.body).selectedProfile.id,'a'.repeat(32));return Response.json({accessToken:'renewed',selectedProfile:{id:substitute?id:'a'.repeat(32),name:'Two'}});}});await a.addServer({server:'https://skin.example/api/',username:'u',password:'p'});const account=a.list().accounts[0];await a.selectProfile(account.id,'a'.repeat(32));assert.equal((await a.identity(account.id)).accessToken,'renewed');substitute=true;await assert.rejects(a.identity(account.id),/不同角色/);});
test('missing ownership blocks Microsoft login',async t=>{const a=await setup(t,{fetcher:async url=>Response.json(url.includes('user.auth')?{Token:'x'}:url.includes('xsts')?{Token:'s',DisplayClaims:{xui:[{uhs:'h'}]}}:url.includes('launcher/login')?{access_token:'mc'}:{items:[]})});await assert.rejects(a.microsoftIdentity('ms'),/所有权/);assert.equal(a.list().accounts.length,0);});
test('Fabric resolves missing Maven hashes and overlays the official client without changing assets',async()=>{
 const fetcher=async url=>url.endsWith('/profile/json')?Response.json({inheritsFrom:'1.21.1',mainClass:'net.fabricmc.loader.impl.launch.knot.KnotClient',libraries:[{name:'net.fabricmc:fabric-loader:0.16.0',url:'https://maven.fabricmc.net/'}],arguments:{jvm:[],game:[]}}):url.endsWith('.sha1')?new Response('a'.repeat(40)):Response.json([{loader:{version:'0.16.0',stable:true}}]);
 const p=await fabricProfile('1.21.1','0.16.0',fetcher);assert.equal(p.libraries[0].sha1,'a'.repeat(40));const base={id:'1.21.1',downloads:{client:{url:'client'}},assetIndex:{id:'17'},libraries:[],arguments:{jvm:['-cp','${classpath}'],game:['--username','${auth_player_name}','--accessToken','${auth_access_token}']}};const m=withFabric(base,p);assert.equal(m.id,base.id);assert.equal(m.downloads,base.downloads);assert.equal(m.libraries.length,1);
 const args=launchArguments(m,{classpath:['a.jar']},{dir:'C:/instance',root:'C:/root',natives:'C:/native',identity:{name:'Player',uuid:id,accessToken:'token',type:'msa'},extraJvm:['-javaagent:C:/with space/a.jar=https://skin.example/']});assert.ok(args.includes('token'));assert.ok(args.includes('-javaagent:C:/with space/a.jar=https://skin.example/'));assert.ok(args.includes(p.mainClass));await assert.rejects(fabricProfile('1.21.1','unknown',fetcher));
});
