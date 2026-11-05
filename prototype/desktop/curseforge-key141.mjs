// SPDX-License-Identifier: MPL-2.0
import {readFile} from 'node:fs/promises';
export async function curseKey141(){const env=process.env.AMBER_CURSEFORGE_API_KEY;if(env)return env;try{return JSON.parse(await readFile(new URL('./curseforge-build-key.json',import.meta.url),'utf8')).key||'';}catch{return '';}}
export async function curseHeaders141(url){if(!['api.curseforge.com','edge.forgecdn.net','mediafilez.forgecdn.net'].includes(new URL(url).hostname))return {};const key=await curseKey141();if(!key)throw Error('CurseForge API key is not configured / 未配置 CurseForge API key');return {'x-api-key':key};}
