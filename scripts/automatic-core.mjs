import {REPOSITORY, OWNER_ID, WITHDRAWAL, parseBody, validateHub, validateRegistry} from './validation.mjs';

// Approval policy belongs to trusted main-branch code, never to submitted text.
export function automaticScope(env, event) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== 'refs/heads/main' ||
      event.repository?.full_name !== REPOSITORY || event.repository?.owner?.id !== OWNER_ID ||
      !['schedule', 'workflow_dispatch', 'issues'].includes(env.GITHUB_EVENT_NAME) ||
      (env.GITHUB_EVENT_NAME === 'issues' && (!['opened', 'reopened', 'edited'].includes(event.action) || event.issue?.pull_request))) {
    throw new Error('Automatic registration scope rejected');
  }
}
export function candidate(issue) {
  if (issue.pull_request || issue.state !== 'open' || !Number.isSafeInteger(issue.number) || issue.number < 1 ||
      issue.labels?.some(label => label.name === WITHDRAWAL)) return null;
  try { return parseBody(issue.body); } catch { return null; }
}
export function sameHub(row, hub) {
  return JSON.stringify(validateHub(Object.fromEntries(['title', 'description', 'url', 'category', 'symbol'].map(k => [k, row[k]])))) === JSON.stringify(hub);
}
export function automaticRows(rows, issue) {
  validateRegistry(rows);
  const hub = candidate(issue);
  if (!hub) return null;
  const previous = rows.find(row => row.issue === issue.number);
  // Saved snapshots stay immutable. A new submission may share the same URL.
  if (previous) return sameHub(previous, hub) ? rows : null;
  return validateRegistry([...rows, {id: `issue-${issue.number}`, ...hub, issue: issue.number}]);
}
export function publishedIssue(rows, issue) {
  const hub = candidate(issue), row = rows.find(row => row.issue === issue.number);
  return Boolean(hub && row && sameHub(row, hub));
}
