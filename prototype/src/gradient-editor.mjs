// SPDX-License-Identifier: MPL-2.0
import {StateEffect,StateField,EditorState} from '@codemirror/state';
import {Decoration,EditorView} from '@codemirror/view';
import {invertedEffects,isolateHistory} from '@codemirror/commands';
import {initialStops,textParts} from './gradient-model.mjs';
export const setRich=StateEffect.define();
export const richField=StateField.define({
 create:state=>({marks:Array.from({length:state.doc.length},()=>({})),stops:initialStops}),
 update(value,tr){
  let next=value;
  if(tr.docChanged){const marks=[];let end=0;
   tr.changes.iterChanges((from,to,_fromB,_toB,insert)=>{marks.push(...value.marks.slice(end,from));const inherited=tr.isUserEvent('input.paste')?{}:value.marks[from===to?Math.max(0,from-1):from]||{};marks.push(...Array.from({length:insert.length},()=>({...inherited})));end=to;});
   marks.push(...value.marks.slice(end));next={...value,marks};
  }
  for(const e of tr.effects)if(e.is(setRich))next=e.value;
  return next;
 }
});
export const richHistory=invertedEffects.of(tr=>tr.docChanged||tr.effects.some(e=>e.is(setRich))?[setRich.of(tr.startState.field(richField))]:[]);
export const richDecorations=EditorView.decorations.compute([richField,'doc'],state=>{
 const v=state.field(richField);return Decoration.set(textParts(state.doc.toString(),v.marks,v.stops).filter(p=>!/[\r\n]/.test(p.text)).map(p=>Decoration.mark({attributes:{style:`color:${p.color};font-weight:${p.bold?700:400};font-style:${p.italic?'italic':'normal'};text-decoration:${[p.underlined?'underline':'',p.strikethrough?'line-through':''].filter(Boolean).join(' ')||'none'}`}}).range(p.from,p.to)));
});
export const sizeLimit=EditorState.transactionFilter.of(tr=>tr.newDoc.length<=4000?tr:[]);
export const richExtensions=[richField,richHistory,richDecorations,sizeLimit];
export function changeRich(view,value){view.dispatch({effects:setRich.of(value),annotations:isolateHistory.of('full')});}
