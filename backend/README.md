# Firebase 댓글 저장

## 2026-10-16 등록 접수 추가

결제 연결 여부를 API로 확인했으며 `billingEnabled:false`인 무료 상태를 유지했다. Cloud Functions 대신 기존 Firestore REST API가 접수를 받고, 공개 저장소의 표준 GitHub Actions 예약 실행이 Issue를 생성한다. Firebase Auth·Firestore 스킬의 기존 Standard DB와 익명 인증 구성을 재사용한다. Hosting·Google 로그인·일기 데이터는 변경하지 않는다.

모델: `teacherHubRequests/UUID`에는 합성 uid·공개 hub map·createdAt·state(queued/issued/rejected)·issue(초기 0)·processedAt(초기 null)을 저장한다. 요청자만 자기 문서를 단건 읽고 생성 후 수정·삭제할 수 없다. `teacherHubRequestWriters/uid`의 마지막 requestId/updatedAt과 `teacherHubRequestQuota/global`의 hourStart/hourCount/dayStart/dayCount/requestId/updatedAt을 접수와 원자적으로 커밋한다. 연결당 1분, 시간 창당 60개·24시간 창당 200개이며 서버 시각을 강제한다. 새 익명 연결로 개인 제한을 우회할 수 있고 전체 한도 소진 공격은 막지 못한다.

별도 합성 Firebase 계정의 `hubRegistrar:true` custom claim은 관리자 API로만 설정했다. 이 계정은 요청 목록(최대 20개), 처리 상태·Issue 번호·처리 시각만 변경하고 처리 7일 이후 원본을 삭제한다. 본문·작성자·생성 시각 변경, 일기장 접근, 댓글 쓰기용 제한 문서 접근은 금지한다. Google IAM 권한·관리자 키를 부여하지 않았다. 갱신 토큰은 메모리에서 Libsodium sealed box로 암호화해 GitHub Actions `INTAKE_REFRESH_TOKEN` Secret에 저장했다. 평문 파일·공개 코드·로그에 저장하지 않았다.

GitHub 인증은 실행마다 발급되는 `GITHUB_TOKEN`의 contents:read/issues:write만 사용한다. 개인 GitHub 토큰을 서버에 저장하지 않는다. 신청 텍스트·URL을 shell에 삽입하거나 실행하지 않고 본문은 다섯 필드의 JSON 코드 블록 하나로 만든다. 운영자 승인·코드 변경·게시 권한은 접수 workflow에 없다. 접수 UUID를 제목에 넣어 중단 후 재실행에서도 기존 Issue를 찾으며, 같은 공개 URL의 열린 신청·게시 허브는 기존 Issue로 연결한다. 임의의 허브 주소를 서버에서 fetch하지 않는다.

쿼리: state==queued, limit10; 처리 시각이 1970년보다 크고 7일보다 오래된 문서 limit20. 모두 단일 필드 인덱스로 실행한다. 처음부터 처리된 문서만 정리하므로 대기 접수는 보존한다. 익명 Auth 계정·작성 제한 문서는 자동 삭제하지 않으며 일기장·댓글과 무료 사용량을 공유한다. 실제 자연어 개인정보를 모두 탐지하지 못하므로 공개 정보만 제출하도록 안내하고 운영자가 검토한다.

예약 실행은 분 7·17·27·37·47·57에 요청하지만 GitHub가 실행을 지연·누락하거나 장기 비활동으로 중지할 수 있다. 운영자는 Actions에서 실행 상태를 확인하고 수동 실행할 수 있다. 처리 오류는 접수를 보존하며 개인정보 없는 일반 오류로 알린다. 공개 GitHub Issue와 Git 이력은 접수 원본을 지워도 남는다.

중단: `등록 접수 처리` workflow를 비활성화하고 접수 create를 거부한다. 일기장·댓글 규칙은 보존한다. 인증 교체: 기존 처리 계정의 custom claim 제거·계정 비활성화 후 새 전용 계정에 claim을 부여하고 Secret을 교체한다. 해당 계정의 ID token은 만료까지 유효할 수 있어 긴급 차단은 규칙의 worker 권한도 함께 거부한다. 프로젝트 전체 Auth나 Google 로그인을 끄지 않는다.

프로젝트 `classroom-diary-098bae6e`, `(default)` Standard Native Firestore, 서울 `asia-northeast3`를 기존 암호화 일기장과 공유한다. 화면은 GitHub Pages로 게시한다. Firebase Hosting 변경·유료 전환·Cloud Functions·추가 DB 생성은 수행하지 않았다.

`firestore.rules`는 일기장과 댓글의 전체 규칙이다. 게시 시 전체 규칙이 교체되므로 Console의 활성 규칙과 비교해 다른 앱의 변경도 보존한다. 일기장 작업본 `classroom-hub/firestore.rules`도 동일한 규칙으로 동기화했다. 예전 일기장 규칙만 배포하면 댓글 접근이 차단된다.

```powershell
firebase deploy --only firestore:rules --config backend/firebase.json --project classroom-diary-098bae6e
```

익명 Authentication을 활성화했으며 Google 로그인과 허용 도메인은 보존했다. 첫 댓글 작성 때 익명 연결을 생성하고 토큰은 메모리에만 둔다. 익명 사용자는 일기장에 접근할 수 없다.

| 경로 | 저장 내용 | 권한 |
| --- | --- | --- |
| `teacherHubFeedback/issue-N/comments/UUID` | 공개 본문, 서버 시각 | 공개 단건·최대 21개 목록 읽기, 익명 생성, 방문자 수정·삭제 금지 |
| `teacherHubFeedbackWriters/익명UID` | 마지막 허브·댓글 식별자, 시각 | 본인 익명 연결만 단건 읽기·생성·1분 이후 갱신, 목록 금지 |
| `teacherHubFeedbackQuota/global` | 시간 창, 건수, 마지막 허브·댓글 식별자, 시각 | 익명 단건 읽기, 댓글과 원자적 갱신, 시간 창당 100개 |

세 문서를 원자적으로 커밋하며 `getAfter`로 같은 새 댓글을 가리키는지 검사한다. 서버에서 본문 길이·필드 allowlist·서버 시각·대표 개인정보·HTML/제어 문자·링크·인증 정보 패턴을 검사한다. 문서 버전 사전조건으로 동시 갱신을 보호한다. 작성자 UID는 프로필과 연결하지 않는 합성 식별자이며 비공개 제한 문서에만 저장한다.

## 한계와 운영

모든 댓글은 공개 자료다. 자연어 이름·학교명 등 모든 개인정보를 자동 판별하지 못하므로 안내와 관리자 삭제가 필요하다. UI는 승인된 카드에만 버튼을 표시하지만 규칙은 GitHub 승인 목록을 조회하지 않으므로 형식상 유효한 임의 `issue-N` 번호로 직접 쓰는 요청까지 막지는 못한다. 그 요청도 검증·한도를 통과해야 하며 미등록 카드가 생기지는 않는다.

브라우저를 다시 열면 새 익명 연결이 생겨 개인별 1분 제한은 우회할 수 있다. 전체 한도는 서버에서 유지되지만 공격자가 소진하면 정상 작성도 다음 시간 창까지 제한된다. 완전한 봇 방지·신원별 제한·읽기 폭증 방어는 제공하지 않는다.

댓글과 일기장은 Firestore 사용량과 Authentication 한도를 공유한다. 공개 읽기 폭증은 일기장 사용에도 영향을 줄 수 있다. Console에서 사용량을 확인하고 필요하면 프로젝트 분리·App Check·추가 서버 제한을 설계한다. 공유 프로젝트에 App Check를 전체 강제하면 일기장에 영향이 있으므로 검증 없이 켜지 않는다. 오래된 익명 계정과 제한 문서는 운영자가 정책을 정해 정리한다. 자동 삭제·유료 서비스는 켜지 않았다.

실패 시 입력을 보존한다. 응답이 불명확하면 생성 UUID로 성공 여부를 확인하고 확인할 수 없으면 중복 작성 전 새로고침을 안내한다. 네트워크·권한·이용량·충돌 오류는 일반 메시지로 표시하며 토큰·본문을 로그에 남기지 않는다. Firebase 장애 때도 허브 링크와 등록 안내는 사용할 수 있다.

운영자 삭제는 Console에서 문제 댓글 문서만 대상으로 한다. 댓글 기능 중단은 댓글 전용 경로를 거부하되 일기장 경로는 유지한다. 공유 프로젝트 Authentication 전체를 비활성화하지 않는다.

## 검증 도구

에뮬레이터는 운영 프로젝트와 다른 `demo-teacher-hub`, 127.0.0.1:8088을 사용한다. `tests/feedback-rules-check.mjs`는 기존 일기장 폴더의 개발용 테스트 라이브러리를 재사용한다. 댓글 권한 42개와 일기장 회귀 검사 39개가 통과했다. 화면은 공식 REST API를 사용하며 신규 SDK·npm 의존성을 추가하지 않았다. 테스트 도구·CLI·Java는 게시 파일에 포함하지 않는다.
