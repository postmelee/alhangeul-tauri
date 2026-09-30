# Task #87 Stage 1 — 기준선과 공개 브랜치 운영 정책

GitHub Issue: [#87](https://github.com/postmelee/alhangeul-tauri/issues/87)
구현계획서: [task_m010_87_impl.md](../plans/task_m010_87_impl.md)
Stage: 1

## 단계 목적

main 전환의 정확한 source/공개 상태를 확인하고 개발·사이트·동기화 운영 대상을 분리한다.

## 산출물

| 파일 | 변경 |
|---|---|
| docs/operations/DESKTOP_RELEASE.md | 공개 기본 main, 일반 PR·동기화·Pages devel 책임 절 추가 |
| task_m010_87_impl.md | 제목의 한국어 표기 정정 |

## 본문 변경 정도 / 본문 무손실 여부

기존 정책 본문을 유지하고 짧은 절을 추가했다. 기존 태그·source/installer 식별 경계와
Pages exact devel 승인 경계를 바꾸지 않았다. 제품 코드·lock·upstream·workflow는 변경하지 않았다.

## 검증 결과

- 시작 main `fc3cad15682f35723ab6558d1301e9096f7eec67`, devel
  `1ee2883e011f0ad1d07cd0f77460bad73559cb48`. 54 commits·78 paths 차이가 있으나
  apps/packages/rhwp-core.lock/pnpm-lock.yaml/third_party는 diff가 없다.
- 직전 [fast CI 36711244690](https://github.com/postmelee/alhangeul-tauri/actions/runs/36711244690)의
  `f7b4917a195ae36ce9e63ff23582a601b5f0b72c` tree와 시작 devel 전체 tree가 같다.
  API completed/success, Windows scripts/workflows를 수정하지 않는 이번 문서 작업의 기존 근거다.
- v0.1.0 annotated tag `3b6b4bc5eef0a5e290b8060b81191c5460cc4c63`, Release ID
  `399698591`, 11 assets의 ID/name/size/digest를 삭제·설정 전 기준선으로 수집했다.
- production stable manifest HTTP 200/version 0.1.0/SHA-256
  `e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1`.
- github-pages 환경 devel branch policy, upstream BASE_BRANCH=devel, 기본 devel 확인.
- 삭제 후보 automation/v0.8.4(PR #32 MERGED), task14 probe(#14 CLOSED), task69(PR #72
  MERGED) 모두 devel ancestor이며 고유 commits/files가 없다.
- publish/task35는 #35 OPEN이고 고유 19 commits가 있다. main/devel·다른 checkout과 함께 보존한다.
- 진행 중/queued Actions 없음. 삭제 직전 다시 조회한다.
- 문서 상대 링크와 `git diff --check` 통과. 계획서의 문서 위치와 실제 수정 위치가 일치한다.

## 잔여 위험

기본 브랜치 설정은 아직 devel이며 main 문서 정렬/전환은 Stage 3에서 수행한다.
CI 결과를 새로운 native 설치 검증으로 확대하지 않는다. 삭제 ref가 이동하면 삭제하지 않는다.

## 다음 단계 영향과 승인

동일 승인 범위로 Stage 2의 ref 재조회·종료 브랜치 삭제·관련 로컬 계약 검증을 진행한다.
기존 Release/asset/tag/manifest 기준선은 최종 원격 수용에서도 대조한다.
