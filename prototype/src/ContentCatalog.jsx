// SPDX-License-Identifier: MPL-2.0
import {ControlButton as Button} from './ControlButton.mjs';
import {Select} from './Select';
import {t as translateText,getLocale} from '../desktop/localization.mjs';

export function CatalogFilters({types,type,onType,categories=[],category,onCategory,sort,onSort,query,onQuery,busy,searching,onSearch,categoriesLoading,categoryError,onRetry,categoryLabels={}}){
 return <form className="store-search" onSubmit={e=>{e.preventDefault();onSearch();}}>
 <label>{translateText('类型')}<Select value={type} onChange={e=>onType(e.target.value)}>{Object.entries(types).map(([key,label])=><option key={key} value={key}>{label}</option>)}</Select></label>
 <label>{translateText('分类')}<Select loading={categoriesLoading} error={categoryError} onRetry={onRetry} value={category} onChange={e=>onCategory(e.target.value)}><option value="">{translateText('全部分类')}</option>{categories.filter(c=>c.project_type===type).map(c=><option key={c.name} value={c.name}>{categoryLabels[c.name]?`${categoryLabels[c.name]} · ${c.name}`:c.name}</option>)}</Select></label>
 <label>{translateText('排序')}<Select value={sort} onChange={e=>onSort(e.target.value)}>{[['relevance','相关程度'],['downloads','最多下载'],['newest','最新发布'],['updated','最近更新'],['follows','最多关注']].map(([key,label])=><option key={key} value={key}>{translateText(label)}</option>)}</Select></label>
 <label>{translateText('搜索')}<input value={query} onChange={e=>onQuery(e.target.value)} placeholder={translateText('输入即查找兼容内容')}/></label><Button className="button secondary" disabled={busy||searching}>{searching?translateText('自动查找中…'):translateText('刷新结果')}</Button>
 </form>;
}
export function CatalogResults({results,local=[],busy,onProject,onVersions}){
 return <div className="store-results">{results.hits.map(p=><article key={p.id}><Button className="project-icon" title={translateText('在 Modrinth 打开项目')} aria-label={translateText('在 Modrinth 打开 ')+p.title} onClick={()=>onProject(p.id)}>{p.icon?<img src={p.icon} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:<span>{p.title.slice(0,1)}</span>}<small>↗</small></Button><div><h3>{p.title}</h3><p>{p.description}</p><small>{p.author} · {(p.downloads||0).toLocaleString(getLocale())}{translateText('次下载')}{local.some(f=>f.projectId===p.id&&!f.missing)?translateText(' · 已安装'):''}</small></div><Button className="button secondary" disabled={busy} onClick={()=>onVersions(p)}>{translateText('查看兼容版本')}</Button></article>)}</div>;
}
export function CatalogVersionPicker({versions,value,onChange}){
 return <label>{translateText('兼容版本')}<Select value={value} onChange={e=>onChange(e.target.value)}>{versions.map((v,i)=><option key={v.id} value={v.id}>{v.version_number} · {{release:translateText('正式版'),beta:translateText('测试版'),alpha:translateText('预览版')}[v.version_type]||v.version_type}{i===0?translateText(' · 推荐'):''}</option>)}</Select></label>;
}
