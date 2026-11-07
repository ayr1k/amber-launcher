import {Select} from './Select';
// SPDX-License-Identifier: MPL-2.0
import {useState} from 'react';
import {th} from './ThemeCanvas';
export function useListDensity(key){const [density,setDensity]=useState(()=>{try{return localStorage.getItem('amber.list-density.'+key)==='compact'?'compact':'comfortable';}catch{return 'comfortable';}});return [density,value=>{setDensity(value);try{localStorage.setItem('amber.list-density.'+key,value);}catch{}}];}
export function ListDensity({value,onChange}){return <div className="list-density-row"><label className="list-density">{th('列表密度','List density')} <Select value={value} onChange={e=>onChange(e.target.value)}><option value="comfortable">{th('舒适','Comfortable')}</option><option value="compact">{th('紧凑','Compact')}</option></Select></label></div>;}
