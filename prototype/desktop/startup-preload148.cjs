// SPDX-License-Identifier: MPL-2.0
const {ipcRenderer}=require('electron');
window.addEventListener('DOMContentLoaded',()=>{
  const update=value=>{
    const s=value.style,root=document.documentElement;
    for(const key of ['background','text','muted','accent'])root.style.setProperty('--'+key,s[key]);
    root.style.setProperty('--radius',s.radius+'px');root.style.setProperty('--font-size',s.fontSize+'px');root.dataset.motion=s.motion?'on':'off';root.lang=value.language;
    document.getElementById('brand').textContent=value.product;
    document.querySelector('img').src='../dist/client/brand/amber-mark'+(s.dark?'-reverse':'')+'.svg';
    document.getElementById('status').textContent=value.text;
    document.getElementById('slow').textContent=value.slow;
  };
  ipcRenderer.on('amber:startup-state',(_event,value)=>update(value));
  ipcRenderer.on('amber:startup-slow',()=>document.getElementById('slow').hidden=false);
  ipcRenderer.invoke('amber:startup-state').then(value=>{update(value);requestAnimationFrame(()=>requestAnimationFrame(()=>ipcRenderer.send('amber:startup-painted')));});
});
