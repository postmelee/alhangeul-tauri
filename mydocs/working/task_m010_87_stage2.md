# Task #87 Stage 2 — 종료된 원격 브랜치 정리와 계약 검증

GitHub Issue: [#87](https://github.com/postmelee/alhangeul-tauri/issues/87)
구현계획서: [task_m010_87_impl.md](../plans/task_m010_87_impl.md)
Stage: 2

## 단계 목적과 산출물

사용자가 승인한 원격 부산물을 정확한 ref로 정리하고 기존 제품·사이트 계약이 유지되는지 확인한다.
산출물은 이 단계 보고서다. 새 코드·테스트·workflow·사이트 소스는 변경하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

삭제된 ref의 commits는 devel에서 모두 도달 가능하다. 미병합 publish/task35와 다른 checkout,
main/devel, 제품 코드와 공개 파일을 보존했다. 원격 브랜치 삭제는 Git 이력을 삭제하거나 재작성하지 않는다.

## 검증 결과

| 정리한 원격 ref | 확인한 tip | 근거 |
|---|---|---|
| automation/rhwp-v0.8.4-full-sync | b3712714f6733aa75ff50dd346b89850136b5458 | PR #32 MERGED·devel ancestor |
| codex/task14-stage4-probe | e407c20cfd23059b997590462a5e66fb47e1aa03 | #14 CLOSED·devel ancestor·고유 변경 없음 |
| publish/task69 | 34446a0fd86a8639158a33745243b68a064f227c | #69 CLOSED·PR #72 MERGED·devel ancestor |

삭제 직전 PR head/tip와 remote tip를 재확인하고 각 ref에 열린 PR과 queued/in_progress/
waiting/pending/requested run이 없음을 조회했다. 삭제 후 ls-remote에서 3개 모두 사라졌다.
publish/task35의 e3095c64 tip는 남아 있으며 #35 OPEN·고유 19 commits를 보존한다.

| 검증 | 결과 |
|---|---|
| pnpm run check:product-boundary | OK — 730 files |
| pnpm run test:automation | OK — 995 passed/0 failed/0 skipped |
| pnpm run test:upstream | OK — 39 passed/0 failed/0 skipped |
| pnpm run test:studio | OK — 235 tests, 38 files passed |
| pnpm run build:studio | OK — 기존 chunk/dynamic import 경고만 유지 |
| pnpm run build:pages | OK — 16 source files, 2 root assets |
| pnpm run check:pages | OK — source 16/output 19 |
| git diff --check | OK |

시작 devel 전체 tree와 일치하는 기존 fast CI의 Windows PowerShell 결과를 재사용한다.
현재 task 변경은 공식 운영 문서와 내부 기록뿐이며 Windows scripts·workflow·제품은 그대로다.
새 Actions를 실행하거나 native 설치·서명·Release·Pages 배포를 반복하지 않았다.

## 잔여 위험

main 기본 전환은 아직 수행하지 않았다. 원격 refs는 삭제했지만 기존 다른 checkout이나
로컬 local/task69를 제거하지 않았다. publish/task35의 완료 판단은 #35 작업에서 수행한다.

## 다음 단계 영향과 승인

동일 명시 승인 범위로 Stage 3의 통합 검토·PR 준비와 병합 후 main 전환·실제 UI 수용을 진행한다.
최종 수용 상태는 설정과 두 PR 병합 결과를 read-back한 뒤 이슈/PR 본문에 기록한다.
