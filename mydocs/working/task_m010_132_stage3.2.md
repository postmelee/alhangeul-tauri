# Task #132 Stage 3.2 — 무료 hosted 잔여 검증 보고

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)
Stage: 3.2 (가능성 조사 하위 단계 완료, 실제 Windows 수용 Stage 3 전체는 진행 중)

## 단계 목적

작업지시자의 “남은 검증도 진행가능하면 진행” 지시에 따라 표준 사용자 NSIS의 실제 탐색기 창 관측을 시도하고, 앞서 확인한 MSI 화면에 자동 내용 비교를 연결한다. Windows ISO는 아직 없으며 작업지시자는 무료 평가판 준비 안내를 요청했다.

## 결과

**Server 2022/2025의 관리자 MSI 화면 자동 비교와 표준 사용자 NSIS 설치·재설치·API·제거를 통과했다. 표준 사용자 NSIS 화면은 두 OS 모두 Explorer 폴더 열기에서 시간 초과되어 미검증이다. Windows 10/11 guest도 미검증이다.**

CI success는 이 관측 절차의 완료를 뜻한다. 이미지 비교의 기준은 에이전트가 확인한 임시 기준이며, 작업지시자의 최종 시각 수용 승인이나 릴리즈 승인으로 기록하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/ci/hosted-ui-standard.ps1` | disposable hosted의 임시 Users 계정, exact NSIS 입력, child token, 계정/profile/scratch 정리 |
| `scripts/ci/hosted-ui-standard-child.ps1` | 표준 사용자 설치·같은 버전 재설치·4 fixture API·엄격한 제품 제거, 90초 캡처 한도 |
| `hosted-ui-windows.ps1`, `hosted-ui-capture.ps1` | 정의 재사용과 실험용 표준 사용자 창 관측. 실제 창 SID/session 검사 유지 |
| `scripts/ci/hosted-ui-image.py` | 외부 패키지 없는 PNG 해독과 고정 1000×650 화면의 내용 영역 비교 |
| `tests/fixtures/explorer-visual-reference.json` | OS별 HWP/HWPX/JPG 내용 fingerprint, 기준 run/source/artifact/PNG hash |
| `tests/windows-thumbnail-visual.test.py`, `tests/ci-hosted-ui-image.test.mjs` | PNG filter·손상·영역·투명도·잘못된 기준·음성 대조군 검증 |
| `alhangeul-hosted-ui-probe.yml` | 무료 Server 2종 × MSI/NSIS matrix, 임시 이미지 비교와 미검증 보존 |

원래 정식 표준 사용자 visual helper의 desktop owner gate는 변경하지 않았다. 실험 플래그는 다른 사용자의 배경 desktop이 존재하는 상태를 기록하되, 캡처할 창 자체의 owner/session 검사는 유지한다.

## 본문 변경 정도 / 본문 무손실 여부

제품 source/NSIS 정책/upstream/배포 파일을 바꾸지 않았다. 기존 plan·Stage 3.1 보고는 보존하고 구현계획의 현재 상태와 오늘할일만 갱신한다. 공개 운영 문서의 수용 완료 주장을 추가하지 않는다. 원본 실패·timeout·미검증을 덮어쓰지 않는다.

## 검증 결과

### 실행과 입력

| 항목 | 값 |
|---|---|
| 첫 관측 | [43207576327](https://github.com/postmelee/alhangeul-tauri/actions/runs/43207576327), attempt 1, success |
| 첫 harness | `f564d1bfcd24bffbb31441c1eb1a99e1fd2c610d` |
| 환경 전달·비교 보완 | [43209155519](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519), attempt 1, success |
| 후속 harness | `57ce3d75f4bb999b914e733a34881954fcdfb104` |
| 재사용 제품 source | `a2796fc0fd93002ccdcf1e5c313701525b1668c6` |
| 성공 producer / artifact | `43102583324` / `13896135792` |
| ZIP SHA256 | `df0ea77f50a2880119f5e1878be1bd98b9e0e732e4ced074c982e3f4d5d464bb` |
| MSI SHA256 | `c74fc9e632ce12d1a6012ea20d06a6261552325c5cc98a41f92383b8a9bb18c5` |
| NSIS SHA256 | `1d439358949785485c28a8a4815d76490cd37d65523abbbd37aa88c6918c220b` |

원격 실행을 위해 후보 커밋을 먼저 push하고 결과 보고 커밋에서 해당 SHA를 연결했다. source-bound inventory와 실제 설치 DLL/worker hash를 검증했다. 제품 rebuild/full 검증을 반복하지 않았다.

### Windows 관측

| 항목 | Server 2022 | Server 2025 |
|---|---|---|
| MSI 설치 / 제거 | 0 / 0 | 0 / 0 |
| MSI force-extract | 4/4 성공 | 4/4 성공 |
| MSI HWP/HWPX/JPG 이미지 비교 | 3/3 matched | 3/3 matched |
| MSI IconsOnly 원상 복원 / 소유 창 닫기 | true / true | true / true |
| NSIS token | non-elevated / integrity 8192 | non-elevated / integrity 8192 |
| NSIS 설치 / 같은 버전 재설치 / 제거 | 0 / 0 / 0 | 0 / 0 / 0 |
| NSIS force-extract | 4/4 성공 | 4/4 성공 |
| NSIS 제품 잔여 디렉터리·handler 등록 없음 | true | true |
| NSIS 실제 Explorer 화면 | unavailable | unavailable |
| 임시 account / profile / scratch 제거 | true / true / true | true / true / true |

후속 run의 API는 네 job 합계 16/16이다. HWP 2종/HWPX는 181×256, JPG는 256×134 bitmap을 반환했다.

첫 NSIS 관측은 `capture-child-failed`였고 capture sidecar가 없었다. 별도 사용자 환경에 hosted marker가 전달되지 않는 경로를 보완하고 stdout/stderr를 보존했다. 후속 raw는 `interactive=true`, session 2, `desktopOwnerMatches=false`, `phase=open-folder`에서 멈췄다. 두 OS 모두 90초 후 소유 capture PowerShell만 종료했으며 `visualFailure=owned-child-timeout`, `visual-comparison.status=unavailable`이다. 실제 창 owner/session/PNG를 얻지 못했다.

NSIS capture가 강제 종료되어 그 child의 finally는 실행되지 않았다. raw의 `displayPreference.restored=false`와 `windowClosed=false`를 그대로 보존한다. 설정은 신규 임시 사용자 profile에만 적용됐으며 이후 부모가 해당 profile·계정·scratch를 모두 제거했다. MSI의 원상 복원 성공과 혼동하지 않는다. 전역 Explorer/dllhost 종료나 UAC/HKLM 변경을 사용하지 않았다. 이 실험만으로 표준 사용자 자신의 로그인 desktop에서도 실패한다고 결론 내릴 수 없다.

### 이미지 판정과 회귀

- 내용 영역은 JPG 사진, HWPX 양식, large HWP 첫 페이지다. small HWP는 빈 문서이므로 양성 내용 기준에서 제외했다.
- 기준은 Stage 3.1의 run `43176532755`, harness `252a9c96d3548792d2f2960614e11e9a2fec42de`다. 원본 PNG/artifact hash와 실제 기본 아이콘의 fingerprint를 fixture에 기록했다.
- 실물 PNG 비교: 기본 아이콘 run `43175177459` 두 OS는 mismatch, 기준 run과 첫 후속 관측 run 두 OS씩 네 이미지는 matched. 결과·hash는 T7 private evidence에 보관했다.
- 6개 Python 테스트에서 RGB/RGBA의 5개 PNG filter, 잘림/CRC 손상/후행 bytes, viewport/영역 오류, 투명 영역, 불완전·지나치게 허용적인 기준을 거부했다. 모든 기준에서 실제 아이콘·흰색·검정·다른 문서 fingerprint가 허용 오차를 벗어났다.
- 최종 CI의 MSI 6개 영역 모두 matched. Server 2025 JPG 차이 0.002077은 한도 0.025 이내이며 나머지 영역 차이는 0이다. 새 원본 PNG 둘도 에이전트가 직접 확인했다.
- `referenceApproval=provisional-agent-reviewed`, `releaseAcceptance=unverified`, raw `captured-awaiting-review`를 유지한다. 고정 화면/배율/공개 fixture의 회귀이며 모든 문서·테마·OS의 일반 판정기가 아니다.

실행 명령:

```sh
python3 -B tests/windows-thumbnail-visual.test.py
pnpm run test:automation
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-hosted-ui-probe.yml
git diff --check
gh workflow run ci.yml --ref publish/task132 -f scope=hosted-ui-probe -f profile=fast
```

로컬 automation 1,414개, Python 6개, boundary 864 files, actionlint/diff 통과. 원격 fast의 automation 1,414개, upstream 39개, Studio 43 test files 및 build, Windows PowerShell 95 sources/18 isolated tests를 통과했다. native Rust/Tauri 검증을 Mac에서 실행하지 않았다.

Linux는 CPU 4개, RAM 16,759,300,096 bytes, free disk 92,019,343,360 bytes, KVM API 12, VM fd 생성/close true다. QEMU 기본 설치 없음, guestBooted=false다.

### 보존 증거

두 run의 artifact ZIP 12개를 내려받아 GitHub digest와 SHA256를 대조했다. 후속 MSI PNG hash는 sidecar와 대조했다. run metadata와 fast 로그, JSON/PNG는 기존 T7 task132 output에만 보관했다.

| 후속 artifact | ID | ZIP SHA256 |
|---|---|---|
| [hosted-ui-windows-2022-nsis](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519/artifacts/13941485023) | `13941485023` | `be941502fa78ca5e8c0dbdd24d0e4b2bc9b624752666e211002076ab0d45170f` |
| [hosted-ui-windows-2022-msi](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519/artifacts/13940388293) | `13940388293` | `d5f30e532629d408c2307f05ee1d62b2d20c149c3216989e9489ab06dd727d31` |
| [hosted-ui-windows-2025-nsis](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519/artifacts/13939658594) | `13939658594` | `8a9cbbd984b53be7fca2d4e1341c95846dd49959b2f751cb489d07a94d58ac82` |
| [hosted-ui-linux-capability](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519/artifacts/13939653214) | `13939653214` | `2318efdfa62267cdc2bd3f2df7896f4f28efc25762b3ca2399ed30fff8c8a8d9` |
| [alhangeul-fast-windows-script-contracts](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519/artifacts/13939309127) | `13939309127` | `fc53a07ba42f9d137468787b5542aeac89d0a4f2c46c8db6ed2909bdbb442267` |
| [hosted-ui-windows-2025-msi](https://github.com/postmelee/alhangeul-tauri/actions/runs/43209155519/artifacts/13939174654) | `13939174654` | `8d1a58f3aa7ce639eb7530e15843e26ea57f55fd943903cbf466516b691a308a` |

후속 MSI PNG SHA256:
- Server 2022: `bf919301d0dfc0364c8f49023920a5f5783876e50fbca40491db2fc5bba75b53`
- Server 2025: `aa3a8ad82603771c8df0ae6d59979ffe92ac28633247a482cad9a9b5fb2d7a39`

## 잔여 위험

- Windows 10/11 guest 부팅·로그인·표준 사용자 Explorer와 실제 제품 시각 수용은 미검증이다.
- 무료 hosted의 관리자 desktop에서 다른 표준 사용자 COM 폴더 열기는 이번 조건에서 시간 초과됐다. API 성공으로 화면 성공을 대체하지 않는다.
- 자동 이미지 기준에 작업지시자의 최종 승인은 없다.
- 같은 v0.1.3 재릴리즈와 exact 최종 배포 bytes 검증은 아직 진행하지 않았다. #132와 Stage 3 전체는 완료가 아니다.

## 다음 단계 영향 — 무료 평가판 준비

1. [Microsoft Windows 11 Enterprise Evaluation Center](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise)에서 Download the ISO를 선택하고 사용자가 직접 등록한다.
2. Windows 11 Enterprise **x64 ISO**를 선택한다. 공식 안내는 90일 평가이며 별도 제품 키가 필요하지 않다고 명시한다. 개인 등록 정보·계정 암호를 저장소나 CI에 넣지 않는다.
3. 연결된 T7에 ISO를 보관하고 파일명/경로를 전달한다. 현재 Mac에 Windows를 설치할 필요는 없다. 확보 후 원본 SHA256·Microsoft 출처·평가 사용 조건을 기록하고 GitHub Linux VM 부팅 실험을 이어간다.
4. Windows 10의 기존 평가판 다운로드 주소는 확인 시 [Microsoft 지원 종료 안내](https://blogs.windows.com/windowsexperience/2024/10/31/how-to-prepare-for-windows-10-end-of-support-by-moving-to-windows-11-today/)로 이동한다. 현재 다운로드 가능한 무료 평가판이라고 단정하지 않는다. 사용 권한을 가진 별도 정식 이미지나 사용자 Windows 10 검증 경로가 필요하다.

이번 실행은 공개 저장소의 무료 표준 hosted runner만 사용했다. 유료 runner/외부 클라우드/청구 변경은 없다. Windows guest 전체 자동화가 무료 자원 제한 안에서 완료되는지는 아직 실험하지 않았다. [GitHub hosted runner 기준](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)

## 승인 범위와 후속 상태

사용자의 연속 진행 지시 안에서 가능한 hosted 조사를 완료했다. ISO 등록·확보가 필요한 guest 작업과 최종 수용은 남겨 둔다. PR 생성 전 알림, 별도 릴리즈 입력·tag/asset 변경 승인 경계를 유지한다.
