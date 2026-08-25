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

## 잔여 위험

- Windows x64 runner에서 같은 automation `224/224`와 bundle build가 통과하는지는 아직
  branch exact-SHA native gate로 확인해야 한다.
- Windows artifact가 생성된 뒤 installer smoke까지 통과해야 이전 run의 연쇄 실패가 해소된다.
- PR merge 뒤에는 새 merge exact SHA에서 native build와 Linux GUI close gate를 다시 실행해야
  Issue #34를 닫을 수 있다.

## 다음 단계 영향

- 이 단계 커밋을 `publish/task34`에 push하고 동일 exact SHA로 `alhangeul-desktop.yml`을
  수동 실행한다.
- Windows x64, Windows installer smoke, Linux x64·arm64가 모두 성공한 경우에만 correction
  PR 게시 승인 단계로 진행한다.

## 승인 요청

- Stage 5.10 산출물과 로컬 검증을 고정한 뒤 branch exact-SHA native gate를 실행한다.
