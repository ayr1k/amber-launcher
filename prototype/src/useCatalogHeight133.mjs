// SPDX-License-Identifier: MPL-2.0
import {useLayoutEffect,useRef} from 'react';
export function useCatalogHeight(enabled) {
 const ref=useRef(null);
 useLayoutEffect(()=>{const el=ref.current;if(!el||!enabled)return;let frame,settle;
 const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!el.getClientRects().length)return;const scroll=el.closest('.workspace-scroll');if(scroll)scroll.scrollTop=0;const top=el.getBoundingClientRect().top;el.style.setProperty('--catalog-height',Math.max(180,innerHeight-top-76)+'px');});};
 const observer=new ResizeObserver(measure);for(let p=el.parentElement;p&&p!==document.body;p=p.parentElement)observer.observe(p);
 const changed=()=>{measure();clearTimeout(settle);settle=setTimeout(measure,350);};
 const mutation=new MutationObserver(changed),shell=document.querySelector('.desktop-app');if(shell)mutation.observe(shell,{attributes:true});
 window.addEventListener('resize',changed);window.addEventListener('amber-settings-changed',changed);changed();
 return()=>{clearTimeout(settle);cancelAnimationFrame(frame);observer.disconnect();mutation.disconnect();window.removeEventListener('resize',changed);window.removeEventListener('amber-settings-changed',changed);el.style.removeProperty('--catalog-height');};
 },[enabled]);return ref;
}
