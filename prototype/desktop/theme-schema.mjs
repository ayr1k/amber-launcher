// SPDX-License-Identifier: MPL-2.0
// Shared, declarative contract. No executable code or arbitrary CSS in themes.
export const themeModules=['launch','shortcuts','activity','details','instances','favorites','recent','artwork'];
export const appearanceDefaults={enabled:false,name:'AMBER Classic',author:'',source:'',license:'',mode:'system',accent:'#245b48',background:'#f8faf7',surface:'#ffffff',text:'#193b30',muted:'#596e64',line:'#cbd6ce',radius:0,borderWidth:1,controlHeight:44,rowHeight:58,iconSize:36,fontFamily:'Sarasa UI',fontSize:14,scale:100,menuStyle:'filled',listStyle:'lines',navLabels:true,panelOpacity:100,windowOpacity:100,backgroundAsset:null,heroAsset:null,artworkAsset:null,backgroundFit:'cover',backgroundPosition:50,overlay:20,blur:0,motion:'standard',canvas:null};
export const appearanceKeys=Object.keys(appearanceDefaults);
export const assetId=/^[a-f0-9]{64}\.png$/;
export function validateCanvas(input){
 if(input==null)return null;let count=0;const ids=new Set(),modules=new Set();
 function visit(n,depth){if(!n||typeof n!=='object'||Array.isArray(n)||++count>32||depth>5||typeof n.id!=='string'||!/^[-a-zA-Z0-9]{1,60}$/.test(n.id)||ids.has(n.id))throw Error('Invalid layout tree / 布局结构无效');ids.add(n.id);
  if(n.type==='module'){if(!themeModules.includes(n.module)||modules.has(n.module))throw Error('Unknown or duplicate module / 未知或重复模块');modules.add(n.module);return {id:n.id,type:'module',module:n.module};}
  if(!['split','tabs'].includes(n.type)||!Array.isArray(n.children)||n.children.length<1||n.children.length>8)throw Error('Invalid layout container / 布局容器无效');
  return {id:n.id,type:n.type,direction:n.direction==='horizontal'?'horizontal':'vertical',ratio:Number.isFinite(n.ratio)?Math.max(25,Math.min(75,n.ratio)):50,children:n.children.map(c=>visit(c,depth+1))};
 }
 const tree=visit(input,0);if(!modules.has('launch'))throw Error('Keep the launch module / 必须保留启动模块');return tree;
}
export function validateAppearance(input){
 if(input==null)return {...appearanceDefaults};if(typeof input!=='object'||Array.isArray(input))throw Error('Invalid theme / 主题配置无效');
 const v={...appearanceDefaults,...input};for(const k of ['enabled','navLabels'])if(typeof v[k]!=='boolean')throw Error('Invalid theme option / 主题选项无效');
 for(const k of ['accent','background','surface','text','muted','line'])if(!/^#[a-fA-F0-9]{6}$/.test(v[k]))throw Error('Use a six-digit HEX color / 请输入六位 HEX 颜色');
 const ranges={radius:[0,24],borderWidth:[0,3],controlHeight:[36,60],rowHeight:[40,90],iconSize:[24,64],fontSize:[12,22],scale:[85,125],panelOpacity:[60,100],windowOpacity:[70,100],backgroundPosition:[0,100],overlay:[0,90],blur:[0,20]};
 for(const [key,[min,max]] of Object.entries(ranges))if(!Number.isFinite(v[key])||v[key]<min||v[key]>max)throw Error('Theme value out of range: '+key);
 for(const [key,values] of Object.entries({mode:['system','light','dark','custom'],menuStyle:['filled','outline','minimal'],listStyle:['lines','striped','spacious'],backgroundFit:['cover','contain'],motion:['none','light','standard']}))if(!values.includes(v[key]))throw Error('Unknown theme option: '+key);
 if(typeof v.fontFamily!=='string'||!v.fontFamily.length||v.fontFamily.length>80||/[;{}<>\\"\x00-\x1f]/.test(v.fontFamily))throw Error('Invalid font name / 字体名称无效');
 for(const k of ['name','author','source','license'])if(typeof v[k]!=='string'||v[k].length>300)throw Error('Invalid theme metadata / 主题信息无效');
 for(const k of ['backgroundAsset','heroAsset','artworkAsset'])if(v[k]!==null&&!assetId.test(v[k]))throw Error('Import an image first / 请先导入图片');
 v.canvas=validateCanvas(v.canvas);return Object.fromEntries(appearanceKeys.map(k=>[k,v[k]]));
}
export const visualSettingKeys=['appearance','layout','theme','uiStyle','accent','density','fontSize','motion','background','panelOpacity','titlebarColor','windowCorners'];
export function visualSnapshot(settings){return structuredClone(Object.fromEntries(visualSettingKeys.filter(k=>settings[k]!==undefined).map(k=>[k,settings[k]])));}
export function luminance(hex){const c=hex.slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function readableInk(color){return contrast(color,'#ffffff')>contrast(color,'#14201b')?'#ffffff':'#14201b';}
export function themeVariables(input,dark=false){const a=validateAppearance(input);if(!a.enabled)return {};
 const colors=a.mode==='custom'?a:(a.mode==='dark'||a.mode==='system'&&dark)?{...a,background:'#171b1a',surface:'#222826',text:'#eef3f0',muted:'#b7c5be',line:'#46534d'}:{...a,background:'#f8faf7',surface:'#ffffff',text:'#193b30',muted:'#596e64',line:'#cbd6ce'};
 return {'--green':a.accent,'--accent':a.accent,'--surface':colors.surface,'--bg':colors.background,'--text':colors.text,'--muted':colors.muted,'--line':colors.line,'--soft':`color-mix(in srgb, ${a.accent} 10%, ${colors.surface})`,'--theme-logo-filter':readableInk(a.accent)==='#ffffff'?'brightness(0) invert(1)':'brightness(0)','--theme-ink':readableInk(a.accent),'--theme-radius':a.radius+'px','--theme-border':a.borderWidth+'px','--theme-control':a.controlHeight+'px','--theme-row':a.rowHeight+'px','--theme-icon':a.iconSize+'px','--panel-opacity':a.panelOpacity+'%','--theme-panel':`color-mix(in srgb, ${colors.surface} ${a.panelOpacity}%, transparent)`,'--theme-font':`"${a.fontFamily}","Sarasa UI","Segoe UI",sans-serif`,'--theme-size':a.fontSize+'px','--theme-overlay':a.overlay+'%','--theme-blur':a.blur+'px','--theme-position':a.backgroundPosition+'%','--theme-fit':a.backgroundFit};
}

// Seed opt-in editing from existing preferences without changing the default renderer.
export function editableAppearance(settings){
 const a={...appearanceDefaults,...settings.appearance};if(a.enabled)return a;
 const dark=settings.theme==='dark',palette=dark?{forest:'#a8c8b1',amber:'#dfbb83',slate:'#b8c7d2'}:{forest:'#245b48',amber:'#82521e',slate:'#425463'};
 return {...a,mode:settings.theme||'system',accent:palette[settings.accent]||palette.forest,radius:settings.uiStyle==='rounded'?12:0,fontSize:settings.fontSize||14,panelOpacity:settings.panelOpacity??100,motion:settings.motion===false?'none':'standard',rowHeight:settings.density==='compact'?44:58};
}
