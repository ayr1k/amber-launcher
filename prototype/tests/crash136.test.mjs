import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,utimes,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {analyzeCrash} from '../desktop/crash136.mjs';
import {collectCrashLogs} from '../desktop/crash-files136.mjs';
test('Fabric missing and incompatible dependencies keep consumer, requirement and evidence',()=>{
 const log="Mod 'Iris' (iris) 1.8 requires version 0.6.x of mod 'Sodium' (sodium), which is missing!";
 const f=analyzeCrash(log).findings[0];assert.match(f.title,/Iris.*Sodium/);assert.match(f.hint,/0.6.x/);assert.equal(f.evidence,log);
 assert.match(analyzeCrash(log.replace('which is missing','but only the wrong version is present'),'en-US').findings[0].title,/incompatible/);
});
test('plain names, exit codes and normal shutdown are not diagnoses',()=>{for(const s of ['Exit code 1','at net.irisshaders.iris.Iris.main(Iris.java:52)','Loading Sodium','Saving chunks\nStopping server',''])assert.equal(analyzeCrash(s).findings.length,0);});
test('specific errors and multiple findings, in both languages',()=>{for(const s of ['UnsupportedClassVersionError: Bad','OutOfMemoryError: Java heap space','Could not reserve enough space for heap','java.net.BindException: Address already in use','GLFW error 65542: WGL','Invalid or corrupt jarfile bad.jar','UnknownDependencyException: Unknown dependency Sodium'])for(const lang of ['zh-CN','en-US'])assert.ok(analyzeCrash(s,lang).findings.length);assert.equal(analyzeCrash('OutOfMemoryError\nOutOfMemoryError\nAddress already in use').findings.length,2);assert.equal(analyzeCrash('MixinTransformerError').findings[0].certainty,'possible');});
test('only reports from the matching run are collected, no history guessing',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'amber-crash136-'));try{await mkdir(join(dir,'logs'));await mkdir(join(dir,'crash-reports'));await writeFile(join(dir,'logs/latest.log'),'current');await writeFile(join(dir,'crash-reports/crash-old.txt'),'obsolete');await utimes(join(dir,'crash-reports/crash-old.txt'),new Date(0),new Date(0));const r=await collectCrashLogs(dir,{startedAt:new Date(Date.now()-1000).toISOString(),tail:'console'});assert.match(r.text,/current/);assert.doesNotMatch(r.text,/obsolete/);assert.equal((await collectCrashLogs(dir,{})).text,'');}finally{await rm(dir,{recursive:true,force:true});}
});
