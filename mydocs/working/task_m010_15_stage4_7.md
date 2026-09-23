# Task #15 Stage 4.7 완료 보고서 — Windows modal handoff GUI acceptance 확정

GitHub Issue: [#15](https://github.com/postmelee/alhangeul-tauri/issues/15)
구현계획서: [`task_m010_15_impl.md`](../plans/task_m010_15_impl.md)
Stage: 4.7

## 단계 목적

Stage 4.6 exact Windows 후보에서 작업지시자가 system print dialog와 Microsoft Print
to PDF 저장창의 modal handoff를 직접 검증한 결과를 확정한다. 자동 workflow가
관찰하지 못하는 처리 중 상태, 최종 focus 복귀 뒤 상태 복원과 반복 인쇄를 Windows
필수 acceptance 증거로 기록하고 다음 exact Linux x64 GUI 회귀 검증으로 넘긴다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/plans/task_m010_15_impl.md` | exact SHA와 Windows WebView2 GUI 필수 gate 통과 결과를 Stage 2.6 판단에 고정한다. |
| `mydocs/orders/20260811.md` | Windows acceptance 통과와 exact Linux x64 GUI 회귀 검증 진행 상태를 기록한다. |
| `mydocs/working/task_m010_15_stage4_7.md` | 수동 증거, 무손실 경계, 잔여 Linux gate와 선행 Task #13 의존성을 기록한다. |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드, bundled Studio, upstream page SVG, print stylesheet, Linux pagination CSS와
HWP/HWPX/direct PDF 데이터는 변경하지 않았다. 원격 `publish/task15`도 exact source
SHA `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`에 유지한다. 이번 단계는 작업지시자의
Windows GUI 관찰 결과만 수행계획서와 단계 기록에 반영한다.

## 검증 결과

대상 후보:

- source SHA: `89718976a7fa44ebe7f8981ca01ce6bfcbebc979`
- CI: [#31480733084](https://github.com/postmelee/alhangeul-tauri/actions/runs/31480733084) — success
- Desktop artifact: [#31480736454](https://github.com/postmelee/alhangeul-tauri/actions/runs/31480736454) — success
- Windows x64 artifact ID: `9097319137`
- MSI·NSIS installer smoke: success

실행·확인 항목:

```bash
git status --short --branch
git rev-parse origin/publish/task15
git diff --check
```

결과:

- OK — Windows system print dialog가 별도 Alhangeul preview 없이 직접 열린다.
- OK — system print dialog와 Microsoft Print to PDF 저장창 모두에서
  `시스템 인쇄 처리 중...`이 유지된다.
- OK — 저장 또는 취소 뒤 앱으로 최종 복귀하면 기존 문서 상태가 복원된다.
- OK — 같은 세션에서 인쇄를 다시 실행할 수 있다.
- INFO — Microsoft Print to PDF 저장창의 기본 파일명은 비어 있으며 계획된 OS 소유
  제약이다. 보장되는 basename UX는 `파일 > PDF로 저장`이 담당한다.
- OK — 원격 candidate는 Stage 2.6 source exact SHA에 유지된다.
- OK — 문서 변경 전 worktree는 clean이고 `git diff --check` 경고가 없다.

## 잔여 위험

- 최신 exact SHA의 Linux x64 bundle은 build·inventory를 통과했지만, Stage 2.4~2.6
  이후 실제 WebKitGTK GUI 출력은 반복하지 않았다.
- Linux 출력 page surface와 pagination CSS는 바뀌지 않았지만 공통 direct-print
  lifecycle의 상태 문구·return waiter가 추가됐으므로 최종 exact에서 취소·반복 인쇄와
  6쪽 무빈쪽 결과를 다시 확인한다.
- native focus 복귀는 Windows modal chain 종료만 뜻하며 저장 성공이나 physical
  printer spool 완료를 주장하지 않는다.
- Task #13이 아직 open이고 PR이 없으므로 Task #15 PR·merge·close를 진행하지 않는다.

## 다음 단계 영향

- Desktop Artifact Build #31480736454의 exact Linux x64 bundle을 설치한다.
- 6쪽 `biz_plan.hwp`에서 GTK `Print to File`, CUPS-PDF와 직접 PDF가 각각 6쪽이며 빈
  쪽·잘림이 없는지 확인한다.
- 취소·저장 뒤 상태 복원과 반복 인쇄를 확인하고 Linux 결과를 별도 단계 보고서에
  고정한다.
- Linux gate 통과 뒤에는 선행 Task #13 완료를 우선하고, 이후 Task #15를 최신
  `devel`에 정렬해 최종 workflow·보고·PR 순서로 진행한다.

## 승인 요청

- 작업지시자의 Windows 검증 완료 보고와 다음 작업 진행 승인에 따라 exact Linux x64
  GUI 회귀 검증으로 이어간다.
