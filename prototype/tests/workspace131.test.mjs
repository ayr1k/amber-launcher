// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {EditorState} from '@codemirror/state';
import {history,undo,redo} from '@codemirror/commands';
import {initialStops,formatRange,textParts,serializeParts,selectionRange,validWork} from '../src/gradient-model.mjs';
import {richField,richHistory,setRich,changeRich,sizeLimit} from '../src/gradient-editor.mjs';
function editor(text){let state=EditorState.create({doc:text,extensions:[richField,richHistory,sizeLimit,history()]});return {get state(){return state},dispatch(tr){state=tr.state||state.update(tr).state}};}
test('partial formats overlap and clear without touching adjacent graphemes',()=>{
 const text='A👨‍👩‍👧‍👦é中文Z';let marks=Array.from({length:text.length},()=>({}));
 const range=selectionRange(text,2,3);assert.equal(text.slice(range.from,range.to),'👨‍👩‍👧‍👦');
 marks=formatRange(text,marks,2,3,{bold:true,color:'#ff0000'});marks=formatRange(text,marks,1,text.length-1,{underlined:true});
 const parts=textParts(text,marks,initialStops);assert.equal(parts.length,6);assert.equal(parts[0].bold,false);assert.equal(parts[1].bold,true);assert.equal(parts[1].color,'#ff0000');assert.equal(parts[1].underlined,true);assert.equal(parts[2].bold,false);assert.equal(parts.at(-1).underlined,false);
 marks=formatRange(text,marks,range.from,range.to,null);assert.deepEqual(marks[1],{});assert.equal(marks[range.to].underlined,true);
});
test('selection gradient has local endpoints and survives base recoloring',()=>{
 const text='abcdef',marks=formatRange(text,Array.from({length:6},()=>({})),2,5,{},initialStops);
 const parts=textParts(text,marks,[{color:'#ffffff',at:0},{color:'#000000',at:100}]);assert.equal(parts[2].color,'#52b788');assert.equal(parts[4].color,'#a9b6ff');assert.equal(parts[0].color,'#ffffff');
});
test('document edits map styles; formatting, deletion and plain paste undo/redo together',()=>{
 const v=editor('abcd');changeRich(v,{...v.state.field(richField),marks:formatRange('abcd',v.state.field(richField).marks,1,3,{bold:true})});
 v.dispatch({changes:{from:2,insert:'中'},userEvent:'input.type'});assert.equal(v.state.field(richField).marks[2].bold,true);
 v.dispatch({changes:{from:1,to:4,insert:'XY'},userEvent:'input.paste'});assert.deepEqual(v.state.field(richField).marks[1],{});assert.equal(v.state.doc.toString(),'aXYd');
 assert.ok(undo(v));assert.equal(v.state.doc.toString(),'ab中cd');assert.equal(v.state.field(richField).marks[2].bold,true);
 assert.ok(undo(v));assert.equal(v.state.doc.toString(),'abcd');assert.equal(v.state.field(richField).marks[1].bold,true);
 assert.ok(undo(v));assert.equal(v.state.field(richField).marks[1].bold,undefined);assert.ok(redo(v));assert.equal(v.state.field(richField).marks[1].bold,true);
});
test('JSON explicitly ends flags; MiniMessage escapes input and closes each format; hex resets',()=>{
 const text='A<bold>\\\n中',marks=formatRange(text,Array.from({length:text.length},()=>({})),0,1,{bold:true,italic:true,underlined:true,strikethrough:true}),parts=textParts(text,marks,initialStops);
 const json=JSON.parse(serializeParts(parts,'json'));assert.equal(json.extra.map(p=>p.text).join(''),text);assert.equal(json.extra[1].bold,false);assert.equal(json.extra[0].strikethrough,true);
 const mini=serializeParts(parts,'mini');assert.ok(mini.includes('\\<'));assert.ok(mini.includes('\\\\'));assert.ok(mini.includes('</strikethrough></underlined></italic></bold></color>'));
 const hex=serializeParts(parts,'hex');assert.ok(hex.startsWith('&r&#52b788&l&o&n&mA'));assert.ok(hex.endsWith('&r'));assert.equal((hex.match(/&r/g)||[]).length,parts.length+1);
});
test('saved works validate format fields and size; edits cannot exceed the text limit',()=>{
 const w={schema:1,name:'work',text:'a',marks:[{bold:true}],stops:initialStops};assert.ok(validWork(w));assert.ok(!validWork({...w,marks:[{color:'red;display:none'}]}));assert.ok(!validWork({...w,text:'a'.repeat(4001)}));
 const v=editor('a');v.dispatch({changes:{from:1,insert:'x'.repeat(4000)}});assert.equal(v.state.doc.toString(),'a');
});
