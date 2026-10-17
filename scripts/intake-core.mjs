import {validateHub} from './validation.mjs';
export function decodeRequest(document){
 const f=document.fields,id=document.name.split('/').at(-1);
 if(!/^[a-f0-9-]{36}$/.test(id)||f?.state?.stringValue!=='queued')throw new Error('Invalid receipt');
 const data=Object.fromEntries(Object.entries(f.hub?.mapValue?.fields||{}).map(([k,v])=>[k,v.stringValue]));
 return {id,hub:validateHub(data),name:document.name,updateTime:document.updateTime};
}
export function existingIssue(request,issues){
 const marker=`[접수 ${request.id}]`;
 const prior=issues.find(x=>!x.pull_request&&x.title.endsWith(marker));if(prior)return prior.number;
 return null;
}
export function issuePayload({id,hub}){return {title:`허브 등록 요청: ${hub.title} [접수 ${id}]`,body:'```json\n'+JSON.stringify(hub,null,2)+'\n```'};}
