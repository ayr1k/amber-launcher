// SPDX-License-Identifier: MPL-2.0
import {useLayoutEffect,useRef} from 'react';
// Replay the shared page animation without remounting editors or their drafts.
export function PageTransition({trigger,className='',children,animateInitial=true}){
 const node=useRef(null),mounted=useRef(false),initial=useRef(animateInitial);
 useLayoutEffect(()=>{const el=node.current;if(!el)return;const first=!mounted.current;mounted.current=true;if(first&&!initial.current)return;el.classList.remove('page-enter');void el.offsetWidth;el.classList.add('page-enter');},[trigger]);
 return <div ref={node} className={className+(initial.current?' page-enter':'')}>{children}</div>;
}
