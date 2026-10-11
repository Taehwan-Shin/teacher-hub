import { readFile } from 'node:fs/promises';
import { client } from './github.mjs';
import { authorize } from './validation.mjs';
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
authorize(event);
const api = client(process.env.GH_TOKEN, process.env.GITHUB_REPOSITORY);
const body = event.label.name === '등록취소'
  ? '등록 취소가 반영되었습니다. 전체 허브에서 카드가 제거되었습니다.'
  : '게시 완료: https://taehwan-shin.github.io/teacher-hub/\n\n승인 당시의 내용으로 게시했습니다. 수정이 필요하면 새 등록 요청을 제출하세요.';
await api(`/issues/${event.issue.number}/comments`, 'POST', { body });
await api(`/issues/${event.issue.number}`, 'PATCH', { state: 'closed', state_reason: 'completed' });
console.log('게시 결과 기록 완료');
