const categories = ['수업 도구','교과 학습','학급 운영','창작 활동','종합 허브'];
const symbols = ['sun','moon','star','book','compass'];
const names = {sun:'THE SUN',moon:'THE MOON',star:'THE STAR',book:'THE BOOK',compass:'THE COMPASS'};
let hubs = [], category = '전체';
const byId = id => document.getElementById(id);
const prompt = `이 GitHub 저장소의 CONTRIBUTING.md 등록 안내를 읽고 내 웹앱 허브의 등록 요청 Issue를 생성해 줘.
저장소: https://github.com/Taehwan-Shin/teacher-hub
허브 이름: [공개할 허브 이름]
소개: [160자 이내 공개 소개]
허브 주소: [쿼리·해시 없는 공개 HTTPS 주소]
분류: [수업 도구 / 교과 학습 / 학급 운영 / 창작 활동 / 종합 허브 중 하나]
카드 문양: [sun / moon / star / book / compass 중 하나]
실명·학교·연락처·학생 정보·토큰은 입력하지 마.
신청 본문에는 안내에 맞는 JSON 코드 블록 하나만 넣어 줘.
저장소 파일이나 코드를 변경하지 말고 승인 라벨도 붙이지 마.
GitHub 연결이나 Issue 생성 권한이 없으면 신청용 JSON을 작성하고 직접 신청 링크를 안내해 줘.
운영자 승인 후 게시된다는 점을 알려 줘.`;
byId('prompt').textContent = prompt;
byId('copy-prompt').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(prompt); byId('copy-status').textContent='복사했습니다. 허브 정보를 채워 Codex에 붙여넣으세요.'; }
  catch { byId('copy-status').textContent='자동 복사를 사용할 수 없습니다. 아래 프롬프트를 펼쳐 직접 복사하세요.'; document.querySelector('details').open=true; }
});
function element(tag, cls, content) { const e=document.createElement(tag); if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e; }
function safeHub(h) {
  if (!h || typeof h.title!=='string'||typeof h.description!=='string'||h.title.length>40||h.description.length>160||!categories.includes(h.category)||!symbols.includes(h.symbol)) return false;
  try { const u=new URL(h.url); return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^[a-z0-9.-]+$/i.test(u.hostname)&&u.hostname.includes('.')&&!/^[\d.]+$/.test(u.hostname)&&!/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/i.test(u.hostname); } catch { return false; }
}
function card(h,index) {
  const a=element('a',`hub-card symbol-${h.symbol}`);a.href=h.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`${h.title} — 새 탭에서 열기`);
  a.append(element('span','card-no',String(index+1).padStart(2,'0')+' · '+names[h.symbol]));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 200 230');svg.classList.add('card-art');svg.setAttribute('aria-hidden','true');const use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href',`art.svg#${h.symbol}`);svg.append(use);a.append(svg);
  a.append(element('p','card-category',h.category),element('h3','card-title',h.title),element('p','card-description',h.description));
  const bottom=element('div','card-bottom');bottom.append(element('small','',new URL(h.url).hostname),element('span','','허브 열기 ↗'));a.append(bottom);return a;
}
function invite() {const a=element('a','hub-card invitation');a.href='#join';a.append(element('div','invitation-symbol','✧'),element('h3','','다음 별자리의 주인공은\n선생님입니다'),element('p','','당신의 아이디어가 담긴 허브를\n한 장의 카드로 나눠주세요.'),element('span','invite-action','내 허브 등록하기 +'));return a;}
function render() {
  const q=byId('search').value.trim().toLocaleLowerCase('ko');
  const matches=hubs.filter(h=>(category==='전체'||h.category===category)&&`${h.title} ${h.description}`.toLocaleLowerCase('ko').includes(q));
  byId('cards').replaceChildren(...matches.map(h=>card(h,hubs.indexOf(h))),invite());byId('empty').hidden=matches.length!==0;
  byId('result-count').textContent=`${matches.length}개의 허브`;byId('total-count').textContent=String(hubs.length).padStart(2,'0');
}
byId('filters').addEventListener('click', e=>{const b=e.target.closest('button[data-category]');if(!b)return;category=b.dataset.category;for(const button of byId('filters').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button===b));render();});
byId('search').addEventListener('input',render);
async function load() {
  byId('load-error').hidden=true;
  try {const response=await fetch('hubs.json',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('load');const data=await response.json();if(!Array.isArray(data)||data.length>2000||data.some(h=>!safeHub(h)))throw new Error('invalid');hubs=data;render();}
  catch {byId('load-error').hidden=false;byId('result-count').textContent='목록을 불러오지 못했습니다.';byId('cards').replaceChildren(invite());}
}
byId('retry').addEventListener('click',load);await load();
