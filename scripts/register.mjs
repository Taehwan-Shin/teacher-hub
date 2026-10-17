import { readFile, appendFile } from 'node:fs/promises';
import { authorize, updateRegistry, REPOSITORY } from './validation.mjs';
import { client } from './github.mjs';
const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
try {
  authorize(event);
  const api = client(process.env.GH_TOKEN, process.env.GITHUB_REPOSITORY);
  const current = await api(`/issues/${event.issue.number}`);
  if (current.state !== 'open' || !current.labels.some(l => l.name === event.label.name) || current.body !== event.issue.body || current.updated_at !== event.issue.updated_at) throw new Error('신청 내용 또는 라벨이 변경되었습니다. 내용을 검토한 뒤 승인 라벨을 다시 붙이세요.');
  let saved = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const file = await api('/contents/data/hubs.json?ref=main');
    const rows = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    const next = updateRegistry(rows, event);
    if (JSON.stringify(rows) === JSON.stringify(next)) { saved = true; break; }
    const latest = await api(`/issues/${event.issue.number}`);
    if (latest.body !== event.issue.body || latest.state !== 'open' || !latest.labels.some(l => l.name === event.label.name)) throw new Error('승인 이후 신청 내용이 변경되었습니다. 다시 검토하세요.');
    try {
      await api('/contents/data/hubs.json', 'PUT', {
        message: `${event.label.name === '등록취소' ? 'Withdraw' : 'Approve'} hub request #${event.issue.number}`,
        content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64'), sha: file.sha, branch: 'main'
      });
      saved = true; break;
    } catch (error) { if (error.status !== 409 && error.status !== 422) throw error; }
  }
  if (!saved) throw new Error('동시 등록 충돌입니다. Actions에서 실패한 작업을 재실행하세요.');
  await appendFile(process.env.GITHUB_OUTPUT, 'ready=true\n');
  console.log('승인된 스냅샷 반영 완료');
} catch (error) {
  // No issue body, URL, account profile or credentials in logs.
  console.error(error.message.startsWith('GitHub API') ? error.message : '등록 검사 실패. 권한·신청 형식·식별자·수정 여부를 확인하세요.');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, '등록되지 않았습니다. 신청 형식·개인정보·식별자·수정 여부를 확인하고 라벨을 제거한 뒤 다시 붙이세요.\n');
  process.exitCode = 1;
}
