# Task #126 Stage 5 — Pages와 실제 업데이트 수용

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
구현계획서: [task_m010_126_impl.md](../plans/task_m010_126_impl.md)

## 단계 목적

공개된 v0.1.3 파일을 웹·production 피드에 연결하고 실제 v0.1.2 설치본의 동일 형식 업데이트를 검증한다.

## 산출물

- [PR #128](https://github.com/postmelee/alhangeul-tauri/pull/128) 일반 병합: `a6abc1b0da3925a20695821f210a0a675252aabf`.
- exact [Pages 43021930874](https://github.com/postmelee/alhangeul-tauri/actions/runs/43021930874) 성공. artifact 13855441487, ZIP SHA256 `45c3818663a0782fd667576f39563b038e47f2e958985bc2212bc276866387a5`.
- 최초 production manifest 2,318 bytes, SHA256 `91874d92fd583f6b9985fbc15ab844be33ccdd1b11041a3321ef2b6762381e52`.
- 입력 fixture와 보정 경위: [Stage 5.1](task_m010_126_stage5.1.md), [Stage 5.2](task_m010_126_stage5.2.md).

## 본문 변경 정도 / 본문 무손실 여부

GitHub 공개 파일·서명·tag·제품 source는 변경하지 않았다. v0.1.3 안내와 현재 웹 데이터를 반영하고 이전 버전 자료는 보존했다. 실제 업데이트에 사용한 최초 피드 fixture와 아래 exact harness는 후속 안내 문구 변경과 구분해 보존한다.

## 검증 결과

### Pages·공개 HTTP·화면

- PR required [43021224177](https://github.com/postmelee/alhangeul-tauri/actions/runs/43021224177): Node automation 1,383, upstream 39, Studio 290, Windows notes 124·production 101 및 PowerShell 84개 source/16개 격리 회귀 통과.
- Pages source 20 / output 24. 실제 배포 artifact의 24개 파일을 로컬 exact source 산출물과 대조했고 공개 HTTP 24개 모두 bytes 일치.
- 홈·업데이트·문의/제보·v0.1.3 안내를 1280px/390px에서 확인했다. 8개 화면 가로 넘침 없음, 최신 v0.1.3·KST 공개일·Windows 2종/Linux 4종 및 버전 고정 다운로드 6종 연결을 확인했다. 브라우저 화면 증거는 T7 private evidence에 보존한다.

### 실제 0.1.2 → 0.1.3 업데이트

| 형식 | 환경 | run / harness | 결과 |
|---|---|---|---|
| NSIS | Windows 2025 x64 | [43023572190](https://github.com/postmelee/alhangeul-tauri/actions/runs/43023572190) / `cd56b9bd9561b7a713cd5cf44e2855b880a35bb8` | 성공 · 2026-11-11T12:59:24.455Z 수용 |
| MSI | Windows 2025 x64 | 같은 run/harness | 성공 · 2026-11-11T12:56:33.895Z 수용 |
| AppImage | Ubuntu 22.04 x64, writable original FUSE | [43022196810](https://github.com/postmelee/alhangeul-tauri/actions/runs/43022196810)의 Linux job 130527878772 / `a6abc1b0da3925a20695821f210a0a675252aabf` | 성공 · 2026-11-11T12:50:07.847Z 수용 |

- 세 형식 모두 공개 Release ID 407055948 → 441647361, tag object·source·asset identity·checksum·Minisign·production manifest exact bytes를 검증했다.
- 앱 시작/수동 확인, dirty 문서 차단, 사용자 다운로드·설치 선택, 재실행 후 `Alhangeul 0.1.3`과 업데이트 없음, 설정 보존을 확인했다.
- 세 형식 각각 HWP 6쪽·HWPX 10쪽을 다시 열어 canvas와 원본 SHA256 보존을 확인했고 저장된 화면도 확인했다.
- Windows 초기 v0.1.2 설치 exit 0. 최종 설치 버전·실행 파일 version resource·파일 연결·기본값 보존, apply/validate/verify/cleanup/policyRestore 전부 success. 3010 재부팅 미완료 상태를 성공으로 처리하지 않았다.
- AppImage 실제 파일 SHA256이 공개 v0.1.3 파일 `740b622792eb6201691f5993c66f351d6b7cf3b66b5bbdda5771b5d0a2fc997e`로 교체됐고 새 PID·FUSE mount의 UI 재시작과 해당 프로세스 정리를 확인했다.
- artifact를 독립 다운로드하고 ZIP digest, accepted/public-input/apply/verify/Windows validate·step outcomes를 다시 검사했다. Windows artifact의 대소문자 무시 제외 패턴은 inventory 파일도 제외하므로, 같은 공개 inventory를 보존한 Linux artifact와 Windows SHA256SUMS·selected 값을 교차 대조했다.

| artifact | ID | ZIP SHA256 |
|---|---|---|
| NSIS | 13856043396 | `cb682ed5bd059ee798ff788e688394258d50731ce68a43c036f15e39917bae5b` |
| MSI | 13856283126 | `d47edca3abbce673356bc9e672e115fdc60ae87c3663d9d2646cc5157f637433` |
| AppImage | 13856251300 | `09e7a34709c3028e57952e9b063e9825c7f3058ee72d224ab8434d41e2624664` |

### 최초 실패와 보정 후 계약

최초 run 43022196810은 전체 failure이며 Linux 성공을 전체 성공으로 기록하지 않는다. Windows NSIS·MSI는 v0.1.2 설치 exit 0 이후 harness가 0.1.1을 기대해 중단했고 apply/verify는 미실행이었다. 두 형식 모두 cleanup과 policy 복구는 성공했다. MSI 원시 artifact 13855986274, SHA256 `594e3cc126bfcef267b9810f836ebe37b5bd6d36a331209ab655c22b1d5693f0`; NSIS 원시는 Stage 5.2에 기록했다.

Windows 기대값 보정 뒤 [fast 43023567578](https://github.com/postmelee/alhangeul-tauri/actions/runs/43023567578)은 automation 1,384 / upstream 39 / Studio 290 및 Windows 계약 모두 통과했다. 제품 재빌드 없이 Windows-only 실제 검증을 다시 실행했다.

## 잔여 위험

기존 Authenticode 미서명·hosted NSIS 썸네일·강제 MSI 3010 이후 재부팅 미검증 및 문서/글꼴/프린터 환경 제한은 유지한다. 이번 실제 업데이트 성공이 그 제한을 해소했다는 뜻은 아니다. CI artifact는 보존 기한이 있으므로 주요 식별자·해시·결과를 이 기록에 남긴다.

## 다음 단계 영향

실제 업데이트 성공을 사용자 notes·GitHub body·웹에 반영한다. 안내 변경으로 feed notes/hash가 달라지면 최초 검증 manifest와 최종 안내 manifest를 구분하고 최종 Pages·HTTP·화면을 다시 확인한다. 이후 최종 보고·PR·일반 merge·정리를 진행한다.

## 승인 기록

“등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 Stage 6를 계속한다.
