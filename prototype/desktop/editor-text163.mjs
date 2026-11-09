// SPDX-License-Identifier: MPL-2.0
export function textMetadata(text){const breaks=text.match(/\r\n|\r|\n/g)||[],types=new Set(breaks);return {encoding:text.startsWith('\uFEFF')?'UTF-8 BOM':'UTF-8',eol:types.size>1?'Mixed':types.size===0?'None':breaks[0]==='\r\n'?'CRLF':breaks[0]==='\r'?'CR':'LF'};}
