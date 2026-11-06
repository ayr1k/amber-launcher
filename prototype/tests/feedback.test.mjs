// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackDraft,feedbackUrl} from '../desktop/feedback.mjs';
import {redact} from '../desktop/privacy.mjs';
import {REPOSITORY_URL} from '../desktop/edition.mjs';
const fields={steps:'Open launcher',expected:'Game starts',actual:'Error',includeDiagnostics:false};
test('feedback only includes diagnostics with explicit consent',()=>{
 const diagnostic={version:'test',platform:'win32'};
 assert.ok(!feedbackDraft(fields,diagnostic).includes('win32'));
 assert.ok(feedbackDraft({...fields,includeDiagnostics:true},diagnostic).includes('win32'));
 assert.throws(()=>feedbackDraft({...fields,includeDiagnostics:true},null));
 assert.equal(feedbackUrl,REPOSITORY_URL+'/issues/new');
 assert.equal(new URL(feedbackUrl).search,'');
});
test('feedback validates field types, empty fields and bounds',()=>{
 for(const key of ['steps','expected','actual'])for(const value of ['', '  ',null,{},'a'.repeat(4001)])assert.throws(()=>feedbackDraft({...fields,[key]:value}));
 for(const includeDiagnostics of [undefined,'false',1])assert.throws(()=>feedbackDraft({...fields,includeDiagnostics}));
 assert.throws(()=>feedbackDraft(null));
 assert.ok(feedbackDraft({...fields,steps:'a'.repeat(4000)}).includes('a'.repeat(4000)));
});
test('preview redacts known account secrets and common personal data',()=>{
 const draft=feedbackDraft({...fields,actual:'secret-fixture Bearer tokenfixture me@example.com C:\\Users\\Player\\game'},null,text=>redact(text,['secret-fixture']));
 for(const value of ['secret-fixture','tokenfixture','me@example.com','Player'])assert.ok(!draft.includes(value));
 assert.ok(draft.includes('Open launcher'));
});
