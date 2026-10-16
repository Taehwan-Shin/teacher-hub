import {parseBody,validateHub,publicURL} from './validation.mjs';
export const key=url=>publicURL(url).replace(/\/$/,'').toLowerCase();
export function decodeRequest(document){
 const f=document.fields,id=document.name.split('/').at(-1);
 if(!/^[a-f0-9-]{36}$/.test(id)||f?.state?.stringValue!=='queued')throw new Error('Invalid receipt');
 const data=Object.fromEntries(Object.entries(f.hub?.mapValue?.fields||{}).map(([k,v])=>[k,v.stringValue]));
 return {id,hub:validateHub(data),name:document.name,updateTime:document.updateTime};
}
export function existingIssue(request,issues,registry){
 const marker=`[접수 ${request.id}]`;
 const prior=issues.find(x=>!x.pull_request&&x.title.endsWith(marker));if(prior)return prior.number;
 const approved=registry.find(x=>key(x.url)===key(request.hub.url));if(approved)return approved.issue;
 for(const issue of issues){if(issue.pull_request||issue.state!=='open')continue;try{if(key(parseBody(issue.body).url)===key(request.hub.url))return issue.number;}catch{}}
 return null;
}
export function issuePayload({id,hub}){return {title:`허브 등록 요청: ${hub.title} [접수 ${id}]`,body:'```json\n'+JSON.stringify(hub,null,2)+'\n```'};}
