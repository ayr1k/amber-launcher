// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef} from 'react';
import {ControlButton as Button} from './ControlButton.mjs';
import {getLocale} from '../desktop/localization.mjs';
import './release145.css';
export function Modal145({title,onClose,children,className='',onKeyDown}){
 const ref=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement;dialog.showModal();return()=>{dialog.close();if(previous?.isConnected)previous.focus();};},[]);
 return <dialog ref={ref} className={'modal145 '+className} aria-label={title} onKeyDown={onKeyDown} onCancel={e=>{e.preventDefault();close.current();}}>
  <header><h2>{title}</h2><Button className="button secondary" autoFocus onClick={onClose}>{getLocale()==='en-US'?'Close':'关闭'} ×</Button></header>
  {children}
 </dialog>;
}
