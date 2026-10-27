// SPDX-License-Identifier: MPL-2.0
import {g} from './guided-text.mjs';
import {answers,matchVersion,memoryBudget,RULE_VERSION} from './guided-model.mjs';
import {features,tiers,featureFor,requestedFeatures,visualBudget,impact} from './guided-catalog.mjs';


const fail=k=>{throw Error(g(k));};
const newest=vs=>vs.sort((a,b)=>Date.parse(b.date_published)-Date.parse(a.date_published));
export async function recommend(guide,input,existing=null){
 const visuals=guide.visualRules;const a=answers(input);if(!existing)await guide.draft(a);
 const hardware=await guide.readHardware(),api=guide.session(),catalog=(await guide.core.versions()).versions;
 if(existing){a.change=a.change==='vanilla'?'vanilla':'light';a.gameplay=[];a.must=[];a.serverVersion=existing.item.game;a.serverLoader=existing.item.loader;a.serverLoaderVersion=existing.item.loaderVersion||'';}
 if(a.serverVersion&&!catalog.some(v=>v.id===a.serverVersion))fail('unknownServerVersion');
 if(a.serverLoaderVersion&&a.serverLoader==='unknown')fail('loaderRequired');
 const projectCache=new Map();
 async function project(slug){if(!projectCache.has(slug))projectCache.set(slug,api('project/'+slug).catch(e=>{guide.propagate(e);return null;}));return projectCache.get(slug);}
 guide.phase('matching');
 const wanted=[...new Set(tiers.flatMap(t=>requestedFeatures(a,t)))];
 const ids=[...new Set([...wanted.flatMap(k=>features[k].slugs),...a.must])];
 // Bounded batches keep latency down without an unbounded request fan-out.
 for(let i=0;i<ids.length;i+=6)await Promise.all(ids.slice(i,i+6).map(project));
 const required=[];for(const id of a.must){const p=await project(id);if(!p)fail('invalidProject');required.push(p);}
 let games=catalog.filter(v=>existing?v.id===existing.item.game:a.serverVersion?v.id===a.serverVersion:a.freshness==='preview'?['release','snapshot'].includes(v.type):v.type==='release');
 games=games.filter(v=>required.every(p=>p.game_versions?.includes(v.id)));
 if(!games.length)fail('noCommonVersion');
 const ps=await Promise.all(ids.map(project));
 const ranked=games.map((v,i)=>({v,n:wanted.filter(k=>features[k].slugs.some(slug=>ps.some(p=>p?.slug===slug&&p.game_versions?.includes(v.id)))).length*10-i*(a.freshness==='stable'?.8:3)})).sort((x,y)=>y.n-x.n);
 games=[...new Map([...ranked.slice(0,4).map(x=>x.v),...games.slice(0,2)].map(v=>[v.id,v])).values()];
 const candidates=[];
 const installed=existing?.files||[];
 const installedPins=new Map(installed.map(f=>[f.projectId,f.versionId]));
 for(const game of games)for(const loader of existing?[existing.item.loader]:a.serverLoader!=='unknown'?[a.serverLoader]:a.change==='vanilla'?['vanilla']:['fabric','neoforge','forge']){
  if(required.some(p=>p.project_type==='mod'&&!p.loaders?.includes(loader)))continue;
  let version=existing?.item.loaderVersion||null;
  if(!existing&&loader!=='vanilla'){
   try{const rows=await guide.workflows.choices(game.id,loader);version=rows.find(v=>a.serverLoaderVersion?v.version===a.serverLoaderVersion||(loader==='forge'&&v.version===game.id+'-'+a.serverLoaderVersion):v.stable)?.version;if(!version&&a.freshness==='preview'&&!a.serverLoaderVersion)version=rows[0]?.version;if(!version)continue;}catch(e){guide.propagate(e);continue;}
  }
  const target={game:game.id,loader,version};
  async function root(slug,{exact,feature,must=false,index=0}={}){
   const p=await project(slug);if(!p||!['mod','shader','resourcepack'].includes(p.project_type))return null;
   const saved=installed.find(f=>f.projectId===p.id);
   const query=new URLSearchParams({game_versions:JSON.stringify([game.id]),...(p.project_type==='mod'?{loaders:JSON.stringify([loader])}:{}),include_changelog:'false'});
   try{
    const rows=saved?[await api('version/'+saved.versionId)]:exact?[await api('version/'+exact)]:await api('project/'+p.id+'/version?'+query);
    const v=newest(rows.filter(v=>v.project_id===p.id&&matchVersion(p,v,target,a)&&(!exact||v.id===exact)))[index];
    if(!v||saved?.enabled===false)return null;
    const f=feature||featureFor(p.slug),def=features[f];
    return {projectId:p.id,versionId:v.id,title:p.title,slug:p.slug,type:p.project_type,feature:f||'custom',group:def?.group||'visual',reason:def?.reason||'reasonRequired',must,icon:p.icon_url||null,installed:!!saved};
   }catch(e){guide.propagate(e);return null;}
  }
  for(const tier of tiers){
   guide.phase('dependencies');
   const roots=[],omitted=[],substitutions=[],warnings=[];
   let invalid=false;
   for(const p of required){const r=await root(p.id,{must:true});if(!r){invalid=true;break;}roots.push(r);}
   if(invalid)continue;
   const requested=loader==='vanilla'?[]:requestedFeatures(a,tier);
   for(const key of requested){
    const def=features[key],present=roots.find(r=>r.feature===key);
    if(present)continue;
    const keep=installed.find(f=>featureFor(f.slug)===key);
    if(keep?.enabled===false){omitted.push({feature:key,reason:'disabledKept'});continue;}
    const order=keep?[keep.slug]:key==='recipes'&&a.recipePreference!=='auto'?[a.recipePreference,...def.slugs.filter(s=>s!==a.recipePreference)]:def.slugs;
    let r=null;for(const slug of order){for(let index=0;index<3;index++){
      const candidate=await root(slug,{feature:key,index});if(!candidate)break;
      // A matching root file is insufficient: its dependencies and earlier choices must fit too.
      try{const check=await guide.resolve(target,a,[...roots,candidate],[],[],api,installedPins);if(check.blockers.length||check.issues.errors.length)continue;}catch(e){guide.propagate(e);continue;}
      r=candidate;break;
    }if(r)break;}
    if(!r){omitted.push({feature:key,reason:'noCompatibleFeature'});continue;}
    roots.push(r);if(r.slug!==order[0])substitutions.push({feature:key,from:order[0],to:r.title,reason:'substitutionReason'});
   }
   guide.phase('visuals');
   const budget=visualBudget(a,tier,hardware.memoryGB);
   let visual={profile:'off',lod:'off',configured:false};
   if(loader!=='vanilla'&&(budget.shaders||budget.lod)&&!existing){
    const lodOrder=budget.lod?(a.lod==='auto'?['dh','voxy']: [a.lod]):['off'];
    let chosen=null;
    for(const lod of [...new Set([...lodOrder,'off'])]){
     if(lod==='voxy'&&!a.opengl46)continue;
     const combo=visuals.combinations.find(c=>c.game===game.id&&c.loader===loader&&c.lod===lod);if(!combo)continue;
     const rows=[];if(budget.shaders){rows.push(await root('iris',{exact:combo.iris}));rows.push(await root(visuals.shader.projectId,{exact:visuals.shader.versionId}));}
     if(lod!=='off')rows.push(await root(lod==='dh'?'distanthorizons':'voxy',{exact:combo.lodId}));
     if(!rows.length||rows.some(r=>!r))continue;
     // User-required projects are never replaced to fit a visual profile.
     if(rows.some(r=>roots.some(old=>old.projectId===r.projectId&&old.versionId!==r.versionId)))continue;
     try{const combined=await guide.resolve(target,a,[...roots.filter(r=>!rows.some(x=>x.projectId===r.projectId)),...rows],[],[],api,installedPins);if(combined.blockers.length||combined.issues.errors.length)continue;}catch(e){guide.propagate(e);continue;}
     chosen={rows,combo};break;
    }
    if(chosen){for(const r of chosen.rows)if(!roots.some(x=>x.projectId===r.projectId))roots.push({...r,reason:r.type==='shader'?'reasonShader':r.slug==='iris'?'reasonShaderSupport':'lodHelp',group:'visual'});visual={profile:budget.shaders?budget.profile:'off',lod:chosen.combo.lod,combo:chosen.combo,configured:false};}
    if(budget.lod&&visual.lod==='off')warnings.push('lodUnavailable');
    if(budget.shaders&&visual.profile==='off')warnings.push('shaderUnavailable');
   }else if(a.shaders==='on'||a.lod!=='off')warnings.push(existing?'addonVisualManual':'visualConservative');
   if(loader!=='vanilla'&&!existing){
    const slug=a.texture==='simple'?'bare-bones':a.texture==='faithful'&&budget.allowed?'faithful-32x':null;
    if(slug){const r=await root(slug);if(r)roots.push({...r,reason:a.texture==='simple'?'reasonSimpleTexture':'reasonFaithfulTexture',group:'visual'});else omitted.push({feature:'texture',reason:'noCompatibleFeature'});}
   }
   if(loader!=='vanilla'&&!roots.length)continue;
   let resolved;try{resolved=await guide.resolve(target,a,roots,[],[],api,installedPins);}catch(e){guide.propagate(e);continue;}
   if(resolved.blockers.length||resolved.issues.errors.length)continue;
   const visualErrors=guide.visualIssues(resolved.files,visual);if(visualErrors.length)continue;
   if(a.play!=='single')warnings.push('serverRules');
   if(a.play!=='single'&&!a.serverVersion)warnings.push('serverUnknown');
   if(a.features.some(k=>['identify','food'].includes(k))&&a.play!=='single')warnings.push('partialServer');
   const coverage=requested.filter(k=>resolved.roots.some(r=>r.feature===k)).reduce((sum,k)=>sum+(features[k].group==='visual'?1:features[k].group==='gameplay'?200:100),0);
   const metrics={impact:impact(resolved.roots),load:visual.lod!=='off'||visual.profile==='HIGH'||resolved.roots.some(r=>r.feature==='machinery')?'high':visual.profile!=='off'||resolved.roots.some(r=>r.group==='gameplay')?'medium':'low'};
   candidates.push({schema:1,ruleVersion:RULE_VERSION,answers:a,target,kind:tier,roots,...resolved,omitted,substitutions,visual,metrics,warnings,score:coverage+(visual.profile!=='off'?12:0)+(visual.lod!=='off'?10:0)-catalog.findIndex(v=>v.id===game.id)*(a.freshness==='stable'?2:5),memory:memoryBudget(a,hardware.memoryGB),createdAt:new Date().toISOString(),tested:false,existing:existing?{id:existing.item.id,stamp:existing.stamp}:null});
  }
 }
 guide.checkGeneration();if(!candidates.length)fail('noPlan');
 const sorted=candidates.sort((x,y)=>y.score-x.score);
 const anchor=sorted.find(p=>p.kind==='balanced')||sorted[0];
 const selected=tiers.map(t=>{const best=sorted.find(p=>p.kind===t),same=sorted.find(p=>p.kind===t&&p.target.game===anchor.target.game&&p.target.loader===anchor.target.loader);return same&&same.score>=best.score-15?same:best;}).filter(Boolean);
 const free=await guide.space();
 return selected.map(p=>guide.remember({...p,freeBytes:free,issues:{...p.issues,errors:[...p.issues.errors,...(free<p.issues.reserve?['diskLimit']:[])]}}));
}
