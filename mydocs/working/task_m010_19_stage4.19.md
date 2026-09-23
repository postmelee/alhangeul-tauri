# Task #19 Stage 4.19 — Windows 전체 PDF 자동 회귀 검증 완료

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [`task_m010_19_impl.md`](../plans/task_m010_19_impl.md)
Stage: 4.19

## 단계 목적

기존 Windows NSIS 설치본으로 HWP/HWPX fresh/restart의 PDF 저장·덮어쓰기·원본 보존을
검증한다. 실제 확인창 차이와 보조 진단 오류로 중단됐던 경로를 승인된 보정 후 다시 확인했다.
이 보고서는 전체 PDF **자동 회귀 검증**의 완료이며 조판 완전 동등성이나 #19 전체 수용은 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-pdf-dialog.ps1` | 보조 tree를 기존 관측-only 모드에 한정, 수집 전 이전 snapshot 초기화 |
| `scripts/windows-pdf-tree-diagnostics.ps1` | 60 LOC, 기본 비활성/callback 미호출, 진단 ControlType 타입 확인 |
| `tests/windows-pdf-tree-diagnostics.test.ps1` | 117 LOC, 실제 wrapper와 타입 직렬화 16개 회귀 |
| 기존 Node tree 계약/PDF reusable workflow | opt-in 연결 검사, 모든 PDF mode에 설치 전 PS 검사 적용 |
| 기존 가이드·사건 기록·plans/orders·이 보고서 | 실패 이력 보존, 자동 성공/시각 한계/후속 수용 구분 |

## 본문 변경 정도 / 본문 무손실 여부

제품 SHA와 설치 bytes는 변경하지 않았다. 이번 보정에서 필수 dialog 탐색·의미/target/owner/
identity/native guard와 확인 adapter는 그대로다. 정상 작업에서 선택적 수집 callback만 제외했다.
관측 모드에서는 bounded tree·민감 값 필터·typed stale 예외 격리를 유지하고 null/미지원
ControlType을 `unavailable`로 표현한다. 필수 판정 예외를 숨기는 catch-all은 추가하지 않았다.

새 workflow/mode·제품 재빌드·클릭 API 변경·timeout 증가·Mac native 검증은 없다.
기존 승인된 원격 실행용 checkpoint 예외에 따라 `fdbf481`에 소스와 당시 기록을 먼저 게시하고,
실제 결과 문서를 후속 커밋한다. 이전 실패 run과 4.20/4.21의 제한 증거는 덮어쓰지 않는다.
기존 공식 문서 위치를 유지했으며 대형 기존 helper 루프/계약 파일의 크기 예외도 그대로다.

## 검증 결과

checkpoint 전 로컬 명령:

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
node --test tests/actions-workflows.test.mjs tests/workflow-artifact-handoff.test.mjs
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-windows-pdf.yml
git diff --check
```

focused 계약 **58/58**, workflow/handoff **83/83**, typecheck·actionlint·diff 통과.
suite 간 import 중복이 있으므로 합산하지 않는다. Node 정적 계약을 PS 실행으로 세지 않는다.

기존 Desktop dispatcher에서 `windows-pdf-acceptance`, `confirmation_cases=all`, 아래 제품 SHA/
native run 지정, `run_tests=false`, `publish_release=false`로 **한 번** 실행했다.

- [run 34058443345](https://github.com/postmelee/alhangeul-tauri/actions/runs/34058443345)
- harness: `fdbf481858a3853f107a990725bdf46cc9c607c6`
- 제품: `69b22650df96323a2c59e473d474ed3195cc9cc7`, native run `34021920074`
- installer artifact: `9986364323`, `alhangeul-desktop-windows-x64`, 123231295 bytes,
  digest `sha256:02c13e35d515d08c7793d315905125932a33209b8e63b1f750998a62b1226bdc`
- 미만료·SHA/digest/size·handoff/inventory 확인 후 같은 bytes를 설치했다.
- Windows job `101554533353`: **14분 45초 통과** (20:35:02–20:49:47 UTC).
  Ubuntu analyze `101556532587`: **36초 통과** (20:49:48–20:50:24 UTC).
- 실제 Windows PS `5.1.26100.33296`의 정책 62개/native 진단 50개/tree 16개 통과.
  tree 16개는 활성·비활성/callback 미호출·타입 직렬화·합성 예외이며 실제 UI race 재현이 아니다.
  앱 자동화 로그의 WebView2는 `151.0.4129.101`이다.

| 실제 앱 결과 | 쪽 수 | 저장/덮어쓰기 | 원본·dirty 보존 |
|---|---:|---|---|
| HWP fresh | 6 | 새 PDF 저장 통과 | 통과 |
| HWP restart | 6 | 확인창·동일 target 덮어쓰기 통과 | 통과 |
| HWPX fresh | 10 | 새 PDF 저장 통과 | 통과 |
| HWPX restart | 10 | 확인창·동일 target 덮어쓰기 통과 | 통과 |

네 문서 identity와 source hash를 확인했다. 두 restart의 `overwriteConfirmed=true`,
`buttonMethod=Win32-BM_CLICK-command`, `dialogCount=0`이며 spec의 저장 완료·mtime 증가도
통과했다. Open/Save evidence 8개는 모두 `disabled`/`diagnostic-mode-only`/빈 tree다.
NSIS cleanup·WebView2 복구가 통과했고 다운로드한 source/네 PDF hash도 evidence와 일치한다.
두 최종 target은 각각 restart PDF와 같다.

| PDF | SHA-256 |
|---|---|
| HWP fresh | `0a9e6e3bd4ce004fbdc736007cd6acdcb17d71c7ce8eed19514e356f5f5d275e` |
| HWP restart | `1d55188d3f4fa90ff8a8ef0df8fa8c909fa448d44a6de6709f01ec5e089c6732` |
| HWPX fresh | `5726300303067d6d02036341ab3bed252c19b5e3035ff7c22477a2d172bc20c1` |
| HWPX restart | `17598f3bbe259453267ffbd0d43131e27ef549ee9eb86c4d3b32c86da30946b5` |

원격 `windows-pdf-summary.json`은 passed다. 네 PDF의 쪽 수/A4·`PDF검증` 검색·쪽별 text/
nonblank·페이지 가장자리 검사가 통과했다. HWP text counts는 fresh/restart 모두
`[50,642,410,638,478,250]`, HWPX는 모두 `[994,1257,1005,1029,1010,1184,971,1185,982,1132]`다.

시각 검토: 최신 32쪽 PNG는 앞서 전 쪽을 열람한 16쪽 fresh 결과와 각각 SHA-256이 같다.
따라서 전 쪽 중복 열람은 생략하고 최신 HWP 2쪽/HWPX 1쪽을 다시 확인했다. 빈 쪽/전면적 문자
깨짐은 없으며 이전 관측과 동일하다. HWPX 홀수 쪽 상단 표의 긴 문구가 우측 셀 경계에 밀착하거나
잘려 보이는 현상은 남는다. 동봉 미리보기와의 폰트/배치 차이는 확인했지만 현재 앱의 같은 위치
대조가 없어 PDF 변환·렌더러·폰트 중 원인을 확정하지 않는다. 수치 성공을 조판 전체 정상으로 쓰지 않는다.

증거 artifact:

- raw `9996908674` / `windows-pdf-raw-34058443345`, 5287211 bytes,
  digest `sha256:1d28d117269f0601e1f9e260811188ee1a028d39870ea68cca23049c7d0fa426`
- analysis `9996919041` / `windows-pdf-analysis-34058443345`, 15059077 bytes,
  digest `sha256:2a2166f0311071e118e68d0d4aa287342994e32912a9e50aa2336b4dd80494a6`
- 다운로드 자료: `/private/tmp/alhangeul-pdf-stage419-final.fMCLJe`; raw PDF/PNG/log는 커밋하지 않는다.

결과 문서 6개의 상대 링크 63개와 이 보고서 필수 섹션 7개, diff 검사가 통과했다.
실행 checkpoint 이후 소스/workflow는 변경하지 않았으므로 같은 suite를 재실행하지 않았다.

## 잔여 위험

- HWPX 표 조판의 원본 동등성은 미확정이다. 기존 관측을 해결됐다고 처리하지 않는다.
- 동시 편집 snapshot, WebView reload, TTL 실제 회수와 physical IME는 이 smoke의 제외 항목이다.
  기존 deterministic/native 단위 테스트 및 사용자 수동 결과와 실제 실행 수용을 구분해야 한다.
- 보조 수집 비활성 경로는 실제 앱에서 통과했다. 관측-only 모드의 모든 UI 상태나 모든 Windows
  언어/provider를 이번 실행에서 재현한 것은 아니다.
- #19/Stage 4 전체, PR/merge·릴리즈 완료는 아니다. MSI/썸네일/updater 검증을 반복하지 않았다.

## 다음 단계 영향

동일 PDF workflow를 다시 실행하거나 보조 자동화를 추가할 근거는 현재 없다. 다음은 기존
수동·단위·Linux GUI·이번 Windows 증거를 #19 수용 조건과 대조해 남은 항목만 확정하는 검토다.
HWPX 조판 관측의 확인 범위도 함께 판단하며 제품 보정/새 workflow/위험 수용은 별도 승인받는다.

## 승인 요청

이번 자동 회귀 결과와 시각 한계를 검토하고, #19의 남은 수용 근거 정리 단계 진행 승인을 요청한다.
