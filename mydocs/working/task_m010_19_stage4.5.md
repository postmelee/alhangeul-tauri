# Task #19 Stage 4.5 — Windows PDF 최소 자동화 구현

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)
Stage: 4.5 (harness 구현, 실제 Windows 수용 완료 아님)

## 단계 목적

작업지시자가 승인한 Windows PDF 최소 자동화를 구현한다. 매번 사용자가 설치·편집·PDF
저장을 반복하지 않도록 기존 NSIS artifact와 WebDriver 기반을 재사용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-windows-pdf.yml` | read-only 수동 실행, exact artifact handoff·inventory, NSIS 설치, 두 앱 실행, Linux PDF 분석, always 증거 업로드·cleanup |
| `scripts/windows-pdf-dialog.ps1` | Alhangeul process 소유 파일 대화상자에 한정된 UIAutomation, 기존 target 덮어쓰기 확인, 90초 제한 |
| `tests/gui/wdio.windows-pdf.conf.ts` | 기존 tauri-service의 Windows driver 정책 재사용, 재시도 없는 전용 config |
| `tests/gui/specs/windows-pdf.e2e.ts` | 고정 HWP/HWPX 복사본, 편집 이벤트, 실제 대화상자 PDF 저장, dirty·source hash 보존, 재시작 덮어쓰기 |
| `tests/gui/windows-pdf/analyze.mjs` | 4개 결과 필수 검증, PDF 해시, 페이지·검색 marker·nonblank·A4 검사와 PNG·summary 생성 |
| `tests/windows-pdf-workflow.test.mjs` | workflow·증거 실패 계약과 PDF 변조/누락 거부 |
| `tests/actions-workflows.test.mjs` | 전용 contract suite 연결과 workflow inventory 등록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 `apps/`, `crates/`, pin과 lockfile은 수정하지 않았다. 기존 계획의 과거 판단은
보존하고 새 승인 범위를 추가했다. task 내부 문서만 갱신했고 공식 문서·manual은 변경하지 않았다.

## 검증 결과

```bash
pnpm run typecheck:gui
node --test tests/actions-workflows.test.mjs tests/workflow-artifact-handoff.test.mjs tests/gui/linux/pdf-analysis.test.mjs
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-windows-pdf.yml
git diff --check
```

- GUI TypeScript 검사 통과.
- 관련 계약 테스트 67/67 통과. 새 Windows 계약은 6개이며 공통 workflow suite에서 호출한다.
- 제품 경계 413개 파일 검사 통과.
- actionlint와 diff check 통과.
- 현재 macOS 호스트에서 Rust/Tauri 빌드 및 Windows UIAutomation 실행은 하지 않았다.

## 잔여 위험

- 실제 Windows 실행 전이다. native 파일 대화상자의 automation ID와 overwrite 확인,
  WebDriver session 재생성·프로세스 종료 동작은 원격에서 검증해야 한다.
- 편집은 실제 editor input handler에 DOM input event를 전달한다. 물리 키보드·IME 검증이 아니다.
- HWP는 고정 6쪽을 검증하고 HWPX는 앱이 표시한 page count와 PDF를 비교한다.
  PNG 육안 검토는 별도이며 자동 검사만으로 표·글꼴 조판 완전성을 선언하지 않는다.
- 동시 편집 snapshot, WebView reload, TTL 실제 회수는 포함하지 않는다. 기존 native/unit
  테스트와 이번 PDF smoke를 합쳐 미검증 실제 동작까지 완료 처리하지 않는다.
- 새로운 workflow의 원격 등록·dispatch 가능 여부는 게시 단계에서 확인한다. 필요하더라도
  default branch 수정이나 merge를 임의 수행하지 않는다.

## 다음 단계 영향

제품 후보는 `69b22650df96323a2c59e473d474ed3195cc9cc7`, 기존 native run은 `34021920074`다.
원격 실행 시 새 harness commit을 acceptanceRef로, 제품 후보를 buildRef로 구분한다.
artifact가 만료·변조되었거나 SHA가 다르면 실패하며 다른 artifact로 묵시 대체하지 않는다.
제품 재빌드, 서명, release 게시, updater 활성화, PR 생성과 이슈 close는 수행하지 않았다.

## 승인 요청

Stage 4.5 구현 결과를 승인하면 harness를 `publish/task19`에 게시하고 기존 artifact를
사용하는 Windows PDF 원격 검증 단계로 진행한다. #19 Stage 4 전체는 미완료 상태다.
