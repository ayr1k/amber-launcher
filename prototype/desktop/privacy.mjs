// SPDX-License-Identifier: MPL-2.0
// Best-effort redaction for sharing. Raw game logs may contain arbitrary mod output.
export function redact(value,secrets=[]){let text=String(value??'');for(const secret of secrets.filter(s=>typeof s==='string'&&s.length>=4).sort((a,b)=>b.length-a.length))text=text.split(secret).join('[redacted]');return text
 .replace(/\bBearer\s+[^\s"'<>]+/gi,'Bearer [redacted]')
 .replace(/(XBL3\.0\s+x=)[^\s"'<>]+/gi,'$1[redacted]')
 .replace(/((?:access[_-]?token|refresh[_-]?token|client[_-]?token|device[_-]?code|user[_-]?code|password|authorization)\s*["']?\s*[:=]\s*["']?)[^\s,"'<>}]+/gi,'$1[redacted]')
 .replace(/(--(?:accessToken|username|uuid|xuid|userProperties)\s+)(?:"[^"]*"|[^\s]+)/gi,'$1[redacted]')
 .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,'[redacted token]')
 .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[redacted email]')
 .replace(/\b[A-Z]:[\\/]Users[\\/][^\\/\s"<>]+/gi,'[user directory]')
 .replace(/\/(?:home|Users)\/[^/\s"<>]+/g,'[user directory]')
 .replace(/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi,'$1[redacted]@');}
export function redactFields(value,secrets=[],key=''){if(typeof value==='string')return ['error','tail','detail','feedback'].includes(key)?redact(value,secrets):value;if(Array.isArray(value))return value.map(v=>redactFields(v,secrets,key));if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,redactFields(v,secrets,k)]));return value;}
