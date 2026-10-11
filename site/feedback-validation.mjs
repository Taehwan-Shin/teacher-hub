export function validateFeedback(value) {
  if(typeof value!=='string')throw new Error('댓글을 입력해주세요.');
  const body=value.trim().normalize('NFC');
  if(body.length<2||body.length>500)throw new Error('댓글은 2~500자로 입력해주세요.');
  if(/[<>\x00-\x08\x0b-\x1f\x7f\u202a-\u202e\u2066-\u2069]/u.test(body))throw new Error('HTML이나 제어 문자는 넣을 수 없습니다.');
  if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu.test(body)||/(?:01[016789]|0[2-6][1-5]?)[ -]?\d{3,4}[ -]?\d{4}/u.test(body)||/\d{6}[ -]?[1-4]\d{6}/u.test(body))throw new Error('이메일·전화번호·개인식별번호를 지우고 다시 작성해주세요.');
  if(/https?:\/\/|www\.|(?:api[_ -]?key|access[_ -]?token|password|비밀번호)\s*[:=]/iu.test(body))throw new Error('링크나 인증 정보를 댓글에 넣지 마세요.');
  return body;
}
export function validHubId(value){return typeof value==='string'&&/^issue-[1-9][0-9]{0,8}$/.test(value);}
