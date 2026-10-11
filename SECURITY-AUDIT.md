# 변경 감사 · 2026-10-12

## 변경 사유

기존 classroom-hub를 수정하지 않고 별도 전체 허브를 구성했다. 승인된 링크만 카드로 공개한다. 서버·DB·신규 npm 의존성 없이 정적 GitHub Pages와 GitHub Actions를 사용한다. 개인정보를 수집하는 신청 항목을 두지 않는다.

## 승인·무결성

승인자는 GitHub의 숫자 ID 67542685와 User 유형으로 제한한다. 저장소 이름·소유자 ID·이벤트 유형·라벨·열린 Issue 상태를 함께 검사한다. PR과 외부 저장소 이벤트는 거부한다. 신청자는 저장소 쓰기 권한을 받을 필요가 없다. Issue 본문은 JSON으로만 읽고 shell 명령·HTML·코드·워크플로로 실행하지 않는다.

고정 필드 다섯 개와 분류·문양 allowlist, 텍스트 길이, HTML·제어문자·대표 연락처/식별번호 패턴을 검사한다. 개인정보 검사는 모든 자연어 실명·학교명 등을 탐지하는 기능은 아니므로 신청 금지 안내와 운영자의 검토가 필요하다. 의도적으로 공개한 허브 제목·소개·URL만 공개 JSON/Git 이력에 저장한다. 비공개 데이터가 필요하면 이 구조에 넣지 않는다.

승인 이벤트의 본문을 저장하며 현재 Issue와 다르면 거부한다. 이후 편집은 자동 반영하지 않는다. 중복 식별자·주소·신청 번호는 거부한다. Contents API의 blob SHA를 이용해 낙관적 동시성 제어를 적용하고 충돌은 최대 5회 재시도한다. 재실행은 같은 승인 내용에 대해 멱등이다. 등록 작업은 신청별, 배포 작업은 전역 직렬화한다. 배포는 최신 main을 체크아웃한다. GitHub concurrency는 대기 작업을 대체할 수 있어 대체된 작업의 완료 댓글은 지연되거나 누락될 수 있으나 최신 배포는 승인 목록 전체를 포함한다. 완료 댓글 누락 시 해당 워크플로를 재실행할 수 있다.

권한 검사 후 Contents 쓰기 직전에 Issue 상태를 재확인하지만 GitHub Issue 변경과 Git 커밋은 원자적 트랜잭션이 아니다. 그 사이 수정돼도 승인 당시 스냅샷만 저장되며 미승인 변경 내용은 게시되지 않는다.

## 네트워크·권한·시크릿

URL은 공개 DNS 이름의 HTTPS만 허용하며 credentials·query·hash·port·local/내부 호스트·IP 리터럴을 거부한다. 등록 runner는 허브 주소를 fetch하지 않는다. 따라서 DNS rebinding을 통한 등록 서버 SSRF를 만들지 않는다. 외부 링크는 noopener noreferrer와 no-referrer를 사용한다. 링크 렌더는 textContent·DOM API를 사용한다.

브라우저에는 토큰·개인 프로필·이메일·개인 기록이 없다. localStorage·쿠키·analytics·외부 글꼴·외부 이미지를 사용하지 않는다. CSP meta는 self 스크립트/스타일/이미지/JSON 연결만 허용한다. CORS API를 제공하지 않는다. Pages는 사용자 지정 CSP·frame-ancestors·X-Frame-Options 응답 헤더를 보장하지 않으므로 meta로 iframe 차단을 보장할 수 없다.

GITHUB_TOKEN은 자동화 작업의 환경 변수에서만 읽고 API github.com에만 전달한다. redirects는 거부한다. 로그에 Issue 본문·URL·인증 토큰·계정 프로필을 출력하지 않는다. 오류는 일반 메시지로 제한한다. 등록 contents:write/issues:read, 배포 contents:read/pages:write/id-token:write, 완료 contents:read/issues:write로 권한을 분리한다. checkout은 main만 읽고 persist-credentials:false로 설정한다. pull_request_target이나 신청자 코드 체크아웃을 사용하지 않는다.

## 공급망

npm 의존성은 없다. 직접 그린 SVG와 OS 글꼴만 사용한다. GitHub 공식 actions/checkout v4, upload-pages-artifact v3, deploy-pages v4의 공식 태그에서 API로 확인한 40자 commit SHA에 고정한다. checkout은 소스 읽기, upload는 허용된 site/만 업로드, deploy는 Pages API와 OIDC로 배포하는 용도로 제한한다. 공식 Actions도 공급망 위험이 있으므로 변경 시 공식 저장소와 보안 공지·권한·태그를 검토한다. Runner 이미지는 GitHub 관리 영역이며 불변 이미지가 아니다.

## 부작용·예외

실시간 DB 방식이 아니므로 게시에는 Actions 대기/배포 시간이 필요하다. 이미 게시된 카드는 라벨 제거만으로 없어지지 않는다. 원본 Issue 재개 후 등록취소가 필요하다. 삭제 후에도 Git/Issue 이력이 남는다. 연락처·비공개 정보가 잘못 공개되면 일반 카드 삭제만으로 완전 제거되지 않으므로 GitHub의 개인정보 제거 절차를 별도로 적용해야 한다.

네트워크 timeout, 잘못된 JSON, 과도한 길이, 잘못된 enum, 비공개 주소, 중복, 권한 오류, 수정된 신청서, 동시 충돌을 처리한다. 등록 실패는 배포로 이어지지 않는다. 배포 실패 시 마지막 성공 사이트가 유지되고 승인 데이터는 보존된다. API 호출은 30초 timeout과 redirect 거부를 사용한다. 복사 실패는 펼쳐서 수동 복사, 목록 실패는 재시도, 검색 결과 없음은 안내를 제공한다. reduced-motion·키보드 focus·모바일을 지원한다.

## 검증 기록

단위 테스트·브라우저 검사·원격 배포·등록 승인 검증 결과는 작업 완료 시 추가 기록한다. 실제 학생·교사 데이터 대신 합성 자료를 사용한다.
