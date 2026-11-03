// SPDX-License-Identifier: MPL-2.0
export const initialStops = [{color:'#52b788',at:0},{color:'#a9b6ff',at:100}];
export const flags = ['bold','italic','underlined','strikethrough'];
export const graphemes = text => [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)];
export function colorAt(stops,at){
 const sorted=[...stops].sort((a,b)=>a.at-b.at);let a=sorted[0],b=sorted.at(-1);
 if(at<=a.at)b=a;else if(at>=b.at)a=b;else for(let k=0;k<sorted.length-1;k++)if(at>=sorted[k].at&&at<=sorted[k+1].at){a=sorted[k];b=sorted[k+1];break;}
 const f=a.at===b.at?0:(at-a.at)/(b.at-a.at);
 return '#'+[1,3,5].map(i=>Math.round(parseInt(a.color.slice(i,i+2),16)*(1-f)+parseInt(b.color.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join('');
}
export function selectionRange(text,from,to){
 if(from===to)return {from,to};
 const units=graphemes(text),first=units.find(g=>g.index+g.segment.length>from),last=units.find(g=>g.index+g.segment.length>=to);
 return {from:first?.index??from,to:last?last.index+last.segment.length:to};
}
export function formatRange(text,marks,from,to,patch,stops){
 ({from,to}=selectionRange(text,from,to));const next=marks.slice();const units=graphemes(text.slice(from,to));
 units.forEach((g,i)=>{const value=patch===null?{}:{...marks[from+g.index],...patch,...(stops?{color:colorAt(stops,i/Math.max(1,units.length-1)*100)}:{})};for(let j=0;j<g.segment.length;j++)next[from+g.index+j]=value;});return next;
}
export function textParts(text,marks,stops){
 const units=graphemes(text),visible=units.filter(g=>g.segment!=='\n'&&g.segment!=='\r\n').length;let i=0;
 return units.map(g=>{const m=marks[g.index]||{},at=i/Math.max(1,visible-1)*100;if(!/^[\r\n]+$/.test(g.segment))i++;return {text:g.segment,from:g.index,to:g.index+g.segment.length,color:m.color||colorAt(stops,at),...Object.fromEntries(flags.map(k=>[k,!!m[k]]))};});
}
export function serializeParts(parts,format){
 if(format==='json')return JSON.stringify({text:'',extra:parts.map(({from,to,...p})=>p)});
 if(format==='hex')return parts.map(p=>`&r&#${p.color.slice(1)}${p.bold?'&l':''}${p.italic?'&o':''}${p.underlined?'&n':''}${p.strikethrough?'&m':''}${p.text}`).join('')+'&r';
 const tags={bold:'bold',italic:'italic',underlined:'underlined',strikethrough:'strikethrough'};
 return parts.map(p=>{const active=flags.filter(k=>p[k]).map(k=>tags[k]);return `<color:${p.color}>${active.map(k=>'<'+k+'>').join('')}${p.text.replaceAll('\\','\\\\').replaceAll('<','\\<')}${active.reverse().map(k=>'</'+k+'>').join('')}</color>`;}).join('');
}
export function validStops(stops){return Array.isArray(stops)&&stops.length>=2&&stops.length<=8&&stops.every(s=>/^#[a-f\d]{6}$/i.test(s.color)&&Number.isFinite(s.at)&&s.at>=0&&s.at<=100);}
export function validWork(w){return w&&w.schema===1&&typeof w.name==='string'&&typeof w.text==='string'&&w.text.length<=4000&&validStops(w.stops)&&Array.isArray(w.marks)&&w.marks.length===w.text.length&&w.marks.every(m=>m&&Object.keys(m).every(k=>k==='color'?/^#[a-f\d]{6}$/i.test(m[k]):flags.includes(k)&&typeof m[k]==='boolean'));}
