# Task #132 Stage 3.6 — cold 시작 수정과 Windows 10/11 실제 Explorer 검증

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)  
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)  
Stage: 3.6

## 단계 목적

설치 직후 첫 Windows 썸네일 요청 실패의 원인을 측정하고 최소 수정한 제품으로 Windows 10/11의 NSIS 새 설치, MSI 일반 설치, 최초 공개본에서 동일 버전 NSIS 업그레이드를 검증한다.

## 결과와 원인

Windows 프로세스 생성에 든 시간이 기존 시작 포함 1,500ms 예산을 소진했다. [cold 대조 run43400996382](https://github.com/postmelee/alhangeul-tauri/actions/runs/43400996382)에서 정확한 DLL의 GetThumbnail은 1,946ms 뒤 실패했지만 worker는 실제 4.262ms만 실행됐다. 별도 재설치 직후 raw Worker의 Process.Start는 2,862ms, preview 완료는 2,873ms, 정상 완료는 2,882ms였다. 생성 지연의 OS 내부 원인이나 특정 보안 제품 책임까지 확정한 결과는 아니다.

Windows handler는 frame 선택 deadline을 `min(요청 시작+5,000ms, worker 준비+1,500ms)`로 계산하도록 수정했다. 렌더링 시간·256MiB·단일 프로세스 Job·COM 격리를 유지하고 이미 만료한 시작 뒤 늦은 frame을 거부한다. OS 생성 API와 종료·pipe join을 포함한 전체 호출 반환 시간이 엄격히 5초 이내라는 보장은 아니다. Linux의 1,500ms 예산은 유지했다.

같은 Windows 11 guest에서 최초 공개본 small-hwp 요청은 0x8004B200/6,665ms로 실패했지만 수정본 교체 직후 첫 요청은 bitmap 181×256/5,070ms로 성공했다. 나머지 세 fixture도 첫 요청에 성공했으며 실패 후 진단 재시도·추가 재설치는 실행되지 않았다. 첫 worker ETW 수명은 공개본 10.824ms, 수정본 27.072ms다. Shell API 전체 경과와 handler 내부 예산은 다른 측정 구간이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/thumbnail-handler/src/process/mod.rs` | Windows 시작/선택 예산 분리와 3개 회귀 |
| `apps/desktop/src-tauri/src/pdf_temp_cleanup.rs` | cfg별 link/reparse 판정을 보존하며 Rust 1.100 Clippy 통과 |
| `scripts/ci/guest-ui-*`, 관련 tests | MSI 관리자 경계, 두 OS/prerequisite, 공개본 업그레이드, 원시 실패·cold/ETW 진단 |
| `scripts/ci/hosted-ui-input.mjs` 및 source 고정 파일 | 성공 생산 run과 정확한 새 artifact 고정 |
| `hosted-ui-capture.ps1` 및 관련 helper | API warm-up 없는 동일 Explorer 창의 10/30/60초 원본 보존 |
| `docs/architecture/WINDOWS_THUMBNAILS.md`, `docs/operations/CI_VALIDATION.md` | 시간 예산과 실제 guest 관측·판정 범위 |
| 기존 계획서·오늘할일 | 실패 이력, 성공 근거, 재배포 인계 |

## 본문 변경 정도 / 본문 무손실 여부

사용자별 NSIS/HKCU, MSI/HKLM, UAC/DCOM, 메모리·격리 경계를 보존했다. 전역 Explorer/dllhost 종료나 캐시 삭제로 성공을 만들지 않았다. 기존 실패와 이전 제품 수용은 역사적 기록으로 유지하며 새 제품 결과로 소급 변경하지 않았다. 문서는 승인된 기존 위치와 mydocs 내부 보고서에만 작성했다.

## 검증 결과

실행 명령:

```sh
pnpm run test:automation
pnpm run check:product-boundary
pnpm run check:action-pins
actionlint -shellcheck=
git diff --check
gh workflow run ci.yml --ref publish/task132 -f profile=full -f thumbnail_same_version_upgrade=true
gh workflow run ci.yml --ref publish/task132 -f scope=windows-guest-probe -f profile=fast -f guest_os=windows11 -f guest_scenario=nsis-upgrade
```

마지막 명령은 각 OS/시나리오로 실행했다. native Rust/Tauri는 Windows/Linux CI에서만 실행했다.

- 제품 source: `ece8bb5e46a1a81e4d74ad2f1dbf84bde7fd59d4`; guest harness: `92ed2d2b2d132e5ba25fd17d56503a20654b63cd`.
- [full run43453382283](https://github.com/postmelee/alhangeul-tauri/actions/runs/43453382283), attempt 1 전체 success.
- automation 1,421, Studio 290/43 files, Windows PowerShell 117 sources/24 isolated tests 통과.
- Windows/Linux x64/arm64 native test·Clippy·core·package와 설치 계약 통과. Windows handler의 warm/cold 예산, 전체 예산 상한, 만료 뒤 queued bitmap 거부 회귀 3개 통과.
- Linux symlink와 Windows junction 보존 회귀가 실제 지원 OS에서 통과했다.
- 일반 사용자 NSIS 새 설치·공개본 수동 업그레이드의 strict bitmap/제품 제거 gate 통과.
- MSI 일반 raw exit 0/failureCount 0, 합성 타사 연결 보존·주입 rollback 통과. 관리자 NSIS는 원래 제한 12개 실패를 그대로 보존한 진단 계약이다.
- MSI forced-reinstall은 3010/reboot-required이며 재부팅 이후 수용은 미검증으로 유지한다.

### 실제 client matrix

각 행은 별도 fresh VM, 동일 제품 bytes, attempt 1이다. Windows 10은 build19045, Windows 11은 build26300 Enterprise Evaluation x64다. 로그인 표준 사용자 medium8192/elevated=false와 실제 Shell/창 SID·session 일치를 확인했다. MSI 설치만 protected SYSTEM 고정 작업으로 실행했다.

| OS | 경로 | 성공 run | 최초 후보 API | 화면10/30/60초 |
|---|---|---|---|---|
| Windows 11 | NSIS 새 설치 | [43469292558](https://github.com/postmelee/alhangeul-tauri/actions/runs/43469292558) | reinstall4/4 | 모두 내용 확인 |
| Windows 11 | MSI 일반 설치 | [43469285593](https://github.com/postmelee/alhangeul-tauri/actions/runs/43469285593) | reinstall4/4 | 모두 내용 확인 |
| Windows 11 | 공개본 → 동일 버전 NSIS | [43469281208](https://github.com/postmelee/alhangeul-tauri/actions/runs/43469281208) | upgrade4/4·reinstall4/4 | 모두 내용 확인 |
| Windows 10 | NSIS 새 설치 | [43473883158](https://github.com/postmelee/alhangeul-tauri/actions/runs/43473883158) | reinstall4/4 | 모두 내용 확인 |
| Windows 10 | MSI 일반 설치 | [43469304414](https://github.com/postmelee/alhangeul-tauri/actions/runs/43469304414) | reinstall4/4 | 모두 내용 확인 |
| Windows 10 | 공개본 → 동일 버전 NSIS | [43469298756](https://github.com/postmelee/alhangeul-tauri/actions/runs/43469298756) | upgrade4/4·reinstall4/4 | 모두 내용 확인 |

모든 성공 행에서 오프라인 install/reinstall/uninstall exit 0, API 4/4, 설정 복원·제품 제거·소유 VM 종료·private disk/credentials 삭제를 확인했다. NSIS 업그레이드 두 행은 최초 후보 요청 4/4와 Local/Roaming 두 sentinel 보존, ETW session/raw ETL 정리도 통과했다. 화면은 사전 API warm-up 없이 10/30/60초를 보존했고 서로 다른 PNG를 에이전트가 직접 검토했다. small-hwp 원본 preview는 빈 페이지이므로 내용 양성 대조에서 제외했지만 API bitmap 성공은 필수로 확인했다.

새 설치 네 행은 VC runtime 부재/error126 상태에서도 exact handler load0과 설치·API·화면이 성공했다. 업그레이드는 공개본용 VC prerequisite를 준비했고 Windows 10은 WebView2도 준비했다. 공식 고정 hash, Microsoft Authenticode Valid, 설치0을 확인했으며 이 prerequisite 준비와 제품 오프라인 설치를 구분한다.

### 정확한 제품 bytes

| 대상 | bytes / SHA256 |
|---|---|
| Windows ZIP artifact14059615097 | 186401417 / `e799040e52d81e670eda4ed9080c7d8f6a3a0d1321c1088cf68a2f8f17ba0bb9` |
| NSIS | 78766221 / `ac9de3fb957f862019ad90c6d24abb11905d0bef3abc583a100dc27fe3d06f3f` |
| MSI | 91357184 / `0a64700f8bf9a140c355b924f3b924a2f5e4a75cd79af9b38881b058edb40d02` |
| handler | 417792 / `de7c3dd0dc43151881fa23157ef787bff957c7b031354ccd652dea6946176119` |
| worker | 40733696 / `6911f3bd2e4c702646fc52eeba64160d93af9e640bfcd7be3c520a2be3c65a67` |

각 archive digest, producer/source/harness, inventory, installer와 실제 설치 binary를 독립 대조했다.
| run / artifact | 증거 ZIP SHA256 | 화면 SHA256 (10/30/60초) |
|---|---|---|
| 43469292558 / 14060223459 | `f6d3da753f5ba40cfc0fd26c879d0fbd8344b49e6d9d30a1ebfb530ab985a7cf` | `32e7d88a1683b20ebd99b3f969d30251095b3cedac198671ad18372503e41fc4` |
| 43469285593 / 14061632483 | `5e8fd45664f43a7ca51ce0e07b5daf2c839ff141dbba235b62a8a604cedbc3b4` | `0c1f2f4384d3c3ee7db7b21af543644522117654b1d5839c86192c3f29ddce4e` / `f0242b75b8390b563cf73a9cdc459170290daeccb6db3a7be9c0031cf9ec272a` |
| 43469281208 / 14060088697 | `df28ac830014332211bf1a6583ad0d705730a794051d587e4ef90adc8bbdb463` | `39663f96fd8a7ab4d4a39b1b96029d27c8bb035456f6fd01210f2113bafee6ac` |
| 43473883158 / 14062488370 | `06689455b43dc373eac5ec79f410d9ab83a8cf53d862ebe39e657f06aea19e8e` | `05c92e4d2f5b792015a9454e9ec12dca53bc75d14dba1073652e0b39bde2a9a6` |
| 43469304414 / 14060253005 | `9312e1249b405ad2e164975102b9f8b000f763f0a64ac0f35c648aabfcfe14b6` | `05c92e4d2f5b792015a9454e9ec12dca53bc75d14dba1073652e0b39bde2a9a6` |
| 43469298756 / 14061332716 | `9e0e643bb54c82adc1db0b99ff345cd07f4cf0dd46229c562c77852cc1c2de4e` | `05c92e4d2f5b792015a9454e9ec12dca53bc75d14dba1073652e0b39bde2a9a6` |

Windows 11 MSI는 10/30초와60초 두 PNG의 hash가 다르지만 세 시점 모두 문서 내용이 보였다. 다른 행의 세 PNG는 각 행 안에서 동일한 hash다. 원시 JSON/PNG와 독립 검산은 T7 private output에 보존하며 공개 저장소에 추가하지 않았다.

### 실패·재실행의 보존

- 이전 제품1e08891d의 Windows 11 첫 요청·HWPX 아이콘 실패와 warm 진단 성공을 분리 보존했다. 상세 run·hash·측정은 구현계획서에 있다.
- d0a896ba full43405485144는 Linux ARM64 Clippy needless_bool 실패 후 작업지시자의 이동 요청으로 취소됐다. ece8bb5e에서 동작을 보존하며 수정하고 새 full을 통과했다.
- Windows 10 NSIS run43469311200은 120~1140초 동일 부팅 로고로 정체됐고 guest.json이 없어 앱 미실행이다. checkpoint14061837820과 최종 artifact14060404415를 보존하고 취소했다. 소유 프로세스·디스크 정리 및 업로드는 success다. 같은 코드/제품의 새 VM run43473883158 결과로 해당 경로를 검증했으며 원래 실패를 성공으로 바꾸지 않았다.
- 기존 Windows 설치/UEFI 오류와 WMI 이벤트 시각 한계도 삭제하지 않았다. WMI를 worker 수명 근거로 사용하지 않으며 ETW와 실제 child 수명 대조를 사용했다.

## 잔여 위험

- 공개 fixture·지정 OS build·표준 DPI 관측이며 모든 Windows update/PC/실제 한컴/고DPI 조합이나 사용자 golden 승인을 뜻하지 않는다.
- 무료 runner의 OS 부팅 정체가 한 번 발생했고 내부 원인은 미확정이다. 자원·네트워크·평가판 조건을 장기 운영 보장으로 해석하지 않는다.
- 관리자 NSIS 지원과 MSI forced-reinstall 후 재부팅 수용은 제외 범위다.
- ordinary artifact 결과는 최종 updater 서명 bytes·공개 승인·동일 버전 자동 업데이트 수용이 아니다.
- 기존 font-performance workflow의 shellcheck SC2016은 이번 변경과 무관한 경고이며 actionlint는 shellcheck를 제외해 확인했다.

## 다음 단계 영향

Stage 4 최종 보고와 PR 전 알림으로 이어간다. 동일 v0.1.3은 자동 업데이트 대상이 아니며 최종 서명 파일·MSI 교체·태그/asset/Pages·복구안을 배포 전에 별도로 확정한다. 기존 공개 11개 asset 보관본은 보존했다.

## 승인 범위와 PR 전 보고

이슈 해결까지의 연속 진행 승인으로 구현·검증을 수행했다. 사용자 요청대로 PR 생성 전에 최종 보고하며 이 문서가 PR·merge·이슈 close·태그 이동·재배포 승인을 대신하지 않는다.
