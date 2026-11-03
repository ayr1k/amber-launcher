// Adapted from tuanzisama/minecraft-gradient-text-generator (MIT),
// src/plugins/processor/builder/text.ts and adapters/vanilla-compatible.ts.
// Copyright (c) 2024 tuanzi. Full license: public/licenses/gradient-generator-MIT.txt.
export class CharacterBuilder {
 constructor(character){this.character=character;this.colorValue=null;this.colorExpression='{color}';}
 withColor(value,expression='{color}'){this.colorValue=value;this.colorExpression=expression;return this;}
 build(template){const char=template.replace('{text}',()=>this.character);if(this.colorValue===null)return char;const convert=exp=>exp.replace('{color}',()=>this.colorValue);const exp=Array.isArray(this.colorExpression)?this.colorExpression.map(convert):convert(this.colorExpression);return Array.isArray(exp)?`${exp[0]}${char}${exp[1]}`:exp+char;}
}
export function legacyOutput(parts,control='&',style='expanded'){
 return parts.map(p=>{const hex=p.color.slice(1),code=style==='expanded'?control+'x'+[...hex].map(c=>control+c).join(''):control+'#'+hex;
 const flags=[['bold','l'],['italic','o'],['underlined','n'],['strikethrough','m']].filter(([k])=>p[k]).map(([,c])=>control+c).join('');
 return control+'r'+new CharacterBuilder(p.text).withColor(code).build(flags+'{text}');}).join('')+control+'r';
}
export function hsvHex(h,s,v){const f=n=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1)))).toString(16).padStart(2,'0')};return '#'+f(5)+f(3)+f(1);}
export function hexHSV(hex){const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=!d?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;return {h:(h*60+360)%360,s:max===0?0:d/max,v:max};}
export function parsePalette(text){const colors=text.match(/#[\da-f]{6}\b/gi);if(!colors||colors.length<2||colors.length>8)throw Error('请输入 2–8 个 HEX 颜色 / Enter 2–8 HEX colors');return colors.map((color,i)=>({color:color.toLowerCase(),at:i/(colors.length-1)*100}));}
