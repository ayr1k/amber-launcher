// SPDX-License-Identifier: MPL-2.0
import {g} from './guided-text.mjs';
import {GuidedPreferences} from './guided-preferences.mjs';
import {cpus,totalmem} from 'node:os';
import {join} from 'node:path';
import {statfs,writeFile,readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {atomicJson} from './core.mjs';
import {readBoundedFile} from './bounded-io.mjs';
import {graphicsAdapters} from './graphics.mjs';
import {Modrinth} from './modrinth.mjs';
import {safePath,safeURL,ensureParents,verified} from './download.mjs';
import {answers,defaults,directory,desired,score,memoryBudget,visualAllowed,matchVersion,planIssues,RULE_VERSION} from './guided-model.mjs';
import {impact} from './guided-catalog.mjs';
import {recommend} from './guided-recommend.mjs';
import visualRules from './guided-visuals.json' with {type:'json'};
import {validateUpdateGraph} from './mod-updates.mjs';
const GB=1073741824;
const validId=x=>typeof x==='string'&&/^[-\w]{1,100}$/.test(x);
const stamp=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const failure=code=>{throw Error(g(code));};
const fileIdentity=f=>[f.projectId,f.versionId,f.relative,f.hash,f.size,f.url];
export class GuidedCreation {
  constructor(core,content,workflows,{hardware,space,visuals=visualRules}={}){
    this.preferences=new GuidedPreferences(core.root);this.generation=null;this.lastGeneration={phase:'idle',running:false};this.visualRules=visuals;this.core=core;this.content=content;this.workflows=workflows;this.plans=new Map();
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
  generationStatus(){return {...this.lastGeneration};}
  cancelGeneration(){this.generation?.controller.abort();return true;}
  phase(phase){if(this.generation){this.checkGeneration();this.lastGeneration={running:true,phase};}}
  checkGeneration(){const job=this.generation;if(job?.controller.signal.aborted){const e=Error(g('generationCancelled'));e.guideFatal=true;throw e;}if(job?.error)throw job.error;}
  propagate(error){this.checkGeneration();if(error?.guideFatal)throw error;if(error?.status===429||error?.status>=500||error?.name==='TimeoutError'||/fetch failed|network|ECONN|ENOTFOUND|timed out/i.test(error?.message||'')){const e=Error(g(error.status===429?'generationLimited':'generationNetwork'));e.guideFatal=true;throw e;}}
  async generate(fn){
    if(this.generation)throw Error(g('generationBusy'));
    const job={controller:new AbortController()};this.generation=job;this.phase('versions');
    const work=fn();let listener;const cancelled=new Promise((_,reject)=>{listener=()=>{const e=Error(g('generationCancelled'));e.guideFatal=true;reject(e);};job.controller.signal.addEventListener('abort',listener,{once:true});});
    try{const result=await Promise.race([work,cancelled]);this.checkGeneration();this.lastGeneration={phase:'done',running:false};return result;}
    catch(e){this.lastGeneration={phase:job.controller.signal.aborted?'cancelled':'failed',running:false};this.propagate(e);throw e;}
    finally{job.controller.signal.removeEventListener('abort',listener);if(job.controller.signal.aborted){this.lastGeneration={phase:'cancelled',running:true};work.catch(()=>{}).finally(()=>{if(this.generation===job){this.generation=null;this.lastGeneration={phase:'cancelled',running:false};}});}else if(this.generation===job)this.generation=null;}
  }
  session(){const cache=new Map(),job=this.generation;return async path=>{
    if(job?.controller.signal.aborted){const e=Error(g('generationCancelled'));e.guideFatal=true;throw e;}
    if(job?.error)throw job.error;
    if(!cache.has(path)){if(cache.size>1000)failure('tooMany');cache.set(path,this.content.api(path,{signal:job?.controller.signal}).catch(error=>{
      if(error.status===404||/HTTP 404/.test(error.message))throw error;
      const e=Error(g(job?.controller.signal.aborted?'generationCancelled':error.status===429?'generationLimited':'generationNetwork'));e.guideFatal=true;if(job)job.error=e;throw e;
    }));}return cache.get(path);
  };}
  remember(plan){for(const [key,p] of this.plans)if(p.expiresAt<Date.now())this.plans.delete(key);while(this.plans.size>=30)this.plans.delete(this.plans.keys().next().value);plan.availableRoots??=structuredClone(plan.roots);plan.availableVisual??=structuredClone(plan.visual);plan.id=randomUUID();plan.expiresAt=Date.now()+30*60000;this.plans.set(plan.id,structuredClone(plan));return plan;}
  get(id){const p=this.plans.get(id);if(!p||p.expiresAt<Date.now())failure('expired');return structuredClone(p);}
  async resolve(target,a,roots,optional=[],excluded=[],api=this.session(),existingPins=new Map()){
    // Prefer explicitly required dependency versions over a root's newest release.
    // Root choices are project choices, not user-specified file-version requirements.
    const pinned=new Map(existingPins),visited=new Set();
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
    const issues=planIssues(plan.files,target,existingPins.size?{...a,downloadGB:0,diskGB:0}:a);
    return {roots,files:plan.files,required:plan.required,optional:plan.optional,excludedRequired:excluded,selectedOptional:optional,blockers:plan.blockers,issues};
  }
  async recommend(input){return this.generate(()=>recommend(this,input));}
  visualIssues(files,visual){
    const shader=files.find(f=>f.type==='shader'),lod=files.find(f=>['voxy','distanthorizons'].includes(f.slug));
    if(!visual)return []; // Existing Beta 1.9 plans retain their original behavior.
    if(!shader)return [];
    const rules=this.visualRules,c=visual.combo;
    if(!c||!rules.combinations.some(v=>JSON.stringify(v)===JSON.stringify(c))||shader.versionId!==rules.shader.versionId||shader.hash!==rules.shader.hash||!files.some(f=>f.slug==='iris'&&f.versionId===c.iris)||!rules.profiles[visual.profile])return ['visualUnverified'];
    if(lod&&lod.versionId!==c.lodId||c.lod!=='off'&&!lod)return ['visualUnverified'];
    return [];
  }
  async configureVisuals(id,p){return this.core.workbench?this.core.workbench.record(id,'visual',()=>this.configureVisualsInner(id,p)):this.configureVisualsInner(id,p);}
  async configureVisualsInner(id,p){
    if(!p.visual||p.visual.profile==='off'||!p.files.some(f=>f.type==='shader'))return;
    if(this.visualIssues(p.files,p.visual).length)failure('visualUnverified');
    const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);
    const shader=p.files.find(f=>f.type==='shader');if(!await verified({...shader,path:safePath(dir,shader.relative)}))failure('changedFile');
    const presets=this.visualRules.profiles[p.visual.profile];
    const writes=[[shader.relative+'.txt',Object.entries(presets).map(([k,v])=>k+'='+v).join('\n')+'\n'],['config/iris.properties','enableShaders=true\nshaderPack='+shader.relative.slice('shaderpacks/'.length)+'\n']];
    // Validate every existing destination before writing. Resume accepts identical bytes only.
    for(const [relative,body]of writes){const path=safePath(dir,relative);await ensureParents(dir,path);try{if(await readBoundedFile(path,32000)!==body)failure('visualSettingsExist');}catch(e){if(e.code!=='ENOENT')throw e;}}
    for(const [relative,body]of writes){const path=safePath(dir,relative);try{await writeFile(path,body,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;if(await readBoundedFile(path,32000)!==body)failure('visualSettingsExist');}}
    p.visual.configured=true;await atomicJson(join(dir,'guided-plan.json'),p);
  }
  async addonSnapshot(id){
    const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);
    if(item.status!=='installed')failure('addonNotReady');
    const manifest=await this.content.manifest(dir),rows=await this.content.list(id);
    if(rows.some(r=>r.type==='mod'&&!r.managed&&r.enabled))failure('addonUnmanaged');
    for(const f of manifest.files){if(!await verified({...f,path:safePath(dir,f.relative+(f.enabled===false?'.disabled':''))}))failure('addonChanged');}
    const api=this.session(),files=[];
    for(const f of manifest.files){const project=await api('project/'+f.projectId);files.push({...f,slug:project.slug});}
    return {item,files,stamp:stamp(manifest.files)};
  }
  async recommendAddon(id,input){return this.generate(()=>this.recommendAddonCore(id,input));}
  async recommendAddonCore(id,input){
    if((await this.workflows.pending()).some(p=>p.instanceId===id))failure('addonNotReady');
    const existing=await this.addonSnapshot(id),plans=await recommend(this,input,existing);
    const checked=[];for(const p of plans){const reviewed=await this.reviewAddon(p,existing);this.plans.set(p.id,structuredClone(reviewed));checked.push(reviewed);}return checked;
  }
  async reviewAddon(p,snapshot){
    const existing=snapshot||await this.addonSnapshot(p.existing.id);
    if(existing.stamp!==p.existing.stamp)failure('addonChanged');
    const additions=p.files.filter(f=>!existing.files.some(x=>x.projectId===f.projectId));
    for(const f of p.files){const old=existing.files.find(x=>x.projectId===f.projectId);if(old&&(old.versionId!==f.versionId||old.enabled===false))p.issues.errors.push('addonChanged');}
    const combined=[...existing.files.filter(f=>f.enabled!==false),...additions];
    const issues=planIssues(combined,p.target,{...p.answers,downloadGB:0,diskGB:0});p.issues.errors.push(...issues.errors);p.issues.warnings.push(...issues.warnings);
    // Only new bytes are downloaded; existing games do not need another game/Java reserve.
    p.issues.errors=p.issues.errors.filter(e=>!['downloadLimit','diskLimit'].includes(e));
    p.issues.size=additions.reduce((n,f)=>n+f.size,0);p.issues.reserve=p.issues.size*2+64*1048576;
    if(p.answers.downloadGB&&p.issues.size>p.answers.downloadGB*GB)p.issues.errors.push('downloadLimit');
    if(p.answers.diskGB&&p.issues.reserve>p.answers.diskGB*GB||await this.space()<p.issues.reserve)p.issues.errors.push('diskLimit');
    try{validateUpdateGraph([...existing.files,...additions]);}catch(e){p.blockers.push(e.message);}
    p.issues.errors=[...new Set(p.issues.errors)];p.issues.warnings=[...new Set(p.issues.warnings)];
    p.additions=additions.map(f=>({title:f.title,relative:f.relative}));p.kept=existing.files.length;p.satisfied=existing.files.filter(f=>f.enabled!==false).map(f=>({title:f.title,version:f.version}));p.disabled=existing.files.filter(f=>f.enabled===false).map(f=>({title:f.title,version:f.version}));
    p.warnings=p.warnings.filter(w=>w!=='nothingToAdd');if(!additions.length)p.warnings.push('nothingToAdd');
    return p;
  }
  async installAddon(id,acknowledge=false){
    const p=this.get(id);if(!p.existing)failure('invalidPlan');await this.reviewAddon(p);
    if(p.blockers.length||p.issues.errors.length)failure('notCompatible');if(p.issues.warnings.length&&!acknowledge)failure('acknowledge');
    return this.workflows.exclusive(async()=>{
      const instanceId=p.existing.id;if((await this.workflows.pending()).some(r=>r.instanceId===instanceId))failure('addonNotReady');
      const {dir}=await this.core.metadata(instanceId);await this.core.requireStopped(dir);await this.recheck(p);
      const record={schema:1,kind:'guided-addon',state:'running',step:'content',guided:p,completed:[],startedAt:new Date().toISOString()};
      await atomicJson(join(dir,'content-task.json'),record);return this.runAddon(instanceId,record);
    });
  }
  async runAddon(id,record){
    const {dir,item}=await this.core.metadata(id);await this.core.requireStopped(dir);this.workflows.lastSetup=id;
    const p=this.validateSaved(record.guided);if(p.existing?.id!==id||item.game!==p.target.game||item.loader!==p.target.loader||(item.loaderVersion||null)!==(p.target.version||null))failure('changedTarget');
    record.state='running';delete record.error;await atomicJson(join(dir,'content-task.json'),record);
    try{
      this.workflows.checkCancelled();await this.recheck(p);
      const manifest=await this.content.manifest(dir);
      // A crash after a committed transaction can only complete the exact reviewed manifest.
      if(stamp(manifest.files)!==p.existing.stamp){
        if(record.afterStamp!==stamp(manifest.files))failure('addonChanged');
        for(const f of p.files)if(!await verified({...f,path:safePath(dir,f.relative)}))failure('addonChanged');
      }else{
        const review=await this.reviewAddon(p);if(review.issues.errors.length||review.blockers.length)failure('notCompatible');
        const newFiles=p.files.filter(f=>!manifest.files.some(x=>x.projectId===f.projectId));
        record.afterStamp=stamp([...manifest.files,...newFiles.map(f=>({...f,enabled:true}))]);await atomicJson(join(dir,'content-task.json'),record);
        const plan={id:randomUUID(),instanceId:id,game:item.game,loader:item.loader,loaderVersion:item.loaderVersion,loaderSha1:item.loaderSha1,manifestStamp:stamp(manifest.files),files:newFiles,compatible:true,expiresAt:Date.now()+600000};
        this.content.plans.set(plan.id,plan);await this.workflows.wait(await this.content.install(id,plan.id));
      }
      record.state='done';record.completed=['content'];await atomicJson(join(dir,'guided-addon.json'),p);return item;
    }catch(e){record.state=this.workflows.cancelled?'cancelled':'failed';record.error=e.message;throw e;}
    finally{record.finishedAt=new Date().toISOString();await atomicJson(join(dir,'content-task.json'),record);}
  }
  async edit(id,selection){
    const p=this.get(id);if(!selection||!Array.isArray(selection.roots)||selection.roots.some(v=>!(p.availableRoots||p.roots).some(r=>r.versionId===v))||p.roots.some(r=>r.must&&!selection.roots.includes(r.versionId)))failure('invalidSelection');
    const roots=(p.availableRoots||p.roots).filter(r=>selection.roots.includes(r.versionId));const existing=p.existing?await this.addonSnapshot(p.existing.id):null;if(existing&&existing.stamp!==p.existing.stamp)failure('addonChanged');const resolved=await this.resolve(p.target,p.answers,roots,selection.optional||[],selection.excluded||[],this.session(),new Map((existing?.files||[]).map(f=>[f.projectId,f.versionId])));
    resolved.issues.errors.push(...this.visualIssues(resolved.files,p.availableVisual||p.visual));
    const free=await this.space();if(free<resolved.issues.reserve)resolved.issues.errors.push('diskLimit');
    const visual={...(p.availableVisual||p.visual),profile:resolved.files.some(f=>f.type==='shader')?(p.availableVisual||p.visual)?.profile||'off':'off',lod:resolved.files.some(f=>f.slug==='voxy')?'voxy':resolved.files.some(f=>f.slug==='distanthorizons')?'dh':'off'};
    const edited=this.remember({...p,...resolved,metrics:{impact:impact(resolved.roots),load:visual.lod!=='off'||visual.profile==='HIGH'||resolved.roots.some(r=>r.feature==='machinery')?'high':visual.profile!=='off'||resolved.roots.some(r=>r.group==='gameplay')?'medium':'low'},visual,availableRoots:(p.availableRoots||p.roots).map(r=>resolved.roots.find(x=>x.projectId===r.projectId)||r),freeBytes:free});if(existing){await this.reviewAddon(edited,existing);this.plans.set(edited.id,structuredClone(edited));}return edited;
  }
  validateSaved(p){
    if(p?.schema!==1||![RULE_VERSION,'beta1.9-r1'].includes(p.ruleVersion)||!p.target||!Array.isArray(p.files)||p.files.length>100||!Array.isArray(p.roots)||p.roots.length>32)failure('invalidPlan');
    const a=answers(p.answers);if((a.serverVersion&&a.serverVersion!==p.target.game)||(a.serverLoader!=='unknown'&&a.serverLoader!==p.target.loader)||(a.serverLoaderVersion&&p.target.version!==a.serverLoaderVersion&&p.target.version!==p.target.game+'-'+a.serverLoaderVersion))failure('changedTarget');if(!['vanilla','fabric','forge','neoforge'].includes(p.target.loader)||typeof p.target.game!=='string'||!Number.isInteger(p.memory)||p.memory<1||p.memory>32)failure('invalidPlan');
    for(const f of p.files){if(!validId(f.projectId)||!validId(f.versionId)||!['mod','shader','resourcepack'].includes(f.type)||!Number.isSafeInteger(f.size)||f.size<1||!/^[a-f0-9]{40}$/.test(f.hash)||!Array.isArray(f.dependencies)||!Array.isArray(f.ignoredRequired))failure('invalidPlan');safePath(this.core.root,f.relative);safeURL(f.url);}
    for(const r of p.roots)if(!validId(r.versionId)||!p.files.some(f=>f.versionId===r.versionId))failure('invalidPlan');
    return p;
  }
  async recheck(p){
    this.validateSaved(p);const api=this.session();
    for(const f of p.files){this.workflows.checkCancelled();const v=await api('version/'+f.versionId),project=await api('project/'+f.projectId);if(v.project_id!==f.projectId||!matchVersion(project,v,p.target,p.answers))failure('changedFile');const file=v.files?.find(x=>x.primary)||v.files?.[0];const folder={mod:'mods',shader:'shaderpacks',resourcepack:'resourcepacks'}[project.project_type];if(!file||stamp(fileIdentity(f))!==stamp([project.id,v.id,folder+'/'+file.filename,file.hashes?.sha1,file.size,file.url])||stamp(v.dependencies||[])!==stamp(f.dependencies)||project.slug!==f.slug)failure('changedFile');}
    const issues=planIssues(p.files,p.target,p.existing?{...p.answers,downloadGB:0,diskGB:0}:p.answers);issues.errors.push(...this.visualIssues(p.files,p.visual));if(issues.errors.length)failure(issues.errors[0]);if(!p.existing&&await this.space()<issues.reserve)failure('diskLimit');return p;
  }
  async create(id,{name,icon='grass',threads=8,acknowledge=false}={}){
    const p=this.get(id);if(p.existing)failure('invalidPlan');if(p.blockers.length||p.issues.errors.length)failure('notCompatible');if(p.issues.warnings.length&&!acknowledge)failure('acknowledge');
    // create() enters the existing exclusive workflow before rechecking or creating files.
    return this.workflows.create({name,icon,threads,...p.target},null,null,null,p);
  }
  async installGroup(id,p,type){
    const files=p.files.filter(f=>f.type===type);if(!files.length)return;
    const {dir,item}=await this.core.metadata(id);if(item.game!==p.target.game||item.loader!==p.target.loader||(item.loaderVersion||null)!==(p.target.version||null))failure('changedTarget');
    const manifest=await this.content.manifest(dir);const plan={id:randomUUID(),instanceId:id,game:item.game,loader:item.loader,loaderVersion:item.loaderVersion,loaderSha1:item.loaderSha1,manifestStamp:stamp(manifest.files),files,compatible:true,expiresAt:Date.now()+600000};
    this.content.plans.set(plan.id,plan);return this.content.install(id,plan.id);
  }
  async report(id){const dir=await this.core.instancePath(id);for(const file of ['guided-addon.json','guided-plan.json']){try{return this.validateSaved(JSON.parse(await readBoundedFile(join(dir,file),2000000)));}catch(e){if(e.code!=='ENOENT')throw e;}}return null;}
  async skipVisuals(id){return this.workflows.exclusive(async()=>{const {dir}=await this.core.metadata(id);await this.core.requireStopped(dir);const record=JSON.parse(await readBoundedFile(join(dir,'setup-report.json'),3000000));if(!record.guided||record.state==='done'||!['resources','shaders','visualSettings'].includes(record.step))failure('cannotSkip');const p=this.validateSaved(record.guided);const removed=p.files.filter(f=>f.type!=='mod').map(f=>f.versionId);const remaining=p.files.filter(f=>f.type==='mod');if(planIssues(remaining,p.target,p.answers).errors.length)failure('cannotSkip');p.files=remaining;p.roots=p.roots.filter(r=>!removed.includes(r.versionId));p.skippedVisuals=true;if(p.visual)p.visual={...p.visual,profile:'off'};p.issues=planIssues(p.files,p.target,p.answers);record.guided=p;await atomicJson(join(dir,'guided-plan.json'),p);await atomicJson(join(dir,'setup-report.json'),record);this.workflows.resumes.delete(id);this.workflows.lastSetup=id;return this.workflows.runPlan(id,record);});}
}
