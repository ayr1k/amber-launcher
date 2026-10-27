// SPDX-License-Identifier: MPL-2.0
import {IS_AMBERE} from './edition.mjs';
const brand=text=>IS_AMBERE?text.replace(/\bAMBER\b/g,'AmberE'):text;
import catalog from './locales/catalog.json' with {type:'json'};
export const builtinLanguages=[{id:'zh-CN',name:'简体中文'},{id:'en-US',name:'English'}];
let locale='zh-CN',custom=null;
const sourceIndex=new Map(Object.entries(catalog).map(([key,m])=>[m.zh,key]));
export function getLocale(){return locale.startsWith('x-')?(custom?.formatLocale||'en-US'):locale;}
export function resolveLocale(value,system='en-US'){return value==='system'||!value?(/^zh\b/i.test(system)?'zh-CN':'en-US'):value;}
export function setLocale(value,pack=null,system='en-US'){custom=pack;const next=resolveLocale(value,system);locale=['zh-CN','en-US',pack?.locale].includes(next)?next:'en-US';return locale;}
export function message(key,params={}){const entry=catalog[key];if(!entry)return key;const text=locale==='zh-CN'?entry.zh:custom?.locale===locale&&Object.hasOwn(custom.messages,key)?custom.messages[key]:entry.en;return brand(text).replace(/\{(\d+)\}/g,(whole,index)=>Object.hasOwn(params,index)?String(params[index]):whole);}
export function t(source,params={}){const key=sourceIndex.get(source);return key?message(key,params):brand(source);}
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates=Object.entries(catalog).filter(([,v])=>/\{\d+\}/.test(v.zh)).map(([key,v])=>({key,indices:[...v.zh.matchAll(/\{(\d+)\}/g)].map(m=>m[1]),pattern:new RegExp('^'+v.zh.split(/\{\d+\}/).map(escape).join('([\\s\\S]*?)')+'$')}));
const fragments=[...sourceIndex.keys()].filter(s=>!s.includes('{')&&s.length>=12).sort((a,b)=>b.length-a.length);
// Only call for application-owned messages, never project descriptions or user names.
export function translateMessage(value,depth=0){if(typeof value==='string'){value=value.replace(/^Error invoking remote method '[^']+': Error: /,'');const tagged=/^\[AMBER (m[a-f0-9]{12}|unexpected)\] ([\s\S]*)$/.exec(value);if(tagged)return translateMessage(tagged[2],depth)+' [AMBER '+tagged[1]+']';}if(typeof value!=='string'||locale==='zh-CN'||depth>4)return value;if(sourceIndex.has(value))return t(value);if(value.length>12000)return value;for(const item of templates){const match=item.pattern.exec(value);if(match){const source=catalog[item.key].zh;const nested=source==='{0}失败（HTTP {1}{2}{3}）。{4}'?['0','4']:source==='实例“{0}”已保留，可在任务中心继续安装。{1}'?['1']:[];return message(item.key,Object.fromEntries(item.indices.map((n,i)=>[n,nested.includes(n)?translateMessage(match[i+1],depth+1):match[i+1]])));}}let text=value;for(const source of fragments)if(text.includes(source))text=text.split(source).join(t(source));return text;}
export function localizeFields(value,key=''){if(typeof value==='string')return ['error','phase','hint','reason','feedback','note','privacy','message','summary'].includes(key)?translateMessage(value):value;if(Array.isArray(value))return value.map(v=>localizeFields(v,key));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,localizeFields(v,k)]));return value;}
export function placeholders(text){return [...new Set([...text.matchAll(/\{(\d+)\}/g)].map(m=>m[1]))].sort().join(',');}
export function errorDescriptor(value){const text=String(value??'');if(sourceIndex.has(text))return {code:sourceIndex.get(text),params:{},text};for(const entry of templates){const match=entry.pattern.exec(text);if(match)return {code:entry.key,params:Object.fromEntries(entry.indices.map((key,i)=>[key,match[i+1]])),text};}return {code:'unexpected',params:{},text};}
export function validateLanguagePack(value){
 if(!value||value.format!=='amber-language'||value.schema!==1||typeof value.locale!=='string'||!/^x-[a-z0-9-]{2,32}$/.test(value.locale)||typeof value.name!=='string'||!value.name.trim()||value.name.length>60||/[\x00-\x1f\u202a-\u202e\u2066-\u2069]/.test(value.name)||!value.messages||typeof value.messages!=='object'||Array.isArray(value.messages))throw Error('Invalid language pack metadata. / 语言包信息无效。');
 const entries=Object.entries(value.messages);if(!entries.length||entries.length>Object.keys(catalog).length)throw Error('Invalid language pack size. / 语言包条目数量无效。');
 for(const [key,text] of entries){if(!Object.hasOwn(catalog,key)||typeof text!=='string'||!text.trim()||text.length>8000||/[\x00-\x08\x0b\x0c\x0e-\x1f\u202a-\u202e\u2066-\u2069]/.test(text)||placeholders(text)!==placeholders(catalog[key].zh))throw Error('语言包条目无效：'+key);}
 let formatLocale=value.formatLocale||'en-US';try{if(typeof formatLocale!=='string'||formatLocale.length>35)throw Error();formatLocale=Intl.getCanonicalLocales(formatLocale)[0];new Intl.DateTimeFormat(formatLocale);}catch{throw Error('语言包的日期格式区域无效。');}
 return {format:'amber-language',schema:1,locale:value.locale,formatLocale,name:value.name.trim(),messages:Object.fromEntries(entries)};
}
export function languageTemplate(){return {format:'amber-language',schema:1,locale:'x-my-language',formatLocale:'en-US',name:'My language',messages:Object.fromEntries(Object.entries(catalog).map(([key,m])=>[key,m.en]))};}
export function pluralText(count,singular,plural){return t(new Intl.PluralRules(getLocale()).select(count)==='one'?singular:plural,{0:new Intl.NumberFormat(getLocale()).format(count)});}
