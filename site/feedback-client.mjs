import { validateFeedback, validHubId } from './feedback-validation.mjs';
let configPromise, session, sessionPromise;
const stringValue=value=>({stringValue:value});
const timestampValue=value=>({timestampValue:value});
const integerValue=value=>({integerValue:String(value)});
function failure(code){const e=new Error(code);e.code=code;return e;}
async function json(url,{method='GET',body,token,missing=false}={}){
  let r;try{r=await fetch(url,{method,credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000),headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});}catch{throw failure('network');}
  if(missing&&r.status===404)return null;
  if(!r.ok)throw failure(r.status===429?'quota':r.status===409?'conflict':r.status===403?'denied':r.status===401?'auth':'service');
  return r.status===204?null:r.json();
}
async function config(){
  if(!configPromise)configPromise=(async()=>{const c=await json('feedback-config.json');if(c.projectId!=='classroom-diary-098bae6e'||typeof c.apiKey!=='string'||!/^AIza[\w-]{35}$/.test(c.apiKey))throw failure('config');return c;})();
  try{return await configPromise;}catch(error){configPromise=undefined;throw error;}
}
async function authenticate(){
  if(session&&session.expires>Date.now()+60000)return session;
  if(sessionPromise)return sessionPromise;
  sessionPromise=(async()=>{
    const c=await config();
    let result;
    if(session){
      const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(c.apiKey)}`,{method:'POST',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:session.refresh})});
      if(!r.ok)throw failure('auth');const d=await r.json();result={idToken:d.id_token,refreshToken:d.refresh_token,localId:d.user_id,expiresIn:d.expires_in};
    }else result=await json(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(c.apiKey)}`,{method:'POST',body:{returnSecureToken:true}});
    if(typeof result.idToken!=='string'||typeof result.refreshToken!=='string'||!/^[-\w]{1,128}$/.test(result.localId))throw failure('auth');
    session={token:result.idToken,refresh:result.refreshToken,uid:result.localId,expires:Date.now()+Number(result.expiresIn)*1000};return session;
  })();
  try{return await sessionPromise;}finally{sessionPromise=undefined;}
}
function root(c){return `https://firestore.googleapis.com/v1/projects/${c.projectId}/databases/(default)/documents`;}
export async function listFeedback(hubId,cursor){
  if(!validHubId(hubId))throw failure('hub');const c=await config();
  const structuredQuery={from:[{collectionId:'comments'}],orderBy:[{field:{fieldPath:'createdAt'},direction:'DESCENDING'},{field:{fieldPath:'__name__'},direction:'DESCENDING'}],limit:21};
  if(cursor){if(typeof cursor.name!=='string'||!cursor.name.startsWith(`projects/${c.projectId}/databases/(default)/documents/teacherHubFeedback/${hubId}/comments/`)||Number.isNaN(Date.parse(cursor.createdAt)))throw failure('cursor');structuredQuery.startAt={values:[timestampValue(cursor.createdAt),{referenceValue:cursor.name}],before:false};}
  const rows=await json(`${root(c)}/teacherHubFeedback/${hubId}:runQuery`,{method:'POST',body:{structuredQuery}});
  if(!Array.isArray(rows))throw failure('data');
  const entries=rows.filter(x=>x.document).map(({document:d})=>{const body=d.fields?.body?.stringValue,createdAt=d.fields?.createdAt?.timestampValue;if(typeof body!=='string'||body.length>500||Number.isNaN(Date.parse(createdAt)))throw failure('data');return {name:d.name,body,createdAt};});
  return {entries:entries.slice(0,20),more:entries.length>20};
}
export async function submitFeedback(hubId,value){
  if(!validHubId(hubId))throw failure('hub');const body=validateFeedback(value),c=await config(),s=await authenticate();
  const base=root(c),nameBase=base.replace('https://firestore.googleapis.com/v1/','');
  const id=crypto.randomUUID();
  const name=`${nameBase}/teacherHubFeedback/${hubId}/comments/${id}`;
  for(let attempt=0;attempt<3;attempt++){
    const [quota,throttle]=await Promise.all([json(`${base}/teacherHubFeedbackQuota/global`,{token:s.token,missing:true}),json(`${base}/teacherHubFeedbackWriters/${s.uid}`,{token:s.token,missing:true})]);
    if(throttle&&Date.now()-Date.parse(throttle.fields.updatedAt.timestampValue)<5000)throw failure('cooldown');
    // Compare-and-swap preconditions protect both counters from concurrent overwrite.
    const recent=quota&&Date.now()-Date.parse(quota.fields.windowStart.timestampValue)<3600000;
    const count=recent?Number(quota.fields.count.integerValue)+1:1;
    if(count>100)throw failure('quota');
    const precondition=d=>d?{updateTime:d.updateTime}:{exists:false};
    const fields={body:stringValue(body)};
    const quotaFields={count:integerValue(count),hubId:stringValue(hubId),commentId:stringValue(id)};
    if(recent)quotaFields.windowStart=quota.fields.windowStart;
    const writes=[
      {update:{name,fields},currentDocument:{exists:false},updateTransforms:[{fieldPath:'createdAt',setToServerValue:'REQUEST_TIME'}]},
      {update:{name:`${nameBase}/teacherHubFeedbackWriters/${s.uid}`,fields:{hubId:stringValue(hubId),commentId:stringValue(id)}},currentDocument:precondition(throttle),updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]},
      {update:{name:`${nameBase}/teacherHubFeedbackQuota/global`,fields:quotaFields},currentDocument:precondition(quota),updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'},...(!recent?[{fieldPath:'windowStart',setToServerValue:'REQUEST_TIME'}]:[])]}
    ];
    try{await json(`${base}:commit`,{method:'POST',token:s.token,body:{writes}});return {id,name};}
    catch(error){if(error.code==='conflict'&&attempt<2)continue;
      // A timed-out commit can have succeeded. Inspect only this generated ID before retrying.
      if(error.code==='network'){try{const check=await json(`https://firestore.googleapis.com/v1/${name}`,{missing:true});if(check)return {id,name};}catch{}throw failure('uncertain');}throw error;}
  }
  throw failure('conflict');
}

// Deletion uses a separate Firebase password identity, never the posting session.
// The password is entered for each deletion and is never persisted or bundled.
export async function deleteFeedback(hubId,name,password){
  if(!validHubId(hubId)||typeof password!=='string'||password.length<6||password.length>128)throw failure('delete-auth');
  const c=await config();
  const prefix=`projects/${c.projectId}/databases/(default)/documents/teacherHubFeedback/${hubId}/comments/`;
  if(typeof name!=='string'||!name.startsWith(prefix)||!/^[a-f0-9-]{36}$/.test(name.slice(prefix.length)))throw failure('hub');
  let moderator;
  try{moderator=await json(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(c.apiKey)}`,{method:'POST',body:{email:'feedback-moderator@teacher-hub.invalid',password,returnSecureToken:true}});}
  catch(error){throw failure(error.code==='quota'?'quota':error.code==='network'?'network':'delete-auth');}
  if(typeof moderator.idToken!=='string')throw failure('delete-auth');
  try{await json(`https://firestore.googleapis.com/v1/${name}`,{method:'DELETE',token:moderator.idToken});}
  catch(error){if(error.code==='network'){try{if(!await json(`https://firestore.googleapis.com/v1/${name}`,{missing:true}))return;}catch{}throw failure('delete-uncertain');}throw error;}
}
