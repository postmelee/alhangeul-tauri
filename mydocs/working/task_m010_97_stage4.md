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

## 후속 공개 안내 규격 적용 (2026-10-04)

PR #103 merge와 PR #101 반영을 같은 스레드의 “진행해줘”로 승인받았다. 공통 규격은 merge `73faf113e8a75cd847e10b4aa3e7fc7e3cb66f41`이며 #102 원격 Windows/Linux/required는 [37152620380](https://github.com/postmelee/alhangeul-tauri/actions/runs/37152620380)에서 success다.

#97에서 merge 방식으로 규격을 반영하고 notes만 같은 원문의 updaterSummary로 정렬했다. 새 생성·check·릴리즈 회귀 124개·Pages17/20·Pages/updater/workflow94개가 통과했다. 새 PR #101 head의 required 검사는 게시 후 확인한다. source/runtime·installer·공개 tag/asset·키/endpoint·pin은 동일하다.

body/notes/manifest의 새 exact hash·공개 승인 필요값은 [최종 보고서](../report/task_m010_97_report.md#gate-5-새-안내-규격-적용--2026-10-04)에 기록했다. 실제 body 수정·Pages 배포·production upgrade는 아직 미실행이다.

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
