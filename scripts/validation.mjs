export const REPOSITORY = 'Taehwan-Shin/teacher-hub';
export const OWNER_ID = 67542685;
export const APPROVAL = '등록승인';
export const WITHDRAWAL = '등록취소';
export const CATEGORIES = ['수업 도구', '교과 학습', '학급 운영', '창작 활동', '종합 허브'];
export const SYMBOLS = ['sun', 'moon', 'star', 'book', 'compass'];
export function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[<>\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(value)) throw new Error('텍스트 형식 또는 길이가 올바르지 않습니다.');
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(value) || /(?:01[016789]|0[2-6][1-5]?)[ -]?\d{3,4}[ -]?\d{4}/u.test(value) || /\d{6}[ -]?[1-4]\d{6}/u.test(value)) throw new Error('연락처·개인식별정보를 입력할 수 없습니다.');
  return value.trim();
}
export function publicURL(value) {
  if (typeof value !== 'string' || value.length > 500 || /[\s\\<>]/u.test(value)) throw new Error('공개 HTTPS 주소를 입력하세요.');
  let u; try { u = new URL(value); } catch { throw new Error('공개 HTTPS 주소를 입력하세요.'); }
  const h = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || u.hash || !h.includes('.') || /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(h) || /^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[') || !/^[a-z0-9.-]+$/.test(h)) throw new Error('인증·쿼리·해시·포트 없는 공개 HTTPS 주소만 허용합니다.');
  if (/%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(u.pathname)) throw new Error('주소의 경로가 올바르지 않습니다.');
  return u.href;
}
export function validateHub(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).sort().join(',') !== 'category,description,symbol,title,url') throw new Error('허용된 다섯 항목만 제출하세요.');
  const hub = { title: text(input.title, 40), description: text(input.description, 160), url: publicURL(input.url), category: input.category, symbol: input.symbol };
  if (!CATEGORIES.includes(hub.category) || !SYMBOLS.includes(hub.symbol)) throw new Error('분류 또는 카드 문양이 올바르지 않습니다.');
  return hub;
}
export function parseBody(body) {
  if (typeof body !== 'string' || body.length > 4000) throw new Error('신청서 크기가 올바르지 않습니다.');
  const match = /^```json\r?\n([\s\S]+?)\r?\n```\s*$/u.exec(body.trim());
  if (!match) throw new Error('신청 본문에는 JSON 코드 블록 하나만 입력하세요.');
  let data; try { data = JSON.parse(match[1]); } catch { throw new Error('JSON 형식이 올바르지 않습니다.'); }
  return validateHub(data);
}
export function validateRegistry(rows) {
  if (!Array.isArray(rows) || rows.length > 2000) throw new Error('등록 목록 크기가 올바르지 않습니다.');
  const urls = new Set(), ids = new Set(), issues = new Set();
  for (const row of rows) {
    if (Object.keys(row).sort().join(',') !== 'category,description,id,issue,symbol,title,url') throw new Error('등록 목록 항목이 올바르지 않습니다.');
    validateHub(Object.fromEntries(['title', 'description', 'url', 'category', 'symbol'].map(k => [k, row[k]])));
    if (!/^[a-z0-9-]{1,80}$/.test(row.id) || (row.issue !== null && (!Number.isSafeInteger(row.issue) || row.issue < 1))) throw new Error('등록 식별자가 올바르지 않습니다.');
    const key = publicURL(row.url).replace(/\/$/, '').toLowerCase();
    if (urls.has(key) || ids.has(row.id) || (row.issue !== null && issues.has(row.issue))) throw new Error('중복 허브가 있습니다.');
    urls.add(key); ids.add(row.id); if (row.issue !== null) issues.add(row.issue);
  }
  return rows;
}
export function authorize(event) {
  if (event.repository?.full_name !== REPOSITORY || event.repository?.owner?.id !== OWNER_ID || event.sender?.id !== OWNER_ID || event.sender?.type !== 'User' || event.action !== 'labeled' || event.issue?.pull_request || !Number.isSafeInteger(event.issue?.number) || event.issue?.state !== 'open' || ![APPROVAL, WITHDRAWAL].includes(event.label?.name)) throw new Error('승인 권한 또는 이벤트가 올바르지 않습니다.');
}
export function updateRegistry(rows, event) {
  authorize(event); validateRegistry(rows);
  if (event.label.name === WITHDRAWAL) return rows.filter(row => row.issue !== event.issue.number);
  const data = parseBody(event.issue.body);
  const previous = rows.find(row => row.issue === event.issue.number);
  if (previous) {
    if (JSON.stringify(validateHub(Object.fromEntries(['title','description','url','category','symbol'].map(k => [k, previous[k]])))) !== JSON.stringify(data)) throw new Error('이미 승인된 신청서입니다. 변경은 새 신청서로 제출하세요.');
    return rows;
  }
  return validateRegistry([...rows, { id: `issue-${event.issue.number}`, ...data, issue: event.issue.number }]);
}
