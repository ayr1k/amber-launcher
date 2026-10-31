// SPDX-License-Identifier: MPL-2.0
import {Children,Fragment,createElement,isValidElement} from 'react';

// Explicit text boxes allow optical alignment without moving icons, focus rings or hit areas.
// Keep existing elements intact: selector labels and navigation icons have their own anatomy.
export function controlLabels(children){
 const flatten=value=>Children.toArray(value).flatMap(child=>isValidElement(child)&&child.type===Fragment?flatten(child.props.children):[child]);
 const result=[];let text='';
 const flush=()=>{if(text){result.push(text.trim()?createElement('span',{'data-control-text':'',key:'text-'+result.length},text):text);text='';}};
 for(const child of flatten(children)){
  if(typeof child==='string'||typeof child==='number')text+=child;
  else {flush();result.push(child);}
 }
 flush();return result;
}
export function ControlButton({children,...props}){
 return createElement('button',props,controlLabels(children));
}
