# Task #34 Stage 5.4 완료 보고서 — post-merge CUPS-PDF directive 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.4

## 단계 목적

PR #38 merge SHA `1ae4415f2547b535d809efcb0b05d1536392eee4`의 native build
run `32090092992`는 Windows x64, Linux x64·arm64와 installer smoke를 모두
통과했다. 해당 run의 exact Linux x64 artifact를 전달한 GUI canary run
`32091121443`은 제품 GUI 실행 전에 `Configure CUPS-PDF`에서 실패했다.

Ubuntu의 기본 `cups-pdf.conf`에서 `Label` directive가 `#Label 0`으로 주석 처리된
형태도 정규화하도록 close gate workflow를 보정하고, runner image 변화가 다시
발생하면 설정 전후 directive를 로그로 확인할 수 있게 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | `Out`·`Label`의 선행 공백과 선택적 주석을 허용하고 설정 전후 directive 진단 추가 |
| `tests/linux-gui-workflow.test.mjs` | 주석 directive 정규화, 진단 출력과 최종 exact 검증 계약 고정 |
| `mydocs/plans/task_m010_34_impl.md` | Stage 5.4 원인·범위·검증·post-merge close gate 의존성 기록 |
| `mydocs/orders/20260818.md` | Task #34 Stage 5.4 로컬 gate 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust·Studio runtime, native 저장·인쇄 동작과 bundled `rhwp`는 수정하지 않았다.
변경은 GitHub-hosted Linux GUI acceptance의 CUPS-PDF 사전 설정과 그 계약 테스트,
작업 증적에 한정된다. CUPS queue, A4 설정, GUI selector와 acceptance threshold는
기존 동작을 유지한다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-gui-workflow.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

결과:

- OK — workflow 집중 계약 21/21을 통과했다.
- OK — product boundary 225개 파일을 통과했다.
- OK — 전체 automation 201/201을 통과했다.
- OK — `actionlint`와 `git diff --check`가 경고 없이 통과했다.

## 잔여 위험

- 로컬 정적·계약 검증은 Ubuntu runner의 실제 CUPS-PDF 설정과 서비스 기동을
  증명하지 않는다.
- 보정 workflow는 아직 `devel`에 merge되지 않았으므로 GitHub Actions 수동 실행의
  선택 대상이 아니다. 보정 PR merge 뒤 새 merge exact SHA에서 native build와
  Linux GUI canary를 순서대로 다시 실행해야 한다.
- 새 canary가 CUPS 설정을 통과하더라도 실제 GTK selector 또는 PDF threshold 실패는
  별도 증거를 읽고 같은 close gate 안에서 판단한다.

## 다음 단계 영향

- 이 Stage commit을 `publish/task34`에 push하고 `devel` 대상 보정 PR을 게시한다.
- PR merge 뒤 새 merge exact SHA로 `alhangeul-desktop.yml`의 `run_tests=true` native
  build를 실행하고, 성공한 exact Linux x64 artifact만
  `alhangeul-linux-gui.yml`에 전달한다.
- Linux GUI canary가 실제 GUI와 PDF acceptance까지 성공한 뒤에만 Issue #34를 닫고
  후속 Issue #35로 진행한다.

## 승인 요청

- Stage 5.4 산출물과 로컬 검증 결과를 승인하면 push 및 보정 PR 게시로 진행한다.
