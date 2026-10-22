// SPDX-License-Identifier: MPL-2.0
import {instanceIcons} from '../desktop/appearance.mjs';
const labels={grass:'草方块',dirt:'土方块',anvil:'铁砧',pickaxe:'铁镐'};
export function InstanceIcon({icon='grass'}) {
 const key=instanceIcons.includes(icon)?icon:'grass';
 return <span className={'instance-icon icon-'+key} aria-hidden="true">{key==='grass'?<img src="/assets/grass-block.png" alt=""/>:<span className="icon-glyph" style={{maskImage:`url(/icons/${key==='dirt'?'box':key}.svg)`}}/>}</span>;
}
export function IconPicker({value,onChange}) {
 return <div className="icon-picker" role="group" aria-label="实例图标">{instanceIcons.map(key=><button type="button" key={key} aria-pressed={value===key} aria-label={labels[key]} title={labels[key]} onClick={()=>onChange(key)}><InstanceIcon icon={key}/><span>{labels[key]}</span></button>)}</div>;
}
