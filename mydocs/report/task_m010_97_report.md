# Task #97 최종 보고서 — 로컬 글꼴 조회 개선과 v0.1.1 후보

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
마일스톤: M010
작성일: 2026-10-03 (Asia/Seoul)
상태: Stage 1–4 완료·main 승격 완료, main 새 후보 검증 및 공개 전달 진행 중

## 작업 요약

- 대상 이슈: #97, 마일스톤 M010, 구현 단계 4개.
- 목적: 로컬 글꼴을 켰을 때 반복 조회가 전체 catalog를 재변환·순회하던 병목을 제거한다.
- catalog 소유 인덱스를 한 번 구축하고 alias/sourceKey로 후보만 찾되 현재 provider 가용성은 매번 확인한다.
- 글꼴 의미·실패 복구·저장 문서·화면을 보존하고 Windows/Linux 실제 설치본으로 개선을 확인했다.
- 버전 0.1.1 후보 6종은 새 bytes 설치 수용을 완료했다. 공개 배포는 아직 하지 않았다.
- 계획 승인·단계별 후속 “진행해줘” 및 Stage 4 exact-file 보정 승인은 구현계획서에 기록했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/studio-host/src/core/local-font-lookup.ts` | 75줄, catalog별 alias/sourceKey Map, 후보별 가용성·공개 반환 복사 | 로컬 글꼴 조회 |
| `apps/studio-host/src/core/{local-fonts,local-font-state}.ts` | catalog/index 동시 publish·clear, bytes 경로 인덱스 재사용 | 재감지·설정 변경·provider 실패 복구 |
| `apps/studio-host/src/core/local-font-lookup.{test,bench,fixture}.ts` | 의미·순회 계수·공개 값 변형·baseline 벤치 | 16개 조회 회귀·별도 benchmark |
| `tests/gui/local-fonts/{performance.ts,fixture.d.mts}`, `tests/gui/specs/local-font-performance.e2e.ts` | 공개 UI 열기·입력·스크롤 관찰, 실제 face·export marker 확인 | Windows/Linux 동일 조건 A/B |
| `scripts/ci/{font-performance-candidate,run-font-performance}.mjs`, `.github/workflows/alhangeul-font-performance.yml` | exact baseline/after bytes·설치·정리·환경 비교 | 검증 전용 |
| `apps/thumbnail-handler/src/lib.rs` | Atomic `fetch_update` → `try_update` 한 줄 | Rust 1.99 deprecation 빌드 호환, 동작 동일 |
| root·desktop version 5개 표면 | version 0.1.1 | 제품 metadata |
| `scripts/ci/release-candidate-input.mjs`, `release-{file,linux}-candidate.mjs` | 명시 후보 JSON과 정확한 metadata/bytes 검증 | 기존 v0.1.0 기본 후보 유지 |
| 기존 release shell 5개 및 workflow 4개 | 검증 identity 전달·6종 선택, 필수 gate 보존 | 최종 새 bytes 설치 수용 |
| `tests/{ci-font-performance,ci-release-candidate-input,actions-workflows,release-metadata}.test.mjs` | 검증 harness·version·입력 경계 회귀 | 자동화 |
| `docs/architecture/LOCAL_FONTS.md`, `docs/operations/DESKTOP_RELEASE.md` | 실제 계약만 6줄/9줄 추가 | 승인된 공식 문서 |
| `mydocs/plans/task_m010_97{,_impl}.md`, `mydocs/working/task_m010_97_stage{1,2,3,4}.md`, `task_m010_97.json`, `mydocs/report/task_m010_97_report.md`, `mydocs/orders/20261003.md` | 계획·승인·측정·exact 후보·결과·오늘할일 | 작업 추적 |

upstream submodule과 core/WASM/Studio pin을 수정하지 않았다. 기존 사용자 checkout 변경도 보존했다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| LOCAL_FONTS.md | docs/architecture | 동일 | OK | 승인된 기존 글꼴 계약 최소 추가 |
| DESKTOP_RELEASE.md | docs/operations | 동일 | OK | 명시 후보 입력 운영 계약 최소 추가 |
| task_m010_97 산출물 | mydocs/plans·working·report·orders | 동일 | OK | template 및 이슈별 명명 |
| site/release.json·v0.1.1 notes | site·GitHub Release | 후속 공개 단계 대기 | 해당 단계 미실행 | Release read-back 전 게시하지 않음 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 1,000글꼴 / PostScript 100회 lookup 중앙값, Node 함수 벤치 | 336.4ms | 0.138ms |
| 1,000글꼴 / 한글 alias 100회 lookup 중앙값 | 339.4ms | 0.271ms |
| 5,000글꼴 / 한글 alias 100회 lookup 중앙값 | 1,798.99ms | 0.248ms |
| 1,000글꼴 일회 구축 | 12.135ms | 17.257ms |
| 5,000글꼴 일회 구축 | 57.7ms | 84.7ms |
| Windows Canvas2D/on HWPX 10쪽 warm open 중앙값 | 18,255ms | 515.7ms |
| 같은 조건 HWPX 입력 batch 중앙값 | 6,951.6ms | 106.6ms |
| Linux Canvas2D/on HWPX warm open 중앙값 | 2,504ms | 636ms |
| Linux Canvas2D/on HWP 입력 batch 중앙값 | 1,814ms | 165ms |
| Canvas2D/on 스크롤 trial 최대 frame gap 중앙값, Windows / Linux | 5,890.7 / 2,070ms | 46.9 / 189ms |
| Stage 4 자동화 | 기존 baseline 외 검증 추가 | 1,044 tests / fail 0 / skipped 0 |

함수 벤치는 앱 전체 처리 시간이 아니다. 실제 측정은 같은 VM·1280×900/DPR1, 두 renderer,
글꼴 off/on, 공개 4문서, 조건별 5회다. Windows/Linux 합계 warm open 320회·입력 320회다.
입력 지표는 공개 textarea 입력 batch부터 canvas 변화 확인까지이며 PNG probe 비용을 포함한다.
물리 키 1개의 실제 디스플레이 지연과 동일하지 않다. 짧은 Linux CanvasKit Abel 사례는 개선을 주장하지 않는다.
P95는 nearest-rank 기준이며 환경·전체 분포·renderer별 상세는 Stage 3 보고서를 따른다.

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| baseline 소비 경로 및 성능 원인 | OK — 실제 adapter 반복 catalog 변환/alias 전체 순회 재현 |
| 조회 의미·정확 face·모호한 family·공개 반환 | OK — 16개 회귀와 실제 소비 경로 유지 |
| failedPaths·설정·재감지·late catalog | OK — generation만의 stale hit/miss 방지, 현재 후보별 가용성 |
| Windows/Linux 실제 성능 | OK — [37121708256](https://github.com/postmelee/alhangeul-tauri/actions/runs/37121708256), 동일 viewport A/B 완료 |
| 화면·local font face·문서 보존 | OK — OS별 16 baseline/after 첫 페이지 쌍 byte-identical, 실제 face·marker 확인 |
| Linux local-font lifecycle | OK — [37119716779](https://github.com/postmelee/alhangeul-tauri/actions/runs/37119716779), 34 관측 |
| 기능/PDF 회귀 | OK — Stage 3 Linux full·Windows PDF, Stage 4 DEB full GUI/PDF 29쪽 시각 확인 |
| version·upstream·Studio·제품 경계 | OK — 0.1.1 일치 / upstream 39 / Studio 251 / build / 경계 734파일 |
| 자동화·workflow | OK — 자동화 1,044개, actionlint·bash -n·diff |
| 최종 native full | OK — [37123984482](https://github.com/postmelee/alhangeul-tauri/actions/runs/37123984482), 세 플랫폼 및 core/package |
| 비게시 서명 후보 | OK — [37123986488](https://github.com/postmelee/alhangeul-tauri/actions/runs/37123986488), 3형식 Minisign·complete inventory |
| NSIS/MSI/AppImage 실제 파일 문서 수용 | OK — [37125756156](https://github.com/postmelee/alhangeul-tauri/actions/runs/37125756156), install/cleanup·version·marker·재열기 |
| DEB x64 실제 파일 full GUI | OK — [37127089292](https://github.com/postmelee/alhangeul-tauri/actions/runs/37127089292), 9 scenario·61 파일 참조·인쇄 복원 |
| RPM 실제 파일 Fedora VM | OK — [37128109422](https://github.com/postmelee/alhangeul-tauri/actions/runs/37128109422), KVM·실제 non-root Xfce·저장/reopen·cleanup |
| DEB arm64 실제 파일 GUI | OK — [37128112105](https://github.com/postmelee/alhangeul-tauri/actions/runs/37128112105), 실제 architecture·설치/저장/reopen |

최종 제품 source는 `8f48d83b30cbe1b7d1af9f7b857044145c5bcdcc`다.
Stage 3 제품 source와 runtime diff가 없고 버전·문서·harness만 변경했다.
새 파일 6종의 producer/run/ID/digest/path/hash·서명·증거 archive는 Stage 4 보고서에 고정했다.
PR 최종 head와 product source를 혼동하지 않는다. 원격 PR required check는 PR 게시 후 결과를 확인한다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_97_stage1.md): 배포본 소비 경로·기준선·회귀 고정.
- [Stage 2](../working/task_m010_97_stage2.md): lookup 인덱스·현재 가용성·무효화 구현과 단위/Studio 검증.
- [Stage 3](../working/task_m010_97_stage3.md): Windows/Linux 실제 설치 A/B·로컬 글꼴·PDF·기능 수용.
- [Stage 4](../working/task_m010_97_stage4.md): version·문서·최종 producer와 새 package 6종 설치 수용.

## 잔여 위험과 후속 작업

### 잔여 위험

- 사용자 Wayland/WebKitGTK 2.52·하이브리드 GPU·개인 문서 환경 미재현. CPU 80%만으로 GPU 원인을 확정하지 않는다.
- NSIS hosted raw 썸네일 실패 12건/exit 1·thumbnail not-accepted, forced MSI raw 실패 1건/exit 1·reboot-required/post-reboot-unverified는 남는다. ordinary MSI는 raw passed/exit 0다.
- 서명은 updater Minisign이며 Windows Authenticode 또는 모든 환경의 Shell 성공을 의미하지 않는다.
- PDF/가상 인쇄 결과는 실제 물리 프린터 및 한컴 레이아웃의 완전한 동등성 검증이 아니다.
- 공개 asset read-back·main exact source·사이트/manifest·production updater는 아직 수용하지 않았다.

### 후속 작업 후보

- 사용자 환경에서 로컬 글꼴 on/off와 Wayland/X11·GPU 경로를 구분한 재측정.
- 기존 NSIS 썸네일·MSI 재부팅/VDI 지원 검증의 별도 후속 과제 유지.
- 승인된 기존 범위: PR merge → release PR/main 확정 → exact source/새 파일 수용 판단 → v0.1.1
  tag/Release의 동일 bytes 게시·원격 재검증 → site/release.json PR·Pages → 공개 링크/manifest 재검증.

## 작업지시자 승인 요청

최종 보고·Stage 4 산출물과 devel 대상 PR 리뷰·merge 승인을 요청한다.
오늘할일의 완료는 Stage 1–4 구현·검증 범위다. #97은 공개 전달 추적을 위해 OPEN 유지한다.
Release·사이트 전달을 마친 뒤 본 보고서에 공개 URL·exact source·asset hash·Pages 근거를 추가한다.
PR merge만으로 사용자 요청 전체를 완료로 보고하지 않는다.


## 후속 릴리즈 승격 — 2026-10-03

작업지시자의 다음 “진행해줘”로 PR #98 merge 및 릴리즈 승격 단계 승인을 받았다.
[PR #98](https://github.com/postmelee/alhangeul-tauri/pull/98)은 required success/CLEAN에서 merge됐으며
devel SHA는 6979d2f67bcfcef6e565031a840d6523e9576e80다.
[Release PR #99](https://github.com/postmelee/alhangeul-tauri/pull/99)은 devel→main으로 생성하고
[승격 fast CI 37130039967](https://github.com/postmelee/alhangeul-tauri/actions/runs/37130039967) success 뒤 merge했다.
최종 main source는 **96e89e900415ee9e1e942b5c01c833dea3415e86**다.

Stage 4 후보 이후 runtime diff는 없으나 새 main source의 파일 provenance를 만들기 위해
[full native 37130396817](https://github.com/postmelee/alhangeul-tauri/actions/runs/37130396817)과
[비게시 signed 37130399389](https://github.com/postmelee/alhangeul-tauri/actions/runs/37130399389)를 실행 중이다.
이 새 files의 실제 설치 수용·tag/Release·public read-back·사이트/manifest 전달은 아직 완료하지 않았다.
#97은 OPEN이다. 앞의 Stage 4 파일 식별자는 당시 후보이며 새 main 후보로 소급 변경하지 않는다.


### main 서명 후보 파일 검증 — 2026-10-04

비게시 signed producer 37130399389는 success, publish skipped다. 정확한 archive digest와
Minisign·complete inventory/파일 metadata를 대조했다. source는 main 96e89e900415ee9e1e942b5c01c833dea3415e86다.
현재 task_m010_97.json은 아래 main 후보 3종으로 갱신한다. Stage 4 당시 JSON은
[PR #98 고정 head의 원본](https://github.com/postmelee/alhangeul-tauri/blob/28ae0a91f4bdc9f9b9552db48f8012aaaf4f58d7/mydocs/working/task_m010_97.json)에 보존돼 있다.

| 파일 | SHA-256 | archive ID/digest |
|---|---|---|
| `nsis/Alhangeul_0.1.1_x64-setup.exe` | `9ff5e10e9b99f2605ab77b2d8525870819f3ed9d138b84fe2e6009b2222a1ca3` | 11276414082 / `sha256:ed84bb3849c460b881446e3ce30598d9275e3342ac88936d6fb8d5e6f6b7e2a0` |
| `msi/Alhangeul_0.1.1_x64_en-US.msi` | `6a34ae3a52c59bf4737cf1595d65a914fdd2ec588a3a1c54270c7d83c578fc98` | 11276414082 / `sha256:ed84bb3849c460b881446e3ce30598d9275e3342ac88936d6fb8d5e6f6b7e2a0` |
| `Alhangeul_0.1.1_amd64.AppImage` | `c3a599fdea3b52353d875a4c50738babaf91102c26fcd7a6079e69e96b6bebf0` | 11276672561 / `sha256:2a221aaf7fd21af7b9f4c498a9f146678594f5e21961b2ccf46532a9fe55cdd0` |

이 세 새 bytes의 설치 수용을 실행하며 native full은 아직 진행 중이다. 공개·tag·Pages는 미실행이다.
