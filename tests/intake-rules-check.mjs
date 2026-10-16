import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
const require=createRequire(new URL('../../classroom-hub/package.json',import.meta.url));
const {initializeTestEnvironment,assertFails,assertSucceeds}=require('@firebase/rules-unit-testing');
const {doc,collection,getDoc,getDocs,query,where,limit,setDoc,updateDoc,deleteDoc,writeBatch,serverTimestamp,Timestamp}=require('firebase/firestore');
const env=await initializeTestEnvironment({projectId:'demo-teacher-hub',firestore:{host:'127.0.0.1',port:8088,rules:await readFile(new URL('../backend/firestore.rules',import.meta.url),'utf8')}});
const db=uid=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).firestore();
const a=db('synthetic-intake-a'),b=db('synthetic-intake-b'),guest=env.unauthenticatedContext().firestore();
const worker=env.authenticatedContext('synthetic-worker',{firebase:{sign_in_provider:'anonymous'},hubRegistrar:true}).firestore();
const hub={title:'합성 허브',description:'수업에 활용할 공개 도구 모음',url:'https://synthetic.github.io/tools/',category:'수업 도구',symbol:'sun'};
const qref=d=>doc(d,'teacherHubRequestQuota','global'),wref=(d,uid)=>doc(d,'teacherHubRequestWriters',uid),rref=(d,id)=>doc(d,'teacherHubRequests',id);
let passed=0;async function yes(p){await assertSucceeds(p);passed++;}async function no(p){await assertFails(p);passed++;}
function commit(d,uid,{id=crypto.randomUUID(),data=hub,extra={},count=1,dayCount=1,hourStart=serverTimestamp(),dayStart=serverTimestamp(),omit=[]}={}){
 const batch=writeBatch(d);
 if(!omit.includes('request'))batch.set(rref(d,id),{uid,hub:data,state:'queued',issue:0,processedAt:null,createdAt:serverTimestamp(),...extra});
 if(!omit.includes('writer'))batch.set(wref(d,uid),{requestId:id,updatedAt:serverTimestamp()});
 if(!omit.includes('quota'))batch.set(qref(d),{requestId:id,updatedAt:serverTimestamp(),hourStart,dayStart,hourCount:count,dayCount});
 return batch.commit();
}
try{
 await env.clearFirestore();await yes(getDoc(qref(a)));await no(getDoc(qref(guest)));
 await no(commit(guest,'synthetic-intake-a'));await no(commit(a,'synthetic-intake-b'));
 for(const omit of [['writer'],['quota'],['request']])await no(commit(a,'synthetic-intake-a',{omit}));
 for(const data of [{...hub,email:'synthetic@example.invalid'},{...hub,title:'<script>'},{...hub,title:' '},{...hub,title:'x'.repeat(41)},{...hub,description:'synthetic@example.invalid'},{...hub,url:'http://synthetic.github.io/'},{...hub,url:'https://synthetic.github.io/?key=secret'},{...hub,url:'https://synthetic.github.io/#private'},{...hub,url:'https://127.0.0.1/'},{...hub,url:'https://synthetic.local/'},{...hub,url:'https://user:secret@synthetic.github.io/'},{...hub,category:'unknown'},{...hub,symbol:'unknown'}])await no(commit(a,'synthetic-intake-a',{data}));
 for(const extra of [{admin:true},{state:'issued',issue:1,processedAt:serverTimestamp()},{createdAt:Timestamp.fromMillis(0)}])await no(commit(a,'synthetic-intake-a',{extra}));
 const id=crypto.randomUUID();await yes(commit(a,'synthetic-intake-a',{id}));
 await yes(getDoc(rref(a,id)));await yes(getDoc(rref(worker,id)));await no(getDoc(rref(b,id)));await no(getDoc(rref(guest,id)));
 await no(getDocs(query(collection(a,'teacherHubRequests'),limit(10))));await no(getDocs(query(collection(worker,'teacherHubRequests'),limit(21))));
 await yes(getDocs(query(collection(worker,'teacherHubRequests'),where('state','==','queued'),limit(10))));
 await no(updateDoc(rref(a,id),{hub:{...hub,title:'변경'}}));await no(updateDoc(rref(a,id),{state:'issued',issue:1,processedAt:serverTimestamp()}));
 await no(updateDoc(rref(worker,id),{state:'issued',issue:1,processedAt:serverTimestamp(),uid:'synthetic-intake-b'}));
 await no(updateDoc(rref(worker,id),{state:'issued',issue:0,processedAt:serverTimestamp()}));await no(updateDoc(rref(worker,id),{state:'issued',issue:1,processedAt:Timestamp.fromMillis(0)}));
 await yes(updateDoc(rref(worker,id),{state:'issued',issue:1,processedAt:serverTimestamp()}));
 await no(updateDoc(rref(worker,id),{state:'queued',issue:0,processedAt:null}));await no(deleteDoc(rref(a,id)));await no(deleteDoc(rref(worker,id)));
 await no(getDoc(doc(worker,'diaryVaults','synthetic-intake-a')));await no(setDoc(doc(worker,'profiles','synthetic-worker'),{admin:true}));
 await no(getDoc(doc(worker,'teacherHubFeedbackQuota','global')));
 const current=(await getDoc(qref(a))).data();
 await no(commit(a,'synthetic-intake-a',{count:2,dayCount:2,hourStart:current.hourStart,dayStart:current.dayStart}));
 await no(commit(b,'synthetic-intake-b',{count:1,dayCount:2,hourStart:current.hourStart,dayStart:current.dayStart}));
 await yes(commit(b,'synthetic-intake-b',{count:2,dayCount:2,hourStart:current.hourStart,dayStart:current.dayStart}));
 await env.withSecurityRulesDisabled(async c=>{await updateDoc(qref(c.firestore()),{hourCount:60});});
 await no(commit(db('synthetic-c'),'synthetic-c',{count:61,dayCount:3,hourStart:current.hourStart,dayStart:current.dayStart}));
 await no(commit(db('synthetic-c'),'synthetic-c',{count:1,dayCount:3,dayStart:current.dayStart}));
 await env.withSecurityRulesDisabled(async c=>{await updateDoc(qref(c.firestore()),{hourStart:Timestamp.fromMillis(Date.now()-3601000),dayCount:200});});
 await no(commit(db('synthetic-c'),'synthetic-c',{dayCount:201,dayStart:current.dayStart}));
 await env.withSecurityRulesDisabled(async c=>{await updateDoc(qref(c.firestore()),{dayStart:Timestamp.fromMillis(Date.now()-86401000)});await updateDoc(rref(c.firestore(),id),{processedAt:Timestamp.fromMillis(Date.now()-8*86400000)});});
 await yes(commit(db('synthetic-c'),'synthetic-c'));await yes(deleteDoc(rref(worker,id)));
 await no(getDocs(collection(a,'teacherHubRequestWriters')));await no(deleteDoc(qref(a)));
 console.log(`PASS: ${passed} registration intake authorization checks`);
}finally{await env.cleanup();}
