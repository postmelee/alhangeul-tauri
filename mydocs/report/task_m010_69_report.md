# Task #69 최종 보고서

GitHub Issue: [#69](https://github.com/postmelee/alhangeul-tauri/issues/69)
마일스톤: M010

## 작업 요약

6단계로 첫 공개 후보를 고정·검증하고 동일 bytes를 stable v0.1.0으로 공개했다.
공개 사이트와 updater manifest를 전환했으며 NSIS·MSI·AppImage 실제 설치본에서
production 자동·수동 동일 버전 조회를 확인했다. 마지막 PR은 잔여 조회 검증 경로와
운영 결과·최종 인계를 통합한다. 선행 준비·release·데이터 PR과 구분한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| .github/workflows/alhangeul-desktop.yml·alhangeul-release-files.yml | 조회 전용 mode와 3대상 실행 | 승인된 파일 소비자 CI |
| scripts/ci/release-file-candidate.mjs | NSIS 고정 archive/installer hash 추가 | 변조 거부·기존 bytes 재사용 |
| tests/gui/specs/production-updater.e2e.ts·wdio.release-files.conf.ts·candidate 계약 | 운영 manifest 대조와 실제 native 조회 | 업데이트 적용 없는 검증 |
| docs/releases/README.md·v0.1.0.md | 운영 완료·공개 기준선·다음 릴리즈 인계 | 공식 공개 기록 |
| mydocs/plans·working·report·orders #69 | 단계/최종 기록 | 내부 실행·승인 추적 |

제품·upstream·lockfile·공개 asset·tag·Release 본문은 이번 최종 PR에서 변경하지 않는다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 공식 릴리즈 기록·인덱스 | docs/releases | 동일 | OK | 기존 승인 위치 |
| 계획·단계·최종 보고·오늘할일 | mydocs 역할별 폴더 | 동일 | OK | 수행/구현계획 위치 판단 |

## 변경 전·후 정량 비교

| 지표 | 첫 공개 작업 전 | 완료 결과 |
|---|---|---|
| stable Release | 없음 | v0.1.0, 6 installer/11 assets |
| 공개 파일 원격 무결성 대조 | 미실행 | 11파일 hash·3 Minisign 통과 |
| 운영 production 동일 버전 조회 | 미실행 | NSIS/MSI/AppImage 자동·수동 통과 |
| 실제 production N → N+1 | 미실행 | 다음 릴리즈 인계, 미검증 유지 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| exact source 및 후보 고정 | OK — product fc3cad15, 일반 36320353815 / 서명 36320371932 |
| 6종 최소 환경 수용 | OK — Stage 3 파일별 결과·사용자 NSIS 점검, 기존 제한 유지 |
| 동일 bytes 공개·원격 대조 | OK — Release 399698591, 11파일/3서명·tag 일치 |
| 사이트·manifest 전환 | OK — PR #81, Pages 36668279136 및 후속 36692552385 |
| 실제 production 동일 버전 조회 | OK — run 36695858456 세 대상·자동/수동 응답·ZIP 독립 대조 |
| 마지막 검증 경로 계약 | OK — 회귀 93건·GUI 타입·actionlint, Pages source16/output19 |
| 기준선·후속 인계 | OK — Stage 6 공개 11파일 보존 bytes와 현재 API digest 일치, 후속 #58/#67 OPEN |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_69_stage1.md): 범위·환경·최소 검증과 승인 경계.
- [Stage 2](../working/task_m010_69_stage2.md): PR #80와 두 생산 run의 exact 제품 SHA. 별도 보고는 최종 점검에서 기존 근거로 회고 보완.
- [Stage 3](../working/task_m010_69_stage3.md): 사용자 NSIS, MSI/AppImage·Ubuntu DEB x64/arm64·Fedora RPM 문서 수용과 잔여 위험.
- [Stage 4](../working/task_m010_69_stage4.md): annotated tag·draft/stable 분리 승인·11파일 원격 재대조.
- [Stage 5](../working/task_m010_69_stage5.md): 운영 Pages/manifest 및 실제 production 동일 버전 조회.
- [Stage 6](../working/task_m010_69_stage6.md): 최종 보존 identity·다음 N → N+1 입력·후속 인계.

Stage 5 native 증거: startup/manual 모두 idle/currentVersion=0.1.0/availableVersion=null,
failure/blocker=null, operationId=1/2. HTTP 200과 manifest 승인 hash 일치. 업데이트 적용 없음.
화면 캡처는 MSI 1×1, NSIS/AppImage 초기 스킨 화면이므로 updater UI 결과 검증으로 사용하지 않는다.

## 잔여 위험과 후속 작업

### 잔여 위험

실제 production N → N+1, hosted NSIS 썸네일 원시 실패, MSI 3010 재부팅 후 확인,
Windows Authenticode, 모든 배포판/Wayland/글꼴/물리 프린터 범위를 완료로 기록하지 않는다.
기간 제한 Actions archive와 /tmp 사본은 영구 백업이 아니다. 설치된 CI VM 상태는 미보존이다.
공개 설치본·서명·checksum/inventory 및 보고서의 고정 식별자로 다음 기준선을 재구성한다.

### 후속 작업 후보

- 다음 버전 전용 이슈에서 v0.1.0 NSIS/MSI 격리 설치·writable AppImage를 기준으로 production N → N+1 수용.
- #58 Windows 썸네일 선택 설치/설정과 #67 독립 증거 재검산·재사용은 별도 OPEN 후속 작업.
- 최종 PR 검토·승인 병합 이후 #69 close 및 필요한 자료를 보존한 브랜치/worktree 정리.

## 작업지시자 승인 요청

Stage 6 진행 승인에 따라 최종 보고와 PR을 게시한다. 최종 PR CI 결과는 게시 후 확인하며
기존 production 조회 run 성공을 PR CI 성공으로 대신하지 않는다. 검토·병합 승인을 요청한다.
