# Task #82 Stage 3 — 화면·접근성·회귀 검토

GitHub Issue: [#82](https://github.com/postmelee/alhangeul-tauri/issues/82)
구현계획서: [task_m010_82_impl.md](../plans/task_m010_82_impl.md)
Stage: 3

## 단계 목적

최종 디자인과 캡처 도구의 회귀를 확인하고 PR 검토 자료를 정리한다.
사용자의 Stage 3 진행 승인은 수행계획의 보고/PR 범위를 포함한다.

## 산출물

최종 보고서, 오늘할일 갱신, devel 대상 PR. 추가 제품 구현 변경은 없다.

## 본문 변경 정도 / 본문 무손실 여부

최신 origin/devel과 비교해 src-tauri, third_party, site/release.json 차이가 없다.
기존 Linux 앱 PNG 및 세 채택 이미지의 hash 회귀가 통과했다.

## 검증 결과

```bash
pnpm run build:pages
pnpm run check:pages
node --test tests/pages.test.mjs tests/site-capture.test.mjs tests/actions-workflows.test.mjs
pnpm run typecheck:gui
shellcheck scripts/site-capture/linux-gallery.sh
actionlint .github/workflows/alhangeul-site-capture.yml .github/workflows/alhangeul-desktop.yml
git diff --check
```

모두 통과. Node 71 tests, Pages source 16/output 19. 공개/미공개/manifest 상태 fixture,
배포 목록 확장, 원본 자산, UI 이벤트와 촬영 workflow 계약을 확인했다.

실제 로컬 브라우저에서 Windows 라디오의 ArrowRight로 Linux 선택·다운로드·이미지 연동,
파일 탐색기 버튼 Enter로 explorer 전면 및 focus 상태를 확인했다. 제목 y=176 유지.
Stage 2에서 Windows/Linux 전환 전후 제목·선택 버튼·이미지 좌표 고정을 확인했다.
390px iframe에서 최종 두 줄 제목, 다운로드, 이미지와 선택 버튼, 푸터를 육안 확인했다.
소스 검토에서 모션 감소 시 transition 제거와 키보드 focus 표시, 비활성 OS hidden을 확인했다.

## 잔여 위험

실제 모바일 터치 장치, 스크린리더, 복수 브라우저, OS 모션 감소 설정의 실행 검증은 미수행이다.
최종 hover는 이벤트 단위 회귀로 확인했으며 실제 포인터 이동은 자동화 도구의 hover API 미지원으로
검증하지 않았다. 이 한계를 실제 브라우저 검증 성공으로 합산하지 않는다.
촬영용 Windows/Linux Actions 성공은 Stage 1에 기록된 exact SHA이며 최종 PR CI와 구분한다.

## 다음 단계 영향

기존 공개 설치본을 다시 빌드하거나 촬영하지 않는다. 최종 PR CI는 게시 후 별도로 확인한다.

## 승인 요청

Stage 3 승인 범위로 최종 보고/PR 게시를 수행한다. PR 병합과 Pages 배포는 별도 승인 대상이다.
