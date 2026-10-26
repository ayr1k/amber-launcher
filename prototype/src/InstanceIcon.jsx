import { useLocale } from "./Locale";import { t as translateText, translateMessage, getLocale } from "../desktop/localization.mjs"; // SPDX-License-Identifier: MPL-2.0
import { instanceIcons } from '../desktop/appearance.mjs';
const labels = { get grass() {return translateText("草方块");}, get dirt() {return translateText("土方块");}, get anvil() {return translateText("铁砧");}, get pickaxe() {return translateText("铁镐");} };
export function InstanceIcon({ icon = 'grass' }) {useLocale();
  const key = instanceIcons.includes(icon) ? icon : 'grass';
  return <span className={'instance-icon icon-' + key} aria-hidden="true">{key === 'grass' ? <img src="/assets/grass-block.png" alt="" /> : <span className="icon-glyph" style={{ maskImage: `url(/icons/${key === 'dirt' ? 'box' : key}.svg)` }} />}</span>;
}
export function IconPicker({ value, onChange }) {useLocale();
  return <div className="icon-picker" role="group" aria-label={translateText("实例图标")}>{instanceIcons.map((key) => <button type="button" key={key} aria-pressed={value === key} aria-label={labels[key]} title={labels[key]} onClick={() => onChange(key)}><InstanceIcon icon={key} /><span>{labels[key]}</span></button>)}</div>;
}
