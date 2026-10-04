# Task #97 최종 보고서 — 로컬 글꼴 조회 개선과 v0.1.1 배포·업데이트 수용

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
마일스톤: M010
작성일: 2026-10-03 (Asia/Seoul)
상태: 제품·Release·규격 body/Pages/feed·세 형식 실제 upgrade·결과 안내 공개 수용 완료 / 기록 PR·승인된 close/cleanup 진행

## 작업 요약

- 대상 이슈: #97, 마일스톤 M010, 구현 단계 4개.
- 목적: 로컬 글꼴을 켰을 때 반복 조회가 전체 catalog를 재변환·순회하던 병목을 제거한다.
- catalog 소유 인덱스를 한 번 구축하고 alias/sourceKey로 후보만 찾되 현재 provider 가용성은 매번 확인한다.
- 글꼴 의미·실패 복구·저장 문서·화면을 보존하고 Windows/Linux 실제 설치본으로 개선을 확인했다.
- 버전 0.1.1 새 파일 6종 수용 및 GitHub Release 11개 asset 공개·원격 재검증을 완료했다. 사이트/manifest와 규격 body 공개까지 완료했고 Windows NSIS/MSI·Linux AppImage의 실제0.1.0→0.1.1 upgrade도 통과했다. 공개 결과 문구 갱신·최종 PR/병합·Pages 인계는 남아 있다.
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

### Gate 5 새 안내 규격 적용 — 2026-10-04

- 작업지시자의 “진행해줘”로 PR #103 merge와 PR #101 규격 반영을 승인받았다. #102의 Windows/Linux/required run [37152620380](https://github.com/postmelee/alhangeul-tauri/actions/runs/37152620380)은 모두 success다. head 23263b60과 merge candidate 167b2b42의 tree가 같고 App 15368 required check를 대조했다.
- PR #103 실제 일반 merge는 `73faf113e8a75cd847e10b4aa3e7fc7e3cb66f41`, mergedAt 2026-10-03T20:55:47Z다. #102는 2026-10-03T20:58:10Z close했고 원격 publish/task102를 삭제했다. #97 브랜치는 최신 devel을 merge하고 오늘할일의 두 작업 최신 상태를 보존했다.
- 원문 [v0.1.1.notes.json](../../docs/releases/v0.1.1.notes.json)·버전별 안내·공식 기록을 사용한다. site/release.json은 notes만 content.updaterSummary로 바꾸며 version·pub_date·URL3개·inventory·production 정책은 유지한다. 실제 공개 body·asset·tag·runtime·pin/key/endpoint는 바꾸지 않았다.
- 새 directory 생성, 원문 check, 규격 회귀 **124/124**, Pages build/check **source17/output20**, Pages/updater/workflow **94/94** 통과다. 실패·skip 0이다. 로컬 변경을 새 head로 게시해 Windows/Linux·required를 확인해야 한다.
- 새 site/release.json SHA-256 `87f4544545fd9946f9cf7fbfc4cecffab38cbb31e1e4c290a55e76d1810207cd`, 새 manifest `62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728`이다. 위 과거 manifest `00a477...`은 이번 승인 대상이 아니다.
- 생성 GitHub body SHA-256 `43b9a7b31f54ad5fb17cd4902801532d52ff3ecb49f8cc2e200f910ae387b8f7`, short notes 파일 `74457f7c870670f1da49fccd71989fcf7941d221bb22a334cb2ac81edfdaafa1`이다. #102 검토 결과와 같은 bytes다. 기존 body `8465f0...`는 아직 공개된 상태이며 수정 승인 전 보존한다.
- 웹 수용은 #102의 같은 source/template/script/notes와 같은 후보 data에 대한 1366/390/320px·최신 표시·download/browser 결과를 재사용한다. 실제 built tree 비교 결과를 함께 확인하며 Pages 공개 후에는 새 배포의 HTTP·화면을 다시 확인한다.
- 공개 body 수정·PR #101 merge·exact Pages SHA 배포는 아직 미실행이며 검토한 산출물의 별도 승인이 필요하다. 실제 production v0.1.0→v0.1.1 NSIS/MSI/AppImage는 아직 미수용이고 다음 harness 계획 승인이 필요하다.

## 2026-10-04 공개 안내·Pages 전달 결과

이 절이 앞선 준비 당시의 미게시 표기보다 최신 상태다. 같은 스레드에서 PR #101 merge·검토한 exact body 적용을 승인했고, 이어 merge된 exact Pages SHA의 공개 요청에 “진행해줘”로 승인했다.

- PR #101은 `fb777a4eeb550a2de572c65c335869973fc6fb7f`로 일반 병합됐다(2026-10-03T21:15:26Z). 갱신 head `f04c5ad873399d916c443c1b5bc52df314fc6336`의 [CI 37153867899](https://github.com/postmelee/alhangeul-tauri/actions/runs/37153867899)에서 Linux·Windows·required 3개 검사 모두 success다. workflow/checkout 후보 `f14267b89a57e5721ad9f807f09895dbdfba117e` 및 실제 merge의 tree `f1519bdc09e44e707f11527fb422f59f9e74eea6`가 같다. Linux automation 1184·upstream 39·Studio, Windows 릴리즈 회귀 124와 PS 검사가 통과했다.
- GitHub v0.1.1 body를 승인 파일로 수정한 뒤 UTF-8 bytes를 재조회했다. SHA-256 `43b9a7b31f54ad5fb17cd4902801532d52ff3ecb49f8cc2e200f910ae387b8f7`이 정확히 일치한다. Release ID402604603·tag/source·공개 시각·stable 상태·11개 asset 전체 metadata와 tag object는 전후 동일하다. 새 파일 생산·tag 이동·교체는 없다.
- [Pages run 37154837431](https://github.com/postmelee/alhangeul-tauri/actions/runs/37154837431)은 exact `fb777a4eeb550a2de572c65c335869973fc6fb7f`에서 검사·upload·deploy 모두 success다. 기존 github-pages 환경의 devel 허용 정책을 유지했다. source17/output20, Pages/updater/workflow 계약 94/94(fail0/skip0)가 통과했다.
- 실제 공개 HTTP 파일 **20/20**을 해당 SHA와 같은 tree의 수용 output과 bytes로 대조했다. 공개 release.json은 v0.1.1 / SHA-256 `87f4544545fd9946f9cf7fbfc4cecffab38cbb31e1e4c290a55e76d1810207cd`, stable.json은 v0.1.1 / SHA-256 `62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728`이다. version·pub_date·notes·세 URL·signature가 수용 output과 동일하다. 이전 0.1.0 피드는 이번 공개에 의해 전환됐다.
- 실제 공개 홈·업데이트 목록·v0.1.1 안내·feedback을 확인했다. 최신0.1.1·목록1행·최신 다운로드3개·고정 다운로드6개·Linux 플랫폼 선택을 수용했다. 1366px·390px 화면과 320px 홈/버전 안내에 가로 넘침이 없다. 로컬 화면 캡처는 검토 자료이며 장기 저장·앱 updater 수용을 대신하지 않는다.
- **실제 앱 v0.1.0→v0.1.1 production upgrade는 아직 미수용**이다. 기존 운영 검사는 같은 version의 idle만 확인하고 기존 native 검사는 99.1.x test-only endpoint다. Windows NSIS→NSIS·MSI→MSI, Linux x64 AppImage→AppImage 검증 도구의 계획 보정 승인이 필요하다. #97은 OPEN/진행중을 유지한다.

### Gate 6 production upgrade 검증 도구 구현·로컬 검증 — 2026-10-04

#### 단계 목적

같은 스레드의 “진행해줘”로 승인한 실제 v0.1.0→v0.1.1 계획 보정을 구현했다. 현재 단계는 도구 구현·플랫폼 중립 검증·원격 fast 확인이며 실제 설치/업데이트 run 승인과 수용은 다음 gate다. #97 기존 이슈·local/task97·계획서·진행중 행을 유지한다.

#### 산출물

| 역할 | 산출물 |
|---|---|
| 공개 입력 | tests/gui/production-upgrade-inputs.json: 실제 두 Release ID·tag object·source SHA·11개 asset identity/digest 각각 고정 |
| read-back·서명 | scripts/updater/production-{contract,download,upgrade}.mjs: API·태그·실제 source config·checksum·inventory·Minisign·exact manifest·같은 harness 증거 요구 |
| 결과 수용 | scripts/updater/production-evidence.mjs: startup/manual·dirty 보호·UI consent·실제 재시작·새 버전·설정·HWP/HWPX·두 Windows handler·3010 미수용 조건 |
| 원본 AppImage | production-process.mjs 및 GUI restart.ts: 실제 FUSE executable/PID 전환 관측 뒤 이 VM의 확인된 PID만 종료하고 새 verification driver session 사용 |
| 앱 UI | wdio.production-upgrade.conf.ts·production-upgrade.e2e.ts 및 inputs/native/apply/verify: 공개 앱의 설치·재시작 버튼과 새 앱 버전·대표 문서 재열기 검사 |
| CI | 기존 등록된 desktop dispatcher production-upgrade-check + 전용 Windows/Linux reusable 2개; NSIS/MSI 각각 clean Windows VM, x64 원본 writable AppImage Linux VM |
| 회귀 | production-upgrade Node 26개·workflow 4개, Windows embedded PS 10블록 구문 검사; 기존 fast Windows 경로에 순수 Node 계약 검사 추가 |

#### 본문 변경 정도 / 본문 무손실 여부

제품 runtime·updater config/key/endpoint·rhwp pin·기존 시험 endpoint·동일 버전 검사·GitHub body·site/release.json·생성 웹 안내는 바꾸지 않았다. 기존 dispatcher에 mode와 read-only reusable 호출만 추가했다. 기본 GitHub branch main에 새 workflow 등록을 요청할 필요 없이 기존 dispatcher를 작업 ref에서 실행할 수 있다. 검증에 새 제품 build/signing/publish는 없으며 이미 공개된 N/N+1 파일만 사용한다. 새 도구 파일은 모두 300 LOC 이하이고 기존 큰 dispatcher의 최소 추가는 승인된 계획 예외를 따른다. 실제 native artifactKind는 Rust lowercase 계약의 appimage로 확인했으며 TypeScript UI 선언 표기와 혼동하지 않는다.

#### 검증 결과

- 로컬 test:automation **1214/1214**, test:upstream **39/39**, test:studio **251/251(39 files)** 통과다. fail/skip0이며 GUI typecheck·build:studio도 통과했다. 빌드의 기존 chunk/dynamic import 경고는 오류가 아니다.
- 새 전용 계약 **30/30**은 version/source/endpoint/key/manifest·asset ID·checksum 변조/누락/중복·inventory traversal·cross-format·동의/dirty 증거 누락·재부팅/잘못된 exe version·미변경 문서/재시작 증거 누락을 거부한다.
- Action pins **29 files/165 references/11 pins** 및 product boundary·release notes·diff 검사를 통과했다. 로컬 product boundary는 최종 helper 추가 후 793 files scanned를 확인했다. 원격 checkout 수치는 별도로 기록한다. Windows PS syntax는 Mac에서 실행하지 않고 원격 fast에서 확인한다.
- 새 read-back 모듈로 실제 v0.1.0/v0.1.1 API metadata·11 asset identity 각각·annotated tag object와 resolved product SHA·공개 source의 운영 key/endpoint/passive mode를 읽기 전용으로 대조했다. 모두 일치한다. 이 확인을 다운로드·설치·실제 upgrade 수용으로 확대하지 않는다.
- Linux 재시작 관측은 [Tauri 2.10.3 process::restart](https://github.com/tauri-apps/tauri/blob/tauri-v2.10.3/crates/tauri/src/process.rs)의 AppImage 경로 재실행/새 process 생성 계약에 맞춘다. 요청한 버튼만 기록하지 않고 새 PID·새 FUSE mount를 요구한다. 실제 새 프로세스 기능 검증은 독립 driver 세션으로 같은 교체 AppImage를 다시 실행해 수행한다.

#### 잔여 위험

- 원격 fast CI는 게시할 exact head에서 아직 확인해야 한다. 통과하면 해당 run과 harness SHA를 작업지시자에게 제시한다. fast는 제품 설치/upgrade 성공이 아니다.
- 실제 Windows NSIS/MSI·Linux AppImage production N→N+1은 미실행·미수용이다. GUI 환경·driver transport·실제 installer 및 재시작 한계는 run 결과로 판정한다. Windows connection close는 설치된 버전과 재실행 증거가 모두 통과하기 전까지 잠정 상태다.
- 시작 조회는 startup, 수동 조회는 public native updater_check 응답으로 확인하며 제품 정보 화면과 실제 설치/재시작은 UI 버튼을 사용한다. 수동 조회 native 확인을 UI 메뉴가 새 요청을 보낸 증거로 혼동하지 않는다. 대표 문서 재열기는 공개 loadFile RPC와 실제 Canvas를 사용하며 native Open dialog 수용을 대신하지 않는다.
- Windows helper가 3010이나 timeout/문서 연결·기본값 손실을 확인하면 실패다. 전체 native job success와 필수 accepted evidence가 모두 있어야 수용하며 누락·skip·partial success를 전체 성공으로 쓰지 않는다.

#### 다음 단계 영향과 승인 요청

로컬 구현·검증 뒤 한 번의 profile=fast 실행으로 Windows/Linux 계약과 Windows 내장 PS 구문을 확인한다. 이후 검토한 exact harness SHA와 세 설치 형식의 native production-upgrade-check run 승인을 요청한다. tag/asset/feed를 추가 변경하지 않고 #97은 실제 결과 정리까지 OPEN이다.


## Gate 6 실제 production upgrade 첫 실행 결과 — 2026-10-04

### 승인과 목적

exact harness `a74d3638116e0bf579985f517e008b365399945f`의 Windows NSIS/MSI·Linux AppImage 실제 실행안 제시 후 같은 스레드의 “진행해줘”로 실행·증거 분석·기존 문서 위치의 결과 기록을 승인받았다. [빠른 CI 37157613138](https://github.com/postmelee/alhangeul-tauri/actions/runs/37157613138)은 같은 SHA에서 success이며 Linux automation 1214·upstream 39·Studio 251/빌드·GUI typecheck, Windows 순수 계약 26·PowerShell source83/격리회귀16·신규 workflow 10블록 parser가 통과했다. 원격 product boundary는 773 files scanned다. fast를 실제 설치 수용으로 기록하지 않는다.

### 실행·산출물과 판정

[실제 run 37158705809](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809)은 exact harness에서 mode=production-upgrade-check/publish_release=false로 실행했고 최종 **failure**다. 공개 제품 source N `fc3cad15682f35723ab6558d1301e9096f7eec67`, N+1 `96e89e900415ee9e1e942b5c01c833dea3415e86`와 harness를 구분한다. 이미 공개된 bytes만 사용했으며 제품 build/signing·tag/asset/feed 변경은 없다.

| 형식 | job 결과 | 실제 upgrade 수용 | 원시 증거 |
|---|---|---|---|
| Linux x64 AppImage | success | 통과 | [job](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/job/111307414907), [artifact11286572569](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/artifacts/11286572569) |
| Windows x64 NSIS | failure | 미수용 — 시작 준비 검사 실패, 설치 버튼 미도달 | [job](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/job/111307415036), [artifact11286658178](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/artifacts/11286658178) |
| Windows x64 MSI | failure | 미수용 — 같은 시작 준비 검사 실패 | [job](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/job/111307415056), [artifact11287246483](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/artifacts/11287246483) |

세 archive의 API ID/digest 및 실제 다운로드 zip SHA-256을 대조했다. AppImage는 `318195343cbd1bfeb7050c5cb8fdbe000da96a1a8df4c65c9b38731d57ccddab`, NSIS는 `bea79fc7cf2c043ff26f2b6b8003f2f1a6c12ffaa459831f902e3b0111325c07`, MSI는 `b6c85901e00f04e0e3786040305c7a0254e153cf2c289f642f7f072a6aae8760`이다. 각각 680601/183011/217582 bytes다. 공개 installer bytes는 CI에서 해시·checksum·Minisign을 검증했고 증거 archive에서는 제외했다. 로컬 재검토를 installer 서명 재계산으로 표현하지 않는다.

### Linux 실제 관측

public-input·apply/result·verify/result·accepted 모두 passed다. 시작/수동 조회의 0.1.0→0.1.1·정확한 appimage target·dirty 문서 차단·UI 동의, 다운로드 135346680 bytes, restartRequired, 제품 재시작 버튼 이후 PID5230→5399와 서로 다른 실제 FUSE mount를 확인했다. 교체된 원본 AppImage hash는 공개 N+1 `c3a599fdea3b52353d875a4c50738babaf91102c26fcd7a6079e69e96b6bebf0`과 같다. 관측한 새 PID만 종료한 뒤 fresh driver session에서 Alhangeul0.1.1/no-update, 설정 보존, HWP6쪽/HWPX10쪽·canvas·두 원본 hash 유지가 통과했다. 두 문서 화면도 직접 확인했다. 원시 계약을 로컬에서 재대조했다. 문서 열기는 loadFile RPC이며 native Open 대화상자 수용이 아니다. 이 Linux GUI/FUSE VM 결과를 모든 Wayland/GPU 환경으로 확대하지 않는다.

### Windows 실패 원인과 미수용 범위

두 형식 모두 공개 입력 검증·clean0.1.0 설치 exit0가 통과했다. 실제 Studio ready RPC=true, toolbarReady=true, canvasReady=false 및 알려진 첫 실행 모달 처리 뒤 상태 문구가 **“0.1.1 업데이트가 있습니다. 제품 정보에서 확인하세요.”**였다. 공통 startup helper는 **“HWP 파일을 선택해주세요.”**만 허용하므로 180초 대기 후 실패했다. 업데이트 알림과 엄격한 idle 문구 조건이 충돌한 검증 도구 결함이다.

apply/result는 failed이고 startup/manual/consent/install 증거가 없으며 설치 버튼에 도달하지 않았다. continue-on-error가 선행 실패를 다음 단계로 전달하여 설치 후 검사에서 추가10분을 기다렸고 실제 exe/uninstall version은0.1.0이었다. 따라서 이번 결과로 Windows updater의 다운로드·설치 실패를 확정하지 않는다. applyTransport=failure·installedVersion=failure·verify=skipped·cleanup=success·policyRestore=success 원시 상태를 보존한다. 두 VM의 제품 제거 exit0와 WebView2 정책 복원을 확인했다. 전체 run failure와 Windows 미수용은 Linux 부분 성공으로 상쇄하지 않는다.

### 잔여 위험·다음 단계

Windows 자동 업데이트는 미수용이다. production 전용 startup의 정확한 알림 허용·준비 상태 진단·실패 apply의 불필요한 설치 대기 차단 및 Windows만 선택한 후속 검증을 위한 도구 보정안이 필요하다. 현재 결과 분석·기록 이후 소스 변경은 아직 승인하지 않았다. 수정·fast 이후 새 exact harness의 실제 Windows 실행 gate를 진행한다. Linux 근거는 이 성공 job/기존 harness 그대로 재사용하며 다른 SHA에서 새로 통과했다고 기록하지 않는다. 공개 안내는 아직 검증 중 문구를 유지하고 #97은 OPEN/진행중이다.


## Gate 6 Windows 시작 검증 보정 구현·로컬 검증 — 2026-10-04

### 단계 목적과 승인

Windows NSIS/MSI의 첫 실제 run37158705809는 설치 버튼 전의 strict idle 상태 문구 검사에서 실패했다. 검토한 보정안에 같은 스레드의 “진행해줘”로 도구 수정·계획 기록·플랫폼 중립 로컬 검사·Windows/Linux fast CI를 승인받았다. 이번 구현은 실제 Windows upgrade 성공이 아니며 새 exact harness의 실제 Windows 실행은 다음 승인 gate다.

### 산출물과 기존 동작 보존

- 공통 studio-startup.ts에 optional expectedUpdateVersion을 추가했다. 입력 없는 기존 helper 호출은 정확한 idle만 허용한다. production apply 호출만 예상0.1.1의 정확한 알림을 허용하며 ready RPC·known modal·toolbar 준비·canvas 없음 조건과 이후 native0.1.0→0.1.1/target/trigger/failure 대조를 유지한다. 임의 알림이나 다른 version을 허용하지 않는다.
- production-upgrade/startup.ts(32 LOC)는 실패 시 상태 문구·toolbar/canvas·modal 제목과 화면을 남긴다. 실패 증거 수집 오류로 원래 오류를 덮지 않으며 환경 변수·자격 증명·개인 문서 정보를 수집하지 않는다.
- production-upgrade.mjs의 require-apply CLI가 공개 입력/동일 harness 및 적용 필수 증거를 확인하고 apply-gate.json을 기록한다. Windows 설치 후10분 대기 전에 이 필수 gate를 실행한다. continue-on-error의 transport close 가능성은 유지하되 시작 실패·동의/dirty/설치 증거 누락은 즉시 실패시킨다. installed version·문서/설정·최종 수용은 여전히 별도 필수다.
- desktop dispatcher에 production_upgrade_platform=all/windows-x64/linux-x64 choice를 추가했다. Windows 재검증에서는 production 두 Windows job만 실행할 수 있다. 기존 mode·공개 제품 source/bytes·key/endpoint·site/notes/feed·rhwp pin은 변경하지 않았다. 신규 파일/함수는 권장 상한 이내이며 기존 dispatcher에는 작은 입력/조건만 추가했다.

### 검증 결과

- 전용 production/workflow/GUI 계약 **67/67**, 전체 automation **1228/1228**, upstream **39/39**, Studio **251/251(39 files)** 통과했다. fail/skip0다. GUI typecheck와 Studio build도 통과했으며 기존 chunk/dynamic import 경고만 남는다.
- 일반 strict idle 보존·정확한 production 알림만 통과·다른 version/임의 문구/미준비 toolbar/열린 canvas 거부·ready RPC/알려진 modal 처리 순서·예상 밖 modal 거부를 확인했다.
- 두 Windows kind의 완전한 적용 증거는 gate를 통과하고 시작 실패·동의/dirty/설치 증거 누락·다른 harness/kind·공개 입력 실패는 거부한다. 실제 CLI도 시작 실패에서 exit1을 반환하고 failed receipt를 남긴다. YAML 순서 검사로 gate가 설치 대기 이전에 배치되고 강제 실패인지를 확인했다.
- all/windows-x64/linux-x64 선택과 publish_release/다른mode 차단을 actual job condition으로 평가했다. 신규 Windows workflow PS block은11개이며 원격 Windows fast parser에서 확인한다.
- check:action-pins **29 files/165 references/11 pins**, check:product-boundary **794 files scanned**, check:release-notes1doc와 git diff --check 통과다. rhwp submodule은 v0.8.6 resolved f1f9c6ae58344ee9368996d3543f76b9345cf227에서 clean이다.

### 잔여 위험·다음 단계·승인 경계

원격 fast는 새 exact commit에서 확인해야 한다. 통과 후 해당 SHA와 Windows NSIS/MSI만 선택한 실제 production 실행안을 제시한다. 실제 설치 및 문서·설정 수용은 미검증이며 old run 실패를 소급 성공으로 바꾸지 않는다. Linux 성공은 기존 a74d3638/run37158705809/artifact11286572569 근거를 유지하며 새 Windows harness에서 Linux도 새로 통과했다고 쓰지 않는다. 제품 재빌드/새 서명/게시/태그 이동·asset 또는 production feed 변경은 없고 공개 안내와 #97 OPEN 상태를 유지한다.


## Gate 6 Windows production 재실행 결과 — 2026-10-04

### 승인·실행과 판정

새 exact harness `1680a608bd507adec3736d4ba6aed5e534f71931`의 Windows NSIS/MSI 재실행안을 제시한 뒤 같은 스레드의 “진행해줘”로 실제 실행·증거 분석·기존 위치 기록을 승인받았다. [fast 37175896878](https://github.com/postmelee/alhangeul-tauri/actions/runs/37175896878)은 이 SHA에서 success다. Linux automation1228/upstream39/Studio251·build/GUI typecheck, Windows production36·릴리즈124·PS83sources/격리16·workflow11블록 parser가 통과했다. 이 fast 결과는 실제 설치 수용을 대신하지 않는다.

[실제 run37176405544](https://github.com/postmelee/alhangeul-tauri/actions/runs/37176405544)은 mode=production-upgrade-check/production_upgrade_platform=windows-x64/publish_release=false로 exact SHA에서 실행했고 전체 **failure**다. 두 Windows job은 설치 후 버전 검사에서 실패했다. Linux는 의도적으로 선택하지 않았으며 이전 run37158705809/harness a74d3638/artifact11286572569의 실제 성공 근거를 그대로 유지한다. 공개 제품 N/N+1, key/manifest/source/tag/asset를 변경하지 않고 기존 installer bytes를 사용했다.

| 형식 | 실제 결과 | 증거 |
|---|---|---|
| Windows NSIS | 미수용 — 설치된 버전0.1.0, 10분 대기 실패 | [job111359814746](https://github.com/postmelee/alhangeul-tauri/actions/runs/37176405544/job/111359814746), [artifact11293513567](https://github.com/postmelee/alhangeul-tauri/actions/runs/37176405544/artifacts/11293513567) |
| Windows MSI | 미수용 — 같은 설치 후 버전 실패 | [job111359814531](https://github.com/postmelee/alhangeul-tauri/actions/runs/37176405544/job/111359814531), [artifact11293159841](https://github.com/postmelee/alhangeul-tauri/actions/runs/37176405544/artifacts/11293159841) |

### 확인된 진행과 원시 증거 재검토

두 형식 모두 공개 입력 검증·clean0.1.0 설치 exit0·정확한 시작/수동 조회의 version/target/trigger·dirty 문서 차단·UI 설치 동의 및 다운로드100%가 통과했다. NSIS56793106 bytes, MSI64102400 bytes를 내려받았다. apply/result와 apply-gate는 passed이나 **설치 완료 수용은 아니다**. 설치 후 executable ProductVersion/FileVersion과 uninstall DisplayVersion은 모두0.1.0이며 verify는 skipped, accepted 증거는 없다. 설정의 사전 snapshot만 있어 업데이트 후 설정·문서 보존은 이번 실행에서 검증하지 못했다.

API artifact ID·headSha·run·크기·digest와 실제 다운로드 ZIP bytes를 대조했다. NSIS119835 bytes/SHA-256 `4c772ed0a3c014f5b802b3f041f9464cae6a593788020752042385c3024b4514`, MSI146926 bytes/SHA-256 `510c844c4220aa073b7f4b813eb506e01d5882c21a5f2fdf557a7d8c683a092f`가 일치한다. 공개 두 Release metadata·manifest bytes·N 설치 hash·CI 서명 검증 receipt·apply 계약을 재대조했고, failed validate를 최종 설치 계약이 거부함을 확인했다. installer/signature/inventory 원본은 archive에서 제외되어 해당 검증은 CI receipt 근거이며 로컬에서 서명을 재계산했다는 의미가 아니다. 두 VM 모두 applyTransport=success/installedVersion=failure/verify=skipped/cleanup=success/policyRestore=success다. 제거 exit0·잔여 설치 제거·WebView2 정책 restored=true를 확인했다.

### 설치 완료 전 검증 종료 관측과 원인 한계

- NSIS는 installing snapshot 뒤 apply 종료04:19:55.757Z, WebDriver deleteSession04:19:55.760Z로 **3ms** 차이다. 연결 삭제 응답은04:20:03.626Z, driver 중지는04:20:04.012Z다.
- MSI는 apply 종료04:19:15.569Z, deleteSession04:19:15.573Z로 **4ms** 차이다. driver 중지는04:19:16.867Z다.
- 두 apply/result에 transportClosed는 없다. 검증 함수가 installing을 보고 즉시 return하고 WDIO runner가 세션을 삭제한 사실이 원시 로그와 소스에서 일치한다. 설치 후 helper가 제품을 강제 종료하는 코드는 버전 준비 이후이며, 이번 실패에서는 그 지점에 도달하지 않았다.
- 제품 service/apply.rs는 begin_install→상태 publish→update.install 순서다. 고정 [tauri-plugin-updater2.10.1 소스](https://github.com/tauri-apps/plugins-workspace/blob/updater-v2.10.1/plugins/updater/src/updater.rs#L732)는 installer 임시 파일 기록·ShellExecuteW 실행 이후 process exit를 수행한다. 따라서 installing은 installer 실행 완료 증거가 아니다.

검증 도구의 조기 종료가 제품의 설치 handoff를 중단했을 가능성이 높다. 다만 현재 archive에는 설치 프로그램 시작/종료나 제품의 자연 종료를 독립적으로 관측한 증거가 없어 **실패 원인으로 확정하지 않는다**. 제품 자체 설치 실패 또는 CI 상호작용 가능성도 다음 관측에서 구분해야 한다. 제품 수정이나 새 릴리즈가 필요하다고 아직 결론 내리지 않는다.

### 잔여 위험과 다음 승인 경계

Windows 실제 업그레이드는 미수용이고 #97은 OPEN/진행중이다. 이번 기록은 단계 완료 보고가 아닌 실패 결과 기록이다. GitHub body·원문 notes·웹 안내·production feed의 검증 중 문구를 유지했다. 다음 보정안은 Windows에서 installing만으로 조기 return하지 않고 제품의 자연 종료/연결 종료까지 기다리며, 제한 시간·오류·마지막 상태/화면 증거와 별도 설치 버전·재실행 수용을 유지하는 검증 도구 수정이다. 회귀 계약·Windows/Linux fast를 먼저 확인하고 새 exact SHA의 실제 Windows run은 별도 승인 gate를 따른다. 새 source 변경·제품 build/sign/publish·공개 안내 갱신·PR/merge/Pages는 이번 실행 승인 범위에 포함되지 않는다.


## Gate 6 Windows 설치 handoff 보정 구현·로컬 검증 — 2026-10-04

### 단계 목적과 승인

실제37176405544에서 Windows apply가 installing 뒤 즉시 반환하고3/4ms 뒤 WDIO 세션을 삭제했다. 검토한 설치 handoff 보정안에 같은 스레드의 “진행해줘”로 검증 도구 수정·기존 계획 기록·중립 로컬 검증·Windows/Linux fast를 승인받았다. 조기 종료의 제품 설치 실패 기여는 여전히 추론이며 이번 구현은 실제 Windows upgrade 성공이 아니다. 새 exact SHA의 실제 native 실행은 별도 승인 gate다.

### 산출물과 기존 동작 보존

- production-upgrade/windows-handoff.ts(70 LOC)는 주입 가능한 readState/pause/clock으로 Windows 상태를 관측한다. installing만으로 return하지 않으며 기본10분 제한 내에서 연결 종료까지 관측한다. updater error·예상 밖 상태/driver 오류·timeout은 실패다. 일반 session/closed 문구를 전부 연결 종료로 허용하던 조건을 실제 driver closure 문구로 제한했다.
- downloading/installing 전환과 시각·마지막 snapshot·closure source/state-poll 또는 install-click·closedAt을 windowsHandoff에 남긴다. 연결 종료는 requiresInstalledVersionVerification=true인 잠정 증거다. 클릭 도중 제품이 빠르게 종료하는 경로도 독립 receipt를 남기고 이후 OS/GUI 필수 수용을 요구한다.
- apply.ts(90 LOC)는 Windows 경로를 별도 연결 코드로 분리해 관측 완료 후에만 WDIO 종료를 허용한다. windows-handoff.json을 별도로 보존하고 실패에는 작은 상태 문구·toolbar/canvas·화면을 수집한다. install-diagnostics.ts(14 LOC)는 readState/screenshot을 주입받으며 진단 실패로 원래 오류를 덮지 않는다. 순수 helper는 WDIO runtime이나 설치한 패키지에 의존하지 않아 의존성 설치 없는 Windows fast에도 사용할 수 있다.
- production-evidence.mjs(84 LOC)는 연결 종료 receipt·시각 순서·source·마지막 snapshot 일치·별도 설치 검증 필요 표시를 필수로 확인한다. installing-only/observing/failed 증거는 apply gate에서 거부한다. 실제 executable/uninstall0.1.1·연결/기본값·fresh GUI/no-update·설정/문서·최종 accepted 조건은 유지한다.
- production-upgrade.test.mjs(287 LOC)에 관측과 오류/timeout/빠른 종료·진단 실패·불완전 receipt 회귀22개를 추가했다. 신규 파일·함수는 권장 상한 이내다. 기존 AppImage restart·공통 startup·제품 runtime·공개 release bytes/key/feed/notes/site·rhwp pin은 보존했다.

### 검증 결과

- 전용 production/workflow/GUI 계약 **89/89**, production 단독 **58/58**, 전체 automation **1250/1250**, upstream **39/39**, Studio **251/251(39 files)**가 통과했다. fail/skip0다. GUI typecheck·Studio build도 통과했고 기존 chunk/dynamic import 경고만 남는다.
- node_modules 없는 임시 checkout에서 production 계약 **58/58** 통과를 확인했다. Windows 플랫폼 결과를 대신하지 않으며 새 exact Windows fast에서 별도로 확인한다.
- 실제 이전 Windows artifact의 installing-only apply 증거 두 개를 새 계약이 거부했다. 이전 Linux 실제 apply/verify 원시 증거는 새 계약에서도 통과하여 기존 수용을 유지했다. 원시 bytes 재검토이며 native Linux를 재실행한 결과가 아니다.
- check:product-boundary **796 files scanned**, check:action-pins **29 files/165 references/11 pins**, check:release-notes **1 documents**, git diff --check 통과다. rhwp v0.8.6/resolved f1f9c6ae58344ee9368996d3543f76b9345cf227 submodule은 clean이다.

### 잔여 위험·다음 단계·승인 경계

새 exact commit을 게시한 뒤 승인된 Windows/Linux fast를 한 번 실행해 플랫폼 계약과 PowerShell parser를 확인한다. fast는 실제 product install/upgrade 수용이 아니다. 이번 commit의 실제 Windows 설치·재실행·문서/설정 수용은 아직 미검증이다. 연결 종료만으로 제품의 정상 종료나 설치 성공을 확정하지 않고 후속 OS version/fresh GUI/accepted 증거를 요구한다. 다음 실제 run에서 installer 실패가 재현되면 당시 원시 증거에 따라 제품 또는 CI 환경 원인을 구분한다.

fast 통과 후 새 exact harness와 Windows NSIS/MSI 실행안을 제시해 승인을 요청한다. Linux는 이전37158705809/a74d3638/artifact11286572569의 실제 성공을 재사용한다. 제품 build/sign/publish·공개 body/notes/site/feed 변경·PR/merge/Pages는 이번 승인 범위 밖이다. 공개 검증 중 문구와 #97 OPEN/진행중을 유지한다.


## Gate 6 production upgrade 세 형식 실제 수용 — 2026-10-04

### 승인·fast·실행 식별자

설치 handoff 보정 뒤 새 exact harness `b7f6979c1f38c060e27f2824bdd71d32c5047468`의 Windows NSIS/MSI 실행안을 제시했고 같은 스레드의 “진행해줘”로 Windows NSIS/MSI 실제 재검증·증거 분석·기존 위치 기록을 승인받았다.

[fast37178736722](https://github.com/postmelee/alhangeul-tauri/actions/runs/37178736722)은 같은 SHA에서 success다. Linux automation1250/upstream39/Studio251·build/GUI typecheck와 원격 boundary776files, Windows 릴리즈124/production58·PowerShell83sources/격리16·workflow11블록 parser가 통과했다. fast는 실제 product upgrade 수용이 아니다.

[실제37179376994](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994)은 이 SHA에서 mode=production-upgrade-check/production_upgrade_platform=windows-x64/publish_release=false로 실행했고 전체 **success**다. Windows NSIS/MSI 두 job 모두 필수 적용·설치·재실행·accepted·cleanup/정책 복원을 통과했다. Linux는 선택하지 않았고 이전 실제 성공 근거를 재사용한다. 제품 N source `fc3cad15682f35723ab6558d1301e9096f7eec67`, N+1 `96e89e900415ee9e1e942b5c01c833dea3415e86`, 두 공개 Release399698591/402604603의 기존 bytes와 manifest `62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728`를 사용했다. 제품 재빌드·서명·tag/assets/body/site/feed 변경은 없다.

### 형식별 최종 수용 근거

| 형식 | 실제 수용 | harness/run/job/artifact |
|---|---|---|
| Windows x64 NSIS | 통과 | b7f6979c/[37179376994](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994)/[111368643157](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994/job/111368643157)/[11294931216](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994/artifacts/11294931216) |
| Windows x64 MSI | 통과 | b7f6979c/37179376994/[111368643112](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994/job/111368643112)/[11294057902](https://github.com/postmelee/alhangeul-tauri/actions/runs/37179376994/artifacts/11294057902) |
| Linux x64 AppImage | 이전 실제 성공 재사용 | a74d3638116e0bf579985f517e008b365399945f/[37158705809](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809)/[111307414907](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/job/111307414907)/[11286572569](https://github.com/postmelee/alhangeul-tauri/actions/runs/37158705809/artifacts/11286572569) |

기존37158705809/37176405544 전체 failure를 소급 success로 바꾸지 않는다. Linux는 이전 run의 해당 success job만 수용하며 이번 Windows SHA에서 새로 통과했다고 쓰지 않는다.

### Windows 실제 관측·보존과 로컬 재대조

두 VM 모두 public-input passed/clean0.1.0 install exit0, 실제 시작·수동 native 조회의0.1.0→0.1.1/동일 target·dirty 문서 차단·UI 설치 동의·다운로드100%를 확인했다. NSIS56793106 bytes/MSI64102400 bytes다. 새 handoff 관측은 installing에서 return하지 않고 driver의 invalid session id/브라우저 연결 종료까지 유지했다. 두 apply/result/windows-handoff.json·apply-gate·verify/result·accepted는 같은 harness의 passed 증거다.

- NSIS: installing05:20:42.111Z→연결 종료05:20:42.631Z(520ms), WDIO deleteSession은 종료 관측 뒤05:20:42.638Z다. 설치 버전 검사05:20:44.825Z~05:20:51.213Z에서 통과했다.
- MSI: installing05:21:12.975Z→연결 종료05:21:13.828Z(853ms), deleteSession은05:21:13.834Z다. 설치 버전 검사05:21:18.142Z~05:21:20.503Z에서 통과했다.

두 형식 모두 실제 executable ProductVersion/FileVersion 및 uninstall DisplayVersion0.1.1, .hwp/.hwpx handler Valid=true, 기본 연결/UserChoice 보존을 확인했다. fresh driver session의 Alhangeul0.1.1/no-update, settingsPreserved=true, HWP6쪽/HWPX10쪽·canvasReady·unchanged=true 및 두 원본 hash 유지가 통과했다. Windows 두 형식×두 문서 화면4장을 직접 확인했다. 두 VM applyTransport/installedVersion/verify/cleanup/policyRestore는 모두 success이고 제거 exit0·잔여 설치 제거·WebView2 restored=true다.

각 API artifact의 ID·exact headSha·run·비만료·bytes 크기/digest를 실제 ZIP에 대조했다. NSIS674312 bytes/SHA-256 `f8f5f2f2625de66b7c03d6648c01e7529cf86b334d60cf3afe0186b103fd0fa7`, MSI700752 bytes/SHA-256 `3bff9026d14de2abfcc54c9c7e5f2816e6a8dbb52161dfa305f532a09119c168`가 일치한다. 공개 Release metadata·checksum10개/metadata 파일 hash·manifest apply/verify bytes·N 설치 hash·CI signatureVerified receipt·consent 및 apply/installed/verify/accepted 계약을 로컬에서 재대조했다. Windows archive에서 제외된 installer/signature/inventory 원본은 CI receipt 근거이며 로컬에서 제품 bytes/Minisign을 다시 계산했다는 의미가 아니다.

### 원인 판단·잔여 한계·다음 단계

검증 도구를 보정한 뒤 같은 공개 설치본의 Windows 두 형식이 실제로 통과했다. 이전 installing-only 관측 뒤3/4ms의 조기 세션 종료와 새 연결 유지·설치 완료 관측의 차이를 확인했다. 이를 Windows 제품 updater를 수정한 결과로 표현하지 않는다. 세 형식의 실제 N→N+1 단계는 수용됐지만 모든 PC/GPU/문서·native Open 대화상자·강제 MSI3010 후 재부팅 수용까지 확대하지 않는다. 수동 조회는 public native updater_check이고 문서 열기는 loadFile RPC다. 알려진 Authenticode·일부 NSIS thumbnail/표시 한계도 유지한다.

공개 body/원문 notes/site/feed에는 아직 검증 중 문구가 남아 있다. 다음은 실제 수용 결과에 맞는 원문·생성 body/website/updaterSummary와 릴리즈 인덱스 상태를 보정하는 검토다. source 구현·PR 준비 뒤 exact 공개물 검토/승인·PR merge·Pages·HTTP 대조·#97 close/cleanup까지는 남아 있으며 이번 실행 승인 범위 밖이다. 따라서 #97은 OPEN/진행중이다. 새 공개 notes-only manifest는 원래 actual 수용의 당시 hash/고정 harness 근거를 보존하고 installer identity와 구분한다.


## Gate 7 / Stage 4.9 — 실제 업데이트 결과 안내 보정 (2026-10-04)

### 목적과 승인

같은 스레드의 “진행해줘”로 `/tmp/task97-public-upgrade-result-draft.md`와 생성기 후보 bytes의 기존 위치 적용·중립 검사·Windows/Linux fast·PR 검토용 정리를 승인받았다. 이미 수용한 세 형식의 실제 업데이트 결과를 릴리즈 안내에 반영한다. PR 게시·공개 body 적용·merge·Pages/HTTP·close/cleanup은 다음 승인 gate이며 아직 수행하지 않았다.

### 산출물과 본문 보존

- `docs/releases/v0.1.1.notes.json`: 검증 중 문구 두 개만 보정. 첫 업데이트 안내·metadata·knownLimitations·references 보존.
- `site/release.json`: notes만 동기화. version/pub_date/downloads/source/tag/key/inventory/platform URL/signature는 기계 deepEqual로 보존 확인.
- `site/updates/v0.1.1.html`: 공식 규격 생성기 산출물과 동일한 파일로 교체. HTML 직접 편집 없음.
- `docs/releases/README.md`와 `v0.1.1.md` 첫 상태: 공개 0.1.1·PR101 MERGED·세 형식 실제 수용과 새 결과 문구 공개 대기 구분. 과거 확인/실패/run/hash 기록은 보존.
- production 입력 JSON·contract hash를 새 안내의 manifest bytes에 정렬. 기존 production 테스트에 현재 feed 생성 bytes와 pin의 일치·notes 변경 시 drift를 검사하는 의미 있는 계약 추가. 테스트 파일295 LOC, 함수7 LOC로 권장 범위 내.
- 기존 plans2개·stage4/report/orders에 문서 위치·승인·변경·검증·다음 gate 기록. 새 공식 루트 없음.

### 검증 결과

- `pnpm run generate:release-notes -- --version 0.1.1 --output-dir /tmp/task97-result-copy-generated`: body/HTML/short notes 생성. 승인 후보와 세 파일의 SHA-256 및 byte 수 일치.
- `pnpm run check:release-notes`: 1문서 drift 통과.
- `pnpm run build:pages` / `pnpm run check:pages`: source17/output20 통과. 새 stable manifest는 공개 원본과 notes만 다름.
- `pnpm run test:automation`: 1,251/1,251 통과, fail/skip0. release notes/updater/production/workflow 회귀 포함.
- `pnpm run check:product-boundary`: 796파일 통과.
- `pnpm run test:upstream`: 39/39, `pnpm run test:studio`: 251/251·39파일 통과.
- `pnpm run build:studio`·`pnpm run typecheck:gui`: 통과. Studio 기존 chunk/dynamic import 경고만 남음.
- `pnpm run check:action-pins`: 29파일/165참조/11pins 통과.
- Browser skill의 in-app browser로 생성 Pages를 1366·390·320px에서 관측. 새 결과 문구·수동 패키지 안내·기존 한계가 표시되고 가로 overflow 없음. 릴리즈 상세 고정 다운로드6개와 목록 최신 다운로드3개는0.1.1, 최신 노트 항목1개 확인. 중간 heading press가 focus 불가로 실패했으나 페이지 변경 없이 screenshot/DOM 직접 관측으로 검증을 완료했다.
- 생성/보존 receipt `/tmp/task97-result-copy-generation-receipt.json`, 원시 로그 `/tmp/task97-result-copy-{automation,boundary,upstream,studio,studio-build,gui-type,pins}.log`, 화면 `/tmp/task97-result-copy-{notes-desktop,notes-320,update-section}.png`.
- Windows/Linux fast는 이 소스·보고서 묶음의 exact commit을 push한 뒤 한 번 실행하고 별도 PR 검토용 receipt에 기록한다. 이전 b7 SHA의 성공을 이번 SHA 결과로 재사용하지 않는다.

### 공개 후보 bytes

| 산출물 | bytes | SHA-256 |
|---|---:|---|
| release-body.md | 5152 | `3544f72d3e3aac3d4f7aab2955ef245bc3cb8cda30dfc5bde1ee889678e250b4` |
| website-release-note.html | 8551 | `fd04f92cccf23f84e3d8c9933d97539635e8b72c42e0ba4ece69c74dd76a10f2` |
| updater-notes.txt | 411 | `7552a58c2269f93c08ccbd02af733a0abb2be2cd36474c8d1338cacda413546c` |
| stable.json | 2295 | `654efd7efc5f57de061d56743d30ab55c0f152d693df52c4022306261edbc638` |

### 잔여 위험과 다음 영향

Windows 실제37179376994/b7f6979c와 Linux 실제37158705809/a74d3638은 당시 공개 manifest `62fae230339497b132be013ec91df7cd83b710b69c9de4f56ffff1c407463728`로 수용됐다. 새 notes-only 후보의 hash는 위654e이며 새 native 실행 수용이 아니다. 이미 통과한 installer/URL/signature/key/targets는 같다. 과거 증거를 새 contract로 소급 재해석하지 않는다.

코드 서명·일부 NSIS 썸네일·강제 MSI3010 후 재부팅·모든 Wayland/GPU/문서/폰트/프린터 제한은 보존한다. 제품 runtime·build/sign/tag/assets/upstream pin 및 Mac desktop 검증은 변경·실행하지 않았다. 현재 공개 body와 feed는 기존 검증 중 문구이며 최종 공개 gate까지 #97은 OPEN이다.

### 다음 승인 요청

새 exact commit의 Windows/Linux fast 결과와 PR 검토용 본문·공개 후보 bytes를 제시한 뒤 PR 게시·body 적용·devel merge·exact Pages 게시·실제 HTTP/표시/링크·close/cleanup gate 승인을 요청한다.


## Gate 8 최종 PR·공개·정리 승인 — 2026-10-04

작업지시자가 `/tmp/task97-result-copy-publish-plan.md`와 PR 본문·생성 body/HTML/manifest 후보를 검토한 뒤 같은 스레드에서 “진행해줘”로 승인했다. 이는 non-draft PR 게시·필수 검사 통과 후 일반 merge·v0.1.1 body만 갱신·exact merge SHA Pages·HTTP20개 bytes/표시/링크 대조·기존 위치 결과 기록(필요한 문서-only 후속 PR 포함)·성공 뒤 #97 close와 task 부산물 안전 정리의 명시 승인이다.

문서 위치는 기존 plans2개·stage4/report/orders 및 docs/releases의 v0.1.1 기록/인덱스를 그대로 사용한다. 사이트/생성 후보 bytes는633629fe와 같고 제품 runtime·build/sign/tag/assets/upstream pin 변경은 없다. 사용자 root local/task69 미커밋 변경·다른 작업자의 devel worktree는 보존한다. 완료 상태와 issue close는 공개 read-back 수용 뒤 기록한다.

[새 안내 fast37182206176](https://github.com/postmelee/alhangeul-tauri/actions/runs/37182206176)는 exact633629fead088b3c7c894d8a146c66dfcb4459f7에서 전체 success다. Linux Node/Studio job과 Windows PowerShell job의 모든 필수 step이 success이며 Linuxautomation1251/upstream39/Studio251/GUItype/Pages17-20,Windowsrelease124/production59/PowerShell83sources-16isolated/productionworkflow11blocks가 통과했다. native/package는 해당 profile에서 skipped이며 새로운 제품/native 수용으로 표현하지 않는다. receipt `/tmp/task97-result-copy-fast-receipt.json`에 run/job/step을 보존했다.

실제 production 수용은 Windows37179376994/b7f6979c와 Linux37158705809/job111307414907/a74d3638의 기존 근거다. 새 native 실행은 필요하지 않다. 다음 PR의 merge ref required는 게시 이후 별도로 확인하며 아직 수행 전이다. 승인 전후 검토 대상 body·site·installer·key·tag identity는 재대조했고 기존 body43b9a7b3… 및11assets는 유지됐다. 공개 변경 전 현재 확인 시각은2026-10-04T06:28:24Z다.


## Gate 8 최종 공개 인계 수용 — 2026-10-04

승인된 실행안대로 [PR #104](https://github.com/postmelee/alhangeul-tauri/pull/104)를 게시하고 [필수 CI37182972337](https://github.com/postmelee/alhangeul-tauri/actions/runs/37182972337)의 Windows/Linux contracts·Alhangeul PR required 및 모든 필수 step success를 확인했다. PR head52c6085375746348eb7d71507ed6c615552ee79f는633629fe 이후 문서만 변경했고 검토 후보 bytes를 보존했다. 일반 merge는2026-10-04T06:36:39Z, 실제 commit은 `ac5ec6ce27cac988231d9ac6e06a2d769bb5bc03`이다.

GitHub v0.1.1 body는 규격 생성 파일로 갱신한 뒤 API read-back bytes를 대조했다. body SHA-256 `3544f72d3e3aac3d4f7aab2955ef245bc3cb8cda30dfc5bde1ee889678e250b4`(5152bytes)이며 Release ID402604603·공개시각·non-draft/non-prerelease·11assets와 annotated tag `b7b858e13c3f9153562e28e33cc398e75e896adf`는 보존됐다. source/key/inventory/installer/URL/signature/rhwp pin 변경은 없다.

[Pages37183359064](https://github.com/postmelee/alhangeul-tauri/actions/runs/37183359064)는 exact `ac5ec6ce27cac988231d9ac6e06a2d769bb5bc03`에서 모든 step success다. SHA를 dispatch ref에 직접 전달한 최초 요청은 GitHub422(No ref found)로 run이 생성되지 않았다. devel tip이 같은 SHA임을 API로 확인해 devel ref/deploy_ref ac5를 지정했고, 실제 WORKFLOW_SHA·DEPLOY_REF·checkout SHA 일치 gate를 통과했다. 임의 tag/force/history rewrite는 없다. Pages build/check source17-output20·계약94/94·upload/deploy 모두 통과했다.

공개 HTTP `2026-10-04T06:40:03.560Z` 확인에서20/20 files가 해당 SHA의 deterministic `_site`와 byte 단위로 일치했다. `release.json` SHA-256 `aa2bce9bf52a37a37c091b80be47e0146d5b15e6b338cabcc6e8b204cce07efd`(3862bytes), stable SHA-256 `654efd7efc5f57de061d56743d30ab55c0f152d693df52c4022306261edbc638`(2295bytes), 실제 HTML SHA-256 `1a20dde8ca0cde80a05e2e5a8a9ea80254982933179423e4e9611e1f72acb7ef`(8542bytes)다. 생성 원문 HTML8551bytes/fd04f92c…와 게시 HTML 차이는 승인된 root asset reference 정규화다. stable은 기존62fae230…와 notes만 달라지고 version/pub_date/platform URLs/signatures는 deepEqual이다.

공개 브라우저1366·390·320px에서 새 업데이트 결과·설정 유지·HWP/HWPX 재열기·수동 DEB/RPM/arm64·기존 한계 표시를 확인했고 가로 overflow가 없다. 최신 노트는0.1.1 한 항목이며 목록의 최신 다운로드3개와 상세 고정 다운로드6개 모두0.1.1 URL이다. 사용자 탭은 공개 릴리즈 안내로 돌려두고 viewport override는 해제했다. 화면 `/tmp/task97-final-public-{desktop,390,320}.png`, UI receipt `/tmp/task97-final-public-ui.json`, HTTP receipt `/tmp/task97-final-http-receipt.json`, Pages/API/CI 원시 기록 `/tmp/task97-final-pages-{result,ci}.*` 및 `/tmp/task97-pr104-{ci-result,merged}.json`에 보존했다.

### 최종 수용과 후속 정리

로컬 글꼴 성능 개선·제품6종 수용/11assets 공개·규격 body/Pages/feed·실제 NSIS/MSI/AppImage0.1.0→0.1.1·설정/문서 보존 및 결과 안내 공개까지 수용했다. 새 안내의 fast1251/39/251·Windowsrelease124/production59/PS83sources16tests·PRrequired·Pages94·HTTP20/20을 각 exact source/run 범위로 기록했다. Windows actual37179376994/b7f6979c와 Linux actual37158705809/job111307414907/a74d3638 및 당시 manifest62fae230… 근거는 그대로다. notes-only 게시를 새 native 실행 성공으로 확대하지 않는다.

기존 Authenticode 미서명·일부 NSIS 썸네일·강제 MSI3010 후 재부팅·모든 Wayland/GPU/문서/폰트/프린터·native 열기 대화상자/전체 수동UI 검증 한계를 유지한다. Mac Rust/Tauri/native 검증·제품 재빌드/서명/태그 이동/asset 교체는 하지 않았다.

문서 위치는 승인한 기존 plans2개·stage4/report/orders·docs/releases 기록/인덱스이며 새 공식 루트는 없다. 이번 후속 기록은 문서만 변경하므로 실제 사이트 게시 source는ac5와 Pages37183359064로 고정한다. 사이트 입력 bytes가 같으면 기록 merge 후 Pages/native/full CI를 반복하지 않는다. 현재 공개 인계는 수용 완료이고, 승인된 기록-only PR 필수 검사/일반 merge 뒤 #97 close·원격/로컬task97·managed worktree 정리를 진행한다. 사용자 root local/task69와 다른 devel worktree는 보존한다.


## README 공개 상태 후속 보정 — 2026-10-04

작업지시자의 “정리해줘”에 따라 단순 문구 수정 축소 절차를 적용했다. 기존 루트 README.md와 #97 계획서·최종 보고서 위치를 사용하며 새 이슈나 문서 루트를 추가하지 않았다. devel README는 두 문단, main README는 세 문단만 보정했다. 안정 버전과 웹 다운로드·updater 피드가 모두 v0.1.1임을 안내하고, NSIS/MSI/Linux x64 AppImage의 실제 업데이트·설정 유지·HWP/HWPX 재열기 수용 및 DEB/RPM/arm64 수동 설치를 표시한다. main의 이전 버전 전용 링크는 실제 공개 v0.1.1 안내로 연결한다.

공개 Release는 v0.1.1/non-draft/non-prerelease, production stable.json은 version 0.1.1임을 재조회했다. 실제 실행 근거는 Windows run37179376994와 Linux run37158705809/job111307414907의 기존 수용 결과를 사용한다. README 보정을 새 native 실행 성공으로 표현하지 않는다. 다운로드 형식·미서명·썸네일·글꼴·문서·프린터 제한 문단은 그대로 유지했다.

main에는 README.md만 변경하는 별도 PR을 준비하고 devel에는 README와 기존 계획·보고 기록만 포함한다. 두 PR의 필수 검사와 공개 링크·최소 diff·whitespace 결과를 PR 본문에 기록한 뒤 병합 승인을 요청한다. 제품 runtime·release/tag/assets·site/updater 입력·rhwp pin 변경 및 제품/native/Pages 재배포는 없다. 사용자 root local/task69 미커밋 변경과 다른 devel worktree를 보존했다.

검토 전 검사: 두 worktree의 git diff --check 통과, devel README 2줄 교체·main README 3줄 교체를 확인했다. 새 Release·공개 v0.1.1 안내·release.json 링크는 HTTP 200이며 웹 다운로드 version도 0.1.1이다. 읽기 전용 공개 검증 결과는 /tmp/task97-readme-links.json에 남겼다. main diff는 README.md 단일 파일, devel diff는 README.md와 기존 계획·최종 보고서 세 파일로 제한된다.
