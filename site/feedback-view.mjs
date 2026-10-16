import { listFeedback, submitFeedback, deleteFeedback } from './feedback-client.mjs';
import { validateFeedback } from './feedback-validation.mjs';
const $=id=>document.getElementById(id);
let hub,generation=0,cursor,busy=false,loading=false;
const messages={network:'연결하지 못했습니다. 작성한 내용은 남아 있습니다. 잠시 후 다시 시도해주세요.',quota:'현재 댓글 이용량이 많습니다. 잠시 후 다시 시도해주세요.',cooldown:'도배를 막기 위해 댓글은 5초에 한 번 남길 수 있습니다.',denied:'요청이 제한되었습니다. 잠시 후 다시 시도해주세요.',auth:'익명 연결을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.',uncertain:'등록 결과를 확인하지 못했습니다. 중복 작성 전에 새로고침으로 댓글을 확인해주세요.','delete-auth':'삭제 비밀번호가 올바르지 않거나 인증이 제한되었습니다.','delete-uncertain':'삭제 결과를 확인하지 못했습니다. 새로고침으로 댓글을 확인해주세요.'};
function message(error){return messages[error.code]||'댓글을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';}
function renderEntry(entry){const item=document.createElement('article');item.className='feedback-entry';const top=document.createElement('div');top.className='feedback-entry-top';const name=document.createElement('strong');name.textContent='익명 선생님';const time=document.createElement('time');time.dateTime=entry.createdAt;time.textContent=new Intl.DateTimeFormat('ko-KR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(entry.createdAt));top.append(name,time);const body=document.createElement('p');body.textContent=entry.body;const remove=document.createElement('button');remove.type='button';remove.className='feedback-delete';remove.textContent='삭제';remove.setAttribute('aria-label','이 댓글 삭제');remove.addEventListener('click',()=>beginDelete(entry));item.append(top,body,remove);return item;}

let deleting;
function beginDelete(entry){if(busy)return;deleting={hubId:hub.id,name:entry.name};$('feedback-delete-password').value='';$('feedback-delete-status').textContent='';$('feedback-delete-dialog').showModal();$('feedback-delete-password').focus();}
function cancelDelete(){if(!busy)$('feedback-delete-dialog').close();}
$('feedback-delete-cancel').addEventListener('click',cancelDelete);
$('feedback-delete-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('feedback-delete-dialog').addEventListener('close',()=>{$('feedback-delete-password').value='';deleting=undefined;});
$('feedback-delete-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!deleting)return;
  const target=deleting,password=$('feedback-delete-password').value;
  $('feedback-delete-password').value='';busy=true;$('feedback-delete-confirm').disabled=true;$('feedback-delete-cancel').disabled=true;$('feedback-delete-status').textContent='댓글을 삭제하는 중입니다.';
  try{await deleteFeedback(target.hubId,target.name,password);$('feedback-delete-dialog').close();$('feedback-status').textContent='댓글을 삭제했습니다.';generation++;loading=false;await load();}
  catch(error){$('feedback-delete-status').textContent=message(error);}
  finally{busy=false;$('feedback-delete-confirm').disabled=false;$('feedback-delete-cancel').disabled=false;}
});
async function load(more=false){
  if(!hub||loading)return;const current=hub.id,g= generation;loading=true;$('feedback-refresh').disabled=true;$('feedback-more').disabled=true;
  if(!more)$('feedback-list').textContent='의견을 불러오는 중입니다.';
  try{const result=await listFeedback(current,more?cursor:undefined);if(g!==generation)return;if(!more)$('feedback-list').replaceChildren();for(const row of result.entries)$('feedback-list').append(renderEntry(row));cursor=result.entries.at(-1);$('feedback-more').hidden=!result.more;if(!$('feedback-list').childElementCount)$('feedback-list').textContent='첫 번째 의견을 남겨주세요.';}
  catch(error){if(g!==generation)return;if(!more)$('feedback-list').textContent='의견을 불러오지 못했습니다. 새로고침으로 다시 시도해주세요.';$('feedback-status').textContent=message(error);}
  finally{if(g===generation){loading=false;$('feedback-refresh').disabled=false;$('feedback-more').disabled=false;}}
}
export function openFeedback(selected){if(busy)return;hub=selected;generation++;loading=false;cursor=undefined;$('feedback-hub').textContent=selected.title;$('feedback-body').value='';$('feedback-status').textContent='';$('feedback-more').hidden=true;$('feedback-report-link').href=`https://github.com/Taehwan-Shin/teacher-hub/issues/${selected.issue}#new_comment_field`;if(!$('feedback-dialog').open)$('feedback-dialog').showModal();void load();}
$('feedback-close').addEventListener('click',()=>{if(!busy)$('feedback-dialog').close();});
$('feedback-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('feedback-dialog').addEventListener('close',()=>{generation++;loading=false;$('feedback-body').value='';hub=undefined;});
$('feedback-refresh').addEventListener('click',()=>{if(!busy)void load();});$('feedback-more').addEventListener('click',()=>void load(true));
$('feedback-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!hub)return;let body;try{body=validateFeedback($('feedback-body').value);}catch(error){$('feedback-status').textContent=error.message;return;}
  const current=hub.id,g=generation;busy=true;$('feedback-submit').disabled=true;$('feedback-close').disabled=true;$('feedback-body').readOnly=true;$('feedback-status').textContent='피드백을 등록하는 중입니다.';
  try{await submitFeedback(current,body);if(g!==generation)return;$('feedback-body').value='';$('feedback-status').textContent='피드백이 공개되었습니다. 의견을 나눠주셔서 감사합니다.';generation++;loading=false;await load();}
  catch(error){if(g===generation)$('feedback-status').textContent=message(error);}
  finally{busy=false;$('feedback-submit').disabled=false;$('feedback-close').disabled=false;$('feedback-body').readOnly=false;}
});
