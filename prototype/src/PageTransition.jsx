// SPDX-License-Identifier: MPL-2.0
import {useLayoutEffect,useRef} from 'react';
// Replay the shared page animation without remounting editors or their drafts.
export function PageTransition({trigger,className='',children}){
 const node=useRef(null);
 useLayoutEffect(()=>{const el=node.current;if(!el)return;el.classList.remove('page-enter');void el.offsetWidth;el.classList.add('page-enter');},[trigger]);
 return <div ref={node} className={className+' page-enter'}>{children}</div>;
}
