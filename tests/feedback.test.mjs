import test from 'node:test';
import assert from 'node:assert/strict';
import {validateFeedback,validHubId} from '../site/feedback-validation.mjs';
test('feedback accepts intended public text and trims input',()=>assert.equal(validateFeedback('  합성 의견입니다.\n수업 도구가 유용해요.  '),'합성 의견입니다.\n수업 도구가 유용해요.'));
test('feedback rejects blank, oversized, markup, PII, secrets and links',()=>{for(const text of [' ','가','가'.repeat(501),'<img>','test@example.invalid','010-0000-0000','123456-1234567','password: example','비밀번호=예시','https://sample.github.io/','\u202e합성 의견'])assert.throws(()=>validateFeedback(text));});
test('hub identifiers cannot inject paths or query operators',()=>{assert.ok(validHubId('issue-1'));for(const id of ['classroom-hub','issue-0','issue-../diary','issue-1/comments','issue-1000000000',1])assert.equal(validHubId(id),false);});
