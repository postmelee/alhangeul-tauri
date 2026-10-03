# Task #97 최종 보고서 — 로컬 글꼴 조회 개선과 v0.1.1 후보

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
마일스톤: M010
작성일: 2026-10-03 (Asia/Seoul)
상태: v0.1.1 GitHub Release 공개·원격 재검증 완료, 사이트/manifest 갱신 PR·Pages 승인 대기

## 작업 요약

- 대상 이슈: #97, 마일스톤 M010, 구현 단계 4개.
- 목적: 로컬 글꼴을 켰을 때 반복 조회가 전체 catalog를 재변환·순회하던 병목을 제거한다.
- catalog 소유 인덱스를 한 번 구축하고 alias/sourceKey로 후보만 찾되 현재 provider 가용성은 매번 확인한다.
- 글꼴 의미·실패 복구·저장 문서·화면을 보존하고 Windows/Linux 실제 설치본으로 개선을 확인했다.
- 버전 0.1.1 새 파일 6종 수용 및 GitHub Release 11개 asset 공개·원격 재검증을 완료했다. 사이트/manifest는 갱신 PR·Pages 승인 대기다.
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

## Stage 4 당시 승인 요청 — 후속 merge 완료

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


### main native 및 설치 수용 진행 — 2026-10-04

full native 37130396817은 모든 필수 gate success다. 새 native ZIP의 archive digest·
원본 case-sensitive inventory 경로/size/hash·선택 installer bytes를 독립 대조했다.
main 후보 JSON에 같은 source의 RPM·arm64 DEB를 추가한다. x64 DEB는 아래 같은 native inventory에서 고정한다.

| 파일 | SHA-256 | archive ID/digest |
|---|---|---|
| `deb/Alhangeul_0.1.1_amd64.deb` | `6ad4492529dd228d38d37b697d0175323e71e2632212f472c1557f3868913862` | 11277562240 / `sha256:1ea3c739764eeb7368f115d5af09a922402b269672d99e561ed914928c23ae2a` |
| `rpm/Alhangeul-0.1.1-1.x86_64.rpm` | `185c399e737c2a686f5d5f599866fa3a63abac442e928f9442c29d9f178564b3` | 11277562240 / `sha256:1ea3c739764eeb7368f115d5af09a922402b269672d99e561ed914928c23ae2a` |
| `deb/Alhangeul_0.1.1_arm64.deb` | `3e29375bf7f824bdc84ae3f1dbff5b5cbeacae5ae694fa64d30c423a5be58859` | 11276793052 / `sha256:c2a3cfede5a8707b1f629fa4ad00cad93be2a05ed488112af90a02491dc7229c` |

main signed 3종 실제 설치 수용 37132406842는 success다. NSIS/MSI 설치·삭제 exit 0,
설치 version 0.1.1, WebView 정책 복원 true, HWP/HWPX 두 시나리오별 저장 파일 hash·
pinned WASM 재읽기 marker 및 6개 재열기 화면을 독립 확인했다. AppImage는 원본 FUSE 실행 경로다.
x64 DEB full GUI 37132752100도 success이며 원시 문서·PDF·인쇄 증거 확인을 진행한다.
RPM Fedora KVM·arm64 새 bytes 실제 설치 수용은 이어서 수행한다.

native raw ordinary MSI passed/exit 0, NSIS hosted raw failed/exit 1/12건·thumbnail not-accepted,
forced MSI raw failed/exit 1/1건·reboot-required/post-reboot-unverified를 확인했다.
계약 gate success가 이 제한을 해소한 것은 아니다. tag/공개 Release·Pages는 미실행이다.


### main DEB 원시 증거 확인

DEB full GUI 37132752100 / harness a4ca981acf667cf9082754956e41696995f8b3dc는 success다.
제품 source·native run·설치 0.1.1 identity를 대조하고 실제 8개 scenario evidence의 파일 참조와
4개 print restoration checkpoint 파일을 독립 검증했다(69 참조, 중복 제거 59 파일).
저장 HWP/HWPX와 새 HWP를 pinned WASM으로 재읽었다. 기존 문서 둘은 공백을 정규화한 전체 텍스트가 pinned 원본과 같고, 새 문서 marker를 확인했다.
PDF 5개/29페이지의 A4 크기·비어 있지 않은 내용·제목과 29개 렌더를 모두 시각 판독했다.
이는 한컴 레이아웃 동등성 또는 물리 프린터 검증을 의미하지 않는다.

### 공개 승인용 고정 입력 — 아직 미게시

- main source: `96e89e900415ee9e1e942b5c01c833dea3415e86`
- 채널/버전/tag: stable / 0.1.1 / v0.1.1
- CLI 인증·게시 주체: postmelee(게시 직전 재조회). 비게시 producer의 동일 bytes를 사용한다.
- signed producer: 37130399389 / native producer: 37130396817
- Minisign key fingerprint: `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`
- SHA256SUMS: 상대 basename 10행, 자기 hash는 아래 별도 행.
- tag/draft/public/Pages는 미실행이다. RPM·arm64 수용 완료 후 Gate 4 exact 입력·CLI 경로 공개 승인을 요청한다.

| basename | bytes | SHA-256 | producer run |
|---|---:|---|---|
| `Alhangeul_0.1.1_x64-setup.exe` | 56793106 | `9ff5e10e9b99f2605ab77b2d8525870819f3ed9d138b84fe2e6009b2222a1ca3` | 37130399389 |
| `Alhangeul_0.1.1_x64-setup.exe.sig` | 420 | `449beb188b00a3ec9ce3fb25c28a821fddbd97e1e797f57c210980f46132ce6a` | 37130399389 |
| `Alhangeul_0.1.1_x64_en-US.msi` | 64102400 | `6a34ae3a52c59bf4737cf1595d65a914fdd2ec588a3a1c54270c7d83c578fc98` | 37130399389 |
| `Alhangeul_0.1.1_x64_en-US.msi.sig` | 420 | `48e55d46a848e7fad77f8eb2cb41facfbf5e7f2edb632fe73eeb4fc00f1fd636` | 37130399389 |
| `Alhangeul_0.1.1_amd64.AppImage` | 135346680 | `c3a599fdea3b52353d875a4c50738babaf91102c26fcd7a6079e69e96b6bebf0` | 37130399389 |
| `Alhangeul_0.1.1_amd64.AppImage.sig` | 420 | `9306fecf0bdf7a367d4c848191f6b4e58b8255ca63e8d50401508b494f448a32` | 37130399389 |
| `Alhangeul_0.1.1_amd64.deb` | 66954862 | `6ad4492529dd228d38d37b697d0175323e71e2632212f472c1557f3868913862` | 37130396817 |
| `Alhangeul-0.1.1-1.x86_64.rpm` | 66948539 | `185c399e737c2a686f5d5f599866fa3a63abac442e928f9442c29d9f178564b3` | 37130396817 |
| `Alhangeul_0.1.1_arm64.deb` | 66823896 | `3e29375bf7f824bdc84ae3f1dbff5b5cbeacae5ae694fa64d30c423a5be58859` | 37130396817 |
| `alhangeul-updater-release-inventory.json` | 2606 | `8f594523bca49993ba3addc51346932ce0018b29533cf237987234f96eac9b82` | 37130399389 |
| `SHA256SUMS` | 976 | `9e3bac3b575f8d074cae21a68dfcaa88e5b6205873996c3d0c4a379640745a44` | 로컬 exact 10행 생성 |

승인용 사용자 notes (UTF-8 파일 SHA-256 `8465f0ddc61efe25799c4ccb192ce6fae49118bb194bf97ec516645a0d126e6a`):

Alhangeul 0.1.1은 로컬 글꼴을 사용할 때 문서 열기와 편집이 느려지는 조회 병목을 개선합니다. 글꼴 목록의 이름과 파일 식별자를 한 번 인덱싱하고 요청한 글꼴의 후보만 조회하도록 바꿨습니다. 재감지와 글꼴 파일 읽기 실패·복구 시의 기존 동작을 유지합니다.

같은 Windows 테스트 환경에서 로컬 글꼴을 켠 Canvas2D의 공개 HWPX 10쪽 문서 열기 중앙값은 약 18.3초에서 0.52초로 줄었습니다. Linux에서도 해당 문서의 열기 중앙값이 약 2.5초에서 0.64초로 줄었습니다. 공개 fixture와 고정 환경의 측정이며 사용자 PC 전체의 성능을 보장하는 수치는 아닙니다.

Windows x64 NSIS/MSI, Linux x64 AppImage/DEB/RPM, Linux arm64 DEB를 제공합니다. MSI·NSIS·AppImage의 .sig는 updater Minisign 서명이며 Windows Authenticode 서명과는 다릅니다. SHA256SUMS로 파일 무결성을 확인할 수 있습니다.

알려진 제한: 일부 Windows NSIS 사용자별 설치에서 Shell 썸네일 생성 문제가 남으며 MSI 설치본이 대안입니다. MSI 강제 재설치의 재부팅 후 검증은 완료하지 않았습니다. 사용자 Wayland·하이브리드 GPU 환경과 물리 프린터는 이번 성능 검증에 포함하지 않았습니다. 문서 레이아웃은 한컴과 완전한 동등성을 보장하지 않습니다.


### main RPM 수용 및 arm64 최초 실패

RPM Fedora KVM 수용 37133517774는 success다. product main 96e89e900415ee9e1e942b5c01c833dea3415e86 /
harness ccd592791077b5ad7af7db3f347b407a5c8c747c / native producer 37130396817을 구분한다.
원시 증거 archive 11278065323, digest `sha256:c69a6cc1b26f820d8ced9852e838c5f37a1ca69b739fa87d9a7f3a7c365ff9c6`를 대조했다.
actual KVM·Fedora 44 x86_64 0.1.1-1·LightDM non-root(uid 1000) Xfce X11·RPM 전송 hash OK·
package/VM phase complete exit 0·VM cleanup을 확인했다. 두 문서의 hash/pinned WASM 편집 marker·재열기 화면도 확인했다.

arm64 최초 수용 37133522684는 failure다. archive 11278060813, digest
`sha256:91a6598b9e09fd2477e4b20e82edde00d729de5064beed75d4bd77d72798b6ab`를 검증해 보존했다.
실제 aarch64 / 설치 arm64 0.1.1, HWP scenario success, 두 저장 파일 marker를 확인했으나
HWPX 저장 후 WebDriver 재시작 세션 POST /session timeout으로 해당 scenario failure, package gui/exit 1이다.
전체 수용 성공으로 기록하지 않는다. 제품 원인인지 일시적인 runner/driver 문제인지 이 run만으로 확정하지 않는다.
제품 파일·harness·조건을 바꾸지 않고 새 runner 수용 37134244591로 재검증 중이다.


arm64 동일 조건 재검증 37134244591도 failure다. archive 11278276402, digest
`sha256:72cf6a7a7223a1fba9c82f43611673679915d6a422713963c0d9d389804b5699`를 검증해 보존했다.
이번에는 HWP 저장 후 같은 재실행 세션 POST timeout이다. package gui/exit 1, 전체 미수용이다.
이전 성공/두 실패의 WebKitGTK/WebDriver 2.52.6과 tauri-driver 2.0.6 실행 파일 hash는 같다.
DRI3 경고만으로 그래픽 원인을 확정하지 않는다. v0.1.0 대조 검사 37134870041을 실행했다.
arm64 종료·재시작 process/driver 진단 보정안은 기존 구현계획서에 기록했고 아직 소스를 수정하지 않았다.


### 진단 보정 승인 요청 당시 수용 상태

v0.1.0 arm64 대조 37134870041은 success다. archive 11278097614 / digest
`sha256:e14446159e74771d9fcde312ba216d7bcf65e54019b06e66219ee331e578982f`, source
fc3cad15682f35723ab6558d1301e9096f7eec67 / producer 36320353815 / harness ccd59279를 대조했다.
실제 arm64 0.1.0·phase complete/exit 0, HWP/HWPX hash·pinned WASM 편집 marker·재열기 두 화면을 확인했다.
같은 harness/driver에서 이전 버전은 성공했다. 0.1.1 arm64 두 번 실패의 원인을 아직 확정하지 않는다.

확정 main 새 파일 수용: NSIS/MSI/AppImage/DEB x64/RPM x64 **5종 통과**, arm64 DEB **전체 미수용**.
11개 asset 준비와 해시·서명 대조는 완료했으나 Gate 3 전체는 미통과이므로 공개 승인 요청 단계가 아니다.
기존 구현계획서의 arm64 종료·재실행 process/driver 진단 보정 범위 승인을 요청한다.
source 변경은 미실행이며 v0.1.1 tag/Release·Pages는 미게시, #97 OPEN을 유지한다.


### arm64 재실행 보정과 main 6종 수용 완료

캡처를 기다리던 진단 run 37135625721·37135906830은 통과했지만 정상 경로의 캡처 대기를
제거한 37136290009는 HWPX 저장 뒤 세 번째 POST /session timeout으로 다시 실패했다.
archive 11278349549 / digest `sha256:910becf75a07e197c8f2ce70d65a70aeb2e720e6356bc3ea7e8f4acf0e3d6447`,
package gui/exit 1과 빈 실패 화면을 보존했다. 실패 120초 동안 앱은 없고 두 driver와 listener만 남았다.
관찰 타이밍에 따른 성공을 해결 근거로 쓰지 않았다.

WebdriverIO 9.29.1의 reloadSession은 DELETE 응답 뒤 POST를 보내며 DELETE 오류를 억제한다.
검증 경로에만 현재 UID·단일 tauri-driver→WebKitWebDriver→Alhangeul의 PID/시작 시각을 고정하고
DELETE 뒤 해당 프로세스 소멸을 기다리는 guard를 추가했다. PID 재사용을 구분하며 guard 실패도
reload 뒤 다시 확인한다. 120초 timeout·retry/skip 없음, 실제 파일·문서 gate를 유지했다.
제품 runtime과 공개 후보 bytes는 바꾸지 않았다.

| 보정 수용 run | evidence archive | archive digest SHA-256 | 실제 결과 |
|---|---:|---|---|
| [37137612562](https://github.com/postmelee/alhangeul-tauri/actions/runs/37137612562) | 11279326174 | `eb02c3db05577a8227dbbdc0599afbb388dcdcd026e9712eebdaca2f1852a704` | success / complete / exit 0 |
| [37137864838](https://github.com/postmelee/alhangeul-tauri/actions/runs/37137864838) | 11279761182 | `5808fd9a25a5d9517a7f67c103abd0512134328a0292efa6e6848d7767190a74` | success / complete / exit 0 |

두 run의 harness는 `737e650fce87d0895914a5868026715986287b71`, product main은
`96e89e900415ee9e1e942b5c01c833dea3415e86`, producer는 37130396817이다.
총 8회 모두 DELETE 응답 시 app PID가 남았고 소멸까지 21.17–96.33ms가 걸렸다.
종료 API 반환과 실제 앱 종료가 다르다는 harness 경계를 확인하고 동기화했다. 최초 실패의
짧은 신규 process 충돌까지 직접 포착한 것은 아니므로 제품 프로세스 원인까지 단정하지 않는다.

실제 non-root aarch64 / 설치 arm64 0.1.1 / HWP·HWPX 각 저장 marker·file hash/pinned WASM
및 재열기 화면 두 장을 run별 확인했다. 마지막 cleanup에는 app/driver/4444·4445 listener가 없다.
[fast CI 37137615232](https://github.com/postmelee/alhangeul-tauri/actions/runs/37137615232)는
자동화 1,050개·upstream 39개·Studio 251개, GUI typecheck·Studio build·Windows PowerShell 계약 success다.

현재 main 새 파일 **NSIS/MSI/AppImage/DEB x64/RPM x64/DEB arm64 6종 수용 완료**다.
서명 후보 3종과 production 설정·키·inventory 대조는 앞 절의 근거를 사용한다. 기존 NSIS raw
썸네일 미수용·forced MSI post-reboot 미검증, 사용자 Wayland/GPU·물리 프린터 제한은 유지한다.
일반 MSI의 raw passed/exit 0를 대안 근거로 안내하며 모든 PC의 썸네일 성공을 보장하지 않는다.

### Gate 4 공개 승인 요청 당시 입력

- stable **v0.1.1**, tag resolved main **96e89e900415ee9e1e942b5c01c833dea3415e86**.
- CLI 인증 주체 **postmelee**, Actions 환경 승인과 구분한 maintainer CLI 경로. 기존 tag/Release는 없음을 조회했다.
- 위 고정 표의 **11개 asset 전체** 및 위 사용자 notes. 기존 NSIS 제한·MSI 대안과 재부팅 후 미검증을 포함한 범위 판단을 함께 요청한다.
- annotated tag 새 생성 → 동일 bytes draft upload → 11개 파일·서명·notes 원격 read-back → stable non-draft/non-prerelease/latest 공개 → 다시 read-back. 다른 파일·미결정 상태에서는 게시하지 않는다.
- 아직 tag/draft/public/Pages 미실행이다. 보정 PR merge와 Gate 4 실행 승인을 요청하며, Pages·production manifest 갱신은 공개 read-back 후 Gate 5 승인으로 진행한다. #97 OPEN·오늘할일 진행중을 유지한다.


### Gate 4 실제 공개 결과 — 2026-10-04

- 작업지시자의 후속 “진행해줘”로 PR #100 merge와 위 exact main/11개 파일·notes·CLI 주체 postmelee·tag/draft/read-back/stable 공개/read-back 범위를 승인받았다. 승인 기록 UTC 시각: 2026-10-03T16:56:37.543378+00:00.
- [PR #100](https://github.com/postmelee/alhangeul-tauri/pull/100)은 exact head 623f7bd0339216359920783e6070f8b018681ea4·required success/CLEAN에서 normal merge했다. merge SHA 939cdb511c08e707120860aac1ba0d0c7fe48a92, mergedAt 2026-10-03T16:56:35Z.
- 새 annotated tag v0.1.1 객체 `b7b858e13c3f9153562e28e33cc398e75e896adf`, peeled main `96e89e900415ee9e1e942b5c01c833dea3415e86`를 push 전후 대조했다. 기존 tag 이동이나 재빌드는 없다.
- [공개 Release v0.1.1](https://github.com/postmelee/alhangeul-tauri/releases/tag/v0.1.1), ID **402604603**, publishedAt **2026-10-03T17:07:44Z** (2026-10-04 02:07:44 KST). non-draft/non-prerelease이며 latest API도 같은 ID다.
- draft와 public을 서로 다른 새 폴더에 다시 내려받았다. 11개 이름·크기·원본 SHA-256·서버 digest·uploaded 상태, 10행 SHA256SUMS 자체 및 내용, 세 Minisign·키 fingerprint·complete inventory·안내문 hash·tag peeled SHA 모두 통과했다. public 고정 URL은 승인한 v0.1.1 tag다.
- draft는 태그별 API에 나오지 않아 인증된 목록에서 정확한 ID를 확인한 뒤 ID로 읽었다. draft 전용 untagged URL과 공개 v0.1.1 URL을 구분했다. tag_name·bytes·서명·notes·source 조건은 완화하지 않았다.

| 공개 asset | asset ID |
|---|---:|
| `Alhangeul-0.1.1-1.x86_64.rpm` | 608174760 |
| `Alhangeul_0.1.1_amd64.AppImage` | 608174616 |
| `Alhangeul_0.1.1_amd64.AppImage.sig` | 608174705 |
| `Alhangeul_0.1.1_amd64.deb` | 608174714 |
| `Alhangeul_0.1.1_arm64.deb` | 608179311 |
| `Alhangeul_0.1.1_x64-setup.exe` | 608174618 |
| `Alhangeul_0.1.1_x64-setup.exe.sig` | 608174619 |
| `Alhangeul_0.1.1_x64_en-US.msi` | 608174620 |
| `Alhangeul_0.1.1_x64_en-US.msi.sig` | 608174617 |
| `SHA256SUMS` | 608179489 |
| `alhangeul-updater-release-inventory.json` | 608179415 |

위 고정 11개 표의 bytes/hash·producer와 이 ID의 원격 다운로드를 대조했다. notes SHA-256
`8465f0ddc61efe25799c4ccb192ce6fae49118bb194bf97ec516645a0d126e6a`, SHA256SUMS
`9e3bac3b575f8d074cae21a68dfcaa88e5b6205873996c3d0c4a379640745a44`다.

### Gate 5 갱신안 준비

원래 승인된 수행계획서의 site/release.json 범위에서 별도 게시 데이터 PR을 준비한다.
현재 공개 사이트 release.json과 stable manifest는 실제 HTTP 조회에서 아직 0.1.0이다.
사이트 version/tag/실제 공개 시각·안내문·고정 다운로드 3개와 complete inventory만 0.1.1로
갱신한다. 기존 endpoint와 manifestPublished=true 정책은 유지하며 신규 updater 활성화가 아니다.
공개 파일·서명 검증을 통과한 inventory만 사용한다. 수동 DEB/RPM/arm64는 Release 안내를 따른다.

Pages 배포와 0.1.1 production manifest 공개는 아직 실행하지 않았다. 데이터 PR 검토·merge,
그 merge의 exact devel SHA와 Pages/manifest 공개 승인을 거쳐 원격 release data·manifest·
화면과 링크를 다시 확인한다. manifest 공개와 실제 N→N+1 production upgrade 성공은 구분한다.
이번 계획에서 새 production upgrade harness 변경은 승인하지 않았으므로 성공으로 보고하지 않는다.
#97은 공개 사이트 전달 추적을 위해 OPEN, 오늘할일 진행중을 유지한다.

갱신안의 플랫폼 중립 Pages 생성·검사(source 16/output 19), 기존 Pages/updater/workflow
계약 **86개 / fail 0 / skip 0**, diff 검사를 통과했다. 생성한 stable manifest SHA-256은
`00a4773b643f2425f6ee8555e00e32c7c518df30b5dd838080cf9f2955caf5b8`이며 실제 공개 read-back의 version·publishedAt·세 URL/서명과 대조했다.
아직 원격 Pages 배포나 앱 내 production upgrade 수용 결과는 아니다.
