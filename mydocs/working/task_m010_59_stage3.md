# Task #59 Stage 3 — 전체·재사용 수용과 측정 결과

GitHub Issue: [#59](https://github.com/postmelee/alhangeul-tauri/issues/59)
구현계획서: [task_m010_59_impl.md](../plans/task_m010_59_impl.md)
Stage: 3

## 단계 목적

분리된 CI를 실제 Windows/Linux에서 통합 수용하고 부분 검증·재사용·cache 한계를 구분한다.

## 산출물

부모 및 #60–#64 최종 보고, 전체/재사용/대표 native 재실행의 exact run·SHA·artifact·시간 근거,
오늘할일 완료 상태와 Open PR 게시 자료. 상세 수치는 [최종 보고서](../report/task_m010_59_report.md)에 보존한다.

## 본문 변경 정도 / 본문 무손실 여부

전체 native 후보 이후 실행 코드는 동일하며 문서와 workflow 입력 설명만 변경했다.
기존 updater/release job 본문 26,316자는 devel과 동일하다. 주 worktree와 #19/#57 미완료 변경은 통합하지 않았다.

## 검증 결과

- [전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307):
  success, SHA `230098401df7d893a26b54b62b780081d3553dda`, all/full/tests=true,
  publish_release=false, 필수 11개 job 통과. fast Windows 19초/Node 70초.
- [재사용 run 34065755394](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065755394):
  success, 제품 2300984/harness 1d2bda6, archive 9998755524의 exact bytes 검증,
  MSI/NSIS install/uninstall 0 및 기본값 복원. installer job 126초, 재빌드 없음.
- [같은 후보 arm64 재실행 34065744901](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901):
  success, linux-arm64/product/tests=true 부분 검증. 첫 native 1,164초 → 재실행 1,259초.
  두 번 모두 Cargo source/target miss. cache key·저장은 확인했고 warm 성능은 미입증이다.
- 통합 automation 554/554, CI targeted 52/52, upstream 36/36, Studio 132/132 및
  Studio build/GUI typecheck/제품 경계·버전·metadata 통과. Windows parser 11개 소스와
  격리 suite 1개를 실제 Windows runner에서 통과했다.
- 전체 workflow actionlint, `git diff --check`, 변경 문서 상대 링크와 필수 보고서 섹션 검증 통과.

## 잔여 위험

cache가 재실행 때 보존되지 않아 warm 속도 개선을 입증하지 못했다. 캐시 제거 원인은 확인하지 않았다.
전체 artifact 수용은 GUI/updater/release 수용을 대신하지 않는다. #57의 독립 MSI/NSIS 경로는 별도 작업이다.
최종 보고 SHA와 실제 제품 SHA를 구분하며, 상세 제약을 PR에 함께 게시한다.

## 다음 단계 영향

부모 `publish/task59 → devel` Open PR 하나를 생성한다. 이슈별 커밋·계획·단계·최종 보고를 보존한다.

## 승인 요청

기존 추가 승인 없는 구현·검증·PR 생성 지시를 적용한다. merge·이슈 close·release는 수행하지 않는다.
