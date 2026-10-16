import { openFeedback } from './feedback-view.mjs';
import { validHubId } from './feedback-validation.mjs';
const categories = ['수업 도구','교과 학습','학급 운영','창작 활동','종합 허브'];
const symbols = ['sun','moon','star','book','compass'];
const names = {sun:'THE SUN',moon:'THE MOON',star:'THE STAR',book:'THE BOOK',compass:'THE COMPASS'};
let hubs = [], category = '전체';
const byId = id => document.getElementById(id);
const prompt = `현재 프로젝트의 웹앱 허브를 ‘교사의 별자리’ 전체 허브에 등록 신청해줘.
등록 안내: https://github.com/Taehwan-Shin/teacher-hub/blob/main/REGISTRATION_API.md
위 안내를 공개 HTTP로 읽고, 현재 프로젝트에서 허브 이름·소개·실제 공개 배포 주소를 확인해줘. 확인되지 않은 정보는 추측하지 말고 질문해줘.
분류는 수업 도구/교과 학습/학급 운영/창작 활동/종합 허브, 문양은 sun/moon/star/book/compass 중 골라줘.
개인정보·학생 정보·비공개 주소·인증 정보는 제외하고 공개할 허브 정보만 전송해줘.
정보가 준비되어 있으면 안내의 공개 접수 클라이언트 코드를 확인한 뒤 임시 폴더에서 실행해 Firebase에 신청을 접수해줘. 이 프롬프트는 해당 공개 정보의 등록 신청 전송을 허용한다.
GitHub 연결 앱으로 Issue를 직접 생성하지 말고, 프로젝트 소스·저장소 파일·승인 라벨을 변경하지 마.
접수 번호와 추적 링크를 알려줘. 접수 후 GitHub Actions가 주기적으로 Issue를 만들고 운영자가 승인하면 카드가 게시된다는 점을 안내해줘. 오류가 나면 성공했다고 말하거나 접수를 반복하지 말고 원인과 접수 번호를 알려줘.`;
byId('prompt').textContent = prompt;
byId('copy-prompt').addEventListener('click', async () => {
  try { await Promise.race([navigator.clipboard.writeText(prompt),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),3000))]); byId('copy-status').textContent='복사했습니다. 웹앱 허브 프로젝트의 Codex에 붙여넣으세요.'; }
  catch { byId('copy-status').textContent='자동 복사를 사용할 수 없습니다. 아래 프롬프트를 펼쳐 직접 복사하세요.'; document.querySelector('details').open=true; }
});
function element(tag, cls, content) { const e=document.createElement(tag); if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e; }
function safeHub(h) {
  if (!h || !validHubId(h.id)||!Number.isSafeInteger(h.issue)||h.id!==`issue-${h.issue}`||typeof h.title!=='string'||typeof h.description!=='string'||h.title.length>40||h.description.length>160||!categories.includes(h.category)||!symbols.includes(h.symbol)) return false;
  try { const u=new URL(h.url); return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^[a-z0-9.-]+$/i.test(u.hostname)&&u.hostname.includes('.')&&!/^[\d.]+$/.test(u.hostname)&&!/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/i.test(u.hostname); } catch { return false; }
}
function card(h,index) {
  const a=element('a',`hub-card symbol-${h.symbol}`);a.href=h.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`${h.title} — 새 탭에서 열기`);
  a.append(element('span','card-no',String(index+1).padStart(2,'0')+' · '+names[h.symbol]));
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 200 230');svg.classList.add('card-art');svg.setAttribute('aria-hidden','true');const use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href',`art.svg#${h.symbol}`);svg.append(use);a.append(svg);
  a.append(element('p','card-category',h.category),element('h3','card-title',h.title),element('p','card-description',h.description));
  const bottom=element('div','card-bottom');bottom.append(element('small','',new URL(h.url).hostname),element('span','','허브 열기 ↗'));a.append(bottom);
  const shell=element('article','card-shell');shell.append(a);
  const feedback=element('button','feedback-open','피드백 남기기 · 보기');feedback.type='button';feedback.setAttribute('aria-label',`${h.title} 피드백 남기기 및 보기`);feedback.addEventListener('click',()=>openFeedback(h));shell.append(feedback);return shell;
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
