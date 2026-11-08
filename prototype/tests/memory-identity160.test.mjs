// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {memoryTargets160,trimWorkingSets160} from '../desktop/memory160.mjs';
test('only trusted main identity in conservative; aggressive snapshots metrics identities and fails conflicting duplicates closed',()=>{
 const metrics=[{pid:10,creationTime:999},{pid:20,creationTime:2000.123},{pid:30,creationTime:3000},{pid:30,creationTime:4000},{pid:NaN,creationTime:1}];
 assert.deepEqual(memoryTargets160('conservative',10,1000,metrics),[{pid:10,creationTime:1000}]);
 assert.deepEqual(memoryTargets160('aggressive',10,1000,metrics),[{pid:10,creationTime:1000},{pid:20,creationTime:2000.123},{pid:30,creationTime:null}]);
});
test('unknown creation time never opens a native process',async()=>{assert.deepEqual(await trimWorkingSets160([{pid:10,creationTime:null}],{execute:()=>assert.fail('must not execute')}),[{pid:10,ok:false,error:0,status:'identity-unavailable'}]);});
test('native wrapper preserves partial success and distinct identity, permission and exit results',async()=>{
 const targets=[10,20,30,40,50].map(pid=>({pid,creationTime:pid===50?null:1000.123}));
 const rows=[{pid:10,ok:true,error:0,status:'trimmed'},{pid:20,ok:false,error:0,status:'identity-mismatch'},{pid:30,ok:false,error:5,status:'access-denied'},{pid:40,ok:false,error:0,status:'exited'}];
 const result=await trimWorkingSets160(targets,{execute:async(_file,args)=>{const source=Buffer.from(args.at(-1),'base64').toString('utf16le');assert.match(source,/GetProcessTimes/);assert.match(source,/0x101100/);assert.match(source,/1000\.123/);assert.doesNotMatch(source,/::Trim\(50,/);return {stdout:JSON.stringify(rows)};}});
 assert.deepEqual(result.slice(0,4),rows);assert.equal(result[4].status,'identity-unavailable');
});
test('native wrapper rejects duplicated, unrelated or inconsistent returned identities',async()=>{
 const targets=[{pid:10,creationTime:1000},{pid:20,creationTime:1000}];
 for(const rows of [[{pid:10,ok:true,error:0,status:'trimmed'},{pid:10,ok:true,error:0,status:'trimmed'}],[{pid:10,ok:true,error:0,status:'trimmed'},{pid:30,ok:true,error:0,status:'trimmed'}],[{pid:10,ok:true,error:0,status:'identity-mismatch'},{pid:20,ok:false,error:5,status:'access-denied'}]])await assert.rejects(trimWorkingSets160(targets,{execute:async()=>({stdout:JSON.stringify(rows)})}),/Invalid native/);
});
