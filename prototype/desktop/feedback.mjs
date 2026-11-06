// SPDX-License-Identifier: MPL-2.0
import {PRODUCT_NAME,REPOSITORY_URL} from './edition.mjs';
export const feedbackUrl=REPOSITORY_URL+'/issues/new';
export function feedbackDraft(fields,diagnostics,redactText=value=>value) {
 if(!fields||typeof fields!=='object'||typeof fields.includeDiagnostics!=='boolean')throw Error('Invalid feedback request');
 for(const key of ['steps','expected','actual'])if(typeof fields[key]!=='string'||!fields[key].trim()||fields[key].length>4000)throw Error('Complete each feedback field (maximum 4000 characters).');
 if(fields.includeDiagnostics&&!diagnostics)throw Error('Preview diagnostics first.');
 return redactText(`# ${PRODUCT_NAME} feedback\n\n## Steps to reproduce / 操作步骤\n${fields.steps.trim()}\n\n## Expected / 预期结果\n${fields.expected.trim()}\n\n## Actual / 实际结果\n${fields.actual.trim()}${fields.includeDiagnostics?'\n\n## Diagnostics / 诊断摘要\n```json\n'+JSON.stringify(diagnostics,null,2)+'\n```':''}`);
}
