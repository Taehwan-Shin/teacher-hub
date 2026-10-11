export function client(token, repo) {
  if (!token || repo !== 'Taehwan-Shin/teacher-hub') throw new Error('API 설정이 올바르지 않습니다.');
  return async function api(path, method = 'GET', data) {
    if (!path.startsWith('/') || path.includes('..')) throw new Error('API 경로 오류');
    const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    if (!response.ok) { const e = new Error(`GitHub API 오류 (${response.status})`); e.status = response.status; throw e; }
    return response.status === 204 ? null : response.json();
  };
}
