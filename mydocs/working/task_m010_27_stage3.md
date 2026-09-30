# Task #27 Stage 3 — 운영 정책과 통합 수용

GitHub Issue: [#27](https://github.com/postmelee/alhangeul-tauri/issues/27)
구현계획서: [task_m010_27_impl.md](../plans/task_m010_27_impl.md)
Stage: 3

## 단계 목적

Action provenance·호환성·갱신·rollback 정책을 공식 운영 문서로 남기고 실제 Windows/Linux 비게시 CI에서 변경을 수용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| docs/operations/ACTION_DEPENDENCIES.md | SHA/version provenance, dtolnay snapshot 경계, 검토·갱신·rollback |
| docs/operations/CI_VALIDATION.md·docs/README.md | 기존 문서에 검사·정책 링크 보완 |
| task 기록·오늘할일 | 사용자 전체 진행 승인, source와 원격 검증 기록 |

## 본문 변경 정도 / 본문 무손실 여부

기존 공식 문서는 링크/검사 설명만 보완했다. 19 workflow/composite YAML을 AST로 비교해 외부 uses ref·주석 외 job·입력·권한·shell·조건이 동일함을 확인했다. 제품·rhwp pin·사이트/Release bytes는 동일하다.

## 검증 결과

- OK: action inventory 11개, YAML25개 외부 uses152개 전부 SHA40와 대응 version 주석. upstream 공식 ref를 recursive resolve하고 pinned action.yml의 152개 입력 이름을 대조했다.
- OK: automation1009/1009, upstream39/39, Studio235/235, Studio build·GUI typecheck·product boundary715개.
- OK: actionlint, diff --check, 문서 상대 링크 검사.
- 원격: fresh full [36730348163](https://github.com/postmelee/alhangeul-tauri/actions/runs/36730348163), source dcef92a1031f5abeef66eeef1adb4fc158c7c0b6. 최종 conclusion=success. fast·core3종·Windows/Linux3종 build·installer3종·installer-status·result가 모두 성공했다.
- 최초 full36723402631은 개별 native/build/설치 계약 성공 뒤 installer-status/result 실패했다. 같은 API 버전으로 완료 후 재검산하면 통과했지만 전체 성공으로 기록하지 않는다. 같은 source의 fresh run으로 재검증했다. API 시점 문제는 추정이며 원인을 확정하지 않는다.

## 잔여 위험

live Pages, 서명·Release 게시, App token 발급, 다음 scheduled 실행은 수행하지 않았다. dtolnay Action snapshot은 Rust compiler version pin이 아니다. installer 계약 통과는 NSIS thumbnail 활성화·MSI 재부팅 후 상태·최신 VDI·전체 GUI 제품 수용을 보장하지 않는다.

## 다음 단계 영향

사용자 명시 지시에 따라 최종 보고·devel PR 리뷰/병합을 진행한다. 예약 workflow는 default main 정의를 사용하므로 최신 main62ab74ab와 task27을 통합하는 운영 PR을 별도 리뷰/병합한다. 이미 main에 있는 task90을 보존하고 PR diff는 #27만 포함한다. release/배포를 실행하지 않는다.

## 승인 요청

같은 스레드의 #27 수행·PR 생성·리뷰·병합 전체 지시를 적용한다. 각 실제 CI 성공과 exact head를 확인한 뒤 진행한다.

원격 source 이후 최종 변경은 mydocs task 기록과 orders뿐이다. 2026-10-01 KST 수용 완료.

운영 통합 추가: devel PR93 merge 확인. fast36736060155(source5daac1dc) Node/Studio·Windows PowerShell 모두 success. full source와 .github·package/lock·apps/crates·third_party/pin diff 없음. 최초 main 운영 계획을 최신 main 보존 통합으로 보완했다.
