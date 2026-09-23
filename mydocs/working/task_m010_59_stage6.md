# Task #59 Stage 6 — devel 통합과 리뷰 보정의 원격 검증

GitHub Issue: [#59](https://github.com/postmelee/alhangeul-tauri/issues/59)
구현계획서: [task_m010_59_impl.md](../plans/task_m010_59_impl.md)
Stage: 6

## 단계 목적

PR #65(#19)가 병합된 devel과 CI 분리 구조를 함께 보존하고, 리뷰 보정의 실제 Windows/Linux
전체 artifact 및 기존 Windows bytes 재사용 경로를 검증한다.

## 산출물

- devel `581d303`을 merge commit `598e899`으로 통합. 여섯 충돌 파일의 양쪽 책임 보존.
- 기존 PDF/dialog dispatcher, Windows cleanup scope, Node·PowerShell 회귀와 오늘할일 기록 보존.
- 공통 PowerShell 실행기의 필수 EvidencePath 전달 및 공백 경로 자식 프로세스 회귀를
  `f0dfe5909ceff95e7a2c54a703c82a1a2a775834`에 보정. 이것이 최종 실행 후보 SHA다.
- 요청 context/단계 outcome·Windows 회귀 evidence를 실제 Actions artifact로 보존.

## 본문 변경 정도 / 본문 무손실 여부

최신 devel 대비 `apps/`, `crates/`, `third_party/`, pnpm lock 변경 없음.
Desktop entry의 `build-updater:` 이후 PDF/dialog 포함 702줄은 최신 devel과 byte 단위 동일하다.
`scope=pdf-cleanup-windows`는 profile 파이프라인과 분리해 유지하고, concurrency도 scope를 구별한다.
주 worktree·미병합 #57 branch·rhwp pin·release gate를 변경하지 않았다.

## 검증 결과

### 로컬 계약

- `pnpm run test:automation` 607개, upstream 36개, Studio 147개 통과.
- Studio build, GUI typecheck, 제품 경계·버전·release metadata·rhwp pin 검증 통과.
- `actionlint`, `git diff --check` 통과.
- 변경 문서 48개·상대 링크 173개 및 단계/최종 보고 필수 섹션 확인.
- AST 결정점 계수: selectValidation 3, classifyPath 6, validationForScopes 8.
  신규 helper의 함수는 50 LOC/복잡도 10 이하다.

### 실패 축소 및 보정

첫 통합 SHA `598e899`의 [full](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209189543),
[negative](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209193430),
[fast](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209195885)는 #19 PowerShell 회귀의
필수 EvidencePath 누락 때문에 실패했다. native/installer는 gate에서 미실행이며 성공 근거가 아니다.
실행기를 보정한 후 [최소 fast](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209452484)가
통과했다. 실제 Windows에서 tracked PS 31개 parser와 4개 격리 suite가 성공했다.
변경 없는 재시도로 실패를 우회하지 않았다.

### 의도한 handoff 실패

[run 34209623502](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209623502),
[installer job](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209623502/job/102007742760):
형식이 유효한 0 digest를 전달해 `Approved artifact ID/digest mismatch`로 실패했다.
context 생성·결과 기록·진단 upload는 success다. 다운로드한 두 JSON에서 handoff=failure,
download/inventory/regressions/smoke=skipped, 전체 결과 failed-or-unverified를 확인했다.
실패 artifact 보존의 negative 테스트 통과이며 installer 수용 success가 아니다.

### 새 후보 원격 수용

정상 재사용 [run 34209988793](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209988793)은
success다. 제품 SHA `230098401df7d893a26b54b62b780081d3553dda`, producer 34063530307,
archive 9998755524와 digest `sha256:0c67ea0a9033ee70152dc5f74565fd13a1adb8afc8453ec67ea916ba80809932`를
새 harness `f0dfe59`로 검증했다. 다운로드한 evidence의 handoff·inventory·회귀·smoke가 모두
success이며 MSI/NSIS summary는 Status=passed, Failures=[]다. 새 제품 acceptance는 unverified로 남는다.

그 뒤 시작한 [fast run 34209992065](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209992065)도
success이며 먼저 시작한 installer는 취소되지 않고 완료됐다.

[전체 artifact run 34209619872](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209619872)는
success다. `artifact/all/full/run_tests=true/publish_release=false`, 후보 `f0dfe59`에서
필수 11개 job이 모두 success임을 API로 대조했다. Windows/Linux native·core, 두 Linux
package lifecycle 및 새 Windows 설치를 포함한다. 다운로드한 새 설치 summary는
Status=passed, Failures=[]이며 MSI/NSIS install/uninstall exit code가 모두 0이다.

| 새 후보 archive | ID | digest |
|---|---|---|
| windows-x64 | 10050026605 | `sha256:5b455250c524c48f49507ccdccec9540d1b9381cfa7ff1c135ef96687c2ce573` |
| linux-x64 | 10050150123 | `sha256:675b8e5a9a4d4204b666a6e8f9e18c20cce0494dfc65660207662b3ca648023f` |
| linux-arm64 | 10049729515 | `sha256:ee9f486b9bc9cc73ad5de3e3f8df45b0a0e4a8ceba2ed5e78976b8d34c3dd42e` |

### Cache 관측

Windows native job 102007715699는 같은 compiler/lock/workload prefix의 `2300984` target을
복원하고 새 source `f0dfe59` key를 저장했다. Windows source cache는 prefix까지 miss였다.
Windows core job 102007715630도 source/target miss 후 둘 다 저장했고, 리뷰에서 언급된
미존재 경로의 Path Validation Error는 이번 실제 로그에서도 관측되지 않았다.
Linux arm64 core는 source exact hit, target miss 후 새 key 저장이었다.
이는 관측한 복원·저장 결과이며 다른 lock fallback 성능을 입증한 것은 아니다.

## 잔여 위험

source cache의 다른 lock fallback 성능은 실측하지 않았다. 과거 동일 SHA arm64 warm
36.85%는 이전 후보의 관측치로 유지한다. 기본 concurrency pending 교체와 cache 보존 한계가 남는다.
미실행 GUI/PDF/updater·공개 release를 이번 artifact 수용 성공으로 확대하지 않는다.

## 다음 단계 영향

최종 원격 결과와 문서 검증 후 부모 최종 보고·오늘할일·기존 PR 본문을 정렬하고,
두 원본 리뷰 코멘트를 연결한 보정 결과 코멘트를 게시한다.

## 승인 요청

작업지시자의 보정 및 코멘트 게시 지시로 수행한다. PR merge·issue close·release는 수행하지 않는다.
