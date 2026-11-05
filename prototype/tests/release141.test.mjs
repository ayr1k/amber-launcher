// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {CurseForge141} from '../desktop/curseforge141.mjs';
import {curseHeaders141} from '../desktop/curseforge-key141.mjs';
import {convertCursePack141} from '../desktop/curseforge-pack141.mjs';
import {parsePack} from '../desktop/modpacks.mjs';
import {parsePlayerBridge141} from '../desktop/players141.mjs';
import {playerCommand140} from '../desktop/server-management140.mjs';
const {zipSync}=createRequire(import.meta.url)('../desktop/vendor/fflate.cjs');
test('CF keeps provider IDs, exact hashes and required/optional/conflict relations',()=>{const cf=new CurseForge141({});const v=cf.normalize({modId:12,id:34,gameVersions:['1.21.1','Fabric'],hashes:[{algo:1,value:'A'.repeat(40)}],dependencies:[{modId:20,relationType:3},{modId:21,relationType:2},{modId:22,relationType:5}]});assert.equal(v.id,'cf-12-34');assert.equal(v.files[0].url,null);assert.equal(v.files[0].hashes.sha1,'a'.repeat(40));assert.deepEqual(v.dependencies.map(d=>d.dependency_type),['required','optional','incompatible']);});
test('CF key is sent only to API and authorized download hosts',async()=>{process.env.AMBER_CURSEFORGE_API_KEY='test-key';try{assert.equal((await curseHeaders141('https://api.curseforge.com/v1/games/432'))['x-api-key'],'test-key');assert.equal((await curseHeaders141('https://edge.forgecdn.net/a'))['x-api-key'],'test-key');for(const host of ['api.modrinth.com','media.forgecdn.net','evil.example'])assert.deepEqual(await curseHeaders141('https://'+host+'/'),{});}finally{delete process.env.AMBER_CURSEFORGE_API_KEY;}});
const manifest={manifestType:'minecraftModpack',manifestVersion:1,name:'Fixture',minecraft:{version:'1.21.1',modLoaders:[{id:'fabric-0.16.0'}]},files:[{projectID:1,fileID:2,required:false}],overrides:'overrides'};
const provider={version:async()=>({files:[{filename:'test.jar',url:'https://edge.forgecdn.net/test.jar',size:10,hashes:{sha1:'a'.repeat(40)}}]}),project:async()=>({title:'Test',project_type:'mod'})};
test('CF pack resolves exact files and preserves optional content and configuration',async()=>{const b=zipSync({'manifest.json':Buffer.from(JSON.stringify(manifest)),'overrides/config/a.json':Buffer.from('{}')});const converted=await convertCursePack141(b,provider);const p=parsePack(converted,'pack-check',{includeOptional:true});assert.equal(p.index.dependencies['fabric-loader'],'0.16.0');assert.equal(p.files[0].optional,true);assert.equal(p.files[1].relative,'config/a.json');});
test('CF pack rejects traversal and author-restricted files before installation',async()=>{await assert.rejects(convertCursePack141(zipSync({'../manifest.json':Buffer.from('{}')}),provider));const b=zipSync({'manifest.json':Buffer.from(JSON.stringify(manifest))});await assert.rejects(convertCursePack141(b,{...provider,version:async()=>({files:[{url:null}]})}),/Author-restricted/);});
test('bridge preserves measured ping and rejects malformed payloads',()=>{const rows=[{name:'Test',uuid:'12345678-1234-1234-1234-123456789abc',ping:42}];assert.equal(parsePlayerBridge141('AMBER_PLAYERS141 '+Buffer.from(JSON.stringify(rows)).toString('base64'))[0].ping,42);assert.equal(parsePlayerBridge141('AMBER_PLAYERS141 aaaa'),null);assert.equal(parsePlayerBridge141('There are 0 players'),null);});
test('manual whitelist accepts absent player name and rejects console injection',()=>{assert.equal(playerCommand140('whitelist','New_Player'),'whitelist add New_Player');assert.throws(()=>playerCommand140('whitelist','test\nop admin'));});

test('preload category bridge forwards both providers without synchronous render errors',async()=>{
 const {readFile}=await import('node:fs/promises');const {runInNewContext}=await import('node:vm');let api;const calls=[];
 runInNewContext(await readFile(new URL('../desktop/preload.cjs',import.meta.url),'utf8'),{require:()=>({contextBridge:{exposeInMainWorld:(_name,value)=>{api=value;}},ipcRenderer:{invoke:(...args)=>{calls.push(args);return Promise.resolve([]);}}})});
 for(const provider of [undefined,'modrinth','curseforge']){assert.deepEqual(await api.contentCategories(provider),[]);assert.equal(calls.at(-1)[0],'amber:content-categories');assert.equal(calls.at(-1)[1],provider);}
});
