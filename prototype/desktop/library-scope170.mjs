// SPDX-License-Identifier: MPL-2.0
import {AsyncLocalStorage} from 'node:async_hooks';
const exact=new Set('instances versions create status install cancel analyze-logs logs-folder backups screenshots protection launch open-instance lite-overlay'.split(' '));
const prefixes=['java-','instance-','library-','content-','bulk-','mod-','backup-','trash-','editor-','dependency-','workbench','trial-','launch-preferences','journal','screenshot-','guided-','template-','pack-','local-pack-','migration-','setup','loader-','fabric-','optifine-import','optifine-install','world-import','graphics-copy-java'];
export const libraryChannel170=channel=>{const name=channel.replace(/^amber:/,'');return exact.has(name)||prefixes.some(p=>name.startsWith(p));};

// A request owns its graph until completion, including jobs it starts. Selection
// is presentation state, never an implicit source of authority for an operation.
export class LibraryScope170 {
 constructor(){this.context=new AsyncLocalStorage();}
 run(graph,fn){return this.context.run(graph,fn);}
 wrap(name,fallback){return new Proxy(fallback,{
  get:(_target,key)=>{const graph=this.context.getStore(),target=graph?graph[name]:fallback;if(!target)throw Error('Library service unavailable: '+name);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},
  set:(_target,key,value)=>{const graph=this.context.getStore(),target=graph?graph[name]:fallback;if(!target)throw Error('Library service unavailable: '+name);return Reflect.set(target,key,value,target);}
 });}
}
