# Task #69 Stage 5 — 사이트·updater 운영 전환 확인

GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
구현계획서: [task_m010_69_impl.md](../plans/task_m010_69_impl.md)
Stage: 5

## 단계 목적

동일 공개 설치본의 다운로드 안내와 운영 updater manifest를 배포하고 실제 설치본의
동일 버전 조회가 오류 없이 업데이트 없음으로 종료되는지 확인한다.

## 산출물

| 파일 / 산출물 | 변경 요약 |
|---|---|
| site/release.json·배포 inventory | PR #81 병합과 운영 Pages/manifest 전환 |
| release-files workflow·candidate verifier·GUI spec | 기존 파일을 재사용하는 production 조회 전용 모드, NSIS/MSI/AppImage 독립 실행 |
| docs/releases/v0.1.0.md | 운영 배포와 실제 production 조회 수용 기록 |
| 계획서·오늘할일 | Stage 5 완료 및 Stage 6 승인 경계 |

## 본문 변경 정도 / 본문 무손실 여부

기존 준비·실패·승인 기록을 보존하고 최신 수용 결과를 추가했다.
제품 SHA·공개 설치본·서명·upstream pin·Release/tag는 변경하지 않았다.
기존 문서 roundtrip 모드는 유지했고 이번 조회 모드에서 반복하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm run build:pages
pnpm run check:pages
pnpm run typecheck:gui
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-release-files.yml
node --test tests/ci-release-file-candidate.test.mjs tests/updater-release.test.mjs tests/pages.test.mjs tests/actions-workflows.test.mjs
gh api repos/postmelee/alhangeul-tauri/actions/runs/36695858456
gh api repos/postmelee/alhangeul-tauri/actions/runs/36695858456/jobs
gh api repos/postmelee/alhangeul-tauri/actions/runs/36695858456/artifacts
git diff --check
```

- 데이터 PR #81: devel `6e2d8de` 병합. Pages 36668279136 성공과 원격 read-back 통과.
  후속 #82 사이트 배포 36692552385도 `c3ee834c`에서 성공했다.
- Pages build/check 재확인 source=16/output=19 통과. 조회 harness 타입·actionlint 통과,
  관련 회귀 93 passed / 0 failed / 0 skipped. 실패 근거가 없는 검사는 재실행하지 않았다.
- [production 조회 run 36695858456](https://github.com/postmelee/alhangeul-tauri/actions/runs/36695858456):
  head `4b3366e71da32fbf641b7ba84f0bd5abeb8f28e6`, 세 대상 모두 success.
  mode=production-updater-check, artifact_platform=all, publish_release=false.
- 제품 `fc3cad15682f35723ab6558d1301e9096f7eec67`, producer 36320371932의 고정 archive와
  공개 파일과 동일한 installer SHA·Minisign 확인 기록을 재사용·대조했다.
- 세 대상 모두 startup operationId=1 및 manual operationId=2 응답이 idle/currentVersion=0.1.0,
  availableVersion/blocker/failure=null이다. disabled/fallback/error가 아니다.
- 실제 운영 manifest HTTP 200, 버전 0.1.0과 SHA-256
  `e3c27ee429063ae12d0f12e7188f5ee2a3e498104963900889501228caba88d1` 일치.
  증거에 저장된 manifest bytes도 로컬에서 다시 해시를 계산했다.
- Windows 설치/제거·WebView2 정책 설정/복원, 원본 AppImage FUSE 실행,
  대상별 GUI 및 evidence upload와 최종 gate 모두 성공했다.
- updater_apply·제품 재빌드·새 서명·Release/Pages 변경은 실행하지 않았다.

다운로드한 증거 ZIP의 SHA-256을 원격 API digest와 독립 대조했다:

| 대상 | artifact ID | ZIP SHA-256 |
|---|---:|---|
| NSIS | 11087968359 | `65bfc60b0050f985f691ed64d4a4b835d77050418ad65bae06fd6406a26f89ac` |
| MSI | 11087903125 | `bbdf4a4b8512e1712c32b36a9509b1d807ee9ea4bd0315de4cd56077be6199a5` |
| AppImage | 11087833196 | `89f8de8f8dfccc4253ba88196eeeed98c8d67c84b14f39f5309be8ad9a38b6d8` |

로컬 증거 위치: `/tmp/task69-production-readback/{nsis,msi,appimage}`.

## 잔여 위험

실제 production N → N+1 업데이트는 다음 릴리즈에서 확인한다. 기존 hosted NSIS 썸네일,
MSI 3010 재부팅 후 미검증, Authenticode 미서명 및 환경·인쇄·글꼴 한계는 유지한다.
이번 캡처는 NSIS/AppImage 초기 스킨 화면, MSI 1×1이므로 updater 결과 UI 수용 근거가 아니다.
실제 native 조회 응답만 수용하며 UI 표시·업데이트 설치 검증으로 확대하지 않는다.

## 다음 단계 영향

Stage 5 완료. Stage 6에서 공개 기준선·보존 자료·후속 N → N+1 및 #58/#67 인계를 정리하고
최종 보고서와 devel 대상 PR을 준비한다. 추가 제품 빌드·사용자 Windows 재설치는 필요 없다.

## 승인 요청

Stage 5 검토와 Stage 6 최종 인계·보고 진입을 요청한다. #69는 OPEN을 유지한다.
