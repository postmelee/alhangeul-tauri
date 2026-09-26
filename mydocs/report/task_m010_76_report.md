# Task #76 최종 보고 — 동기화 운영과 rhwp v0.8.6 수용

GitHub Issue: [#76](https://github.com/postmelee/alhangeul-tauri/issues/76)
마일스톤: M010

## 작업 요약

- #74를 PR #75로 반영한 뒤 별도 #76에서 동기화 운영을 활성화하고 3개 Stage로 v0.8.6을 수용했다.
- core·Studio·WASM은 stable `v0.8.6` / `f1f9c6ae58344ee9368996d3543f76b9345cf227`로 일치한다.
- Windows x64·Linux x64/arm64 설치본과 Linux 실제 GUI를 검증했다. 최종 Windows 사용자 점검은 인계 후 진행하며 공개 release는 하지 않는다.
- 글꼴 목록 UI 개선과 Abel `iii`의 upstream 폭 보정은 범위에서 제외했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| sync workflow·update-upstream·pin 검증 | writer 활성화, 네 Cargo.lock 갱신·검증·staging, skip 이유 표시 | 자동 Draft PR 운영; 선행 PR #77 |
| third_party/rhwp·vendor·rhwp-core.lock·네 native lock | v0.8.6 source·WASM·의존성 | Windows/Linux 공통 엔진 |
| Studio Vite·command·toolbar adapter | standalone 플래그, options 전달, hidden 복원, native idle 시작 보존 | 기존 제품 저장 소유권과 upstream UI 호환 |
| Rust preview fixture·썸네일 명세 | HWPX 필수 항목·10 MiB 거부·current pin | 검증 자료; production parser·자원 제한 유지 |
| GUI startup·새 문서·native print | 알려진 모달·고유 버튼 처리와 저장/PDF 재확인 | 설치본 수용 |
| Windows 안내·stage/final 보고 | exact 설치본과 점검 절차 | 최종 사용자 인계 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| UPSTREAM·WINDOWS_THUMBNAILS | docs/architecture/ | 동일 | OK | 기존 소유권·실효 상한 설명 보정 |
| WINDOWS_FONT_ACCEPTANCE | docs/operations/ | 동일 | OK | 승인된 사용자 최종 점검 안내 |
| README·DEVELOPMENT | 기존 위치 | 동일 | OK | managed pin·운영 설명 |
| 계획·단계·최종 보고 | mydocs/plans·working·report | 동일 | OK | 내부 수행 이력 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| rhwp pin | v0.8.4 / 496333b2 | v0.8.6 / f1f9c6ae |
| sync writer | false, create_candidate 뒤 skip | true, Draft PR #78 생성 |
| 자동 갱신 native lock | desktop 1개 | native consumer 4개 |
| 반복 target dispatch | 운영 수용 전 | existing_pr, head 불변 |
| Studio 검사 | 233개 | 235개 통과 |
| 자동화 계약 | 966개 | 최종 977개 통과 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| stable provenance | OK — v0.8.6/f1f9c6ae source·Studio·WASM·네 lock 일치 |
| 동기화 운영 | OK — writer=true, 자동 후보 #78, 반복 existing_pr·head 불변 |
| 플랫폼 중립 | OK — full 당시 automation 970·upstream 39·Studio 235, 최종 automation 977·pin·제품 경계·GUI typecheck |
| native·설치본 | OK — [full 36229142460](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460), 3개 target build·native·core·package 계약 |
| Linux 전체 GUI | OK — [36277021792](https://github.com/postmelee/alhangeul-tauri/actions/runs/36277021792), WebDriver 7/7·native print·썸네일 모두 success |
| 로컬 글꼴 | OK — [36273643047](https://github.com/postmelee/alhangeul-tauri/actions/runs/36273643047), 두 renderer Abel 실제 적용·설정 유지·저장 보존 |
| exact artifact 인계 | OK — Windows ZIP/NSIS 및 Linux 설치 DEB hash·source/inventory 대조 |
| Windows 사용자 최종 점검 | 대기 — 새 설치본과 독립 실행 가능한 안내 인계 완료, #69 후속 결과 필요 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_76_stage1.md): 최초 sync 실패 보완, PR #77 선반영. [36224131632](https://github.com/postmelee/alhangeul-tauri/actions/runs/36224131632) 후보 생성 성공, [36225031135](https://github.com/postmelee/alhangeul-tauri/actions/runs/36225031135) existing_pr·추가 커밋 없음.
- [Stage 2](../working/task_m010_76_stage2.md): 후보 #78 head `54ee0745576875b427efe29908d414874db0b4c8` 통합. pin·product boundary·version·release metadata, upstream 39·Studio 235·build 통과.
- [Stage 3](../working/task_m010_76_stage3.md): 전체/full·글꼴 GUI 성공, artifact 출처·해시 대조 및 대표 화면 판독 완료. 제품 SHA는 `02388f59e88efbf37514894a28a69466bcde9a8b`, 전체 GUI harness는 `0bd29211c819205925b5b596c53edb81fc1e8a18`이다. 최종 PR의 후속 변경은 진단 경로 POSIX 명시·보고 문서이며 제품 bytes와 Linux 동작을 유지한다.

### 실패와 보완 이력

- 첫 full [36225178661](https://github.com/postmelee/alhangeul-tauri/actions/runs/36225178661), source `d033911dce903c801e1d210d40023abb5437f3c9`: native preview fixture가 HWPX 필수 package 항목 없이 일반 ZIP만 만들었고 새 parser가 이를 거부했다. 손상된 HWPX의 preview fallback이라는 원래 조건을 복구하고 일반 ZIP 거부 회귀를 추가했다.
- Linux core는 각 architecture 88개 관측의 출력·자원 조건을 모두 충족했지만 명세의 old pin으로 실패했다. x64 최대 150 ms / 71,041,024 bytes, arm64 최대 145 ms / 70,254,592 bytes. 실제 fixture bytes/hash 불변을 확인해 수용 pin을 갱신했다. 원시 실패를 성공으로 바꾸지 않았다.
- 첫 실행은 필수 실패 확보 후 남은 Windows core compile을 취소했다. 전체 conclusion은 cancelled이며 최종 수용 근거로 사용하지 않는다. 수정본에서 전체 검증을 다시 수행한다.
- v0.8.6의 preview 추출 상한은 10 MiB로 제품 16 MiB보다 엄격하다. 이를 우회하지 않고 해제 전 거부를 수용했다.
- 두 번째 full [36225908122](https://github.com/postmelee/alhangeul-tauri/actions/runs/36225908122), source `4700933857f6347edb1142411b62d9e6c6852307`: 세 플랫폼 core 진단은 성공했다. preview 계약은 11/12로, 단순 text가 빈 문서로 허용돼 의도한 실패 조건이 아니었다. pinned WASM에서 실제로 XML 오류를 내는 `<broken></mismatch>`로 시험 파일을 보정했다. 이 실행의 전체 결론은 failure이며 설치본 수용으로 쓰지 않는다.
- 집중 native [36226889223](https://github.com/postmelee/alhangeul-tauri/actions/runs/36226889223), source `289d96593871e27c905b631b0a353e263a3c2f02`: 최종 success. Preview 12+4, desktop 187+21+3, automation 970, upstream 39, Studio 및 Clippy 모두 통과했다. Native test가 통과한 뒤 같은 SHA의 final full을 시작했고 남은 Clippy도 성공했다.

- 세 번째 full [36227541535](https://github.com/postmelee/alhangeul-tauri/actions/runs/36227541535), source `289d96593871e27c905b631b0a353e263a3c2f02`: core 세 플랫폼, Windows preview·desktop·worker, Linux 빌드는 통과했지만 COM handler의 별도 BMP fixture에 같은 package 항목 누락이 남았다. 첫 fallback E_FAIL 뒤 두 검사는 공유 mutex poison으로 실패했다. 네 번째 fixture helper를 같은 형식으로 보완한 `02388f59e88efbf37514894a28a69466bcde9a8b`에서 full을 재실행했다. 제품 DLL·deadline·HRESULT 기준은 변경하지 않았다.

- Linux GUI 실패 36273638799/36275362102/36276264694는 초기화·radio·preview fixture·drag URI 관측·chooser 이중 제출을 차례로 좁히는 증거로 보존했다. 최종 36277021792의 전체 성공과 이전 글꼴 성공을 수용 근거로 사용한다. 실제 함수 회귀와 run별 한계는 Stage 3·구현계획서에서 확인한다.

## 설치본 인계

- [Windows x64 ZIP](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902469644): `420c5b51ca4e38f7eb6010824c4b277aeb3d2396af2184dbcf87aa46e43bd84d`.
- NSIS `Alhangeul_0.1.0_x64-setup.exe`: `ee70185e47ab59a00904e5b9b9bbd97ebb16b85e2dcdf75b7f835b229ea6afb9`.
- [Linux x64 ZIP](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902705329), [Linux arm64 ZIP](https://github.com/postmelee/alhangeul-tauri/actions/runs/36229142460/artifacts/10902595215).
- Linux full GUI artifact `10916948891`: ZIP `cc5ea9cf017787920a0845dbb55562e4d0038fb5965c9239cab9827ac5440cc9`; 글꼴 artifact `10916865310`: ZIP `546d72178d374d11dc2b22bae9937bce4a5a2a6643a159ede7563348d8790931`.
- 전체 GUI의 8개 scenario manifest와 참조 61개 파일을 대조했다. native 저장·새 문서·직접 PDF 6/10쪽·GTK/CUPS 각 6쪽·cancel/복원·drag·Nautilus/Thunar 통과. 대표 PDF 4개와 글꼴 전/후 4개 페이지를 판독했다. 해시·실행 범위·한계는 Stage 3에 기록했다.

Windows 사용자는 [최종 점검 안내](../../docs/operations/WINDOWS_FONT_ACCEPTANCE.md)에 따라 기존 나눔스퀘어·Abel의 재감지, 실제 표시, 새 창·재실행, HWP/HWPX 저장·재열기, 새 문서 저장, PDF·인쇄를 확인한다. 동일 `0.1.0` 파일명이라도 SHA-256으로 후보를 구분한다.

## 잔여 위험과 후속 작업

### 잔여 위험

- MSI lifecycle 원시는 passed. NSIS는 raw failure 12건(0x80040154), lifecycle passed·thumbnail not-accepted로 hosted 계약만 통과했다. MSI forced reinstall은 3010/reboot-required·post-reboot-unverified다. CI 집계 성공을 모든 Windows Shell 환경의 실제 수용으로 해석하지 않는다.
- Windows 최종 사용자 GUI 결과는 대기다. 이전 #74의 나눔스퀘어·Abel 확인을 이 v0.8.6 후보의 사용자 수용으로 대신하지 않는다.
- Linux arm64 GUI, 모든 글꼴·문서·프린터 환경을 검증한 것은 아니다.
- 공개 release·서명·updater·Pages 게시를 수행하지 않았다.

### 후속 작업 후보

- Windows 최종 결과를 받은 뒤 #69의 릴리즈 준비 gate를 갱신한다.
- 동기화 writer는 계속 true로 유지하지만 후보 자동 merge·release는 수행하지 않는다.

## 작업지시자 승인 기록

2026-09-26 사용자의 '#74 남은 검증 정리·반영 → 별도 이슈에서 동기화 운영 설정과 v0.8.6 수용 → 새 Windows/Linux 설치본 검증' 지시를 적용했다. 완료 코드·보고의 devel 반영과 사용자 Windows 인계를 포함하며 공개 release 승인은 별도다.
