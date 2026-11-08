// SPDX-License-Identifier: MPL-2.0
export async function coreChoices160(type,game,json){
 if(!/^[-\w.]{1,60}$/.test(game))throw Error('Invalid game version');
 const part=encodeURIComponent(game),group=(key,title,rows)=>({key,title,rows:rows.map((r,i)=>({...r,recommended:i===rows.findIndex(x=>x.stable)||!rows.some(x=>x.stable)&&i===0}))});
 if(type==='paper'){const builds=await json(`https://fill.papermc.io/v3/projects/paper/versions/${part}/builds`);return [group('build','Paper',builds.filter(b=>b.downloads?.['server:default']).map(b=>({version:String(b.id),stable:b.channel==='STABLE',kind:b.channel})))];}
 if(type==='fabric'){const [loaders,installers]=await Promise.all([json(`https://meta.fabricmc.net/v2/versions/loader/${part}`),json('https://meta.fabricmc.net/v2/versions/installer')]);return [group('loader','Fabric Loader',loaders.map(b=>({version:b.loader.version,stable:b.loader.stable,kind:b.loader.stable?'stable':'other'}))),group('installer','Fabric Installer',installers.map(b=>({version:b.version,stable:b.stable,kind:b.stable?'stable':'other'})))];}
 if(type==='quilt'){const loaders=await json(`https://meta.quiltmc.org/v3/versions/loader/${part}`);return [group('loader','Quilt Loader',loaders.map(b=>({version:b.loader.version,stable:!/-/.test(b.loader.version),kind:/-/.test(b.loader.version)?'prerelease':'stable'})))];}
 if(['vanilla','spigot','craftbukkit'].includes(type))return [];
 throw Error('Unknown server software');
}
export function selectCore160(groups,input={}){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!groups.some(g=>g.key===k)))throw Error('Invalid core selection / 核心版本选择无效');
 return Object.fromEntries(groups.map(g=>{const row=input[g.key]?g.rows.find(r=>r.version===input[g.key]):g.rows.find(r=>r.recommended)||g.rows[0];if(!row)throw Error('Selected '+g.title+' version unavailable / 所选版本上游不可用');return [g.key,row.version];}));
}
