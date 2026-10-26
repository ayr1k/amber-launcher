// SPDX-License-Identifier: MPL-2.0
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import catalog from '../desktop/locales/catalog.json' with {type:'json'};
import {placeholders} from '../desktop/localization.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const sources=new Set(Object.values(catalog).map(m=>m.zh));
for(const [key,m] of Object.entries(catalog)){if(!m.zh||!m.en||placeholders(m.zh)!==placeholders(m.en))throw Error('Invalid locale entry '+key);}
for(const name of await readdir(join(root,'src'))){if(!/\.(jsx|mjs)$/.test(name))continue;const text=await readFile(join(root,'src',name),'utf8');for(const match of text.matchAll(/translateText\(("(?:[^"\\]|\\.)*")/g)){const source=JSON.parse(match[1]);if(!sources.has(source))throw Error('Missing translation in '+name+': '+source);}if(name!=='main.jsx'&&/\bt\(/.test(text))throw Error('Ambiguous translation identifier in '+name);}
console.log('LOCALE_CHECK_OK: '+sources.size+' bilingual messages and placeholders.');
