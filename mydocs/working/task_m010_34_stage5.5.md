# Task #34 Stage 5.5 완료 보고서 — PR #39 CUPS-PDF 정규화 리뷰 보정

GitHub Issue: [#34](https://github.com/postmelee/alhangeul-tauri/issues/34)
구현계획서: [`task_m010_34_impl.md`](../plans/task_m010_34_impl.md)
Stage: 5.5

## 단계 목적

[PR #39 리뷰](https://github.com/postmelee/alhangeul-tauri/pull/39#issuecomment-5322798235)의
merge 전 권고와 같은 mutation 경계의 저위험 지적을 함께 해소한다. CUPS-PDF 설정
전후 출력은 진단으로만 유지하고, 주석을 직접 활성화하던 치환을 활성 directive
삭제 후 exact 값 추가 방식으로 바꿔 부재·중복·산문 주석과 sed 치환 문자 위험을
한 번에 제거한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-linux-gui.yml` | 활성 `Out`·`Label`만 삭제 후 exact 값 append, 두 진단을 nonfatal로 고정 |
| `tests/linux-gui-workflow.test.mjs` | delete-and-append, 주석 비치환과 두 nonfatal 진단 계약 추가 |
| `mydocs/plans/task_m010_34_impl.md` | Stage 5.5 리뷰 범위·검증·fixture test 유보 근거 기록 |
| `mydocs/orders/20260818.md` | Task #34 Stage 5.5 리뷰 보정 상태 반영 |

## 본문 변경 정도 / 본문 무손실 여부

제품 Rust·Studio runtime, native 저장·인쇄 동작, CUPS queue, GUI selector와 PDF
acceptance threshold는 수정하지 않았다. workflow는 주석 행을 보존하고 활성
`Out`·`Label`만 exact 두 값으로 수렴시키므로 기존 목표 동작을 유지하면서 runner
설정 형태 의존성을 줄인다.

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
- OK — product boundary 225개 파일과 전체 automation 201/201을 통과했다.
- OK — `actionlint`와 `git diff --check`가 경고 없이 통과했다.
- OK — 주석 기본값·단일 `# Out` 산문·활성 중복을 포함한 입력에서 주석은 보존되고
  활성 `Out`·`Label`이 exact 각 한 행으로 수렴하는 정규식 의미를 확인했다.

## 잔여 위험

- repository test는 workflow source contract를 검증하며 실제 distro
  `cups-pdf.conf`를 production command로 실행하는 행위 test는 포함하지 않는다.
- 실제 Ubuntu runner의 CUPS-PDF 서비스와 GUI acceptance는 PR merge 뒤 새 merge
  exact SHA의 native build 및 Linux GUI canary에서만 확정할 수 있다.

## 다음 단계 영향

- Stage 5.5 commit으로 PR #39 head를 갱신하고 리뷰 보정 내용을 코멘트로 남긴다.
- PR merge 뒤 새 merge exact SHA로 native build를 실행하고 성공한 Linux x64
  artifact를 Linux GUI canary에 전달한다.
- canary가 실제 GUI·PDF acceptance까지 성공한 뒤 Issue #34를 닫고 #35로 진행한다.

## 승인 요청

- Stage 5.5 산출물과 검증 결과를 승인하면 PR #39 merge 및 post-merge exact-SHA
  close gate로 진행한다.
