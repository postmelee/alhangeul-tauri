# Task #147 Stage 4 — GitHub와 Pages 공개 및 원격 검산

GitHub Issue [#147](https://github.com/postmelee/alhangeul-tauri/issues/147)

구현계획서 [task_m010_147_impl.md](../plans/task_m010_147_impl.md)

Stage 4

## 단계 목적

검증한 v0.1.4 설치 파일과 사용자 안내를 공개하고, 실제 다운로드와 업데이트 피드의 바이트를 검산한다.

## 산출물

| 파일 또는 공개 경로 | 변경 요약 |
|---|---|
| GitHub stable Release | ID 454047556, v0.1.4, 설치 파일 등 11개 |
| `docs/releases/v0.1.4.notes.json` 및 `site/updates/v0.1.4.html` | 검증한 파일과 실제 공개 시각을 담은 원문·생성 안내 |
| `site/release.json`과 생성 웹 데이터 | 다운로드 6개, 운영 manifest 3개 |
| `tests/gui/production-upgrade-v0.1.4-inputs.json` | 공개 v0.1.3 재배포본과 v0.1.4의 실제 ID·tag·파일·피드 고정 |

## 본문 변경 정도 / 본문 무손실 여부

한국어 원문을 기준으로 GitHub와 웹 안내를 생성했다. GitHub 본문의 초안 상태와 실제 공개 상태를 구분해 생성했다. 공개 파일에는 3단계에서 검증한 동일 바이트를 사용했다.

## 검증 결과

- GitHub에서 2026-11-22 08:07:51 KST에 stable·latest로 공개했다. 새 annotated tag `3c6e613ebed3c402e2ab73cd9484b686e37e75b5`는 `dad348a78f059dad282c8803737306d31b163c9d`를 가리킨다. [v0.1.4 GitHub Release](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.4)
- 인증된 draft와 인증 없는 공개 주소에서 각각 11개 파일의 크기, SHA-256 및 Minisign 서명 3개를 확인했다. 체크섬 파일 SHA-256은 `0b36e95a92ba59c1081966508f904f0a7891e16c88241681bea795dead39e44c`다. GitHub 최종 본문 SHA-256은 `69cd14ec296ae2404b6ae74d131c84d07037c85c8aa3cc43af25078157a34daf`다. 실제 공개 시각을 넣은 뒤에도 Release ID, tag, 공개 시각 및 11개 asset ID·크기·digest를 대조했다.
- Pages 검사 source 23개·output 27개와 관련 계약 384개를 통과했다. [필수 검사 44960565504](https://github.com/postmelee/alhangeul-tauri/actions/runs/44960565504), [Pages 데이터 PR #152](https://github.com/postmelee/alhangeul-tauri/pull/152)
- `df278ceac5c4aef460418803ca8150304257f014`의 [Pages 실행 44960976347](https://github.com/postmelee/alhangeul-tauri/actions/runs/44960976347)이 통과했다. artifact ID 14729197382, SHA-256 `ce679832ba8fffa8637bb09d32b1a2dea95378d1c4ef8b141d8a8dc5e4c44214`다. 원격 배포 ZIP 내부 27/27과 공개 HTTP 27/27을 같은 소스에서 독립 생성한 파일에 바이트 단위로 대조했다.
- 공개 홈·업데이트·문의/제보·v0.1.4 안내를 1280px·390px에서 검사했다. 가로 넘침이 없고 최신 버전, KST 날짜, 운영체제 선택, 고정 다운로드 6개가 맞았다. 공개 운영 피드 SHA-256은 `1bb8c4511a3aa25625a7f598f94555d75ef86868450da9faa21c57e48c1d10f1`다. [공개 안내](https://postmelee.github.io/alhangeul-tauri/updates/v0.1.4.html) · [운영 피드](https://postmelee.github.io/alhangeul-tauri/updater/stable.json)

## 잔여 위험

Windows 설치본의 Authenticode 상태는 `NotSigned`다. 표준 사용자 탐색기의 NSIS와 관리자 환경의 MSI 설치 범위를 유지한다. 운영 피드에서 앱 안 업데이트를 실제로 적용하는 검증은 5단계에서 마친다.

## 다음 단계 영향

공개 피드 바이트에 대조한 입력으로 NSIS·MSI·AppImage의 v0.1.3→v0.1.4 실제 업데이트, 재실행, 사용자 데이터와 HWP/HWPX를 확인한다. DEB·RPM·arm64는 웹의 수동 설치 안내를 사용한다.

## 승인 기록

전체 검사 통과 시 별도 승인 없이 배포·공개 검증·후속 정리를 이어가라는 작업지시를 적용했다.
