# 교사의 별자리

교사들의 공개 웹앱 허브를 모으는 타로 카드 아카이브입니다.

- 사이트: https://taehwan-shin.github.io/teacher-hub/
- 등록 안내와 공유 프롬프트: [CONTRIBUTING.md](CONTRIBUTING.md)
- 등록 요청: https://github.com/Taehwan-Shin/teacher-hub/issues

## 등록 승인

1. Issues에서 허브 등록 요청을 엽니다.
2. 허브 이름·소개·분류·주소를 확인하고 실제 허브를 방문해 내용·등록 권한·개인정보를 검토합니다.
3. 오른쪽 Labels에서 **등록승인**을 붙입니다. 소유자 Taehwan-Shin 계정의 승인만 허용합니다.
4. Actions의 **승인 등록과 Pages 게시**가 검사·등록·게시를 진행합니다.
5. 성공하면 Issue에 게시 완료 댓글을 남기고 닫습니다. 실패하면 Actions 실행의 Summary를 확인합니다.

거절은 승인 라벨 없이 Issue를 닫습니다. 이미 게시된 카드 제거는 원래 신청 Issue를 다시 열고 **등록취소** 라벨을 붙입니다. 삭제가 완료되면 다시 닫힙니다. 승인 라벨 제거만으로 게시된 카드가 삭제되지는 않습니다. 수정은 기존 카드를 취소하고 새 신청서로 승인합니다. 최초 교실 도구 허브는 신청 Issue가 없으므로 data/hubs.json을 직접 수정합니다.

승인 시 이벤트 본문의 스냅샷을 저장합니다. 실행 전후 신청 내용·라벨·상태를 다시 확인합니다. 이후 Issue 수정은 카드에 반영되지 않습니다. 재실행은 동일 내용을 중복 등록하지 않습니다. 서로 다른 신청의 동시 승인은 SHA 충돌 재시도로 처리합니다. 게시 실패 시 이미 승인된 데이터는 보존하며 Actions에서 실패한 작업을 재실행합니다.

## 로컬 실행

Node.js 24 이상에서 설치 없이 실행합니다.

```powershell
node --test tests/*.test.mjs
node scripts/build.mjs
node scripts/serve.mjs
```

주소: http://127.0.0.1:4188 . 서버는 loopback만 허용합니다. 종료는 Ctrl+C입니다.

## 구성

site/는 HTML·CSS·JavaScript와 직접 그린 SVG입니다. data/hubs.json은 승인된 공개 목록입니다. scripts/는 입력 검사·등록·완료 처리·정적 빌드를 담당합니다. .github/workflows/publish.yml은 승인 및 Pages 게시 자동화입니다. GITHUB_TOKEN의 등록 커밋은 push 워크플로를 다시 시작하지 않으므로 같은 워크플로에서 직접 게시합니다. 게시 작업을 직렬화하고 게시 직전 최신 main을 읽어 동시 등록 누락을 방지합니다.

카드는 큰 화면에서 5열, 화면 크기에 따라 4·3·2·1열로 표시됩니다. 커서가 있는 환경에서 2.8초 동안 서서히 3D 회전하며 동작 감소 설정은 효과를 끕니다. 검색·분류는 브라우저 메모리에서 처리합니다. 신청 프롬프트 복사가 막히면 직접 복사할 수 있습니다.

## 운영 주의

GitHub Pages와 Issue는 공개입니다. 학생 정보·일기·개인 문서·연락처·인증 정보는 제출하지 않습니다. 방문 기록은 GitHub 호스팅 정책이 적용됩니다. 공개 주소를 서버에서 방문하지 않아 등록 URL을 이용한 SSRF를 방지합니다. 링크의 적합성은 운영자가 검토합니다. 보안·변경 사유·예외 처리·검증 한계는 [SECURITY-AUDIT.md](SECURITY-AUDIT.md)를 확인하세요.
