// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {Select} from './Select';
import {visibleStructures,supportedStructures} from './seed-results161.mjs';
import {zoomCamera,reliefShade,keyboardPanCamera} from './seed-math161.mjs';
import {resolveWorldVersion} from '../desktop/world-version161.mjs';
import {ControlButton as B} from './ControlButton.mjs';
import {getLocale} from '../desktop/localization.mjs';
import './workspace134.css';
import './workspace161.css';
import {useCatalogHeight} from './useCatalogHeight133.mjs';
import {viewWidth as width,viewHeight as height,sceneKey,panCamera,mapPosition,bufferedRequest,LatestMapQueue} from './seed-view134.mjs';
const tr=(a,b)=>getLocale().startsWith('zh')?a:b;
const names={village:['村庄','Village'],desert_pyramid:['沙漠神殿','Desert pyramid'],jungle_temple:['丛林神庙','Jungle temple'],swamp_hut:['沼泽小屋','Swamp hut'],igloo:['雪屋','Igloo'],monument:['海底神殿','Monument'],mansion:['林地府邸','Mansion'],outpost:['掠夺者前哨站','Outpost'],ocean_ruin:['海底废墟','Ocean ruin'],shipwreck:['沉船','Shipwreck'],ruined_portal:['废弃传送门','Ruined portal'],ancient_city:['远古城市','Ancient city'],treasure:['埋藏的宝藏','Buried treasure'],trail_ruins:['古迹废墟','Trail ruins'],trial_chambers:['试炼密室','Trial chambers'],abandoned_camp:['废弃营地','Abandoned camp'],fortress:['下界要塞','Nether fortress'],bastion:['堡垒遗迹','Bastion'],nether_portal:['下界废弃传送门','Nether ruined portal'],end_city:['末地城','End city']};
const scales=[1,4,16,64,256,1024,4096];
const initial={seed:'230686175948231322',version:35,dimension:0,x:0,z:0,y:64,scale:16};
function valid(p){return p&&typeof p.seed==='string'&&p.seed.length<=256&&Number.isInteger(p.version)&&p.version>=10&&p.version<=35&&[-1,0,1].includes(p.dimension)&&['x','z','y'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<29900000&&Math.abs(p.z)<29900000&&p.y>=-64&&p.y<=320&&scales.includes(p.scale);}
function saved(){try{const p=JSON.parse(localStorage.getItem('amber-seed-map'));return valid(p)?p:initial}catch{return initial}}
function validMarks(rows){return Array.isArray(rows)&&rows.length<=500&&rows.every(m=>m&&typeof m.name==='string'&&m.name.length<=80&&typeof m.seed==='string'&&m.seed.length<=256&&[-1,0,1].includes(m.dimension)&&Number.isInteger(m.x)&&Number.isInteger(m.z)&&Math.abs(m.x)<30000000&&Math.abs(m.z)<30000000);}
function marksSaved(){try{const p=JSON.parse(localStorage.getItem('amber-map-markers'));return validMarks(p)?p:[]}catch{return []}}
export function SeedMapTool(){
 const layout=useCatalogHeight(true);
 const [p,setP]=useState(saved),[draft,setDraft]=useState(saved),[catalog,setCatalog]=useState(null),[datasets,setDatasets]=useState([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[terrain,setTerrain]=useState(false),[grid,setGrid]=useState(false),[slime,setSlime]=useState(false),[show,setShow]=useState(Object.keys(names)),[biome,setBiome]=useState(''),[marks,setMarks]=useState(marksSaved),[cursor,setCursor]=useState(null),[markerName,setMarkerName]=useState(''),[markMode,setMarkMode]=useState(false);
 const canvas=useRef(null),drag=useRef(null),upload=useRef(null),camera=useRef(p),paint=useRef(()=>{}),frame=useRef(0),panTimer=useRef(null),queue=useRef(null),api=window.amberDesktop;
 const supported=supportedStructures(p),activeTypes=show.filter(type=>supported.includes(type));
 const data=datasets.at(-1),structuresEnabled=activeTypes.length>0;
 useEffect(()=>{const c=canvas.current,wrap=c?.parentElement;if(!wrap)return;const fit=()=>{const w=Math.min(wrap.clientWidth,wrap.clientHeight*5/3);c.style.width=w+'px';c.style.height=w*3/5+'px';};const observer=new ResizeObserver(fit);observer.observe(wrap);fit();return()=>observer.disconnect();},[]);
 const structureResults=visibleStructures(datasets,p,terrain,activeTypes);
 function redraw(){if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;paint.current()});}
 useEffect(()=>{let active=true;api.seedMap('catalog').then(value=>{if(active)setCatalog(value)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;queue.current?.dispose();cancelAnimationFrame(frame.current);clearTimeout(panTimer.current);api.seedMap('cancel').catch(()=>{})}},[]);
 useEffect(()=>{if(!catalog)return;const q=new LatestMapQueue(r=>api.seedMap('map',r),d=>{
  setDatasets(previous=>[...previous.filter(v=>sceneKey(v.request)===sceneKey(d.request)).slice(-2),d]);
 },e=>setError(e.message),setBusy);queue.current=q;return()=>q.dispose()},[catalog]);
 useEffect(()=>{if(!catalog)return;setError('');queue.current.enqueue(bufferedRequest(p,terrain,structuresEnabled));redraw();try{localStorage.setItem('amber-seed-map',JSON.stringify(p))}catch{}},[catalog,p,terrain,structuresEnabled]);
 function update(next){if(sceneKey(next)!==sceneKey(camera.current))setNotice('');camera.current=next;setP(next);setDraft(next);redraw();}
 function commitCamera(){const next={...camera.current,x:Math.round(camera.current.x),z:Math.round(camera.current.z)};update(next);}
 function saveMarks(next){try{localStorage.setItem('amber-map-markers',JSON.stringify(next));setMarks(next)}catch{setError(tr('标记未保存：本地存储空间不足','Markers not saved: local storage is full'))}}
 function zoom(step,event){const v=camera.current,next=scales[Math.max(0,Math.min(scales.length-1,scales.indexOf(v.scale)+step))];if(next===v.scale)return;const b=canvas.current.getBoundingClientRect();update(zoomCamera(v,next,event?event.clientX-b.left:b.width/2,event?event.clientY-b.top:b.height/2,b));}
 useEffect(()=>{
  const c=canvas.current;if(!catalog||!c)return;
  const palette=new Map(catalog.biomes.map(b=>[b.id,b.color])),key=sceneKey({...p,terrain});
  // Cache rendered, overscanned areas. Drag frames only composite these bitmaps.
  const layers=datasets.filter(v=>sceneKey(v.request)===key).map(({request:r,result:d})=>{
   const small=document.createElement('canvas');small.width=r.width;small.height=r.height;
   const sc=small.getContext('2d'),im=sc.createImageData(r.width,r.height);
   const shades=d.heights.map((_,k)=>reliefShade(d.heights,Math.ceil(r.width/4),k,r.scale*4));
   d.biomes.forEach((id,i)=>{const rgb=palette.get(id)||[80,80,80];let shade=biome&&id!==Number(biome)?0.18:1;
    if(d.heights.length){const k=Math.floor(Math.floor(i/r.width)/4)*Math.ceil(r.width/4)+Math.floor(i%r.width/4);shade*=shades[k]??1;}
    for(let j=0;j<3;j++)im.data[i*4+j]=Math.min(255,rgb[j]*shade);im.data[i*4+3]=255;
   });sc.putImageData(im,0,0);return {image:small,r,d};
  });
  if(c.width!==1200){c.width=1200;c.height=720;}
  paint.current=()=>{
   const v=camera.current,ctx=c.getContext('2d'),ux=c.width/(width*v.scale),uz=c.height/(height*v.scale),left=v.x-width*v.scale/2,top=v.z-height*v.scale/2;
   ctx.clearRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
   if(sceneKey({...v,terrain})!==key)return;
   layers.forEach(({image,r})=>ctx.drawImage(image,(r.x-left)*ux,(r.z-top)*uz,r.width*r.scale*ux,r.height*r.scale*uz));
   if(grid){ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1;const stride=Math.max(16,v.scale*16);ctx.beginPath();for(let x=Math.ceil(left/stride)*stride;x<left+width*v.scale;x+=stride){ctx.moveTo((x-left)*ux,0);ctx.lineTo((x-left)*ux,c.height)}for(let z=Math.ceil(top/stride)*stride;z<top+height*v.scale;z+=stride){ctx.moveTo(0,(z-top)*uz);ctx.lineTo(c.width,(z-top)*uz)}ctx.stroke();}
   const chunks=new Set(),features=new Map();
   layers.forEach(({d})=>{if(slime){ctx.fillStyle='rgba(80,255,80,.45)';d.slime.forEach(([x,z])=>{const id=x+':'+z;if(chunks.has(id))return;chunks.add(id);ctx.fillRect((x*16-left)*ux,(z*16-top)*uz,16*ux,16*uz)})}d.features.filter(f=>show.includes(f.type)).forEach(f=>features.set(f.type+':'+f.x+':'+f.z,{...f,name:tr(...names[f.type])}))});
   const points=[...features.values(),...marks.filter(m=>m.seed===v.seed&&m.dimension===v.dimension).map(m=>({...m,custom:true}))];ctx.font='bold 16px sans-serif';
   points.forEach(f=>{const x=(f.x-left)*ux,z=(f.z-top)*uz;if(x<0||z<0||x>c.width||z>c.height)return;ctx.beginPath();ctx.arc(x,z,f.custom?7:5,0,Math.PI*2);ctx.fillStyle=f.custom?'#ffcf63':'#fff';ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=2;ctx.stroke();if(f.custom||v.scale<=16&&points.length<50){ctx.strokeText(f.name,x+9,z-7);ctx.fillText(f.name,x+9,z-7)}});
  };redraw();
 },[datasets,catalog,marks,show,biome,slime,grid,p.seed,p.version,p.dimension,p.y,terrain]);
 useEffect(()=>{const c=canvas.current,fn=e=>{e.preventDefault();if(drag.current)return;if(e.deltaY!==0)zoom(e.deltaY>0?1:-1,e)};c.addEventListener('wheel',fn,{passive:false});return()=>c.removeEventListener('wheel',fn)},[p]);
 function position(e){if(!data)return null;const b=canvas.current.getBoundingClientRect();return mapPosition(camera.current,e.clientX-b.left,e.clientY-b.top,b);}
 function inspect(e){const pos=position(e);if(!pos)return;const v=camera.current,layer=datasets.findLast(({request:r})=>sceneKey(r)===sceneKey({...v,terrain})&&pos.x>=r.x&&pos.z>=r.z&&pos.x<r.x+r.width*r.scale&&pos.z<r.z+r.height*r.scale);let id,near;
  if(layer){const r=layer.request,ix=Math.floor((pos.x-r.x)/r.scale),iz=Math.floor((pos.z-r.z)/r.scale);id=layer.result.biomes[iz*r.width+ix];near=layer.result.features.filter(f=>show.includes(f.type)).find(f=>Math.hypot(f.x-pos.x,f.z-pos.z)<v.scale*3);}
  setCursor({...pos,biome:catalog?.biomes.find(b=>b.id===id)?.name,feature:near?tr(...names[near.type]):''});
 }
 function movePointer(e){const d=drag.current;if(!d||e.pointerId!==d.id){inspect(e);return;}
  const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.hypot(dx,dy)<=5)return;d.moved=true;
  camera.current=panCamera(d.start,dx,dy,d.bounds);redraw();
  const publish=()=>{panTimer.current=null;d.last=performance.now();const next={...camera.current,x:Math.round(camera.current.x),z:Math.round(camera.current.z)};setP(next);setDraft(next)};
  if(performance.now()-d.last>=120){clearTimeout(panTimer.current);publish();inspect(e)}
  else if(!panTimer.current)panTimer.current=setTimeout(publish,120-(performance.now()-d.last));
 }
 function finishPointer(e,cancelled=false){const d=drag.current;if(!d||e.pointerId!==d.id)return;
  if(!cancelled)movePointer(e);clearTimeout(panTimer.current);panTimer.current=null;drag.current=null;canvas.current.classList.remove('dragging');
  if(d.moved)commitCamera();else if(!cancelled&&markMode&&marks.length<500){const pos=position(e);if(pos)saveMarks([...marks,{...pos,seed:p.seed,dimension:p.dimension,name:markerName.trim()||tr('标记','Marker')+' '+(marks.length+1)}]);setMarkMode(false)}
  if(canvas.current.hasPointerCapture(e.pointerId))canvas.current.releasePointerCapture(e.pointerId);
 }
 async function readWorld(){try{
  const w=await api.seedMap('world');if(!w)return;
  const version=resolveWorldVersion(w.version,catalog.versions);
  const next={...camera.current,seed:w.seed,dimension:0,...(version?{version:version.id}:{}),...(w.spawnKnown?{x:w.x,z:w.z,y:w.y}:{x:0,z:0,y:64})};
  setDraft(next);
  if(!version){setError(tr('存档版本无法识别或不受支持。已填入种子，请选择生成版本并点击查看地图。','World version is unknown or unsupported. Seed filled in; select a generation version and choose View map.'));return;}
  update(next);
  setNotice([!version.exact?tr('使用同系列近似生成版本；升级过的区块可能不同。','Using an approximate generation version from the same series; upgraded chunks may differ.'):null,!w.spawnKnown?tr('存档未提供完整出生点；地图暂以原点为中心，原点不是已知出生点。','The save has no complete spawn coordinates; the map is centered on the origin, which is not a known spawn.'):null].filter(Boolean).join(' '));
 }catch(e){setError(e.message)}}

 return <section className="seed134 seed161" ref={layout}>
 <div className="seed-basics161"><label className="seed-input">{tr('种子','Seed')}<input form="seed-view161" value={draft.seed} maxLength={256} onChange={e=>setDraft({...draft,seed:e.target.value})}/></label><label>{tr('Java 生成版本','Java generation version')}<Select value={draft.version} onChange={e=>setDraft({...draft,version:Number(e.target.value)})}>{catalog?.versions.slice().reverse().map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</Select></label><label>{tr('维度','Dimension')}<Select value={draft.dimension} onChange={e=>setDraft({...draft,dimension:Number(e.target.value)})}><option value="0">{tr('主世界','Overworld')}</option><option value="-1">{tr('下界','Nether')}</option><option value="1">{tr('末地','The End')}</option></Select></label></div>
 <div className="seed-toolbar"><B className="button secondary" aria-label={tr('放大','Zoom in')} disabled={p.scale===1} onClick={()=>zoom(-1)}>＋</B><B className="button secondary" aria-label={tr('缩小','Zoom out')} disabled={p.scale===4096} onClick={()=>zoom(1)}>−</B><B className="text-button" onClick={()=>update({...p,x:0,z:0})}>{tr('返回原点','Origin')}</B>{[[terrain,setTerrain,'估算地形阴影','Estimated relief'],[grid,setGrid,'网格','Grid'],[slime,setSlime,'史莱姆区块','Slime chunks']].map(([v,set,zh,en])=><label className="check131" key={en}><input type="checkbox" checked={v} onChange={e=>set(e.target.checked)}/><span>{tr(zh,en)}</span></label>)}<span role="status">{busy?tr('正在生成…','Generating…'):tr('离线地图','Offline map')}</span></div>
 <div className="seed-body161"><div className="seed-display161">
 <div className="seed-map-wrap"><canvas ref={canvas} className={markMode?'mark-mode':''} tabIndex={0} aria-label={tr('种子地图，方向键移动，加减键缩放','Seed map: arrows to pan, plus/minus to zoom')} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();update(keyboardPanCamera(camera.current,e.key))}if(e.key==='+')zoom(-1);if(e.key==='-')zoom(1)}} onPointerDown={e=>{if(e.button!==0||drag.current)return;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...camera.current},bounds:canvas.current.getBoundingClientRect(),last:0,moved:false};e.currentTarget.classList.add('dragging');e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={movePointer} onPointerUp={e=>finishPointer(e)} onPointerCancel={e=>finishPointer(e,true)} onLostPointerCapture={e=>finishPointer(e,true)}/><div className="seed-scale"><span style={{width:80}}/> {data?Math.round(80/(canvas.current?.clientWidth||1200)*width*p.scale):0} {tr('格','blocks')}</div></div>
 <div className="seed-readout">X {cursor?.x??p.x} · Z {cursor?.z??p.z} · Y {p.y} {cursor?.biome&&' · '+cursor.biome.replaceAll('_',' ')} {cursor?.feature&&' · '+cursor.feature}<span>{tr('拖动移动；滚轮缩放。','Drag to pan; scroll to zoom.')}</span></div>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="seed-note" role="status">{notice}</p>}

</div><aside className="seed-settings161"><form id="seed-view161" className="seed-controls seed-coordinates161" onSubmit={e=>{e.preventDefault();if(valid({...draft,x:Number(draft.x),z:Number(draft.z),y:Number(draft.y)}))update({...draft,x:Number(draft.x),z:Number(draft.z),y:Number(draft.y)});else setError(tr('请检查坐标范围','Check coordinate ranges'))}}>{['x','z','y'].map(k=><label key={k}>{k.toUpperCase()}{k==='y'?' · '+tr('高度','Height'):''}<input type="number" step="1" min={k==='y'?-64:-29899999} max={k==='y'?320:29899999} value={draft[k]} onChange={e=>setDraft({...draft,[k]:Number(e.target.value)})}/></label>)}<B className="button" type="submit">{tr('查看地图','View map')}</B><B type="button" className="button secondary" disabled={!catalog} onClick={readWorld}>{tr('读取 level.dat…','Read level.dat…')}</B></form>
 <div className="seed-options"><div className="seed-filter"><label>{tr('高亮生物群系','Highlight biome')}<Select value={biome} onChange={e=>setBiome(e.target.value)}><option value="">{tr('全部','All')}</option>{catalog?.biomes.map(b=><option key={b.id} value={b.id}>{b.name.replaceAll('_',' ')}</option>)}</Select></label><details className="seed-structures"><summary>{tr('结构筛选','Structure filters')} · {activeTypes.length}/{supported.length}</summary><div className="seed-structure-list"><B className="text-button" onClick={()=>setShow(show.length?[]:Object.keys(names))}>{show.length?tr('隐藏全部结构','Hide all structures'):tr('显示全部结构','Show all structures')}</B>{Object.entries(names).map(([id,label])=><label className="check131" key={id}><input type="checkbox" disabled={!supported.includes(id)} title={!supported.includes(id)?tr('当前版本或维度不支持','Unsupported in this version or dimension'):undefined} checked={supported.includes(id)&&show.includes(id)} onChange={e=>setShow(e.target.checked?[...show,id]:show.filter(k=>k!==id))}/><span>{tr(...label)}{!supported.includes(id)&&' · '+tr('不支持','Unsupported')}</span></label>)}</div></details></div><div className="seed-marker-controls"><label>{tr('标记名称','Marker name')}<input maxLength={80} value={markerName} onChange={e=>setMarkerName(e.target.value)}/></label><B className="button secondary" aria-pressed={markMode} onClick={()=>setMarkMode(!markMode)}>{markMode?tr('点击地图添加标记','Click map to mark'):tr('添加标记','Add marker')}</B><B className="button secondary" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(marks,null,2)],{type:'application/json'}));a.download='amber-map-markers.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}}>{tr('导出标记','Export markers')}</B><B className="button secondary" onClick={()=>upload.current.click()}>{tr('导入标记','Import markers')}</B><input hidden type="file" accept=".json" ref={upload} onChange={async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>200000)throw Error('File too large');const rows=JSON.parse(await f.text());if(!validMarks(rows)||rows.length+marks.length>500)throw Error(tr('标记文件无效或超过 500 项','Invalid marker file or over 500 markers'));saveMarks([...marks,...rows])}catch(e){setError(e.message)}e.target.value=''}}/></div><details className="seed-saved-markers"><summary>{tr('已保存标记','Saved markers')} · {marks.filter(m=>m.seed===p.seed&&m.dimension===p.dimension).length}</summary>{marks.filter(m=>m.seed===p.seed&&m.dimension===p.dimension).map((m,i)=><div className="seed-marker" key={i}><B className="text-button" onClick={()=>update({...p,x:m.x,z:m.z})}>{m.name} · X {m.x} Z {m.z}</B><B className="text-button" onClick={()=>saveMarks(marks.filter(v=>v!==m))}>{tr('删除','Delete')}</B></div>)}</details></div> <details className="seed-results161"><summary>{tr('当前视野结构预测','Structure predictions in view')} · {structureResults.total}</summary>
 <p>{tr('按距地图中心的直线距离排列。仅列出已加载区域的预测；缩小地图时密集结构可能省略，空列表不代表不存在结构。','Sorted by straight-line distance from map center. Loaded-area predictions only; dense structures may be omitted when zoomed out. An empty list does not prove absence.')}</p>
 {!structuresEnabled?<p>{tr('没有启用当前版本和维度支持的结构。开启适用的结构筛选后恢复查找。','No supported structures are enabled for this version and dimension. Enable an available structure filter to resume searching.')}</p>:!structureResults.covered?<p role="status">{tr('当前视野尚未完整加载；结果可能不完整。','The current view is not fully loaded; results may be incomplete.')}</p>:null}
 {structureResults.rows.map(f=><div className="seed-marker" key={f.type+':'+f.x+':'+f.z}><B className="text-button" onClick={()=>update({...p,x:f.x,z:f.z})}>{names[f.type]?tr(...names[f.type]):f.type} · X {f.x} Z {f.z} · ≈{Math.round(f.distance)} {tr('格','blocks')}</B></div>)}
 {structureResults.total>structureResults.rows.length&&<p>{tr('仅显示最近 100 项；放大或使用结构筛选缩小范围。','Showing the nearest 100 matches; zoom in or filter structures to narrow the results.')}</p>}</details>
</aside></div> <p className="seed-note">{tr('Java 原版生成预测。结构位置可能受地形影响；阴影为估算高度，不是逐方块地形。旧存档跨版本生成区域、模组及数据包可能与预测不同。史莱姆区块需放大查看，缩小时密集结构会省略。','Java vanilla generation prediction. Terrain may affect structures; relief uses estimated heights, not block-accurate terrain. Mixed-version worlds, mods and datapacks may differ. Zoom in for slime chunks and dense structures.')} · Cubiomes / xpple (MIT)</p></section>;
}
