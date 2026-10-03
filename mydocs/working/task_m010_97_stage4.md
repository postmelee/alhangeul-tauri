# Task #97 Stage 4 완료보고 — v0.1.1 최종 후보 검증과 배포 준비

GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
구현계획서: [`task_m010_97_impl.md`](../plans/task_m010_97_impl.md)
Stage: 4
작성일: 2026-10-03 (Asia/Seoul)
상태: 구현·최종 후보 검증 완료, PR merge·공개 배포 대기

## 단계 목적

제품 버전을 0.1.1로 정렬하고 실제 게시 후보 6종의 설치·실행·HWP/HWPX 저장·재열기를 확인한다.
Stage 3 승인에 대한 후속 “진행해줘”는 Stage 4 및 제안한 exact-file 입력화 범위의 승인이다.
이번 단계 완료는 공개 Release·Pages 완료를 뜻하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `package.json`, `apps/desktop/package.json`, `apps/desktop/src-tauri/{Cargo.toml,Cargo.lock,tauri.conf.json}` | 제품 version 5개 표면 0.1.1 정렬 |
| `docs/architecture/LOCAL_FONTS.md` | 구축·조회·가용성·무효화·공개 반환값 계약 6줄 추가 |
| `docs/operations/DESKTOP_RELEASE.md` | 새 후보 JSON 운영 입력 계약 9줄 추가 |
| `scripts/ci/release-candidate-input.mjs` | 80줄, version/tag/source/run/ID/digest/경로/형식 검증과 검증 후 identity 전달 |
| `scripts/ci/{release-file-candidate,release-linux-candidate}.mjs` | 기존 v0.1.0 기본값 유지, 명시한 새 후보만 정확한 producer/파일 수용 |
| `.github/workflows/alhangeul-{desktop,release-files,release-linux-files,release-fedora-vm}.yml` | candidate path 전달, signed 3종·arm64 선택 |
| `scripts/ci/{accept-release-arm64,accept-release-fedora,release-fedora-vm,release-fedora-vm-guest,release-fedora-vm-session}.sh` | 검증된 source/version/hash 전달, 기존 설치·VM·정리 gate 유지 |
| `tests/ci-release-candidate-input.test.mjs`, `tests/release-metadata.test.mjs` | 입력 거부/기존 계약 및 version 기대값 회귀 |
| `mydocs/working/task_m010_97.json` | 검증한 signed 3종·RPM·arm64의 exact ID/digest/path/hash 고정 |
| `mydocs/plans/task_m010_97{,_impl}.md`, `mydocs/orders/20261003.md` | 승인·실행·완료 범위 기록 |

## 본문 변경 정도 / 본문 무손실 여부

기존 제품 문서는 읽은 뒤 승인된 두 위치에 최소 추가했다. 새 공식 문서 루트를 만들지 않았다.
Stage 3 제품 source `ef54ae9dd1de17a208eff6986335d23b2e7ff86b`와 최종 제품 source
`8f48d83b30cbe1b7d1af9f7b857044145c5bcdcc` 사이 runtime 소유 경로 diff는 없다.
version·문서·검증 harness만 변경했고 rhwp v0.8.6 / `f1f9c6ae58344ee9368996d3543f76b9345cf227` pin은 유지했다.
후보 prepare 함수는 순차 검증을 보존하기 위해 50줄을 조금 넘으며 각각 70줄 미만이다.
입력 검증은 별도 모듈로 분리했고 이유를 구현계획서에 기록했다.

## 검증 결과

실행 명령:

```bash
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
git diff --check
```

| 주제 | 결과 | 근거 |
|---|---|---|
| 제품 metadata | OK | version 5개 표면 0.1.1 일치, release metadata 통과 |
| 제품 경계 | OK | 734파일 검사 |
| upstream | OK | 39 tests, stable pin 변경 없음 |
| Studio | OK | 39 files / 251 tests, build 통과 |
| 자동화 | OK | 1,044 tests / fail 0 / skipped 0, 최종 후보 JSON 반영 후도 통과 |
| workflow/shell | OK | 변경 workflow actionlint, 6개 관련 shell bash -n, diff 검사 통과 |
| native full | OK | 아래 full producer에서 Windows/Linux x64·arm64 및 core/native/package 계약 통과 |
| signed bytes | OK | archive digest·파일 hash·Minisign·complete inventory 대조 |
| 새 파일 설치/문서 | OK | 아래 6종 각각 실제 파일·앱 0.1.1·HWP/HWPX 저장/재열기 확인 |

Mac 분석 호스트에서는 Rust desktop/Tauri/native GUI를 실행하지 않았다.
Studio build의 기존 chunk/dynamic import 경고는 남으며 실패가 아니다.

### 제품 source와 producer

모든 Stage 4 package의 제품 source는 **`8f48d83b30cbe1b7d1af9f7b857044145c5bcdcc`**다.

| 생산 run | 범위 | 결과 |
|---|---|---|
| [37123984482](https://github.com/postmelee/alhangeul-tauri/actions/runs/37123984482) | full native, 세 core 및 Windows/Linux x64·arm64 | success |
| [37123986488](https://github.com/postmelee/alhangeul-tauri/actions/runs/37123986488) | 비게시 signed Windows NSIS/MSI·Linux AppImage·complete inventory | success, publish job skipped |
| [37125754390](https://github.com/postmelee/alhangeul-tauri/actions/runs/37125754390) | harness `4fb0cc82b02ad87ee983b1ed44e3c9cd64ab480b` fast 계약 | success |

비게시 서명 run의 pending 환경 승인 전 reviewer postmelee, prevent_self_review=false,
current_user_can_approve=true, ref 제한 없음을 확인했다. 승인된 Stage 4 범위로 해당 run만 승인했다.
보호 정책·서명 비밀·공개 권한을 변경하지 않았다.
서명 public key fingerprint는 `9f86f804067eff359cd32707137dfaaea8710450985dda86b0392da5db63b8f8`이다.

| archive | ID | SHA-256 digest (접두사 제외) |
|---|---:|---|
| signed Windows x64 | 11275190891 | `6d2623857add47b10d56f96b187ae6a59208608519efca6f44a2892eea955041` |
| signed Linux x64 | 11273649560 | `cc869b95b2d26a159b2eb7d9911ca9941f863b6b41e26093140a0a779e1dda75` |
| complete signed inventory | 11274780726 | `b6cf15c17d0e6e00541f78724a22aadc35068944ea2e4cf731d3302e34fe7ee0` |
| native Linux x64 | 11274996353 | `b9c7e0453c45884ba200cf2f963e8a61852f1d4cb6e7bbd03d6b6e2c15778b12` |
| native Linux arm64 | 11275051018 | `68d6938fd1ca3f09eb205c96c01d9765ad43617fa078d92f5c4b76f48026910f` |

### 실제 파일 수용

| package 경로 | SHA-256 | 실제 수용 run |
|---|---|---|
| `nsis/Alhangeul_0.1.1_x64-setup.exe` | `31719e8a94ff67f6a7d80f473cdf81676cccdfaa0774aa97b6df221a5551f799` | [37125756156](https://github.com/postmelee/alhangeul-tauri/actions/runs/37125756156) |
| `msi/Alhangeul_0.1.1_x64_en-US.msi` | `acde761349ade61d30d2bc0208ded46abf30e99ed2ea3422d41c69a2e26497e3` | 같은 signed 일반 문서 run |
| `Alhangeul_0.1.1_amd64.AppImage` | `20f0e6c1218f4fd0b8dd9d9b09d992ae72e2d71832cc3491fafbef4255d109a7` | 같은 signed 일반 문서 run |
| `deb/Alhangeul_0.1.1_amd64.deb` | `d8f2224418489c2161c7dbd5ab73933147a79d2a0dbf25fd15ad118e5fcdc4d8` | [37127089292](https://github.com/postmelee/alhangeul-tauri/actions/runs/37127089292) |
| `rpm/Alhangeul-0.1.1-1.x86_64.rpm` | `dcf6e0ceebaeb494433d69950f22731039bbb18749aaa8c86f2d51a7bf060674` | [37128109422](https://github.com/postmelee/alhangeul-tauri/actions/runs/37128109422) |
| `deb/Alhangeul_0.1.1_arm64.deb` | `79eb78d7b095e4e3d141cb0f8e66b0e0afadfea55a248e13526d54d4267d891c` | [37128112105](https://github.com/postmelee/alhangeul-tauri/actions/runs/37128112105) |

signed 문서와 DEB full GUI의 harness SHA는 `4fb0cc82b02ad87ee983b1ed44e3c9cd64ab480b`,
RPM/arm64의 harness SHA는 `5e6b870689ba2c396b7f004050996b5c01c8d261`다. 제품 SHA와 구분한다.
모든 run은 attempt 1이며 source·run·version·선택 hash와 필수 실제 단계 성공을 원시 JSON에서 대조했다.

- NSIS/MSI: install/cleanup exit 0, 설치 version 0.1.1, WebView 정책 restored=true.
  각각 HWP/HWPX 저장 marker를 pinned WASM으로 독립 파싱하고 재열기 화면 4개를 읽었다.
- AppImage: 원본 FUSE launcher에서 실행했고 writable 원본 파일·부모 경로를 확인했다.
  HWP/HWPX 저장 marker 독립 파싱과 재열기 화면 2개를 읽었다.
- x64 DEB: 정상 filesystem inventory 검사·설치 helper 확인·thumbnail manager·GUI gate 통과.
  9 scenario의 identity와 61개 파일 참조의 size/hash를 대조했다. native Save As/current save/reopen,
  새 문서 입력/저장/reopen/PDF, X11 drag-in 화면도 읽었다. 기존 문서 native save는 marker 입력
  시나리오가 아니므로 marker 통과로 기록하지 않았으며 pinned parser 본문 재읽기를 확인했다.
- DEB PDF: HWP 6쪽, HWPX 10쪽, 새 문서 1쪽, GTK 파일 인쇄 6쪽, CUPS 6쪽 모두
  A4·제목 한글·쪽별 text/nonblank 검사 통과. 생성한 29쪽 PNG를 모두 시각 판독했다.
  인쇄 전/파일 출력/취소/CUPS 후 4 checkpoint의 8 표본은 본문 유지·matches=true다.
  물리 프린터 및 한컴과 완전한 레이아웃 동등성을 검증한 결과는 아니다.
- RPM: Fedora 44 x64 QEMU/KVM Xfce X11, LightDM 실제 active 사용자 세션 uid 1000.
  기존 SELinux 설정 유지, RPM transfer hash OK, 설치 `alhangeul x86_64 0.1.1-1`.
  package/VM lastPhase=complete/exitCode=0, VM cleanup terminated 기록을 확인했다.
  HWP/HWPX marker와 재열기 두 화면 확인.
- arm64: 실제 arm64 runner·설치 `alhangeul arm64 0.1.1`·정상 filesystem inventory 확인.
  package complete/exitCode=0, HWP/HWPX marker 독립 파싱과 재열기 두 화면 확인.

### 수용 증거 아카이브

각 run의 source·artifact metadata·archive 다운로드 bytes SHA-256을 독립 대조했다.

| 자료 | artifact ID | archive SHA-256 (접두사 제외) |
|---|---:|---|
| signed AppImage 문서 | 11275351764 | `13e533da4cbfb8501f262cc14c8857a99f12a167ac806b2cfbb7a6e26d58f6be` |
| signed MSI 문서 | 11274927171 | `ac15a375faac7d0bc07df11f3a52e6976b68c27193713cf3c109480e6ef681ee` |
| signed NSIS 문서 | 11274801482 | `cfe5157920288c30c9bd0b2181cd4030e3d54f2b572961ca30eb65a7227ee374` |
| x64 DEB full GUI | 11275337488 | `a7c24facdf8e657e789bbf344ee72ccd68892aa5c622b5aa17bbf2b77f6038c2` |
| Fedora RPM VM | 11275109033 | `e010f9d1edf68d3dfe7806e60f739ec77b4cdbe95ae06442943de3ccf8bb852c` |
| arm64 DEB | 11276295920 | `95c3ab6d69dfa19b15d39af4324076c2e8411cf3fcc529679d54d301a80a13d2` |

### 실패·보정과 수용 경계

초기 metadata 테스트 두 건의 0.1.0 기대값을 새 제품 version에 맞춰 보정한 뒤 전체 1,044개를 통과했다.
분석 호스트의 case-insensitive filesystem이 unpacked 보조 경로 `Alhangeul/alhangeul`을 합쳐
일반 inventory 재계산이 한 번 실패했다. 원본 ZIP의 경로별 size/hash와 기존 AppDir intermediate
제외 계약을 그대로 대조해 분석했다. 지원 Linux의 실제 filesystem verifier는 변경하지 않았고
DEB/RPM/arm64 실제 실행에서 통과했다. watcher 네트워크 오류와 producer 최종 success도 구분했다.

full native Windows의 raw 결과는 다음과 같다. 계약 통과를 모두 기능 성공으로 기록하지 않는다.

| 설치 계약 | raw 관측 | 판정 |
|---|---|---|
| ordinary MSI strict-product | passed / exit 0, thumbnail/lifecycle passed | 해당 시나리오 수용 |
| hosted NSIS diagnostic | failed / exit 1 / 실패 12건, thumbnail not-accepted | 기존 사용자별 Shell 활성화 제한 유지 |
| forced MSI reboot 계약 | failed / exit 1 / 실패 1건, lifecycle reboot-required | post-reboot-unverified 유지 |

새 signed 일반 문서 성공은 해당 NSIS 썸네일 또는 MSI 재부팅 후 검증을 대신하지 않는다.

## 잔여 위험

- 사용자 Wayland/WebKitGTK 2.52·Intel/NVIDIA 환경과 개인 Windows 문서는 직접 재현하지 못했다.
- Stage 3의 같은 조건 VM 측정은 공개 fixture·renderer별 결과다. CPU 80%만으로 GPU 원인을 확정할 수 없다.
- Windows NSIS 썸네일 제한, MSI 강제 재설치 후 재부팅 확인, Authenticode 경고 정책은 공개 판단에 남긴다.
- 후보 product SHA는 PR 최종 head SHA와 다르다. main 확정 뒤 승인된 exact source/bytes 정책에 따라
  다시 판단해야 하며 새로 빌드한 파일은 이 설치 검증을 재사용할 수 없다.
- Release asset 공개 read-back·사이트·manifest 검증 및 실제 production updater 업그레이드는 미실행이다.

## 다음 단계 영향

Stage 4 구현·검증은 완료했다. 최종 보고서·devel Open PR을 준비하고 필수 PR check·리뷰를 확인한다.
#97은 공개 배포·사이트 전달 추적 때문에 OPEN 유지하며 자동 close 문구를 넣지 않는다.
main 승격·tag·동일 bytes 게시·사이트 PR/Pages는 승인 게이트를 지켜 후속 진행한다.

## 승인 요청

Stage 4·최종 보고·PR 리뷰 후 merge 단계 승인을 요청한다. 공개 배포까지 완료한 상태는 아니다.
