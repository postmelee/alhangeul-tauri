# Task #110 Stage 1 — 기준선과 기존 수용 근거

GitHub Issue: [#110](https://github.com/postmelee/alhangeul-tauri/issues/110)
구현계획서: [task_m010_110_impl.md](../plans/task_m010_110_impl.md)
Stage: 1

## 단계 목적

main 정렬의 정확한 시작 ref·제품 경계·기존 공개 상태를 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| mydocs/working/task_m010_110.json | main/devel/source·Release 자산·22개 공개 파일·기존 Actions 상태 |
| 본 보고서 | 기준선 검증과 재사용 제한 |

## 본문 변경 정도 / 본문 무손실 여부

제품·공식 문서·웹 source 변경 없음. 기존 완료 작업과 공개 근거를 조회해 새 task 기록에만 보존했다.

## 검증 결과

실행: git merge-base, main/devel 직접 diff, v0.1.1/devel 제품 경로 diff, GitHub ref/tag/Release/Actions API, 공개 사이트 22개 파일 HTTP/크기/SHA-256 대조, git diff --check.

- OK: main 7bab9062, devel 1d3817c7, common ancestor/product source 96e89e90. 직접 변경 경로 103개.
- OK: main/devel와 v0.1.1/devel 사이 앱·crate·자산·rhwp lock·pnpm lock·gitlink 설정 차이 없음.
- OK: annotated tag의 resolved source 일치, Release ID 402604603와 공개 asset 11개 기준선 기록.
- OK: 기존 PR #109 run [37222603474](https://github.com/postmelee/alhangeul-tauri/actions/runs/37222603474)과 Pages run [37223289065](https://github.com/postmelee/alhangeul-tauri/actions/runs/37223289065)의 모든 job/step success.
- OK: Pages source는 devel 1d3817c7, 공개 22개 파일이 직전 실제 배포의 크기/hash와 모두 일치.
- 기존 업그레이드: Windows [37179376994](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994) 전체 success. Linux [job 111307414907](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/job/111307414907) success지만 소속 전체 run은 failure. 두 상태를 구분하며 재실행한 근거로 표현하지 않는다.

## 잔여 위험

기존 native/실기기 수용의 알려진 제한은 그대로다. 새 native build나 업그레이드를 실행하지 않았다. 이후 ref 이동은 병합 직전에 다시 검사한다.

## 다음 단계 영향

Stage 2에서 승인된 main SHA를 작업 브랜치에 merge하고 README 충돌 1개만 통합한다. 기존 103개 변경을 새 구현으로 분류하지 않는다.

## 승인 요청

작업지시자의 “병합및 이번 작업 마무리까지 별도 승인없이 계속 진행” 지시에 따라 본 결과를 기록하고 Stage 2로 진행한다.
