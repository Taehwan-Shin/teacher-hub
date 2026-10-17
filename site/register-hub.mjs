// Public registration client. Node.js >=22, no dependencies or GitHub credentials.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateHub } from './registration-validation.mjs';
const PROJECT='classroom-diary-098bae6e',KEY='AIzaSyBxk2xJoiLA_iOSvSzVRfpO_yCorssPS1M';
const BASE=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
export async function request(url,{body,token,missing=false,method=body?'POST':'GET'}={}){
 let r;try{r=await fetch(url,{method,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(20000),headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});}catch{throw new Error('연결 실패. 중복 접수 전에 이전 접수 결과를 확인하세요.');}
 if(missing&&r.status===404)return null;
 if(!r.ok){const e=new Error(r.status===403?'접수 제한 또는 입력 검사 실패입니다. 신청 정보와 이용량을 확인하세요.':r.status===429?'접수량이 많습니다. 잠시 후 다시 시도하세요.':`접수 API 오류 (${r.status})`);e.status=r.status;throw e;}
 return r.status===204?null:r.json();
}
const s=value=>({stringValue:value}),i=value=>({integerValue:String(value)});
export async function submitHub(input){
 const hub=validateHub(input);
 const session=await request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,{body:{returnSecureToken:true}});
 if(!session.idToken||!/^[-\w]{1,128}$/.test(session.localId))throw new Error('익명 접수 연결 실패');
 const id=crypto.randomUUID(), nameBase=BASE.slice('https://firestore.googleapis.com/v1/'.length);
 const name=`${nameBase}/teacherHubRequests/${id}`,auth={token:session.idToken,missing:true};
 // Output the receipt before writing, so a lost response still has a lookup key.
 console.log(JSON.stringify({receipt:id,tracking:`https://github.com/Taehwan-Shin/teacher-hub/issues?q=${encodeURIComponent(`is:issue "접수 ${id}"`)}`}));
 for(let attempt=0;attempt<3;attempt++){
  const [quota,writer]=await Promise.all([request(`${BASE}/teacherHubRequestQuota/global`,auth),request(`${BASE}/teacherHubRequestWriters/${session.localId}`,auth)]);
  if(writer&&Date.now()-Date.parse(writer.fields.updatedAt.timestampValue)<60000)throw new Error('한 연결에서는 1분 후 다시 신청할 수 있습니다.');
  const fresh=field=>!quota||Date.now()-Date.parse(quota.fields[field].timestampValue)>= (field==='hourStart'?3600000:86400000);
  const hourFresh=fresh('hourStart'),dayFresh=fresh('dayStart');
  const hourCount=hourFresh?1:Number(quota.fields.hourCount.integerValue)+1,dayCount=dayFresh?1:Number(quota.fields.dayCount.integerValue)+1;
  if(hourCount>60||dayCount>200)throw new Error('전체 접수 한도에 도달했습니다. 잠시 후 다시 신청하세요.');
  const pre=d=>d?{updateTime:d.updateTime}:{exists:false};
  const quotaFields={requestId:s(id),hourCount:i(hourCount),dayCount:i(dayCount)};
  if(!hourFresh)quotaFields.hourStart=quota.fields.hourStart;if(!dayFresh)quotaFields.dayStart=quota.fields.dayStart;
  const stamp=fieldPath=>({fieldPath,setToServerValue:'REQUEST_TIME'});
  const writes=[
   {update:{name,fields:{uid:s(session.localId),hub:{mapValue:{fields:Object.fromEntries(Object.entries(hub).map(([k,v])=>[k,s(v)]))}},state:s('queued'),issue:i(0),processedAt:{nullValue:null}}},currentDocument:{exists:false},updateTransforms:[stamp('createdAt')]},
   {update:{name:`${nameBase}/teacherHubRequestWriters/${session.localId}`,fields:{requestId:s(id)}},currentDocument:pre(writer),updateTransforms:[stamp('updatedAt')]},
   {update:{name:`${nameBase}/teacherHubRequestQuota/global`,fields:quotaFields},currentDocument:pre(quota),updateTransforms:[stamp('updatedAt'),...(hourFresh?[stamp('hourStart')]:[]),...(dayFresh?[stamp('dayStart')]:[])]}
  ];
  try{await request(`${BASE}:commit`,{token:session.idToken,body:{writes}});return {receipt:id,state:'queued',message:'접수 완료. 주기 실행 후 GitHub Issue가 생성됩니다. 자동 승인 및 카드 게시까지 처리되며 시간이 걸릴 수 있습니다.'};}
  catch(error){const check=await request(`https://firestore.googleapis.com/v1/${name}`,auth).catch(()=>null);if(check)return {receipt:id,state:check.fields.state.stringValue,message:'접수 확인 완료'};if((error.status===409||error.status===412)&&attempt<2)continue;throw error;}
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{if(process.argv.length!==3)throw new Error('사용법: node register-hub.mjs 신청.json');const source=await readFile(process.argv[2],'utf8');if(Buffer.byteLength(source)>4000)throw new Error('신청서가 너무 큽니다.');console.log(JSON.stringify(await submitHub(JSON.parse(source))));}
 catch(error){console.error(error instanceof SyntaxError?'신청 JSON 형식이 올바르지 않습니다.':error.message);process.exitCode=1;}
}
