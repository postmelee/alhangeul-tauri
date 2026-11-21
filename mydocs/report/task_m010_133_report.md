# Task #133 최종 보고

## 완료한 변경
다운로드 홈에서 Windows 보안 안내에 접근할 수 있고, 업데이트 페이지에 현재 v0.1.3 Authenticode 미서명과 Minisign의 차이, SAC/SmartScreen 구분, MSI 대체가 해결책이 아님을 명시했다. 보호 기능 유지와 개인정보를 가린 제보를 안내한다.

## 검증
node --test tests/pages.test.mjs 107 PASS; pnpm run build:pages, check:pages, check:product-boundary, git diff --check PASS. 최초 check:pages는 빌드 출력 미생성으로 실패했으나 빌드 후 통과했다.

## 한계
문서 보완이며 실제 SAC 차단은 미해결이다. 정확한 제보 화면·Windows 정책과 실제 설치본 서명 대조가 필요하다. 인증서 구매/서명·설치·릴리스·Pages 배포는 하지 않았다. 후속 구현·기능 검증 및 공개 게시 전 판단이 남아 있어 이슈는 닫지 않는다.

## 최종 통합 검토 — 2026-11-18 KST

- 최신 devel `7aaf47fa747031ca375d4da37ea38bd4044bf964`을 merge하여 오늘할일 add/add 충돌에서 #132·#133을 모두 보존했다. #136/#137의 개인정보·코드 서명 정책과 #138~#143의 재배포 변경을 유지했다.
- 다운로드 화면의 안내 링크와 보안 절은 아직 없으므로 유지한다. 코드 서명 정책으로 연결하고 11월 14일 재배포가 SAC 해결을 뜻하지 않음을 명시했다. 제품 소스·릴리스 데이터·workflow는 최신 devel을 그대로 따른다.
- `pnpm exec node --test tests/pages.test.mjs tests/updater-release.test.mjs tests/actions-workflows.test.mjs`: 152 PASS. `pnpm run build:pages`, `pnpm run check:pages`(source 22/output 26), `pnpm run check:product-boundary`(931 files), diff check PASS.
- 첫 회귀 실행에서 추가한 버전 고정 내부 링크가 미공개 버전 fixture를 깨뜨렸다. 같은 페이지의 릴리스 안내 anchor로 수정한 후 전체 152개가 통과했다.
- Pages는 workflow_dispatch 전용이며 병합으로 배포되지 않는다. Windows/Linux native 실행은 이번 안내 변경 범위에서 하지 않았다. 새 HEAD의 필수 PR CI 성공을 확인한 뒤 정상 merge commit으로 병합한다.
