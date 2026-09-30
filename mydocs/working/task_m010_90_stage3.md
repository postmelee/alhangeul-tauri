# README 배지 Stage 3 보고서

GitHub Issue: [#90](https://github.com/postmelee/alhangeul-tauri/issues/90)
구현계획서: [task_m010_90_impl.md](../plans/task_m010_90_impl.md)
Stage: 3

## 단계 목적

GitHub 실제 README에서 배지 표시·링크를 확인하고 검토 가능한 PR을 준비한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| mydocs/report/task_m010_90_report.md | 통합 수용·검증 결과·캐시와 공개 반영 경계 |
| mydocs/orders/20260930.md | #90 구현·검증 완료, PR 검토 대기 |

## 본문 변경 정도 / 본문 무손실 여부

전체 사용자 변경은 README 배지 5행이다. 제품·pin·workflow·사이트 diff가 비어 있고
원래 README의 배지 이외 본문은 bytes 단위로 같다. 내부 기록은 계획된 역할별 위치에 있다.

## 검증 결과

- 전체 diff --check 및 허용 파일 목록: OK. README/updater/기존 테스트와 내부 기록만 변경.
- publish/task90의 c2cd777f README 실제 GitHub 렌더링을 확인했다.
- 배지 natural size: 110×20 / 130×20 / 158×20 / 78×20, complete=true.
- 네 배지는 같은 y=249.59375에 한 줄 배치됐다. 로고·기존 이미지 4개도 정상 로드됐다.
- DOM에서 배지 링크는 다운로드 페이지 / rhwp v0.8.6 release / 업데이트 페이지 / LICENSE다.
- 실제 screenshot에서 제목·배지·기존 사용자 안내·Windows/Linux 이미지 배치를 확인했다.
- rhwp v0.8.6 Release API: draft=false, prerelease=false, html_url과 배지 링크 일치.
- 관련 focused 25개·upstream 39개, boundary 730 files 검증 결과를 통합 수용했다.
  이후 변경은 이 보고서·최종 보고·orders이며 검증한 README·스크립트·테스트 bytes는 같다.

## 잔여 위험

외부 배지 캐시가 지연될 수 있다. 이 PR은 devel 대상이며 공개 기본 main에는 병합·승격 후 반영된다.
새 CI/설치본·실제 다음 rhwp scheduled run은 수행하지 않았다. 영향 범위에 맞는 로컬 계약을 검증했다.

## 다음 단계 영향

publish/task90 → devel Open PR을 게시하고 작업지시자 검토·병합 지시를 기다린다.

## 승인 요청

요청된 변경과 검증을 완료했다. PR 병합과 공개 main 승격은 별도 명시 지시 후 수행한다.
