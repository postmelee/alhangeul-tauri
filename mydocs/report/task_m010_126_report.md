# Task #126 최종 보고서 — Alhangeul v0.1.3 공개 완료

GitHub Issue: [#126](https://github.com/postmelee/alhangeul-tauri/issues/126)  
마일스톤: M010

## 작업 요약

- 6개 Stage로 rhwp v0.9.0 기반 Alhangeul v0.1.3을 stable/latest로 공개했다.
- [GitHub Release](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.3)의 Windows/Linux 설치 파일 6종, 업데이트 서명 3종, inventory·SHA256SUMS 등 총 11개 파일을 검증했다.
- [공개 웹 안내](https://postmelee.github.io/alhangeul-tauri/updates/v0.1.3.html)와 production 피드를 게시하고 NSIS·MSI·AppImage의 실제 v0.1.2→v0.1.3 업데이트, 설정 유지·HWP/HWPX 재열기를 수용했다.
- 공개 제품 source는 `bcb892d49a9003615f3acd980babd71e59e147dd`, rhwp는 v0.9.0 / `c9095c5f67632e6721e800ccc7fb43ea49d26682`이다. 검사기 보정 때문에 제품을 재빌드하지 않았다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `docs/releases/v0.1.3*`, `docs/releases/README.md`, `README.md` | 실제 공개·수용·사용자 안내 | 사용자 및 릴리즈 기록 |
| `site/release.json`, `site/updates/*` | 6종 다운로드·최신 버전·최종 안내·서명 피드 | 공개 웹·업데이트 안내 |
| `tests/gui/production-upgrade-v0.1.3-inputs.json`, fixture | Release·태그·11개 파일·최초 manifest 고정 | 실제 업데이트 재현 |
| `scripts/updater/production-contract.mjs`, GUI input selector | 신규 승인 tuple 추가 | 검증 harness |
| production workflow·fast workflow·회귀 검사·package script | 시작/완료 버전·Windows 실행·신규 계약 | CI 검증 |
| `mydocs/plans`, `working`, `report`, `orders` | 승인·단계·실패 복구·최종 보고 | 작업 추적 |

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 사용자 원문·기술 기록 | docs/releases | docs/releases | OK | 수행계획서 기존 루트 판단과 일치 |
| 생성 웹·배포 데이터 | site | site | OK | 기존 notes 생성 경로 유지 |
| 계획·단계·보고·보드 | mydocs 해당 하위 폴더 | 동일 | OK | 중앙 템플릿·M010 파일명 준수 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 최신 공개 앱 | v0.1.2 | v0.1.3 |
| 공개 rhwp 기준 | v0.8.7 | v0.9.0 |
| v0.1.3 공개 파일 | 0 | 11개, 설치 파일 6종 |
| 실제012→013 지원3종 수용 | 미실행 | NSIS·MSI·AppImage 3/3 |
| 최종 공개 HTTP 대조 | v0.1.2 데이터 | 24/24 exact bytes |
| 공개 화면 점검 | 이전 안내 | 4개 페이지 × 2개 폭 = 8개 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 최종 main source·release pin | OK — PR #127 정상 병합, tag와 resolved commit 고정 |
| 일반·서명 최종 파일 | OK — 일반42996821567 및 서명42996892999 성공, 11개 파일 hash·서명3종 |
| 실제 게시 설치 파일6종 | OK — Windows2/AppImage/DEBx64/FedoraRPM/arm64DEB 설치·문서 수용 |
| GitHub stable 공개 | OK — Release441647361, 2026-11-11T12:19:34Z, draft/public 독립11개 read-back |
| Pages·웹·피드 | OK — 최종505cb1b7 / Pages43026646059, artifact·HTTP24/24·화면8개 |
| 실제 업데이트 | OK — Windows43023572190, Linux job43022196810, 버전·설정·원본 보존 |
| 실패 복구 | OK — 최초 Windows 기대값 오류를 수정, 회귀 검사 추가, Windows-only 재검증 |
| 계약·회귀 | OK — 보정fast automation1384/upstream39/Studio290, Windows notes124/production101·PS84source/16격리 검사 |
| 최종 안내 일치 | OK — 본문48b641ee… / 최종manifest8b94dd15…, URL·서명·버전 불변 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_126_stage1.md): 공개 입력·main source 확정.
- [Stage 2](../working/task_m010_126_stage2.md): 최종 일반·서명 파일과 해시·inventory.
- [Stage 3](../working/task_m010_126_stage3.md): 실제 게시 6종 설치 및 문서·PDF 수용 범위.
- [Stage 4](../working/task_m010_126_stage4.md): stable 공개, tag·11개 파일·서명·본문 독립 확인.
- [Stage 5](../working/task_m010_126_stage5.md): Pages·실제3종 업데이트, 최초 실패와 보정 성공 구분.
- [Stage 6](../working/task_m010_126_stage6.md): 최종 안내 공개·HTTP·화면·식별자 검증.

## 잔여 위험과 후속 작업

### 잔여 위험

- Windows Authenticode 미서명, 일부 hosted NSIS 탐색기 썸네일 제한, 강제 MSI 3010 이후 재부팅 검증 미완료는 유지한다. 정상 실제 MSI 업데이트 성공과 별도 범위다.
- Canvas2D 폴백을 CanvasKit 전체 수용이나 성능 향상으로 취급하지 않는다. 물리 프린터·모든 문서/글꼴/Wayland/GPU/배포판·PDF 가져오기 옵션 전부를 검증하지 않았다.
- Microsoft Print to PDF는 시각적 내용 확인 범위이며 검색 텍스트가 없다. 직접 PDF 내보내기의 한글 검색 수용과 구분한다.
- 최초 run43022196810은 전체 failure이며 Linux job만 수용했다. Windows 최종 성공은 별도run43023572190이다. 최초 피드91874d92…와 최종 안내 피드8b94dd15…는 별도 증거다.
- CI artifact는 보존 기한이 있다. 공개 파일은 Release, 주요 식별자·해시·수용 결과는 단계 기록에 남겼다.

### 후속 작업 후보

새로운 필수 미완료 릴리즈 작업은 없다. 기존 알려진 제품 제한은 해당 범위의 후속 작업으로 유지한다. 최종 PR·main 기록 동기화·issue/branch 정리는 이 보고의 게시 절차에서 완료한다.

## 작업지시자 승인 기록

“등록하고 릴리즈 완료까지 계속 진행해줘.”에 따라 검증 완료 후 최종 보고·PR·일반 merge·정리를 계속한다. 키·보호 설정·지원 범위·tag는 변경하지 않는다.
