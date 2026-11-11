# Task #122 Stage 4 — Alhangeul v0.1.3 릴리즈 후보 인계

GitHub Issue: [#122](https://github.com/postmelee/alhangeul-tauri/issues/122)  
구현계획서: [task_m010_122_impl.md](../plans/task_m010_122_impl.md)  
Stage: 4 · 2026-11-11

## 단계 목적

작업지시자의 Stage 4 진행 승인에 따라 검증한 후보 파일·사용자 안내·실행 근거·한계를 최종 보고서와 검토용 PR로 인계한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| [v0.1.3.md](../../docs/releases/v0.1.3.md) | 검증 완료 후보와 최종 인계 연결, 공개와 후보 상태 구분 |
| [릴리즈 인덱스](../../docs/releases/README.md) | 설치본 검증 예정 문구를 후보 검증 완료·PR 검토로 갱신 |
| [최종 보고서](../report/task_m010_122_report.md) | 전체 단계 요약·문서 위치·정량 비교·수용 범위·후속 작업 |
| [구현계획서](../plans/task_m010_122_impl.md), [오늘할일](../orders/20261111.md) | Stage 4 승인과 후보 인계 완료 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품·검증 코드 변경은 없다. 첫 후보의 실패와 새 후보의 성공은 기존 버전 기록 및 Stage 3 보고서에 보존했다. 문서는 승인된 `docs/releases/`와 `mydocs/` 위치를 사용한다. 서명된 inventory가 없는 `v0.1.3.notes.json`은 생성하지 않으며 기존 notes 규격을 완화하지 않는다.

## 검증 결과

- `pnpm run check:release-notes`는 `Release notes check passed: 2 documents`로 통과했다. 기존 typed notes 2건의 계약을 확인한 결과다. v0.1.3의 Markdown은 실행·파일 근거 및 로컬 링크를 별도 대조했다.
- `git diff --check`, 문서 링크와 단계별 보고서 4건의 존재 여부를 통과했다. `check:committed-rhwp`도 v0.9.0과 resolved commit 일치를 확인했다.
- 제품 SHA `2de5aa319d29e125bec0efc58f9e5526fc4a65d6`, producer `42919676345`와 설치 파일 6종의 식별 정보는 [Stage 3 보고서](task_m010_122_stage3.md)에 고정되어 있다.
- 최종 일반 파일 수용 `42936058653`, 빠른 CI `42936062390`의 하네스는 `c5f59294abefb6ad3251bb5f6a5083283ff8c6e0`다. 이번 문서 변경은 해당 제품 bytes를 바꾸지 않아 검증 근거를 재사용한다.
- 게시 전 최신 `devel`은 `9f811db9fe5d282b91cbe64867eaa79870cc053d`이며 작업 브랜치의 조상이다. 기존 #123은 병합, 자동 후보 #124는 draft/open, #122는 open이다.
- PR 게시 후 `Alhangeul PR required`와 실제 merge candidate의 결과를 원격에서 확인해 PR 본문에 기록한다. 이 보고서의 작성 시점은 PR 게시 전이며, 아직 실행하지 않은 필수 검사를 성공으로 기록하지 않는다.

## 잔여 위험

NSIS 사용자별 Shell 썸네일 제한, 강제 MSI 재설치의 재부팅 후 미검증, 대표 문서의 명시적 Canvas2D 전환, Microsoft Print to PDF 텍스트 검색 불가를 그대로 인계한다. 일반 설치본 수용이 production 서명·updater 업그레이드·공개 배포 수용을 대신하지 않는다.

## 다음 단계 영향

검토용 PR은 `publish/task122` → `devel`로 게시한다. #124의 동기화 커밋은 이 브랜치에 포함되어 있으므로 중복 병합을 시도하지 않는다. 실제 통합 확인 후 #124와 #122 및 브랜치 정리는 병합 승인에 따른 후속 절차에서 처리한다. 공개 준비는 검증한 후보 SHA와 새 서명/게시 파일의 관계를 다시 고정해야 한다.

## 승인 요청

승인된 Stage 4 범위로 최종 보고·PR 게시를 수행한다. PR 필수 검사 완료 후 작업지시자의 리뷰·일반 병합 승인을 요청한다. 공개 실행은 별도다.
