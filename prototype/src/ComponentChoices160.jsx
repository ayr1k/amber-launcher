// SPDX-License-Identifier: MPL-2.0
import {useState} from 'react';
import {Select} from './Select';
import {ControlButton as Button} from './ControlButton.mjs';
import {getLocale} from '../desktop/localization.mjs';
const st=(zh,en)=>getLocale()==='en-US'?en:zh;
export function EasyTierChoices160({network,busy,act}){
 const [rows,setRows]=useState(null),[version,setVersion]=useState('2.6.4'),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function load(){setLoading(true);setError('');try{setRows(await window.amberDesktop.server('networkChoices160'));}catch(e){setError(e.message);}finally{setLoading(false);}}
 const locked=busy||network?.installing||['connecting','running','stopping'].includes(network?.room?.state);
 return <div className="component-choices160"><p>EasyTier {network?.version||'2.6.4'} · {network?.installed?st('已安装','Installed'):st('未安装','Not installed')}</p><label>{st('下载版本','Download version')}<Select aria-label={st('EasyTier 下载版本','EasyTier download version')} value={version} disabled={locked||loading} onChange={e=>setVersion(e.target.value)}><option value="2.6.4">2.6.4 · {st('推荐默认','Recommended default')}</option>{rows?.filter(r=>r.version!=='2.6.4').map(r=><option key={r.version} value={r.version} disabled={r.disabled}>{r.version}{r.prerelease?' · '+st('预发布','Prerelease'):''}{r.disabled?' · '+st('缺少可信校验','No trusted checksum'):''}</option>)}</Select></label><div className="inline-actions"><Button className="text-button" disabled={loading||locked} onClick={load}>{st('读取官方其他版本','Load other official releases')}</Button><Button className="button" disabled={locked||loading||version!=='2.6.4'&&!rows?.some(r=>r.version===version&&!r.disabled)} onClick={()=>act(()=>window.amberDesktop.server('networkInstall',version))}>{st('下载并切换','Download and switch')}</Button></div><p>{st('先断开房间才能切换。旧版本保留；下载、SHA-256 和命令行能力检查成功后才切换。双方应使用兼容版本，预发布版需自行验证。','Disconnect the room before switching. The previous version is retained; switching requires a successful download, SHA-256 and CLI capability checks. Participants need compatible versions; test prereleases separately.')}</p>{rows?.length===0&&<p>{st('官方清单没有当前平台架构的文件。','The official list has no assets for this platform and architecture.')}</p>}{error&&<p role="alert" className="error">{error}</p>}</div>;
}
