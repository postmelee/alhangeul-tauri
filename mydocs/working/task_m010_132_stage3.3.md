# Task #132 Stage 3.3 — NSIS Explorer timeout 원인 분리 보고

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)  
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)  
Stage: 3.3 (현재 무료 hosted 조건의 원인 분리 조사 완료, Stage 3 제품 수용은 진행 중)

## 단계 목적

작업지시자의 연속 진행 지시에 따라 NSIS 탐색기 화면 검증의 timeout을 분석하고, 무료 Windows runner에서 해결 가능한 실행 방식을 대조한다. 동시에 다운로드 중인 Windows ISO를 T7의 Mac VM에서 향후 검증에 사용할 수 있는지 확인한다.

## 결과와 원인 판단

**설치 전 빈 폴더에서도 timeout이 재현됐다. Shell COM 생성·조회는 E_ACCESSDENIED이며, COM을 제거한 일반 explorer.exe 및 /separate 실행도 종료 코드 1로 끝나 소유 문서 창을 얻지 못했다. 현재 무료 Windows hosted의 다른 사용자 로그인 desktop 조건에서는 NSIS 화면 검증을 해결하지 못했다.**

확인한 사실:

- 표준 사용자는 non-elevated, integrity 8192, session 2다. 배경 desktop Shell과 사용자의 SID가 일치하지 않는다.
- 제품 설치 전에 HKCU handler 등록이 없음을 검사한 뒤 빈 폴더를 열었다. HWP/HWPX도 없고 제품도 설치하지 않은 상태에서 Shell.Open이 약 60초 동안 반환하지 않는다.
- 설치 후 문서 폴더도 같은 지점에서 timeout이다. 네 경우(두 run × 두 OS)의 설치 전 대조군이 모두 동일하게 재현됐다.
- ShellBrowserWindow 생성은 HRESULT 0x80070005 E_ACCESSDENIED를 포함한 오류를 반환한다. 첫 실행의 직접 실행 후 ShellWindows 조회도 접근 거부다.
- ShellWindows와 ShellBrowserWindow의 AppID RunAs가 모두 Interactive User인 것을 읽기 전용으로 확인했다.
- Microsoft는 [Interactive User COM](https://learn.microsoft.com/en-us/windows/win32/com/interactive-user)이 로그인 사용자 문맥에서 실행되고, 세션 소유자와 호출자가 다를 때 기본 접근 권한이 호출자에게 허용되지 않는다고 설명한다. [Run as different user](https://learn.microsoft.com/en-us/troubleshoot/windows-client/group-policy/group-policy-not-applied-user-account-runas)는 자신의 desktop에 직접 로그인하는 것과 다르다.
- COM을 쓰지 않는 후속 native 창 탐색에서도 일반·/separate 두 프로세스는 두 OS 모두 exit 1이다. 각 15초 관측 구간에서 고유 시험 폴더 marker를 가진 창 후보를 얻지 못했다.

이 증거로 **현재 timeout에 제품 설치나 문서 렌더링이 필요하지 않으며, 다른 사용자 desktop에서 Explorer를 활성화·제어하는 경계가 주된 장애**라고 판단한다. 내부 COM 대기의 정확한 서버 thread/lock까지 추적한 것은 아니다. 호출 thread는 반복 표본에서 Wait/UserRequest였다. 이를 deadlock의 증명이나 모든 Windows의 제한으로 확대하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `hosted-ui-capture.ps1` | 설치 전 빈 폴더, 실행 방식별 단계·시간·thread, 실제 소유 창 캡처 |
| `hosted-ui-launch.ps1` | 최대 12회 × 5초 child 관측, thread/window 표본, timeout 뒤 같은 사용자 문맥에서 설정 복구 |
| `hosted-ui-window.cs` | 고유 시험 marker의 native 창 열거, 창 상태·닫기·foreground API |
| `hosted-ui-process.ps1` | 일반·/separate Explorer 실행 후 COM 없는 native HWND 관측 |
| `hosted-ui-standard*.ps1` | 설치 전 대조, COM AppID 읽기, 설치 후 네 방식과 기존 API/제거 |
| `windows-thumbnail-hosted-launch.test.ps1` | 실제 임시 Form의 handle/PID/가시성 검증, 다른 marker·닫힌 창 배제 |
| `alhangeul-hosted-ui-probe.yml` | 기존 192px MSI 비교 유지, 다른 실험 레이아웃은 별도 미승인 상태로 기록 |

native 소유 창을 얻었을 때의 키보드 표시·PNG 경로도 구현했으나 이번에는 창을 얻지 못해 그 부분을 실제 수행하지 않았다. 단축키 성공이나 native PNG 수용을 주장하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

제품 source/upstream/설치 범위/배포 파일을 바꾸지 않았다. 이전 보고를 보존하고 기존 impl의 현재 상태와 오늘할일, 본 조사 보고만 갱신한다. UAC, DCOM RunAs/보안 정책, HKLM 제품 등록, 전역 Explorer/dllhost, 실제 로그인 desktop을 변경하지 않았다.

## 검증 결과

### 실행과 exact 입력

| 항목 | 값 |
|---|---|
| 첫 대조 | [43212274409](https://github.com/postmelee/alhangeul-tauri/actions/runs/43212274409), attempt 1, success |
| 첫 harness | `0f6f8e68684637a23da8d0197b39cb2382ac7b83` |
| COM 없는 직접 실행 대조 | [43214335047](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047), attempt 1, success |
| 후속 harness | `5095fa45fffb7d8c83b6f6e5db625ab0a0be5d51` |
| 재사용 제품 source | `a2796fc0fd93002ccdcf1e5c313701525b1668c6` |
| 성공 producer / artifact | `43102583324` / `13896135792` |
| ZIP SHA256 | `df0ea77f50a2880119f5e1878be1bd98b9e0e732e4ced074c982e3f4d5d464bb` |
| NSIS SHA256 | `1d439358949785485c28a8a4815d76490cd37d65523abbbd37aa88c6918c220b` |
| MSI SHA256 | `c74fc9e632ce12d1a6012ea20d06a6261552325c5cc98a41f92383b8a9bb18c5` |

원격 실행을 위한 후보 커밋 후 결과 보고 커밋에서 SHA를 연결한다. 설치 bytes는 동일하며 provenance/inventory와 설치 DLL/worker hash를 확인했다.

### 후속 run 결과

| 시험 | Server 2022 | Server 2025 |
|---|---|---|
| 설치 전 빈 폴더 Shell.Open | 60,184ms, timeout | 60,123ms, timeout |
| 설치 후 문서 Shell.Open | 60,102ms, timeout | 60,044ms, timeout |
| ShellBrowserWindow 생성 | E_ACCESSDENIED, 약 2.2초 | E_ACCESSDENIED, 약 3.0초 |
| 일반 explorer.exe + native HWND | exit 1, 창 없음, 약 16.4초 | exit 1, 창 없음, 약 16.4초 |
| /separate + native HWND | exit 1, 창 없음, 약 16.3초 | exit 1, 창 없음, 약 16.3초 |
| NSIS 설치 / 재설치 / 제거 | 0 / 0 / 0 | 0 / 0 / 0 |
| NSIS force-extract | 4/4 성공 | 4/4 성공 |
| 제품 디렉터리·handler 등록 제거 | true | true |
| 임시 account / profile / scratch 제거 | 모두 true | 모두 true |
| MSI 설치·제거 / API | 0·0 / 4/4 성공 | 0·0 / 4/4 성공 |
| MSI HWP/HWPX/JPG 화면 비교 | 3/3 matched | 3/3 matched |

첫 run의 일반 직접 실행 관측은 /separate 실행 뒤 COM 창 조회를 사용했다. 그 접근 거부를 직접 창 실행 실패로 결론 내리지 않고 후속에서 COM을 제거했다.

모든 timeout의 child raw `restored=false`를 보존했다. 관측 부모가 같은 임시 사용자 문맥에서 원래 값의 부재를 복원하고 `preferenceRecovered=true`로 별도 기록했다. 나머지 방식은 child finally에서 복원했다. 부모의 `ownedWindowsClosed=true`는 남은 해당 사용자·marker의 Explorer 창이 없다는 검사이며, 원래 창 생성 성공을 의미하지 않는다.

NSIS의 `visual=unverified`, comparison `unavailable`, `releaseAcceptance=unverified`를 유지한다. workflow success는 관측과 정리 절차의 완료이며 화면 수용이 아니다.

### 회귀와 보존 증거

```sh
pnpm run test:automation
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-hosted-ui-probe.yml
git diff --check
gh workflow run ci.yml --ref publish/task132 -f scope=hosted-ui-probe -f profile=fast
```

- 로컬 두 후보 automation 각각 1,414개, boundary 867 → 868 files, actionlint/diff 통과.
- 원격 두 run fast 성공. 후속 Windows는 98 source parser/19 isolated test, Node automation 1,414, upstream 39, Studio 43 test files와 build 통과.
- 새 Windows 회귀는 실제 Form의 native handle/PID/가시성, 없는 marker 및 Dispose 이후의 부재를 확인했다. Explorer 성공의 대체 증거는 아니다.
- 두 run의 제품 API 합계 32/32 성공. MSI 네 PNG는 sidecar hash·임시 기준 비교·창 닫기·IconsOnly 원복을 확인했다.
- 원본 ZIP 12개를 GitHub SHA256 digest와 대조했고 원시 JSON, PNG, run metadata, fast 로그를 T7 기존 task132 output에 보존했다. Mac에서 native Rust/Tauri 빌드·검증은 수행하지 않았다.
- 후속 Linux KVM API 12, VM fd 생성/close true, CPU 4, RAM 16,760,344,576 bytes, free disk 92,019,163,136 bytes. guestBooted=false, Windows 10/11 unverified다.

| 후속 artifact | ID | ZIP SHA256 |
|---|---|---|
| [hosted-ui-windows-2022-msi](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047/artifacts/13943206687) | `13943206687` | `57708c981168e796e9f8688f754607bc80948133e2df15bb8a433411443cd825` |
| [alhangeul-fast-windows-script-contracts](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047/artifacts/13943191412) | `13943191412` | `081e4018892298873451a07ccac225ca3c804ed4867d964a0c06549a5c45c41b` |
| [hosted-ui-windows-2025-msi](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047/artifacts/13943136691) | `13943136691` | `73348379f27cf5be3a2d4e92a0f442302b2c1e6841bf48345ccbff19fbe35854` |
| [hosted-ui-linux-capability](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047/artifacts/13942563729) | `13942563729` | `d8e37db94326ac30d1608b2457605e3fd04df75e9ec6fc251ae85ec5ba198c38` |
| [hosted-ui-windows-2025-nsis](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047/artifacts/13942479688) | `13942479688` | `aa730c5d46d0586b5ff21ae7bf60cb9c3d33343fdd07d077d00f9347a70b8ecf` |
| [hosted-ui-windows-2022-nsis](https://github.com/postmelee/alhangeul-tauri/actions/runs/43214335047/artifacts/13942459524) | `13942459524` | `945a4d7a52832cab5b55df1772776bc1f0780682d23b2954a636af250b5b203b` |

## 잔여 위험

- 현재 무료 Windows hosted에서 다른 사용자 계정만 생성하는 방식으로 실제 NSIS Explorer 화면을 얻지 못했다. timeout 연장이나 COM 열거 제거만으로 해결되지 않는다.
- 실제 표준 사용자 로그인 desktop의 Windows 10/11 수용은 남아 있다. 무료 Linux KVM Windows guest는 아직 부팅하지 않았으므로 완주 가능성을 확정하지 않는다.
- 소유 창 자체를 얻지 못했으므로 native 키보드 표시/캡처 경로와 그 레이아웃의 이미지 기준은 미검증이다.
- 전체 Stage 3, #132, PR, 같은 v0.1.3 재릴리즈는 미완료다.

## 다음 단계 영향 — T7의 Windows VM 활용

현재 Mac을 읽기 전용으로 확인한 결과 M4 Pro(ARM64), 메모리 24GB다. T7은 APFS이며 확인 시 여유 약 437GiB였다. 사용자 다운로드 중인 ISO의 실제 경로/에디션/아키텍처는 아직 전달받지 않았다.

**T7에 Windows 가상 디스크와 VM 패키지를 두고 Mac에서 실행하는 구성은 가능하다.** [UTM은 외장 디스크로 VM 이동](https://docs.getutm.app/basics/actions/)을 지원한다. VM 앱은 Mac에, ISO·VM 디스크·스냅샷·검증 자료는 T7에 두는 구성을 제안한다. 초기 메모리 8GB, 가상 디스크 100~128GB는 설정 제안이며 실제 설치/성능 검증 결과가 아니다.

| 구성 | 현재 목적에 대한 판단 |
|---|---|
| UTM + Windows x64 | 다운로드 중인 x64 ISO와 현재 x64 제품 검증에 맞는다. M4에서는 CPU 에뮬레이션이므로 느릴 수 있다 |
| ARM64 Windows VM | 하드웨어 가상화로 빠르지만 Windows 아키텍처가 달라 현재 x64 Explorer/handler 수용과 별도로 취급한다 |
| 무료 Ubuntu hosted + KVM x64 Windows | KVM 기본 자원은 확인했다. ISO 출처·hash·사용 조건 확보 후 실제 부팅/로그인/캡처 실험이 필요하다 |

[UTM 공식 안내](https://getutm.app/)는 무료·오픈소스, ARM64 가상화와 x86/x64의 느린 에뮬레이션을 구분한다. [Fusion의 Apple Silicon 조건](https://knowledge.broadcom.com/external/article/315602)은 ARM guest만 지원하므로 현재 x64 ISO를 직접 실행하는 대안으로 삼지 않는다.

Windows VM 내부에서 해당 테스트 사용자로 실제 로그인한 상태를 만들고 Windows guest 안에서 제품 검증을 실행한다. Mac 제품 지원이나 macOS native 빌드 범위를 추가하는 것이 아니다. 향후 VM 안에 [self-hosted runner](https://docs.github.com/en/actions/concepts/runners/self-hosted-runners)를 둘 수도 있다. GitHub 사용료는 무료지만 Mac/T7/VM 가동과 사용자 로그인 상태를 유지해야 한다. [Windows Enterprise 평가판](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise)은 90일이며, 장기 사용은 평가판 기간과 별도의 정식 사용 권한을 고려해야 한다.

이번에 VM 앱 설치, 디스크 포맷, Windows 설치, self-hosted runner 등록은 수행하지 않았다. 사용자에게 다운로드 완료 후 ISO 경로/에디션/아키텍처를 요청했고, 확보되면 provenance 확인부터 이어갈 수 있다. 이번 두 실행은 공개 저장소의 무료 표준 runner만 사용했다.

## 승인 범위와 후속 상태

연속 진행 승인 안에서 현재 hosted의 원인 분리와 가능한 호출 경로를 실험했다. 다음 실제 Windows guest 검증에는 ISO 입력이 필요하다. PR 생성 전 알림과 최종 릴리즈 bytes/태그 변경 승인 경계를 유지한다.
