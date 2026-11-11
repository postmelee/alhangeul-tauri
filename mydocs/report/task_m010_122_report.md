# Task #122 최종 보고서 — rhwp v0.9.0과 Alhangeul v0.1.3 후보

GitHub Issue: [#122](https://github.com/postmelee/alhangeul-tauri/issues/122)  
마일스톤: M010 · 2026-11-11

## 작업 요약

- 대상 이슈: #122, Alhangeul v0.1.3 릴리즈 후보 준비.
- 마일스톤: M010. 단계 수: 4개와 승인된 선행 호환성 보정.
- rhwp v0.8.7에서 Stable v0.9.0으로 Rust core·Studio·WASM을 함께 갱신하고 실제 설치본에서 폼/PDF Worker를 확인했다.
- Windows x64 NSIS·MSI, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB의 후보 파일과 검증 결과를 인계한다. 이번 완료는 후보 준비이며 공개 배포 완료가 아니다.

선행 호환성 PR #123은 이미 devel에 병합되어 있다. 자동 후보 PR #124의 `b8a238b0c2a584d1a8ac65e0bcb940756a7c29bd`를 작업 브랜치에 통합했고, 제품 버전·글꼴 재감지 보정·설치본 검증을 추가했다. `publish/task122` → `devel` Open PR로 남은 통합 변경을 검토한다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `third_party/rhwp`, `rhwp-core.lock`, native Cargo.lock 4종 | Stable 태그와 resolved commit 고정, 의존성 정합화 | Rust core와 전체 Studio 출처 |
| `apps/studio-host/vendor/rhwp-core/` | 공식 태그에서 생성한 JS·타입·WASM 6개 산출물 | 같은 버전의 main·Worker WASM |
| `apps/studio-host/local-font-entry-hooks.ts` 및 회귀 검사 | 재감지 전에 선언 글꼴 프로그램·CSS face·별칭 해제 | 삭제/복구/비활성화 후 렌더링 |
| 루트·desktop package, Tauri/Cargo 메타데이터 및 검사 | 제품 버전 5곳을 0.1.3으로 정합화 | 설치 파일 버전 |
| `scripts/ci/release-{candidate-input,file-candidate}.mjs`, desktop/release-files workflow | 대용량 WASM blob 대조, 명시적인 일반 파일 수용 경로 | 서명 검증과 분리한 exact artifact 재사용 |
| `tests/gui/`, `scripts/windows-system-print.ps1`, 대응 계약 검사 | 실제 Worker, Windows 인쇄 UI, 글꼴 설정·렌더러 전환 검증 | 설치된 제품의 문서/출력 수용 |
| README·개발/아키텍처 문서, fixture pin 참조 | 태그·커밋 및 영향 경계 갱신 | 기여자 안내·검증 입력 |
| `docs/releases/`, `mydocs/` | 후보 파일 해시·실행 결과·단계별 승인·최종 인계 | 릴리즈 판단과 PR 검토 |

선행 PR #123에서 v0.9.0 글꼴 API 대응, PDF Worker의 제품 WASM 연결, 선택적 AI 도우미 비활성화를 완료했다. 이 PR의 기준 devel에는 이미 포함된 변경이므로 새 diff와 구분한다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| 현재 pin 안내 | 기존 공식 문서 | `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md` | OK | 수행계획서의 현재 pin·adapter 계약 위치 |
| 후보·사용자 안내 | `docs/releases/` | `v0.1.3.md`, `README.md` | OK | 기존 기록을 보존하고 검증 완료/공개 미게시 구분 |
| typed notes | `docs/releases/` | `v0.1.3.notes.json`은 후속 | 이연 | Stage 2에서 규격상 서명 inventory 필요를 확인하고 Markdown 초안으로 인계. 가상 서명/파일 정보를 만들지 않음 |
| 계획·단계·최종 보고·보드 | `mydocs/plans`, `working`, `report`, `orders` | 해당 폴더의 `task_m010_122*`, 작업일 보드 | OK | 승인한 문서 위치와 일치 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| rhwp pin | v0.8.7 · `1a76570e833917d15817415a53c09ad61ab3203f` | v0.9.0 · `c9095c5f67632e6721e800ccc7fb43ea49d26682` |
| 제품 버전 | 0.1.2 | 0.1.3, 메타데이터 5곳 일치 |
| WASM 크기 | 11,821,756바이트 | 26,836,346바이트 |
| 설치 파일 provenance | v0.1.3 후보 없음 | 동일 제품 SHA의 6종, archive 3종·파일별 크기/SHA-256 |
| 글꼴 삭제/재감지 | 첫 v0.9.0 후보에서 Abel face 1개 잔존 | 보정 후 0개, 초기 픽셀 복귀·복구 후 적용 확인 |
| 일반 파일 문서/글꼴 반복 | 미검증 | NSIS·MSI·AppImage 각각 16개 조합·80회 입력/저장 |
| 자동화 계약 | Stage 2 1,360개 | 최종 하네스 1,370개 통과 |

테스트 수의 증가는 성능 향상 지표가 아니다. 실제 입력/스크롤 관측은 남겼지만 이전 제품과 통제된 속도 비교를 수행하지 않았다.

## 검증 결과

검증한 제품 SHA는 `2de5aa319d29e125bec0efc58f9e5526fc4a65d6`, 전체 producer는 [42919676345](https://github.com/postmelee/alhangeul-tauri/actions/runs/42919676345)다. 최종 일반 파일 하네스는 `c5f59294abefb6ad3251bb5f6a5083283ff8c6e0`이며 이후 변경은 보고 문서다. 파일별 SHA-256과 archive digest는 [후보 기록](../../docs/releases/v0.1.3.md), 세부 원시 결과는 [Stage 3](../working/task_m010_122_stage3.md)에 고정했다.

| 수용 기준 | 결과 |
|---|---|
| Stable 태그·Rust/Studio/WASM 정합성 | OK — 공식 동기화 42622195018, committed/pin 및 생성물 해시 대조 |
| 제품 계약·Studio | OK — 버전 5곳, 제품 경계·메타데이터, upstream 39개, 보정 후 Studio 290개 및 빌드 |
| 전체 Windows/Linux 생성 | OK — all/full/run_tests=true producer, 3 target의 Rust/Clippy·core·패키지 필수 계약 성공 |
| 설치 파일 6종 | OK — 실제 archive/file hash 재계산과 형식별 설치/실행 확인. Windows 제한은 아래 분리 |
| Windows 직접 PDF | OK — [42930152006](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930152006), HWP/HWPX 새 출력·재시작 덮어쓰기 4건의 페이지/한글 검색 |
| Linux x64 문서·출력·썸네일 | OK — [42930156329](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930156329), 문서 roundtrip, 직접·GTK/CUPS·취소, Nautilus·Thunar |
| 글꼴 재감지 회귀 | OK — [42932035740](https://github.com/postmelee/alhangeul-tauri/actions/runs/42932035740), 삭제·복구·비활성화·새 창·재시작 |
| Fedora RPM·arm64 DEB GUI | OK — [42932221022](https://github.com/postmelee/alhangeul-tauri/actions/runs/42932221022), [42930258952](https://github.com/postmelee/alhangeul-tauri/actions/runs/42930258952), 실제 데스크톱에서 HWP/HWPX 편집·저장·재열기 |
| NSIS/MSI/AppImage·Worker·Windows 인쇄 | OK — [42936058653](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936058653), 3 job 성공, 각 80회 반복, 실제 폼/PDF Worker, Windows 출력·취소 복귀·제거 |
| 빠른 계약 | OK — [42936062390](https://github.com/postmelee/alhangeul-tauri/actions/runs/42936062390), Node/Studio·Windows PowerShell. 타입·자동화 1,370개 통과 |
| 출력 시각 확인 | OK(관측 범위) — Windows 직접 32쪽, Linux 직접/GTK/CUPS 28쪽, 최종 Windows 시스템 인쇄 6쪽씩 개괄·대표 확대. 눈에 띄는 잘림/누락 없음 |
| 최종 문서 계약 | OK — `check:release-notes` 기존 2건, 로컬 링크·단계 보고서 4건·`git diff --check` 통과. v0.1.3 서명 inventory 수용이 아님 |

### 단계별 검증 결과

- [Stage 1](../working/task_m010_122_stage1.md): 선행 [Stage 1.1](../working/task_m010_122_stage1.1.md)·PR #123 후 공식 동기화 후보 #124와 출처/Worker 경로 확인.
- [Stage 2](../working/task_m010_122_stage2.md): v0.1.3 제품 버전과 후보 사용자 안내 작성.
- [Stage 3](../working/task_m010_122_stage3.md): 글꼴 재감지 회귀 보정, 새 6종 생성 및 실제 설치본 수용. 이전 실패 시도를 소급 성공 처리하지 않음.
- [Stage 4](../working/task_m010_122_stage4.md): 파일·검증·한계를 최종 보고와 검토용 PR로 인계. PR 게시 후 exact merge candidate의 `Alhangeul PR required` 결과는 PR 본문에서 확인.

## 잔여 위험과 후속 작업

### 잔여 위험

- NSIS 사용자별 Shell 썸네일은 raw 실패 12건, `thumbnailStatus=not-accepted`. 설치/제거 및 진단 계약의 성공과 분리한다.
- 일반 MSI 설치/제거·Explorer 썸네일은 raw 성공이다. 강제 재설치는 raw 실패 1건과 재부팅 요구이며 재부팅 후 상태는 미검증이다.
- 활성 Abel fixture는 실제 CanvasKit을 확인했다. 비활성 Abel·CSP 차단 HCRDotum·공급 부재 한양신명조는 Canvas2D 전환을 기록하며 CanvasKit 성공으로 간주하지 않는다.
- Microsoft Print to PDF 출력은 6쪽의 시각적 내용을 확인했으나 검색 가능한 텍스트가 없다. 앱의 직접 PDF 내보내기는 별도로 한글 검색을 통과했다.
- Fedora GUI 결과는 해당 VM의 문서 작업 범위다. Fedora 파일 관리자 썸네일 수용이나 모든 PDF 형식/옵션 수용으로 확대하지 않는다.

### 후속 작업 후보

- 검토용 PR의 필수 검사와 리뷰 후 일반 병합. #124의 통합 및 #122 완료 확인 후 이슈/브랜치 정리.
- 공개 작업 승인 시 최종 제품·서명 파일·inventory를 고정하고 `v0.1.3.notes.json`을 작성한다. 서명이나 재빌드로 bytes가 바뀌면 해당 파일의 검증을 다시 선정한다.
- production 서명·태그·Release·Pages·updater 및 v0.1.2 → v0.1.3 실제 업그레이드는 별도 공개 절차다. 현재 공개 채널은 v0.1.2를 유지한다.

## 작업지시자 승인 요청

2026-11-11의 “진행해줘”로 후보 인계·최종 보고·Open PR 게시를 승인받았다. 본 보고서와 PR의 실제 검사 결과에 대한 리뷰·일반 병합 승인을 요청한다. 공개 배포는 이번 승인에 포함하지 않는다.
