// Run only against the local Firestore emulator. Reuse the diary project's
// development dependencies; nothing is loaded into the published website.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(new URL('../../classroom-hub/package.json', import.meta.url));
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, collection, getDoc, getDocs, query, limit, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp } = require('firebase/firestore');
const env = await initializeTestEnvironment({ projectId:'demo-teacher-hub', firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../backend/firestore.rules',import.meta.url),'utf8')} });
const context = uid => env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).firestore();
const guest = env.unauthenticatedContext().firestore(), a=context('synthetic-a'), b=context('synthetic-b');
const google = env.authenticatedContext('synthetic-google',{firebase:{sign_in_provider:'google.com'}}).firestore();
const comment=(db,id,hub='issue-1')=>doc(db,'teacherHubFeedback',hub,'comments',id);
const writer=(db,uid)=>doc(db,'teacherHubFeedbackWriters',uid);
const quota=db=>doc(db,'teacherHubFeedbackQuota','global');
let passed=0;
async function yes(p){await assertSucceeds(p);passed++;}
async function no(p){await assertFails(p);passed++;}
function commit(db,uid,{id=crypto.randomUUID(),hub='issue-1',body='설명이 명확해서 수업에 활용하기 좋습니다.',count=1,windowStart=serverTimestamp(),extra={},omit=[]}={}){
 const batch=writeBatch(db);
 if(!omit.includes('comment'))batch.set(comment(db,id,hub),{body,createdAt:serverTimestamp(),...extra});
 if(!omit.includes('writer'))batch.set(writer(db,uid),{hubId:hub,commentId:id,updatedAt:serverTimestamp()});
 if(!omit.includes('quota'))batch.set(quota(db),{hubId:hub,commentId:id,updatedAt:serverTimestamp(),windowStart,count});
 return batch.commit();
}
try{
 await env.clearFirestore();
 await yes(getDocs(query(collection(guest,'teacherHubFeedback','issue-1','comments'),limit(21))));
 await no(getDocs(collection(guest,'teacherHubFeedback','issue-1','comments')));
 await no(getDocs(query(collection(guest,'teacherHubFeedback','issue-1','comments'),limit(22))));
 await no(getDoc(writer(guest,'synthetic-a')));await no(getDoc(writer(b,'synthetic-a')));
 await no(getDoc(quota(guest)));await yes(getDoc(quota(a)));
 await no(commit(guest,'synthetic-a'));await no(commit(google,'synthetic-google'));
 for(const omit of [['quota'],['writer'],['comment']])await no(commit(a,'synthetic-a',{omit}));
 await no(commit(a,'synthetic-b'));
 await no(commit(a,'synthetic-a',{hub:'bad-path'}));
 for(const body of ['', ' ', 'x'.repeat(501), '<script>', 'synthetic@example.invalid', '010-0000-0000', '900101-1234567', 'https://example.invalid', 'password: synthetic', 'synthetic\u202e'])await no(commit(a,'synthetic-a',{body}));
 await no(commit(a,'synthetic-a',{extra:{uid:'synthetic-a'}}));
 await no(commit(a,'synthetic-a',{extra:{createdAt:Timestamp.fromMillis(0)}}));
 const id=crypto.randomUUID();await yes(commit(a,'synthetic-a',{id}));
 await yes(getDoc(comment(guest,id)));
 const publicData=(await getDoc(comment(guest,id))).data();
 if(Object.keys(publicData).sort().join(',')!=='body,createdAt')throw new Error('Unexpected public fields');passed++;
 await no(updateDoc(comment(a,id),{body:'변경 시도'}));await no(deleteDoc(comment(a,id)));
 await no(commit(a,'synthetic-a',{count:2,windowStart:(await getDoc(quota(a))).data().windowStart}));
 const current=(await getDoc(quota(a))).data().windowStart;
 await no(commit(b,'synthetic-b',{count:1,windowStart:current}));
 await no(commit(b,'synthetic-b',{count:2,windowStart:Timestamp.fromMillis(0)}));
 await yes(commit(b,'synthetic-b',{count:2,windowStart:current}));
 await no(getDocs(collection(a,'teacherHubFeedbackWriters')));await no(deleteDoc(quota(a)));
 await no(getDoc(doc(a,'diaryVaults','synthetic-a')));
 await no(setDoc(doc(a,'diaryVaults','synthetic-a'),{body:'synthetic'}));
 await env.withSecurityRulesDisabled(async c=>{await setDoc(quota(c.firestore()),{count:100,windowStart:Timestamp.now(),updatedAt:Timestamp.now(),hubId:'issue-1',commentId:crypto.randomUUID()});});
 const full=(await getDoc(quota(a))).data().windowStart;
 await no(commit(context('synthetic-c'),'synthetic-c',{count:101,windowStart:full}));
 await no(commit(context('synthetic-c'),'synthetic-c',{count:1}));
 await env.withSecurityRulesDisabled(async c=>{await updateDoc(quota(c.firestore()),{windowStart:Timestamp.fromMillis(Date.now()-3601000)});await updateDoc(writer(c.firestore(),'synthetic-a'),{updatedAt:Timestamp.fromMillis(Date.now()-6000)});});
 await yes(commit(a,'synthetic-a'));
 const moderator=env.authenticatedContext('synthetic-moderator',{firebase:{sign_in_provider:'password'},feedbackModerator:true}).firestore();
 const regularPassword=env.authenticatedContext('synthetic-password',{firebase:{sign_in_provider:'password'}}).firestore();
 const wrongProvider=env.authenticatedContext('synthetic-moderator',{firebase:{sign_in_provider:'anonymous'},feedbackModerator:true}).firestore();
 await no(deleteDoc(comment(regularPassword,id)));await no(deleteDoc(comment(wrongProvider,id)));
 await no(updateDoc(comment(moderator,id),{body:'변경 시도'}));
 await no(getDoc(doc(moderator,'diaryVaults','synthetic-owner')));
 await no(getDoc(quota(moderator)));await no(getDocs(collection(moderator,'teacherHubRequests')));
 await no(deleteDoc(writer(moderator,'synthetic-a')));
 await yes(deleteDoc(comment(moderator,id)));
 console.log(`PASS: ${passed} feedback authorization and abuse checks`);
}finally{await env.cleanup();}
