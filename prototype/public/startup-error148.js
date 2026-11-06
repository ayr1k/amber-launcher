// SPDX-License-Identifier: MPL-2.0
// Loaded before the application module graph. Electron's isolated preload
// cannot observe every main-world module evaluation/resource failure.
window.addEventListener('error',event=>{
  if(event.error||event.target?.tagName==='SCRIPT'||event.target?.tagName==='LINK'&&event.target.rel==='stylesheet')window.amberDesktop?.startupFailed?.().catch(()=>{});
},true);
window.addEventListener('unhandledrejection',()=>window.amberDesktop?.startupFailed?.().catch(()=>{}));
