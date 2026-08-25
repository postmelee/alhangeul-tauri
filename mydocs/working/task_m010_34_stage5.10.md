# Task #34 Stage 5.10 진행 보고서 — Windows host path 계약 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.10

## 단계 목적

PR #43 merge exact SHA `4ba0b20daeea7c06d5d7fddce06566c762ca6f73`의 native run
`32863830229`에서 확인한 Windows automation 실패를 보정한다. Linux 전용 CUPS-PDF
helper의 unit fixture가 Windows drive-letter 임시 경로를 POSIX path API로 검증한 문제이므로,
production POSIX 계약을 유지하면서 fixture 파일 I/O에만 host path API를 명시적으로 주입한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/linux/native-print.mjs` | CUPS-PDF path 검증·탐색·이동·진단에 단일 `pathApi`를 결속하고 production 기본값은 `node:path.posix`로 유지 |
| `tests/gui/linux/native-print.test.mjs` | 임시 fixture 경로를 host path API로 생성하고 같은 API를 helper에 주입해 Windows drive-letter 경로를 검증 |
| `mydocs/working/task_m010_34_stage5.10.md` | 실패 원인, 보정 범위, 로컬 검증과 원격 gate 경계를 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드와 사용자 문서는 변경하지 않았다. production 호출은 `pathApi`를 전달하지 않으므로 기존
POSIX 절대경로·동일 output directory fail-closed 계약과 Linux CUPS runtime 동작을 그대로
유지한다. Windows test skip이나 경로 validation 완화 없이 unit fixture의 host path 결속만
명시했다.

## 검증 결과

실행 명령:

```bash
node --test tests/gui/linux/native-print.test.mjs
pnpm run test:automation
pnpm run typecheck:gui
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

결과:

- OK — CUPS-PDF focused test `4/4` 통과
- OK — automation test `224/224` 통과
- OK — GUI TypeScript typecheck 통과
- OK — product boundary `236 files scanned` 통과
- OK — `actionlint` 오류 없음
- OK — `git diff --check` 오류 없음
- OK — 구현 파일 `tests/gui/linux/native-print.mjs`는 `278 LOC`로 권장 상한 이내
- OK — branch exact SHA `0e053613dbad28c6ec3a824336acae959735ac06`의
  [native run 32866224614](https://github.com/postmelee/alhangeul-tauri/actions/runs/32866224614)에서
  Windows automation `224/224`, upstream·Studio host, Tauri bundle과 artifact 검증·업로드를
  통과했다. Linux x64·arm64도 같은 SHA의 bundle을 검증·업로드했다.
- OK — 같은 run의 Windows installer smoke가 source SHA와 Windows artifact를 재검증하고
  MSI·NSIS smoke 및 진단 upload를 포함해 `48s`에 성공했다.

## 잔여 위험

- PR merge 뒤에는 새 merge exact SHA에서 native build와 Linux GUI close gate를 다시 실행해야
  Issue #34를 닫을 수 있다.

## 다음 단계 영향

- correction PR merge 뒤 새 merge exact SHA로 `alhangeul-desktop.yml`을 실행하고, 그 native
  artifact를 같은 SHA의 Linux GUI workflow에 handoff한다.
- evidence hash와 대표 화면 read-back까지 성공한 경우에만 Issue #34를 닫는다.

## 승인 요청

- Stage 5.10 산출물과 branch exact-SHA native gate 결과를 승인하면 correction PR 게시
  절차로 진행한다.
