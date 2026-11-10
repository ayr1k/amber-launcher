// SPDX-License-Identifier: MPL-2.0
import {useEffect,useRef,useState} from 'react';
import {ControlButton as Button} from './ControlButton.mjs';
import {LocalPackImport} from './LocalPackImport';
import {useLocale} from './Locale';
import {message} from '../desktop/localization.mjs';
export const entryText=key=>message('entry.'+key);
export function ExistingGameImport({onClose,onCreated,onNavigate}) {
 useLocale();const ref=useRef(null),[kind,setKind]=useState(null);
 useEffect(()=>{if(!kind)ref.current?.showModal();},[kind]);
 if(kind==='pack')return <LocalPackImport onClose={()=>setKind(null)} onCreated={onCreated} onNavigate={onNavigate}/>;
 return <dialog ref={ref} className="dialog existing-game-import" aria-labelledby="existing-game-title" onCancel={onClose}><div className="dialog-head"><h2 id="existing-game-title">{entryText('title')}</h2></div><div className="dialog-body"><section><h3>{entryText('pack')}</h3><p>{entryText('packNote')}</p><Button className="button secondary" onClick={()=>setKind('pack')}>{entryText('pack')}</Button></section><p>{entryText('account')}</p><div className="dialog-actions"><Button className="text-button" onClick={onClose}>{entryText('later')}</Button></div></div></dialog>;
}
