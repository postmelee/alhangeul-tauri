# Task #126 Stage 6 — 최종 공개 상태와 인계

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md)

## 단계 목적

실제 업데이트 수용 결과를 최종 안내에 게시하고 공개 상태·영구 기록을 확정한다.

## 산출물

- [PR #129](https://github.com/postmelee/alhangeul-tauri/pull/129), 일반 병합 `505cb1b75b684c867f86ab6587ce5ccf004469d4`.
- exact [최종 Pages 43026646059](https://github.com/postmelee/alhangeul-tauri/actions/runs/43026646059), 위 병합 SHA로 성공.
- Pages artifact 13857282649, ZIP SHA256 `898124cc7914ef914e035384d63acbcc293051ab7046d3fba70cf513769e472c`.
- 최종 릴리즈 기록·인덱스·보고서·오늘할일 갱신.

## 본문 변경 정도 / 본문 무손실 여부

사용자 안내의 업데이트 미검증 문구를 실제 3종 성공으로 바꿨다. 기존 알려진 제한, 최초 실패·보정·이전 후보 이력, 최초 실제 검증 manifest fixture를 보존했다. 제품 파일·서명·태그·공개 시각은 변경하지 않았다.

## 검증 결과

- [PR required 43025957751](https://github.com/postmelee/alhangeul-tauri/actions/runs/43025957751) Node/Studio·Windows PS 및 `Alhangeul PR required` 성공.
- 최종 안내 검사 124/124, Pages·v0.1.3 계약 119/119, source 20/output 24 통과. 상세는 [Stage 6.1](task_m010_126_stage6.1.md).
- 배포 artifact 24개 파일과 exact source의 산출물을 대조했다. 공개 HTTP 24개 파일도 모두 bytes 일치.
- 1280px·390px에서 홈·업데이트·문의/제보·버전별 안내 8개 화면과 Windows 2종/Linux 4종 다운로드를 재확인했다. 최종 문구와 KST 날짜, 최신 버전 표시, 가로 넘침 없음 및 안내 페이지 전체 화면을 확인했다.
- 최종 stable manifest: 2,456 bytes / SHA256 `8b94dd1508da603c7c0dc0d83b01033ccd8a24393b06ba7401ddea5283524ba7`.
- 최종 GitHub body: 6,206 bytes / SHA256 `48b641ee46260fe71c4a46a82e57b47cedca2457a8099ab6adcd9496ad61381a`.
- 실제 latest 조회에서 Release 441647361 / v0.1.3 / non-draft / stable, 공개 시각 2026-11-11T12:19:34Z, 11개 asset identity 불변 확인. annotated tag `8bb3b997cd2279c1e92f440ed7d1f1810c14b7cd`는 제품 source `bcb892d49a9003615f3acd980babd71e59e147dd`를 가리킨다.
- 최초 실검증 manifest `91874d92fd583f6b9985fbc15ab844be33ccdd1b11041a3321ef2b6762381e52`와 최종 manifest는 notes만 다르며 나머지 JSON 값은 동일하다. Stage 5의 정확한 run/harness/fixture가 실제 업데이트 증거다.
- 완성된 Windows 서명 ZIP을 다시 검산하고 미사용 상태를 확인한 뒤 중복 중간 다운로드 180,232,483 bytes만 제거했다. 원본·실패·수용 증거와 routing symlink는 보존했다.
- `git diff --check`와 단계 문서·내부 링크 점검 통과.

## 잔여 위험

Stage 3·5의 기존 제품 제한을 그대로 인계한다. CI artifact의 보존 기한과 영구 Release 파일을 구분한다. 이번 안내 hash를 최초 실제 업데이트에서 사용한 hash로 대체하지 않는다.

## 다음 단계 영향

최종 보고 PR은 필수 CI·일반 병합을 따른다. 기본 브랜치 main에도 공개 README·기록을 일반 PR로 동기화하되 제품 tag를 이동하지 않는다. 병합 확인 후 #126과 작업 브랜치를 정리하고 기존 devel worktree로 복귀한다.

## 승인 기록

작업지시자의 “등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 최종 보고·PR·일반 merge·정리를 진행한다.
