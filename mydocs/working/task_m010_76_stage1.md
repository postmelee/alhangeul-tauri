# Task #76 Stage 1 — 동기화 운영과 후보 생성

GitHub Issue: [#76](https://github.com/postmelee/alhangeul-tauri/issues/76)
구현계획서: [task_m010_76_impl.md](../plans/task_m010_76_impl.md)
Stage: 1 (1.1 보완 검증 완료, 1.2 실제 후보·멱등성 검증 대기)

## 단계 목적

#74를 devel에 반영한 뒤 stable 감시의 writer를 활성화하고 v0.8.6 후보 생성 경로를 검증한다. 최초 실제 실행으로 확인한 호환성 장애를 clean devel에 먼저 반영해야 하므로 선행 PR을 사용한다.

## 산출물

| 파일/설정 | 변경 요약 |
|---|---|
| ALHANGEUL_UPSTREAM_SYNC_ENABLED | false → true. 이후 stable의 검증된 Draft PR 생성 유지 |
| rhwp-upstream-sync.yml | writer 상태와 비활성 skip 이유를 summary에 표시, 네 native lock explicit staging |
| update-upstream.sh, verify-rhwp-pin.mjs, verify-rhwp-sync-changes.mjs | desktop 외 document-preview·Windows worker·Linux thumbnailer lock 갱신·동일 버전 검증·allowlist |
| local-font-entry-hooks.test.ts | 과거 upstream prompt 문구 대신 원본 browser 함수 본문의 보존 검증 |
| desktop-toolbar-mode-sync.ts 및 회귀 | 새 upstream hidden 속성을 표시 복원 시 해제 |
| upstream-boundary.test.ts | inline 스타일에서 native hidden으로 이전해도 남은 모든 inline-hidden의 owner를 검증 |
| command/commands/file.ts, rhwp-baseline.test.mjs | 저장 확인 함수의 새 options 인자 전달과 호출 계약 |
| vite.config.ts | upstream standalone Studio의 선택적 OCX plugin 제외 상수 |
| DEVELOPMENT.md, UPSTREAM.md | 네 lock 경계와 활성화 운영 정책 |

## 본문 변경 정도 / 본문 무손실 여부

upstream source는 수정하지 않는다. 기본 검증 pin은 v0.8.4를 유지한다. 제품의 글꼴 목록 UI·renderer·저장 소유권은 유지하고 stable 수용에 필요한 호환성만 보완한다. 기존 공식 문서의 관리 경계와 운영 설명만 수정했다.

## 검증 결과

- 선행 #74: PR #75 merge a1d8ac4669af370f2c428e1b73c222eb664c3c26, Issue #74 CLOSED. 완료 publish/local 브랜치 정리, 다른 checkout local/task69 유지.
- 실제 운영 run [36223270009](https://github.com/postmelee/alhangeul-tauri/actions/runs/36223270009): resolve create_candidate, writer 실행, v0.8.6 WASM 생성 성공. platform-neutral gate의 저장 확인 호출 정규식에서 실패. App token·push·PR 생성은 미실행이다. 취소 요청 시 이미 실패 종료였다.
- pnpm run test:automation: 966 통과. sync workflow 보완 후 focused 계약 11 통과.
- pnpm run test:upstream: 네 lock 갱신과 stale consumer lock 거부 포함 39 통과.
- 현재 v0.8.4의 pnpm run test:studio: 233 통과. build:studio 통과, check:product-boundary 665 파일 통과, git diff --check 통과.
- v0.8.6 source 사전 조사: 최초 Studio 230/233 (2개 과거 upstream 문자열 가정, 1개 old pin 불일치). TypeScript 11개 old WASM binding API 누락은 새 binding 수신 전의 진단이며 통합 수용 결과가 아니다. standalone flag 적용 Vite bundling 성공도 동일 제한을 갖는다.

- 보완 후 실제 v0.8.6 source의 저장 확인 baseline 1개와 focused Studio 12개 통과(관련 없는 11개는 명시 선택에서 제외). 검증 뒤 source checkout을 v0.8.4로 복원했다.

## 잔여 위험

- Stage 1.2에서 보완된 clean devel 기반 candidate의 전체 preflight와 App token·Draft PR 생성을 아직 확인해야 한다.
- v0.8.6 실제 native/설치본·Linux GUI·최종 Windows는 후속 단계다. 첫 실패나 사전 source 검사를 전체 성공으로 기록하지 않는다.

## 다음 단계 영향

선행 PR 반영 후 target_tag=v0.8.6, dry_run=false를 실행한다. 생성된 exact candidate head와 반복 dispatch의 existing_pr/no additional commit을 확인한 뒤 이 보고서에 Stage 1 결과를 보완한다.

## 승인 근거

2026-09-26 사용자의 #74 반영 → 별도 동기화/v0.8.6 수용 → 설치본 검증 순차 진행 승인을 적용한다. 선행 PR은 #76을 close하지 않으며 최종 수용 PR과 분리한다.
