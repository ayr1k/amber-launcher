// SPDX-License-Identifier: MPL-2.0
import {join} from 'node:path';
import {readBoundedFile} from './bounded-io.mjs';
import {ensureParents} from './download.mjs';
import {atomicJson} from './core.mjs';

const finite = n => Number.isFinite(n) && Math.abs(n) < 1_000_000;
export function validBounds(v) {
  return v && ['x','y','width','height'].every(k => finite(v[k])) && v.width >= 200 && v.height >= 150;
}
export function fitWindow(saved, displays, primaryId) {
  const available = displays.filter(d => validBounds(d.workArea));
  if (!available.length) throw Error('No usable display');
  const bounds = validBounds(saved) ? saved : null;
  const overlap = (a,b) => Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  const nearest = bounds && available.reduce((best,d) => overlap(bounds,d.workArea)>overlap(bounds,best.workArea)?d:best,available[0]);
  const display = nearest && overlap(bounds,nearest.workArea)>0 ? nearest : available.find(d=>d.id===primaryId)||available[0];
  const area=display.workArea, width=Math.min(area.width,Math.max(860,Math.round(bounds?.width||1440))),height=Math.min(area.height,Math.max(640,Math.round(bounds?.height||1000)));
  const centered=!bounds||!nearest||overlap(bounds,nearest.workArea)===0;
  const x=centered?area.x+Math.floor((area.width-width)/2):Math.max(area.x,Math.min(Math.round(bounds.x),area.x+area.width-width));
  const y=centered?area.y+Math.floor((area.height-height)/2):Math.max(area.y,Math.min(Math.round(bounds.y),area.y+area.height-height));
  return {x,y,width,height};
}
export function supportsWindowCorners(platform,release) {return platform==='win32' && Number(release.split('.')[2])>=22000 || platform==='darwin';}
export function editingCommand(input){
  if(input.type!=='keyDown'||!input.control||input.alt||input.meta)return null;
  const key=String(input.key).toLowerCase();
  if(input.shift)return ({z:'redo',v:'pasteAndMatchStyle'})[key]||null;
  return ({a:'selectAll',c:'copy',x:'cut',v:'paste',z:'undo',y:'redo'})[key]||null;
}
export function runWindowAction(win,action) {
  if(!['minimize','maximize','close'].includes(action))throw Error('不支持的窗口操作。');
  if(win.isDestroyed())return;
  if(action==='minimize')win.minimize();
  else if(action==='maximize'){if(win.isMaximized())win.unmaximize();else win.maximize();}
  else win.close();
}
export class WindowStateStore {
  constructor(root){this.root=root;this.path=join(root,'window-state.json');this.queue=Promise.resolve();}
  async load(){try{const value=JSON.parse(await readBoundedFile(this.path,16_384));return value.schema===1&&validBounds(value.bounds)?{bounds:value.bounds,maximized:value.maximized===true}:null;}catch{return null;}}
  save(bounds,maximized){if(!validBounds(bounds))return Promise.reject(Error('Invalid window bounds'));const value={schema:1,bounds:Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.round(bounds[k])])),maximized:maximized===true};const next=this.queue.catch(()=>{}).then(async()=>{await ensureParents(this.root,this.path);await atomicJson(this.path,value);});this.queue=next;return next;}
}
