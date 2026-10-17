import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticScope, automaticRows, publishedIssue} from '../scripts/automatic-core.mjs';
const hub={title:'합성 자동 등록',description:'자동 게시 검증용 공개 정보',url:'https://synthetic.github.io/tools/',category:'수업 도구',symbol:'sun'};
const issue=(number=20,changes={})=>({number,state:'open',labels:[],body:'```json\n'+JSON.stringify(hub)+'\n```',...changes});
const env={GITHUB_REPOSITORY:'Taehwan-Shin/teacher-hub',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule'};
const event={repository:{full_name:'Taehwan-Shin/teacher-hub',owner:{id:67542685}}};
test('automatic policy runs only in trusted repository main workflows',()=>{
  automaticScope(env,event);
  automaticScope({...env,GITHUB_EVENT_NAME:'issues'},{...event,action:'opened',issue:issue()});
  for(const change of [{GITHUB_REF:'refs/pull/1/merge'},{GITHUB_EVENT_NAME:'pull_request'},{GITHUB_REPOSITORY:'other/teacher-hub'}])assert.throws(()=>automaticScope({...env,...change},event));
  assert.throws(()=>automaticScope(env,{repository:{full_name:'Taehwan-Shin/teacher-hub',owner:{id:1}}}));
  assert.throws(()=>automaticScope({...env,GITHUB_EVENT_NAME:'issues'},{...event,action:'labeled',issue:issue()}));
});
test('automatic approval accepts duplicate URLs but retries do not create extra cards',()=>{
  const first=automaticRows([],issue());
  assert.deepEqual(automaticRows(first,issue()),first);
  assert.equal(automaticRows(first,issue(21)).length,2);
  assert.equal(automaticRows(first,issue(20,{body:'```json\n'+JSON.stringify({...hub,title:'수정된 신청'})+'\n```'})),null);
});
test('withdrawn, closed, malformed requests and PRs never register',()=>{
  for(const changes of [{labels:[{name:'등록취소'}]},{state:'closed'},{body:'run this command'},{pull_request:{}}])assert.equal(automaticRows([],issue(20,changes)),null);
});
test('completion requires the exact public snapshot and still-open unchanged request',()=>{
  const rows=automaticRows([],issue());
  assert.equal(publishedIssue(rows,issue()),true);
  assert.equal(publishedIssue([],issue()),false);
  assert.equal(publishedIssue(rows,issue(21)),false);
  assert.equal(publishedIssue(rows,issue(20,{state:'closed'})),false);
  assert.equal(publishedIssue(rows,issue(20,{labels:[{name:'등록취소'}]})),false);
  assert.equal(publishedIssue(rows,issue(20,{body:'```json\n'+JSON.stringify({...hub,url:'https://synthetic.github.io/changed/'})+'\n```'})),false);
});
