# Task #34 Stage 5.3 완료 보고서 — PR #38 Linux path API 소유권 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.3

## 단계 목적

[PR #38 리뷰](https://github.com/postmelee/alhangeul-tauri/pull/38#issuecomment-5322303455)에서
확인된 Linux path 소유권의 잠재 회귀를 새 exact-SHA native gate 전에 제거한다.
공통 실행 파일 탐색은 delimiter와 join을 하나의 path API로 결합하고, Linux probe,
AT-SPI, drag-in과 PDF 분석 helper는 실행 host와 무관하게 POSIX 경로 의미를 유지한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/support/process.mjs` | delimiter·join 개별 option을 host 기본 `pathApi` 주입으로 통합 |
| `tests/gui/linux/probe.mjs` | Linux 실행 파일 탐색에 POSIX path API 전체를 전달 |
| `tests/gui/linux/native-ui/drag-drop.mjs` | fixture 절대 경로와 Python·xdotool 탐색을 POSIX 의미로 고정 |
| `tests/gui/linux/native-ui/atspi.mjs` | dialog·증거 경로 판정과 결합을 단일 POSIX path API로 통합 |
| `tests/gui/linux/pdf-analysis.mjs` | PDF input·임시·evidence 경로를 단일 POSIX path API로 통합 |
| `tests/linux-gui-probe.test.mjs` | 공통 helper의 path API 주입과 invalid API fail-closed 회귀 추가 |
| `tests/gui/linux/native-ui/atspi.test.mjs`, `tests/gui/linux/pdf-analysis.test.mjs` | 실제 macOS 임시 파일 test에는 host path API를 명시해 test 경계를 분리 |
| `tests/gui-contracts.test.mjs` | Linux helper의 host path 함수 import와 분리 option 주입을 금지하는 source 계약 추가 |
| `mydocs/plans/task_m010_34_impl.md` | Stage 5.3 범위·검증·exact-SHA Windows gate를 수행계획에 반영 |
| `mydocs/orders/20260818.md` | Task #34의 Stage 5.3 완료와 hosted gate 대기 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust·Studio runtime, native 저장·인쇄 동작과 bundled `rhwp`는 수정하지 않았다.
변경은 GUI acceptance test harness의 path 추상화와 회귀 test, 작업 증적에 한정된다.
`resolveExecutable`의 기본 동작은 계속 host `node:path`를 사용하고, Linux 전용
호출자만 POSIX API를 명시하므로 플랫폼 중립 사용자의 기존 의미도 보존한다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-gui-probe.test.mjs tests/gui-contracts.test.mjs tests/gui/linux/*.test.mjs tests/gui/linux/native-ui/*.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-sync-pr-body.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run typecheck:gui
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — 집중 path·Linux helper 회귀 52/52를 통과했다.
- OK — product boundary 225개 파일, version `0.1.0`, release metadata와
  `rhwp v0.8.2` exact pin을 유지했다.
- OK — GUI TypeScript no-emit 검사와 automation 201/201, upstream 35/35,
  Studio 97/97을 통과했다.
- OK — Studio production build 성공. 기존 CanvasKit externalization과 chunk-size
  warning 외 오류가 없다.
- OK — `git diff --check` 경고가 없고 변경한 구현·test 파일은 모두 300행
  권장 상한 이내다.

## 잔여 위험

- macOS local test는 Windows runner의 실제 path 동작을 증명하지 않는다. 이 Stage
  commit을 push한 정확한 PR head SHA로 Windows native workflow를 실행해야 한다.
- 첫 native run #32086154448은 Windows automation 실패로 downstream test·build와
  artifact upload가 생략되었으므로 성공 증거로 사용할 수 없다.
- 새 Windows run이 성공해도 GTK selector와 PDF 임계값은 Linux GUI canary의 실제
  evidence를 읽기 전까지 확정하지 않는다.

## 다음 단계 영향

- Stage 5.3 commit을 `publish/task34`에 push한 뒤 그 exact SHA를 `build_ref`로,
  `run_tests=true`로 `alhangeul-desktop.yml`을 수동 실행한다.
- Windows automation, upstream/studio test, Tauri build와 artifact upload가 모두
  성공해야 PR #38 merge 및 Linux GUI artifact handoff로 진행한다.
- hosted run 결과는 validated head를 바꾸지 않도록 PR 리뷰 보정 코멘트에 run ID와
  exact SHA로 기록한다. 추가 코드 변경이 생기면 새 SHA에서 gate를 다시 실행한다.

## 승인 요청

- Stage 5.3 산출물과 로컬 검증 결과를 승인하면 push 및 exact-SHA Windows native
  gate 실행으로 진행한다.
