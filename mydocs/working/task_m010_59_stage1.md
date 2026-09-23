# Task #59 Stage 1 — 하위 CI 계층 통합과 운영 문서 연결

GitHub Issue: [#59](https://github.com/postmelee/alhangeul-tauri/issues/59)
구현계획서: [task_m010_59_impl.md](../plans/task_m010_59_impl.md)
Stage: 1

## 단계 목적

#60–#64의 계층별 구현을 한 부모 branch에 모으고 후속 작업자가 필요한 검증을 선택할 수 있게 한다.

## 산출물

- #60 계층·시간 측정, #61 fast, #62 exact artifact, #63 core/cache,
  #64 profile/플랫폼 분리의 Stage 1/2 커밋을 fast-forward로 통합한다.
- `docs/operations/CI_VALIDATION.md`: profile별 실행 명령, 자동 선택 fallback, 재사용 입력,
  상태·캐시·측정 및 workflow 소유 파일 목록.
- `AGENTS.md`, `docs/DEVELOPMENT.md`, 운영 정책·runbook·체크리스트: 기존 문맥을 읽고
  진입 링크와 ordinary artifact의 정확한 SHA·입력 계약만 보완.
- `mydocs/orders/20260907.md`: 하위 작업의 Stage 1/2 완료와 통합 수용 진행 상태.

## 본문 변경 정도 / 본문 무손실 여부

제품·upstream source는 변경하지 않았다. Desktop entry는 1,435→797 LOC이며 일반 빌드의
단계를 reusable 소유 파일로 옮겼다. updater/release job 본문은 이전 HEAD와 동일하다.
기존 #19/#57 branch나 메인 worktree는 수정하지 않았다. #57의 NSIS/MSI 별도 fresh runner
수용을 이번 기존 smoke 통과와 혼동하지 않도록 가이드에 명시했다.

공식 운영 문서는 승인 계획의 `docs/operations`, 개발 진입은 기존 `docs/DEVELOPMENT.md`와
`AGENTS.md`에 둔다. 기존 runbook/정책의 입력 설명 정합성 보완도 #64 구현계획서에 기록했다.

## 검증 결과

- 하위 구현 후보 `230098401df7d893a26b54b62b780081d3553dda`: 자동화 554개,
  upstream 36개, Studio 132개와 Studio build/GUI typecheck 통과.
- 원격 [34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307)의
  fast는 같은 개수의 Node 검사를 통과했다. Windows parser 11개 source와 격리 회귀
  1개 suite 통과. native/package 전체 완료를 이 단계에서 주장하지 않는다.
- 변경 문서 상대 링크 검증과 `git diff --check`, workflow `actionlint` 통과.
- GitHub #59 sub-issues가 정확히 #60–#64로 연결되어 있고 기존 이슈는 OPEN이다.

## 잔여 위험

전체 native/package/installer 수용과 cache warm, 기존 artifact 재사용은 Stage 3에서 결과를 확인한다.
새 입력이 source/workflow SHA를 일치시키므로 과거에 다른 build_ref를 쓰던 실행은 가이드대로 조정한다.

## 다음 단계 영향

부모 통합 문서·workflow·회귀의 정합성을 확인한 뒤 진행 중인 원격 수용을 이어간다.

## 승인 요청

기존 전체 하위 작업·통합 PR 승인과 복구 task의 계속 진행 지시 적용.
