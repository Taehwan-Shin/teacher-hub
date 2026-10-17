import {readFile, appendFile} from 'node:fs/promises';
import {client} from './github.mjs';
import {APPROVAL, validateRegistry} from './validation.mjs';
import {automaticScope, automaticRows, publishedIssue, candidate} from './automatic-core.mjs';

async function run() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  automaticScope(process.env, event);
  const mode = process.argv[2];
  if (!['register', 'complete'].includes(mode)) throw new Error('Invalid mode');
  const api = client(process.env.GH_TOKEN, process.env.GITHUB_REPOSITORY);
  const issues = [];
  for (let page = 1; page <= 20; page++) {
    const batch = await api(`/issues?state=open&per_page=100&page=${page}`);
    issues.push(...batch);
    if (batch.length < 100) break;
    if (page === 20) throw new Error('Issue pagination limit');
  }
  let published;
  if (mode === 'complete') {
    const response = await fetch(`https://taehwan-shin.github.io/teacher-hub/hubs.json?run=${encodeURIComponent(process.env.GITHUB_RUN_ID)}`, {redirect: 'error', signal: AbortSignal.timeout(30000), cache: 'no-store'});
    if (!response.ok) throw new Error('Publication unavailable');
    published = validateRegistry(await response.json());
  }
  let count = 0, skipped = 0;
  for (const snapshot of issues) {
    if (snapshot.pull_request) continue;
    if (!candidate(snapshot)) { skipped++; continue; }
    if (mode === 'complete') {
      const current = await api(`/issues/${snapshot.number}`);
      // Never close an edited/unpublished request or a withdrawal in progress.
      if (!publishedIssue(published, current)) continue;
      const marker = '<!-- teacher-hub:auto-published -->';
      const comments = await api(`/issues/${current.number}/comments?per_page=100`);
      if (!comments.some(c => c.user?.login === 'github-actions[bot]' && c.body?.includes(marker))) {
        await api(`/issues/${current.number}/comments`, 'POST', {body: `${marker}\n자동 승인 및 사이트 게시가 완료되었습니다.\nhttps://taehwan-shin.github.io/teacher-hub/`});
      }
      const latest = await api(`/issues/${current.number}`);
      if (latest.body !== current.body || !publishedIssue(published, latest)) continue;
      await api(`/issues/${current.number}`, 'PATCH', {state: 'closed', state_reason: 'completed'});
      count++;
      continue;
    }
    let saved = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const current = await api(`/issues/${snapshot.number}`);
      if (current.body !== snapshot.body || !candidate(current)) break;
      const file = await api('/contents/data/hubs.json?ref=main');
      const rows = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      const next = automaticRows(rows, current);
      if (!next) break;
      if (JSON.stringify(rows) !== JSON.stringify(next)) {
        try {
          await api('/contents/data/hubs.json', 'PUT', {message: `Automatically register hub request #${current.number}`, sha: file.sha, branch: 'main', content: Buffer.from(JSON.stringify(next, null, 2) + '\n').toString('base64')});
        } catch (error) { if ([409, 422].includes(error.status)) continue; throw error; }
      }
      await api(`/issues/${current.number}/labels`, 'POST', {labels: [APPROVAL]});
      saved = true; count++; break;
    }
    // Conflicts are retried next run; do not claim an unsaved request succeeded.
    if (!saved) skipped++;
  }
  if (mode === 'register') await appendFile(process.env.GITHUB_OUTPUT, `ready=${count > 0}\n`);
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${mode === 'register' ? '자동 등록 준비' : '공개 확인 및 완료'} ${count}건. 형식 오류·취소·변경된 신청 ${skipped}건은 보존됩니다.\n`);
  console.log(`자동 처리 ${count}건, 보존 ${skipped}건`);
}
try { await run(); } catch {
  console.error('자동 등록 실패: 기존 데이터와 대기 신청은 보존됩니다. Actions에서 다시 실행하세요.');
  process.exitCode = 1;
}
