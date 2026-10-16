import {client} from './github.mjs';
import {decodeRequest,existingIssue,issuePayload} from './intake-core.mjs';
import {request} from '../site/register-hub.mjs';
const project='classroom-diary-098bae6e',key='AIzaSyBxk2xJoiLA_iOSvSzVRfpO_yCorssPS1M';
const root=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
async function run(){
 if(process.env.GITHUB_REPOSITORY!=='Taehwan-Shin/teacher-hub'||process.env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(process.env.GITHUB_EVENT_NAME))throw new Error('Worker scope rejected');
 const secret=process.env.INTAKE_REFRESH_TOKEN;if(!secret)throw new Error('Missing worker secret');
 const response=await fetch(`https://securetoken.googleapis.com/v1/token?key=${key}`,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:secret})});
 if(!response.ok)throw new Error('Worker authentication failed');const session=await response.json();
 if(!session.id_token||!session.refresh_token)throw new Error('Worker authentication failed');
 console.log(`::add-mask::${session.id_token}`);console.log(`::add-mask::${session.refresh_token}`);
 const payload=JSON.parse(Buffer.from(session.id_token.split('.')[1],'base64url'));
 if(payload.hubRegistrar!==true)throw new Error('Worker claim rejected');
 const token=session.id_token,github=client(process.env.GH_TOKEN,process.env.GITHUB_REPOSITORY);
 const rows=await request(`${root}:runQuery`,{token,body:{structuredQuery:{from:[{collectionId:'teacherHubRequests'}],where:{fieldFilter:{field:{fieldPath:'state'},op:'EQUAL',value:{stringValue:'queued'}}},limit:10}}});
 const documents=rows.filter(x=>x.document).map(x=>x.document);
 let issues=[],registry=[];
 if(documents.length){
  const file=await github('/contents/data/hubs.json?ref=main');registry=JSON.parse(Buffer.from(file.content,'base64'));
  for(let page=1;page<=20;page++){const batch=await github(`/issues?state=all&per_page=100&page=${page}`);issues.push(...batch);if(batch.length<100)break;if(page===20)throw new Error('Issue history requires maintenance');}
 }
 let processed=0;
 for(const document of documents){
  let receipt;try{receipt=decodeRequest(document);}catch{}
  let issue=0,state='rejected';
  if(receipt){issue=existingIssue(receipt,issues,registry)||0;
   if(!issue){const created=await github('/issues','POST',issuePayload(receipt));issue=created.number;issues.push(created);}
   state='issued';
  }
  // If Issue creation succeeded but this write fails, the next run finds its
  // receipt marker, including closed Issues, without creating another Issue.
  await request(`${root}:commit`,{token,body:{writes:[{update:{name:document.name,fields:{state:{stringValue:state},issue:{integerValue:String(issue)}}},updateMask:{fieldPaths:['state','issue']},currentDocument:{updateTime:document.updateTime},updateTransforms:[{fieldPath:'processedAt',setToServerValue:'REQUEST_TIME'}]}]}});processed++;
 }
 const old=await request(`${root}:runQuery`,{token,body:{structuredQuery:{from:[{collectionId:'teacherHubRequests'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'processedAt'},op:'GREATER_THAN',value:{timestampValue:'1970-01-01T00:00:00Z'}}},{fieldFilter:{field:{fieldPath:'processedAt'},op:'LESS_THAN',value:{timestampValue:new Date(Date.now()-7*86400000-60000).toISOString()}}}]}},limit:20}}});
 const expired=old.filter(x=>x.document).map(x=>x.document);
 if(expired.length)await request(`${root}:commit`,{token,body:{writes:expired.map(d=>({delete:d.name,currentDocument:{updateTime:d.updateTime}}))}});
 console.log(`등록 접수 처리 ${processed}건, 보관 기간이 지난 접수 ${expired.length}건 정리 완료`);
}
try{await run();}catch{console.error('접수 처리 실패: 인증·규칙·서비스 상태를 확인하고 이 워크플로를 다시 실행하세요. 기존 접수는 보존됩니다.');process.exitCode=1;}
