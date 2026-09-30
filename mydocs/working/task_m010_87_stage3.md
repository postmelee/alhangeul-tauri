# Task #87 Stage 3 — 통합 검토와 공개 기본 전환 PR 준비

GitHub Issue: [#87](https://github.com/postmelee/alhangeul-tauri/issues/87)
구현계획서: [task_m010_87_impl.md](../plans/task_m010_87_impl.md)
Stage: 3

## 단계 목적과 산출물

검증된 문서/원격 정리 결과를 일반 PR로 반영하고 main 승격·기본 설정 전환의 정확한 입력을 준비한다.
산출물은 이 단계 보고서, 최종 보고서, 오늘할일의 PR 준비 완료 기록이다.

## 본문 변경 정도 / 본문 무손실 여부

이번 task는 운영 정책 13행과 내부 기록만 추가한다. 제품 source·lock·upstream·workflow·사이트
코드와 사용자 문서를 새로 변경하지 않았다. main에는 이전 #69/#82/#85의 승인 내용을 함께 반영한다.

## 검증 결과

- 전체 task diff는 docs/operations/DESKTOP_RELEASE.md와 mydocs 승인 경로뿐이다.
- `git diff --check`와 기록 상대 링크·문서 위치 대조 통과. 외부 기여 지침은 devel PR을 명시한다.
- 기존 fast CI 성공 head와 시작 devel의 tree 동등성이 확인됐다. 이번 새 문서는 로컬
  boundary 730 files·automation 995·upstream 39·Studio 235 및 두 build/Pages check가 통과했다.
- Windows PowerShell 증거는 변경 없는 기존 exact tree의 CI에서 재사용한다. 새 native
  제품·package·서명/Release/Pages 배포를 수행하거나 그 범위의 수용으로 확대하지 않는다.
- 삭제한 3개 ref는 시작 tip·종료 상태·ancestry와 진행 중 run 부재를 재확인한 뒤 정리했다.
- 내부 리뷰에서 요청 범위 초과, 제품 변경, 미병합 작업 삭제와 태그 이동이 없음을 확인했다.

## 잔여 위험과 다음 단계 영향

이 source 보고서는 PR 게시 전의 준비 결과다. 기본 branch=main, main UI 8/8,
두 PR 병합·설정 read-back·공개 파일 불변의 최종 확인은 아직 실행 전이다.
동일 스레드 승인에 따라 일반 PR을 먼저 병합한 뒤 최신 devel을 main으로 승격한다.
remote ref가 이동하면 기존 승인 source와 diff를 다시 확인한다.

## 승인 상태

작업지시자가 main PR 검토/병합 → 기본 전환 → Community/운영 확인과 원격 정리를
명시 승인했다. PR별 head를 고정해 검토·병합하고 실제 종료 결과를 이슈/PR 본문에 추가한다.
