# Task #132 Stage 3.1 — GitHub 무료 hosted 자원 가능성 실험 보고

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)  
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)  
Stage: 3.1 (조사 하위 단계 완료, Stage 3 전체와 이슈는 진행 중)

## 단계 목적

사용자가 Windows PC를 제공하지 않아도 GitHub 무료 표준 runner에서 탐색기 화면 검증을 할 수 있는지 실제로 확인한다. Windows Server 결과와 Windows 10/11 결과를 구분하고, 무료 Linux runner에 Windows VM을 올릴 기본 가상화 자원이 있는지 관측한다.

## 결과

**Windows Server 2022/2025의 실제 Explorer에서 MSI로 설치한 HWP/HWPX 첫 페이지 표시와 PNG 캡처에 성공했다.** Linux에서는 KVM API를 통한 VM 객체 생성·정리에 성공했다. Windows 10/11 guest 부팅이나 표준 사용자 NSIS 화면 검증은 이번 실험에서 수행하지 않았다.

첫 관측에서는 HWP/HWPX와 대조 JPG 모두 기본 아이콘이었다. 후속 대조에서 두 Windows 이미지의 사용자별 Explorer `IconsOnly`가 DWORD 1이고, HKCU/HKLM `DisableThumbnails` 정책 값은 없는 것을 확인했다. 테스트 동안 `IconsOnly=0`을 적용하고 설정 변경을 통지하자 썸네일이 나타났다. 창을 닫은 뒤 원래 DWORD 1로 복원한 readback도 성공했다. UAC/보안 정책/제품 설치 범위는 변경하지 않았다.

에이전트가 다운로드한 원본 PNG를 이미지 도구로 직접 확인했다. 두 OS 모두 `large-hwp`의 국어 시험 첫 페이지, `form-hwpx`의 표·본문이 있는 양식, `control-jpg`의 실제 사진이 표시됐다. `small-hwp`는 원래 빈 문서이므로 하얀 페이지를 내용 판정의 양성 대조군으로 삼지 않았다. 자동 이미지 비교기는 아직 없으며 raw 상태 `captured-awaiting-review`, `releaseAcceptance=unverified`를 보존했다. 에이전트의 이미지 확인을 작업지시자의 기준 이미지 승인으로 기록하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `ci.yml`, `alhangeul-hosted-ui-probe.yml` | 수동 scope=hosted-ui-probe, fast 후 무료 Windows 2종/Ubuntu 관측. 기본 CI와 분리 |
| `scripts/ci/hosted-ui-input.mjs` | 성공 producer/source/artifact ID/digest를 고정해 기존 installer를 재사용 |
| `hosted-ui-windows.ps1`, `hosted-ui-capture.ps1` | 현재 Shell과 runner SID/session 검사, MSI 설치·캡처·API·제거, 소유 자식 시간 제한 |
| `hosted-ui-view.ps1` | 테스트 사용자 IconsOnly의 존재/값/type 저장·임시 적용·원상 복원 |
| `hosted-ui-linux.py` | 실제 KVM API/VM fd 생성·close, CPU/RAM/disk/Docker 관측 |
| `tests/ci-hosted-ui-input.test.mjs`, `windows-thumbnail-hosted-view.test.ps1` | 잘못된 producer/hash/만료 거부 및 실제 Windows 설정 적용·복원 회귀 |
| 계획·구현계획·오늘할일 | 승인 범위, 조사 결과, 미검증 범위 정렬 |

기존 표준 사용자 capture helper와 github-hosted 전용 계정 wrapper의 가드를 완화하지 않았다. 제품 source/설치 파일/upstream은 변경하지 않았다. private JSON/PNG/log는 실제 연결된 T7의 기존 task132 output에만 보관했다. Tauri 루트에서 routing 도구가 Cargo.toml 부재로 실패한 사실은 구현계획에 기록했고 routing 완료로 주장하지 않았다.

## 검증 결과

### 실행과 정확한 입력

| 구분 | 실행/결과 |
|---|---|
| 기본 표시 설정 | [43175177459](https://github.com/postmelee/alhangeul-tauri/actions/runs/43175177459), attempt 1, success, harness `84402ee703550e7a9cc95dd63f6796fd0d7a534d` |
| 설정 대조·복원 | [43176532755](https://github.com/postmelee/alhangeul-tauri/actions/runs/43176532755), attempt 1, success, harness `252a9c96d3548792d2f2960614e11e9a2fec42de` |
| 제품 source | `a2796fc0fd93002ccdcf1e5c313701525b1668c6` |
| 제품 producer/artifact | 성공 run `43102583324` / artifact `13896135792` |
| 제품 ZIP SHA256 | `df0ea77f50a2880119f5e1878be1bd98b9e0e732e4ced074c982e3f4d5d464bb` |
| MSI SHA256 | `c74fc9e632ce12d1a6012ea20d06a6261552325c5cc98a41f92383b8a9bb18c5` |

두 실행 모두 source-bound inventory를 검증한 같은 MSI bytes를 사용했다. 새 제품을 빌드하지 않았다. 후보 커밋을 먼저 push해 실험하고 본 보고서를 후속 커밋으로 연결하며 이력을 재작성하지 않는다.

### Windows 관측

| 항목 | Server 2022 | Server 2025 |
|---|---|---|
| OS build / image | 20348 / 20261101.353.1 | 26100 / 20261103.298.1 |
| token/session | elevated, integrity 12288, session 2 | elevated, integrity 12288, session 2 |
| Shell·창 owner/session 일치 | true | true |
| MSI 설치 / 제거 | 0 / 0 (두 실행 모두) | 0 / 0 (두 실행 모두) |
| force-extract | HWP 2종/HWPX/JPG 4개 성공 | HWP 2종/HWPX/JPG 4개 성공 |
| 문서 / JPG bitmap | 181×256 / 256×134 | 181×256 / 256×134 |
| 초기 PNG | 기본 아이콘만 표시 | 기본 아이콘만 표시 |
| IconsOnly=0 PNG | 실제 문서 페이지·사진 표시 | 실제 문서 페이지·사진 표시 |
| IconsOnly 원상 복원 / 소유 창 닫기 | true / true | true / true |

후속 PNG SHA256:
- Server 2022: `679388f7f1ea613e6281f8a606d773a6630c00ac986b544cdf2f88d690782f90`
- Server 2025: `e8eab54b87acd11547f0ed6b8d711d6874d40c75068e866a4d6987e70837e0b1`

### Linux 관측

두 실행 모두 x86_64, CPU 4개, KVM API 12, VM 생성/close true, TUN 존재, Docker 28.0.4다. 후속 실행의 RAM은 16,759,304,192 bytes, 여유 디스크는 92,019,445,760 bytes(약 85.7 GiB)다. QEMU 실행 파일은 기본 설치되어 있지 않았다. guestBooted=false이며 Windows 10/11은 unverified다. 이 수치는 이번 VM의 실측값이지 향후 모든 무료 runner의 보장 용량이 아니다.

### 회귀와 증거

- 로컬 automation 1,413개 통과, boundary 856 → 표시 helper 추가 후 858개 파일 통과, Action pin 검사와 actionlint 통과.
- 원격 두 실행의 fast Node/Studio·Windows PowerShell 계약 통과. 후속 PowerShell은 93 source parser와 18 isolated test를 통과했고 Explorer 설정 적용/복원 실제 roundtrip을 포함한다.
- 원본 ZIP 8개(두 run × 4개)의 SHA256를 GitHub artifact digest와 대조했다. PNG 자체 hash도 sidecar와 대조했다.
- 모든 native/제품 전체 회귀를 새로 실행한 결과가 아니다. 조사 전용 scope 결과이며 최종 릴리즈 수용과 분리한다.

후속 증거 다운로드:
- [Server 2022 화면·JSON·설치 로그](https://github.com/postmelee/alhangeul-tauri/actions/runs/43176532755/artifacts/13924871321): ZIP SHA256 `4372de73a96608bb7797f129593eb54519d1b4132f19f504c857fe915b04b522`
- [Server 2025 화면·JSON·설치 로그](https://github.com/postmelee/alhangeul-tauri/actions/runs/43176532755/artifacts/13924553372): ZIP SHA256 `77d16c7225bd5301ddcd617178442c3a29e700a54e665d4464fa8289384130f1`
- [Linux KVM·자원 JSON](https://github.com/postmelee/alhangeul-tauri/actions/runs/43176532755/artifacts/13923784918): ZIP SHA256 `01cf6b932c99803645712b12cb893ab9d8890da2d520a7768bd49dc3cf56868f`

## 본문 변경 정도 / 본문 무손실 여부

승인된 계획·기존 실험 이력을 보존하고 현재 상태와 후속 관측을 추가했다. self-hosted 안은 대안 초안으로 남겼다. 공개 제품/사용자 운영 문서를 아직 변경하지 않았으며 원시 증거의 실패/미검증 상태를 덮어쓰지 않았다.

## 잔여 위험과 다음 단계 영향

1. **사용자 PC 없이도 무료 hosted Windows Server의 실제 Explorer 관측이 가능하다.** self-hosted PC 확보를 모든 화면 검증의 선행 조건으로 둘 필요가 없다.
2. 현재 관측은 관리자 MSI다. 일반 사용자 NSIS와 실제 Windows 10/11의 제품 수용을 대체하지 않는다.
3. 자동 캡처와 API 관측은 구현됐지만, 페이지 내용 자동 비교와 사람이 승인한 기준 이미지는 아직 없다. CI success를 시각 수용 pass로 사용하면 안 된다.
4. Linux의 KVM·자원 기본 조건은 확보됐다. 다음 실험은 고정된 Windows 정식 이미지, QEMU/UEFI/TPM 준비, 실제 부팅·로그인·설치·화면 캡처다. 아직 수행하지 않았으므로 성공을 예상만으로 기록하지 않는다.
5. Microsoft는 [Windows 11 Enterprise 90일 평가판](https://www.microsoft.com/en-us/evalcenter/evaluate-windows-11-enterprise)을 안내하며 등록 절차를 명시한다. 이미지 선택·사용 조건과 provenance를 확보해야 하며 오픈소스 가상화 도구가 Windows 사용 권한을 제공하는 것은 아니다. Windows 10의 기존 평가 페이지는 확인 시 지원 종료 안내로 이동했다.
6. 실행한 자원은 공개 저장소의 무료 표준 runner뿐이다. 유료 runner/외부 클라우드/사용자 PC/비공개 저장소를 사용하거나 청구 설정을 변경하지 않았다. [GitHub 무료 표준 runner 기준](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
7. #132, Stage 3 전체, PR, 같은 v0.1.3 재릴리즈는 완료되지 않았다. PR 생성 전 알림과 최종 배포 bytes 검증 원칙을 유지한다.

## 승인 범위와 후속 상태

이번 무료 hosted 가능성 실험은 사용자가 명시 승인한 범위에서 완료했다. 별도 Windows PC 준비를 요청하지 않는다. Windows 10/11 guest 및 표준 사용자 NSIS 시각 수용은 후속 범위로 명확히 남기며, 최종 보고/PR/릴리즈로 넘어가지 않는다.
