# Task #132 Stage 3.5 — clean Windows 런타임 수정과 실제 Explorer 관측

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)
Stage: 3.5 (정적 CRT 수정·Windows 11 NSIS 단일 환경 관측 완료, 전체 Stage 3 수용은 진행 중)

## 단계 목적

무료 Windows Server runner의 다른 사용자 desktop에서 발생한 Explorer timeout과 제품 자체 결함을 분리한다. 제공된 공식 Windows 11 x64 평가판으로 무료 Ubuntu runner에 실제 표준 사용자 desktop을 만들고, 발견한 필수 VC 런타임 누락을 수정한 동일 설치 파일을 검증한다.

## 결과

**무료 표준 Ubuntu runner의 QEMU/KVM에서 실제 Windows 11 표준 사용자 Explorer를 캡처했다. HWP 시험지·HWPX 양식의 페이지 내용과 JPG가 보인다. 별도 VC 런타임 설치 없이 NSIS 새 설치·재설치·제거가 모두 성공했다.**

[Stage 3.3](task_m010_132_stage3.3.md)의 빈 폴더 대조에서 제품 설치 전에도 Shell.Open timeout과 E_ACCESSDENIED가 발생했다. 현재 hosted Windows의 다른 사용자 desktop 경계가 장애였으며, 실제 로그인 사용자와 Shell 소유권이 일치하는 guest에서는 같은 엄격한 캡처 helper가 성공했다. UAC/DCOM 정책을 변경하거나 전역 Explorer/dllhost를 종료하지 않았다.

별개의 제품 결함으로 기존 handler/worker가 VCRUNTIME140.dll에 동적으로 의존했다. 개발 도구 없는 Windows 11에서 이 DLL이 없고 handler LoadLibraryEx 오류 126, NSIS exit 2가 재현됐다. WebView2는 이미 설치되어 있었고 온라인 재시도도 실패했다. sidecar에 정적 CRT를 적용하고 일반·delay PE import 검사를 추가한 뒤 같은 ISO 조건에서 성공했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-thumbnail-crt.mjs` | 기존 Cargo flag 우선순위를 보존하며 정적 CRT 적용 |
| `scripts/windows-pe-imports.mjs`, `build-thumbnail-binaries.mjs` | 일반·delay import의 외부 VC 런타임 거부, 복사 전 검사 |
| `tests/windows-thumbnail-crt.test.mjs` | flag·손상 PE·외부 import·기존 staged 파일 보존 회귀 |
| `scripts/ci/guest-ui-*` 및 guest workflow | 공식 ISO·exact artifact, 실제 표준 로그인, offline 설치·캡처·API·제거, 소유 VM 정리 |
| `scripts/ci/hosted-ui-input.mjs` 및 Windows 입력 | 성공한 새 제품 SHA/run/artifact/digest 고정 |
| `tests/ci-windows-guest.test.*` | 직렬 증거 무결성, 프로세스 소유권, 필수 관측 누락·불일치 거부 |
| `docs/architecture/WINDOWS_THUMBNAILS.md` | sidecar CRT 빌드 계약 |
| `docs/operations/CI_VALIDATION.md`, `RELEASE_CHECKLIST.md` | 재현·입력·cleanup·시각 판정과 clean Windows 검사 |
| 기존 impl/orders | 실패 대조·완료 범위·후속 상태 |

Stage 3.4의 준비·전송·로그인 실험과 실패 원본은 impl에 남겼다. 이번 보고는 그 결과를 소급 통과시키지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

사용자별 NSIS/HKCU, MSI/HKLM, UAC 및 renderer 동작 경계를 유지했다. Windows sidecar 빌드의 CRT 연결 방식과 패키징 검사를 변경했다. 기존 문서는 관련 절에만 보완했으며 과거 수용·미검증 기록과 역사적 시각 기준의 source SHA를 유지했다.

## 검증 결과

실행 명령:

```sh
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:action-pins
actionlint -shellcheck=
git diff --check
gh workflow run ci.yml --ref publish/task132 -f profile=full
gh workflow run ci.yml --ref publish/task132 -f scope=windows-guest-probe -f profile=fast
```

- 제품 source: `1e08891d6411e17806a5b3a48635a5fbca7a639f`.
- 후속 harness: `84f852c916771642273ff543766ddcb514acf1ba`.
- [full run 43241666433, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/43241666433): success. Windows 및 Linux x64/arm64 native/build/package와 필수 설치 계약 통과.
- [guest run 43259686576, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/43259686576): success. fast 두 job, 실제 guest 관측·upload·프로세스 종료·private disk/credentials 제거 모두 통과.
- 로컬 automation 1,421/1,421, product boundary 882 files, action pins 32 workflows/182 references/11 pins, Python AST와 diff 통과. 제품 full의 automation은 이전 후보 기준 1,420개이며 추가 회귀를 포함한 후속 harness와 구분한다.
- 전체 workflow 구조 actionlint 통과. shellcheck를 포함한 전체 actionlint에는 변경하지 않은 font-performance.yml:114의 기존 SC2016이 남아 있다.
- 실제 이전 handler/worker는 새 PE gate에서 VCRUNTIME140.dll 의존성으로 거부됐다. 새 두 binary는 inventory 해시/크기가 일치하고 Windows 시스템 DLL만 import한다.
- Mac에서 native Rust/Tauri 빌드는 실행하지 않았다. private 증거는 연결된 T7에 보존했다.

### 같은 clean ISO의 전후 대조

| 항목 | 이전 제품 / run 43237334829 | 정적 CRT 후보 / run 43259686576 |
|---|---|---|
| Windows | Enterprise Evaluation x64, build 26300 | 동일 ISO·edition·build |
| 시스템 VCRUNTIME140.dll | 없음, 로드 오류 126 | 없음, 로드 오류 126 |
| reference handler 로드 | 오류 126 | 성공 0 |
| WebView2 | 152.0.4191.66 | 동일 |
| 오프라인 NSIS 설치 | exit 2 | exit 0 |
| 온라인 재시도 | exit 2 | 미사용, NIC link down 유지 |
| 후보 재설치 / 제거 | 미실행 | 0 / 0 |
| 실제 표준 desktop / 창 소유자 | desktop 일치, 설치 실패 | SID/session 일치, non-admin·medium 8192 |
| force-extract | 미실행 | HWP 2개·HWPX·JPG 모두 bitmap 생성 |
| Explorer | 미실행 | 실제 소유 창 1100×720, icon 192, 캡처·창 닫기 성공 |
| 표시 설정 복원 / 제품 자체 제거 | 수용 불가 | 모두 true |

guest 부팅·설치·로그인·제품 검증을 합한 관측 시간은 880.86초다. 이 값을 Explorer 창 열기 시간으로 해석하지 않는다.

원본 PNG를 에이전트가 직접 검토했다. `large-hwp`의 시험지 제목·두 단 본문, `form-hwpx`의 표·본문, `control-jpg`의 이미지가 표시된다. `small-hwp`는 원래 빈 문서인 blank2010.hwp로, 내용 시각 수용 대상에서 제외하며 API 경로 대조에만 사용한다. 원시 `captured-awaiting-review`와 `releaseAcceptance=unverified`를 변경하지 않았다. 사용자 승인 golden이나 자동 반복 시각 수용으로 승격하지 않는다.

### Exact artifact와 이미지

| 항목 | 식별·SHA256 |
|---|---|
| [Windows 제품 ZIP](https://github.com/postmelee/alhangeul-tauri/actions/runs/43241666433/artifacts/13960733196) | ID 13960733196 · `b9a9f28916954bcf6f7cef1b86904e09b38583a38421224c64e44fafd07267cf` |
| NSIS | `22e9c4d17d4b3669510c6af70d5721ea0feed7a51f3d7911d11d989b56aa3a68` |
| MSI | `09cd65ac1e3af59251fb058f777edbdc7d2527f6b14a1df01d6265eab56eb58c` |
| handler | `ae7d3bfc8f5325b5bdffd40d3dfcb45ec7e2cbe42b4319b3d13fa3c4b528c18e` |
| worker | `e9e6a4d0300449800f180208b46846a136985d68643ed9e1debe3be29a1fc901` |
| [guest 증거 ZIP](https://github.com/postmelee/alhangeul-tauri/actions/runs/43259686576/artifacts/13965300396) | ID 13965300396 · `33d35b1f9e4f72b0a480bde5744ba5502e3ebcdacbf2e4106c4aee8ca4e21a34` |
| Explorer PNG | `42e59df5afca7836c96b5d3cff50c53e536f25af2478408141bbd5309c2cb6dd` |
| 공식 한국어 x64 ISO | `b7ec51f0d332ac2aa4f7faeffbefac961ce6eb7204b5876b48fa8d9f1cf0a9a6` · 8,225,404,928 bytes |

모든 다운로드 ZIP digest와 PNG digest를 대조했다. ISO 원본·VM 디스크는 공개 artifact에 포함하지 않았다.

## 잔여 위험

- 전체 Stage 3/#132는 진행 중이다. Windows 10 실제 클라이언트, Windows 11 MSI 일반 Explorer, 새 CRT 후보의 공개본→동일 버전 업그레이드는 남아 있다.
- 이번 Windows 11 시각 결과는 한 환경의 한 번 관측이다. 사용자 기준 이미지 승인·반복 안정성·고DPI·실제 한컴/VDI 전반의 수용은 아니다.
- 관리자 NSIS는 기존 지원 제외 진단이며 raw 실패 12개를 보존했다. MSI 일반 lifecycle은 통과했지만 강제 재설치 3010 후 재부팅은 미검증이다.
- 이전 오프라인 guest에 평가판 만료 watermark가 관측됐다. activation 상태/원인은 검증하지 않았고 우회하지 않았다. [Microsoft 평가판](https://www.microsoft.com/ko-kr/evalcenter/download-windows-11-enterprise)의 활성화·90일 조건은 장기 VM 운영과 별도로 관리한다.
- 공식 runner의 최소 보장 디스크와 실제 가용량은 다를 수 있다. 실행마다 KVM/55 GiB guard가 필요하며 항상 같은 자원 확보를 보장하지 않는다.

## 다음 단계 영향

[공개 저장소의 표준 GitHub runner는 무료](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)이며 이번 run은 유료/larger runner 없이 완료했다. 같은 exact artifact를 후속 추가 검증에 재사용하고 제품을 불필요하게 재빌드하지 않는다.

T7에 UTM VM 패키지·가상 디스크를 두는 구성도 가능하다([공식 이동 안내](https://docs.getutm.app/basics/actions/)). 현재 M4 Pro/ARM64 호스트에서 제공된 x64 ISO는 에뮬레이션이므로 느릴 수 있다. ARM64 Windows는 현재 x64 Shell handler 수용과 별도다. 로컬 VM 앱 설치·포맷·Windows 설치·self-hosted 등록은 수행하지 않았다.

## 승인 범위와 후속 상태

기존 이슈 해결까지 연속 진행 승인에 따라 조사·최소 수정·검증을 수행했다. PR 생성 전 알림 요구를 유지한다. 이 보고로 전체 수용이나 공개 승인을 대체하지 않으며 PR·merge·이슈 close·v0.1.3 태그 이동·Release/updater 변경은 수행하지 않았다.
