# Task #132 Stage 1 — 공개 NSIS 사용자 문맥 비교와 제거 잔존 확인

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)
Stage: 1

## 단계 목적

공개 v0.1.3의 동일 설치 파일로 표준 사용자/관리자 문맥을 비교하고 최소 수정 경계를 확정한다.
작업지시자는 관측 뒤 사용자별 NSIS 유지, 관리자 환경 MSI 사용을 선택했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| scripts/windows-thumbnail-user-context.ps1 | 고정 공개 installer/fixture hash, 격리 표준 계정, 원시 관측·환경 정리 |
| scripts/windows-thumbnail-user-probe.ps1 | 실제 token/HKCU, HWP/HWPX Shell/force-extract 및 제거 잔존 |
| .github/workflows/alhangeul-thumbnail-user-context.yml, ci.yml | 기본 false opt-in, fast 선행, 두 VM 분리 |
| tests/windows-thumbnail-user-context.test.mjs, actions-workflows.test.mjs | opt-in·권한·고정 bytes·workflow inventory 계약 |
| 수행/구현계획서와 오늘할일 | 승인 이력, 실제 결과, 지원 범위 선택 |

## 본문 변경 정도 / 본문 무손실 여부

제품 renderer/handler/worker·설치 scope·UAC·HKLM 정책은 변경하지 않았다.
#57의 HKLM overlay/보호 경로 실험은 실행하지 않았다.
표준 계정 생성·profile·임시 파일은 disposable hosted VM에 한정했다.
기존 실패 결과를 보존하고 후보 commit과 원격 결과 문서 commit을 구분한다.

## 검증 결과

- 로컬 Node 24.15.0/pnpm 10.33.0: automation 1,384 passed, boundary 839 files,
  전용 검사 2 passed, actionlint/diff 통과. 최종 후보의 Node/Studio·Windows PS fast도 통과.
- source 563dae612eba52e0b5ea5d7c25a84111b2752775 /
  [43039943503](https://github.com/postmelee/alhangeul-tauri/actions/runs/43039943503): 전체 failure.
  표준 사용자 썸네일 6개 성공, 관리자 6개 0x80040154. 표준 사용자 제거 잔존으로 cleanup 실패.
- source 89eef0f52ab7fea8f6eb6e5fc72d3a7dab60220f /
  [43042356555](https://github.com/postmelee/alhangeul-tauri/actions/runs/43042356555): 전체 failure.
  동일 기능 결과 재현. profile/LocalAppData 상속은 원래도 올바르므로 환경변수 가설 배제.
  uninstallExit=0, handlerRegistered=false, 처리기 DLL 한 개 잔존.
- source 1a6aee6feca87a8e46d2728788f9e55748b7bd75 /
  [43044745096](https://github.com/postmelee/alhangeul-tauri/actions/runs/43044745096): 관측 전체 success.
  표준 사용자 raw productUninstallPassed=false를 보존했다. 30초 후 handlerLoaders=[]이며
  hash를 확인한 잔존 DLL의 시험용 삭제 재시도가 성공했다. 이것은 제품 제거 성공이 아니다.

세 실행은 product source bcb892d49a9003615f3acd980babd71e59e147dd,
공개 NSIS SHA256 932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490를 썼다.
표준 사용자 token medium 8192/elevated=false, runner high 12288/elevated=true,
Windows build 26100/image 20261103.298.1/EnableLUA=1/session 2다. 서로 다른 계정·VM이므로
동일 사용자 token만 바꾼 단일 변수 실험이라고 표현하지 않는다.

설치된 handler SHA256 5cae0049fbf31e0d66bb411eaf452244fde0e07f82f03a12372d0fb34cf268bb,
worker 560236cadc4b06b8358e604f5a919b6d22a07c0eb8082fe782d5795dabf37e26는 양쪽이 같다.
표준 사용자 HWP/HWPX는 각각 181×256 실제 bitmap, JPG 대조군은 256×134다.
관리자 문서 추출은 실패하지만 JPG·association·직접 COM 생성은 성공한다.

최종 관측 artifact:
- standard ID 13866488678 / sha256:35e7d2c09800fa5403c2e5d89a01ab75e21fb2915894f84bfad1f8bfcc8e7eae
- runner ID 13867256951 / sha256:5bfac268dc16392e62ba9dc473dec99d3f5089bcaf8266172bdc331f55726a55

세 run의 archive bytes SHA256을 metadata와 대조하고 raw JSON을 읽었다.
private 증거는 T7의 task132 output에 보존하며 source에 포함하지 않는다.

## 잔여 위험

- 관리자 NSIS의 실패는 사용자가 선택한 지원 정책에 따라 제한으로 유지한다.
- 표준 사용자 NSIS는 새 썸네일 생성 후 제거 시 DLL을 남긴다. 실제 제품 보완이 필요한 별도 lifecycle 결함이다.
- 최신 일반 사용자 Explorer 화면, 새 제품 installer, 기존 3010 재부팅 이후는 아직 수용하지 않았다.
- API bitmap 성공을 모든 Explorer/문서/Windows 조합 성공으로 확대하지 않는다.

## 다음 단계 영향

NSIS scope나 renderer 대신 설치기의 제한된 삭제 재시도를 보완한다.
같은 DLL을 사용하는 Shell의 자연스러운 해제를 기다리며 host 종료·cache 삭제·권한 변경을 하지 않는다.
신규 installer의 일반 사용자 실제 썸네일과 제거 성공을 별도 필수 gate로 검증한다.

## 승인 적용

작업지시자의 이슈 해결까지 연속 진행 승인과 NSIS 유지/MSI 관리자 지원 선택에 따라 Stage 2로 진행한다.
PR 생성 직전 보고하며 새 release/tag/asset/feed 변경은 아직 수행하지 않는다.
