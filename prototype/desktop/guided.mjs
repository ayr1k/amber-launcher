// SPDX-License-Identifier: MPL-2.0
import {g} from './guided-text.mjs';
import {cpus,totalmem} from 'node:os';
import {join} from 'node:path';
import {statfs} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {readBoundedFile} from './bounded-io.mjs';
import {graphicsAdapters} from './graphics.mjs';
import {Modrinth} from './modrinth.mjs';
import {safePath,safeURL} from './download.mjs';
import {answers,defaults,directory,desired,score,memoryBudget,visualAllowed,matchVersion,planIssues,RULE_VERSION} from './guided-model.mjs';
const GB=1073741824;
const validId=x=>typeof x==='string'&&/^[-\w]{1,100}$/.test(x);
const stamp=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const failure=code=>{throw Error(g(code));};
const fileIdentity=f=>[f.projectId,f.versionId,f.relative,f.hash,f.size,f.url];
export class GuidedCreation {
  constructor(core,content,workflows,{hardware,space}={}){
    this.core=core;this.content=content;this.workflows=workflows;this.plans=new Map();
    this.readHardware=hardware|| (async()=>({cpu:cpus()[0]?.model||'',memoryGB:Math.round(totalmem()/GB),adapters:await graphicsAdapters().catch(()=>[])}));
    this.space=space|| (async()=>{const f=await statfs(core.root);return f.bavail*f.bsize;});
    workflows.guided=this;
  }
  async hardware(){return {...await this.readHardware(),freeBytes:await this.space()};}
  async draft(value){const path=join(this.core.root,'guided-draft.json');if(value!==undefined){const a=answers(value);await atomicJson(path,{schema:1,answers:a});return a;}try{const data=JSON.parse(await readBoundedFile(path,32000));return answers(data.answers);}catch(e){if(e.code==='ENOENT')return {...defaults};throw Error(g('draftInvalid'));}}
  async search(query,type='mod'){
    if(typeof query!=='string'||query.trim().length<2||query.length>100||!['mod','modpack'].includes(type))return [];
    const result=await this.content.api('search?'+new URLSearchParams({query:query.trim(),limit:'12',facets:JSON.stringify([[`project_type:${type}`]]),index:'relevance'}));
    return (result.hits||[]).map(x=>({id:x.project_id,title:x.title,description:x.description}));
  }
  session(){const cache=new Map();return async path=>{if(!cache.has(path)){if(cache.size>1000)failure('tooMany');cache.set(path,this.content.api(path));}return cache.get(path);};}
  remember(plan){for(const [key,p] of this.plans)if(p.expiresAt<Date.now())this.plans.delete(key);while(this.plans.size>=30)this.plans.delete(this.plans.keys().next().value);plan.availableRoots??=structuredClone(plan.roots);plan.id=randomUUID();plan.expiresAt=Date.now()+30*60000;this.plans.set(plan.id,structuredClone(plan));return plan;}
  get(id){const p=this.plans.get(id);if(!p||p.expiresAt<Date.now())failure('expired');return structuredClone(p);}
  async resolve(target,a,roots,optional=[],excluded=[],api=this.session()){
    // Prefer explicitly required dependency versions over a root's newest release.
    // Root choices are project choices, not user-specified file-version requirements.
    const pinned=new Map(),visited=new Set();
    const collect=async vid=>{if(!validId(vid))failure('invalidProject');if(visited.has(vid))return;if(visited.size>=100)failure('tooMany');visited.add(vid);const v=await api('version/'+vid);for(const [i,d]of (v.dependencies||[]).entries()){if(!d.version_id||!(d.dependency_type==='required'&&!excluded.includes(vid+':'+i)||d.dependency_type==='optional'&&optional.includes(vid+':'+i)))continue;const dep=await api('version/'+d.version_id);if(d.project_id&&d.project_id!==dep.project_id)failure('invalidProject');const previous=pinned.get(dep.project_id);if(previous&&previous!==dep.id)failure('duplicateVersion');pinned.set(dep.project_id,dep.id);await collect(dep.id);}};
    for(const r of roots)await collect(r.versionId);
    roots=roots.map(r=>({...r,versionId:pinned.get(r.projectId)||r.versionId}));
    const core={root:this.core.root,metadata:async()=>({dir:join(this.core.root,'guided-preview'),item:{...target,loaderVersion:target.version}})};
    const virtual=new Modrinth(core);virtual.api=api;virtual.manifest=async()=>({schema:1,files:[]});
    virtual.compatible=(v,item,type)=>matchVersion({project_type:type,...(projects.get(v.project_id)||{})},v,target,a);
    const projects=new Map();const originalApi=api;
    virtual.api=async path=>{const v=await originalApi(path);if(path.startsWith('project/')&&!path.includes('/version'))projects.set(v.id,v);return v;};
    virtual.versions=async(_id,pid)=>{const p=await virtual.api('project/'+pid);return (pinned.has(pid)?[await api('version/'+pinned.get(pid))]:await api('project/'+pid+'/version?'+new URLSearchParams({game_versions:JSON.stringify([target.game]),...(p.project_type==='mod'?{loaders:JSON.stringify([target.loader])}:{}),include_changelog:'false'}))).filter(v=>matchVersion(p,v,target,a)).sort((x,y)=>Date.parse(y.date_published)-Date.parse(x.date_published));};
    const plan=await virtual.preview('guided',roots.map(r=>r.versionId),optional,excluded,true);
    plan.files=plan.files.map(f=>({...f,slug:projects.get(f.projectId)?.slug||''}));
    // The shader API lists engine support; never assume a ZIP is usable with any loader.
    const issues=planIssues(plan.files,target,a);
    return {roots,files:plan.files,required:plan.required,optional:plan.optional,excludedRequired:excluded,selectedOptional:optional,blockers:plan.blockers,issues};
  }
  async recommend(input){
    const a=answers(input);await this.draft(a);const hardware=await this.readHardware(),api=this.session();
    const catalog=(await this.core.versions()).versions;
    if(a.serverVersion&&!catalog.some(v=>v.id===a.serverVersion))failure('unknownServerVersion');
    if(a.serverLoaderVersion&&a.serverLoader==='unknown')failure('loaderRequired');
    const slugs=[...new Set([...desired(a,'balanced',hardware.memoryGB),...a.must])];
    const projects=[];const unavailable=[];
    for(const slug of slugs){try{const p=await api('project/'+slug);if(!validId(p.id)||!['mod','resourcepack','shader'].includes(p.project_type))failure('invalidProject');projects.push({...p,reason:directory.find(x=>x.slug===p.slug)?.reason||'reasonRequired',must:a.must.includes(slug)||a.must.includes(p.id)});}catch(e){if(a.must.includes(slug))throw e;unavailable.push(slug);}}
    const required=projects.filter(p=>p.must);
    let games=catalog.filter(v=>a.serverVersion?v.id===a.serverVersion:a.freshness==='preview'?['release','snapshot'].includes(v.type):v.type==='release');
    games=games.filter(v=>required.every(p=>p.game_versions?.includes(v.id)));
    if(!games.length)failure('noCommonVersion');
    // Include current releases and older intersections relevant to requested content.
    const ranked=games.map((v,i)=>({v,rank:projects.filter(p=>p.game_versions?.includes(v.id)).length*8-i*(a.freshness==='stable'?1:4)})).sort((x,y)=>y.rank-x.rank);
    games=[...new Map([...games.slice(0,2),...ranked.slice(0,4).map(x=>x.v)].map(v=>[v.id,v])).values()].slice(0,6);
    const candidates=[];const failures=[];
    const kinds=a.change==='vanilla'?['vanilla']:['balanced','light'];
    for(const game of games)for(const loader of (a.serverLoader!=='unknown'?[a.serverLoader]:a.change==='vanilla'?['vanilla']:['fabric','neoforge','forge'])){
      if(required.some(p=>p.project_type==='mod'&&!p.loaders?.includes(loader)))continue;
      let version=null;try{if(loader!=='vanilla'){const vs=await this.workflows.choices(game.id,loader);const requested=a.serverLoaderVersion;version=vs.find(v=>requested?v.version===requested||(loader==='forge'&&v.version===game.id+'-'+requested):v.stable)?.version;if(!version&&!requested&&a.freshness==='preview')version=vs[0]?.version;if(!version)continue;}}
      catch(e){failures.push(e.message);continue;}
      for(const kind of loader==='vanilla'?['vanilla']:kinds){
        const target={game:game.id,loader,version},wanted=desired(a,kind,hardware.memoryGB);const roots=[];let invalid=false;
        for(const p of projects.filter(p=>p.must||wanted.includes(p.slug))){const q=new URLSearchParams({game_versions:JSON.stringify([game.id]),...(p.project_type==='mod'?{loaders:JSON.stringify([loader])}:{}),include_changelog:'false'});
          try{const rows=(await api('project/'+p.id+'/version?'+q)).filter(v=>matchVersion(p,v,target,a)).sort((x,y)=>Date.parse(y.date_published)-Date.parse(x.date_published));const v=rows[0];if(!v){if(p.must)invalid=true;continue;}roots.push({projectId:p.id,versionId:v.id,title:p.title,slug:p.slug,type:p.project_type,reason:p.reason,must:p.must});}catch(e){if(p.must)throw e;failures.push(e.message);}
        }
        if(invalid)continue;
        // Empty enhanced variants should never masquerade as successful recommendations.
        if(loader!=='vanilla'&&!roots.length)continue;
        let resolved;try{resolved=await this.resolve(target,a,roots,[],[],api);}catch(e){failures.push(e.message);continue;}if(resolved.blockers.length||resolved.issues.errors.length){failures.push(...resolved.blockers,...resolved.issues.errors);continue;}
        const matched=wanted.length?roots.filter(r=>wanted.includes(r.slug)).length/wanted.length:1;
        const metrics={play:matched,performance:kind==='light'||kind==='vanilla'?1:visualAllowed(a,hardware.memoryGB)?.7:.9,stability:game.type==='release'?.85:.3,visual:roots.some(r=>r.type==='shader')?1:roots.some(r=>r.type==='resourcepack')?.65:.25,ease:Math.max(.1,1-roots.length*.055)};
        const warnings=[...(a.play!=='single'?['serverRules']:[]),...(!a.serverVersion&&a.play!=='single'?['serverUnknown']:[]),...(a.serverLoader==='unknown'&&a.play!=='single'?['serverLoaderUnknown']:[]),...(a.shaders==='on'&&!visualAllowed(a,hardware.memoryGB)?['visualConservative']:[]),...(unavailable.length||failures.length?['someUnavailable']:[]),...(a.content.some(x=>['technology','magic','combat'].includes(x))&&a.change==='expanded'?['packSuggested']:[])];
        candidates.push({schema:1,ruleVersion:RULE_VERSION,answers:a,target,kind,roots,...resolved,omitted:wanted.filter(slug=>!roots.some(r=>r.slug===slug)),warnings,score:score(metrics,a),memory:memoryBudget(a,hardware.memoryGB),createdAt:new Date().toISOString(),tested:false});
      }
    }
    if(!candidates.length){failure('noPlan');}
    const free=await this.space();const unique=new Map();for(const c of candidates.sort((x,y)=>y.score-x.score)){const key=c.target.game+':'+c.target.loader+':'+c.roots.map(x=>x.versionId).sort().join(',');if(!unique.has(key))unique.set(key,c);}
    const all=[...unique.values()];const selected=[all[0]];for(const kind of ['light','balanced','vanilla']){const c=all.find(x=>x.kind===kind&&!selected.includes(x));if(c)selected.push(c);}
    return selected.slice(0,3).map(p=>this.remember({...p,freeBytes:free,issues:{...p.issues,errors:[...p.issues.errors,...(free<p.issues.reserve?['diskLimit']:[])]}}));
  }
  async edit(id,selection){
    const p=this.get(id);if(!selection||!Array.isArray(selection.roots)||selection.roots.some(v=>!(p.availableRoots||p.roots).some(r=>r.versionId===v))||p.roots.some(r=>r.must&&!selection.roots.includes(r.versionId)))failure('invalidSelection');
    const roots=(p.availableRoots||p.roots).filter(r=>selection.roots.includes(r.versionId));const resolved=await this.resolve(p.target,p.answers,roots,selection.optional||[],selection.excluded||[]);
    const free=await this.space();if(free<resolved.issues.reserve)resolved.issues.errors.push('diskLimit');
    return this.remember({...p,...resolved,availableRoots:(p.availableRoots||p.roots).map(r=>resolved.roots.find(x=>x.projectId===r.projectId)||r),freeBytes:free});
  }
  validateSaved(p){
    if(p?.schema!==1||p.ruleVersion!==RULE_VERSION||!p.target||!Array.isArray(p.files)||p.files.length>100||!Array.isArray(p.roots)||p.roots.length>32)failure('invalidPlan');
    const a=answers(p.answers);if((a.serverVersion&&a.serverVersion!==p.target.game)||(a.serverLoader!=='unknown'&&a.serverLoader!==p.target.loader)||(a.serverLoaderVersion&&p.target.version!==a.serverLoaderVersion&&p.target.version!==p.target.game+'-'+a.serverLoaderVersion))failure('changedTarget');if(!['vanilla','fabric','forge','neoforge'].includes(p.target.loader)||typeof p.target.game!=='string'||!Number.isInteger(p.memory)||p.memory<1||p.memory>32)failure('invalidPlan');
    for(const f of p.files){if(!validId(f.projectId)||!validId(f.versionId)||!['mod','shader','resourcepack'].includes(f.type)||!Number.isSafeInteger(f.size)||f.size<1||!/^[a-f0-9]{40}$/.test(f.hash)||!Array.isArray(f.dependencies)||!Array.isArray(f.ignoredRequired))failure('invalidPlan');safePath(this.core.root,f.relative);safeURL(f.url);}
    for(const r of p.roots)if(!validId(r.versionId)||!p.files.some(f=>f.versionId===r.versionId))failure('invalidPlan');
    return p;
  }
  async recheck(p){
    this.validateSaved(p);const api=this.session();
    for(const f of p.files){this.workflows.checkCancelled();const v=await api('version/'+f.versionId),project=await api('project/'+f.projectId);if(v.project_id!==f.projectId||!matchVersion(project,v,p.target,p.answers))failure('changedFile');const file=v.files?.find(x=>x.primary)||v.files?.[0];const folder={mod:'mods',shader:'shaderpacks',resourcepack:'resourcepacks'}[project.project_type];if(!file||stamp(fileIdentity(f))!==stamp([project.id,v.id,folder+'/'+file.filename,file.hashes?.sha1,file.size,file.url])||stamp(v.dependencies||[])!==stamp(f.dependencies)||project.slug!==f.slug)failure('changedFile');}
    const issues=planIssues(p.files,p.target,p.answers);if(issues.errors.length)failure(issues.errors[0]);if(await this.space()<issues.reserve)failure('diskLimit');return p;
  }
  async create(id,{name,icon='grass',threads=8,acknowledge=false}={}){
    const p=this.get(id);if(p.blockers.length||p.issues.errors.length)failure('notCompatible');if(p.issues.warnings.length&&!acknowledge)failure('acknowledge');
    // create() enters the existing exclusive workflow before rechecking or creating files.
    return this.workflows.create({name,icon,threads,...p.target},null,null,null,p);
  }
  async installGroup(id,p,type){
    const files=p.files.filter(f=>f.type===type);if(!files.length)return;
    const {dir,item}=await this.core.metadata(id);if(item.game!==p.target.game||item.loader!==p.target.loader||(item.loaderVersion||null)!==(p.target.version||null))failure('changedTarget');
    const manifest=await this.content.manifest(dir);const plan={id:randomUUID(),instanceId:id,game:item.game,loader:item.loader,loaderVersion:item.loaderVersion,loaderSha1:item.loaderSha1,manifestStamp:stamp(manifest.files),files,compatible:true,expiresAt:Date.now()+600000};
    this.content.plans.set(plan.id,plan);return this.content.install(id,plan.id);
  }
  async report(id){try{const data=JSON.parse(await readBoundedFile(join(await this.core.instancePath(id),'guided-plan.json'),2000000));return this.validateSaved(data);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async skipVisuals(id){return this.workflows.exclusive(async()=>{const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);const record=JSON.parse(await readBoundedFile(join(dir,'setup-report.json'),3000000));if(!record.guided||record.state==='done'||!['resources','shaders'].includes(record.step))failure('cannotSkip');const p=this.validateSaved(record.guided);const removed=p.files.filter(f=>f.type!=='mod').map(f=>f.versionId);const remaining=p.files.filter(f=>f.type==='mod');if(planIssues(remaining,p.target,p.answers).errors.length)failure('cannotSkip');p.files=remaining;p.roots=p.roots.filter(r=>!removed.includes(r.versionId));p.skippedVisuals=true;p.issues=planIssues(p.files,p.target,p.answers);record.guided=p;await atomicJson(join(dir,'guided-plan.json'),p);await atomicJson(join(dir,'setup-report.json'),record);this.workflows.resumes.delete(id);this.workflows.lastSetup=id;return this.workflows.runPlan(id,record);});}
}
