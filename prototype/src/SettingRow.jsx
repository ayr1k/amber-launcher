// SPDX-License-Identifier: MPL-2.0
import {useId} from 'react';
export function SettingRow({title,description,children}) {
  return <div className="setting-row"><div className="setting-copy"><strong>{title}</strong>{description&&<p>{description}</p>}</div><div className="setting-control">{children}</div></div>;
}
export function CheckSetting({title,description,checked,disabled,onChange}) {
  const id=useId();
  return <label className="check-setting"><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} aria-describedby={description?id:undefined}/><span><span className="check-title">{title}</span>{description&&<small id={id}>{description}</small>}</span></label>;
}
