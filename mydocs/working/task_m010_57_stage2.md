# Task #57 Stage 2 보고서 — Windows 설치별 격리 재현과 진단 검증

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 2
검증일: 2026-09-07 (KST)
작업 브랜치: `local/task57`, 분리 worktree: `.claude/worktrees/task57`
상태: 진단·증거 수집 계약 검증 완료, 단계 보고 검토 및 Stage 3 승인 대기

## 단계 목적

같은 빌드의 NSIS와 MSI를 별도 Windows VM에서 검사해 등록·직접 COM 생성과
실제 Shell 썸네일 반환을 구분하고, 사용자 보고를 재현할 수 있는 근거를 수집한다.

Stage 2.1의 실패 분석 뒤, 작업지시자는 Stage 2.2 구현 전에 단계 수용 대상을
**진단·증거 수집 계약**으로 한정하고 제품 기능 수용과 분리하는 변경을 승인했다.
이 보고서는 그 승인 기준을 적용한다. workflow 전체나 NSIS 기능의 성공 보고가 아니다.
기존 실패를 성공으로 바꾸지 않으며 #57 전체 완료·현장 해결도 선언하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/alhangeul-desktop.yml` | Windows-only 선택, NSIS/MSI 일반/MSI 강제 교체의 독립 VM, 진단 검사와 제품 실패 gate 분리 |
| `scripts/windows-installer-smoke.ps1` | installer/scenario 선택, 설치 직후·재설치 관측, 재부팅 상태별 후속 검사·rollback 제한 |
| `scripts/windows-thumbnail-fixtures.json`, `windows-thumbnail-fixtures.ps1` | 공개 문서 pin·hash, 새 복사본의 Shell/캐시/강제 추출, 무결성·원본 JSON 대조 |
| `scripts/windows-thumbnail-assessment.ps1` | 등록·COM·JPG·문서별 API 결과로 순수 분류; 원시 결과 불변 |
| `scripts/windows-installer-reboot.ps1` | MSI 종료 코드와 재부팅 표식·로그의 읽기 전용 수집·판정 |
| `scripts/windows-thumbnail-assessment-tests.ps1` | Windows PS 5.1 synthetic 회귀, summary/원본 증거 재검증 |
| `scripts/windows-thumbnail-smoke.ps1` | rollback 예상 코드 1603과 이후 재부팅·등록 정리 검사 |
| 관련 `tests/*.test.mjs`, `package.json` | 신규 source-contract 검사 및 automation suite 연결 |
| 수행·구현계획서, 오늘할일, 본 보고서 | 승인 이력·수용 범위·관측과 잔여 작업 기록 |

### 커밋과 실행의 관계

- 선행 후보: `32c903dd3d54f0388ccec81788cbdd3b2f9a68fe`,
  [run 34042095817](https://github.com/postmelee/alhangeul-tauri/actions/runs/34042095817).
  빌드 성공, NSIS 썸네일 실패, MSI 강제 재설치 3010 실패를 관측했다.
  당시 상세 결과는 구현계획서에 유지한다.
- 최종 검증 후보: `001cc3adeab003260fb7b830f6f757b53c65d489`,
  [run 34047889263](https://github.com/postmelee/alhangeul-tauri/actions/runs/34047889263), attempt 1.
- 각 후보 게시·실행은 작업지시자의 별도 “진행해줘” 승인 뒤 수행했다.
  최종 후보를 `publish/task57`에 non-force push한 뒤 원격 SHA 일치를 확인했다.
- 입력: `mode=artifact`, `artifact_platform=windows-x64`,
  `build_ref=001cc3adeab003260fb7b830f6f757b53c65d489`,
  `run_tests=true`, `publish_release=false`.
- 모든 installer artifact의 workflow SHA·requested build ref·checkout SHA는 최종 후보와 같다.
- 이 문서 커밋은 이미 승인·검증한 후보 뒤에 붙는 결과 보고다. 승인된 조기 CI 게시
  예외에 따라 후보 코드와 후속 결과 보고를 분리했으며 history를 재작성하지 않는다.
  보고 커밋 자체를 native 검증한 SHA라고 표현하지 않는다. 추가 push/dispatch는 하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

제품 NSIS/WiX 설치 코드, HKCU/HKLM 등록 모델, 썸네일 엔진과 앱 설정은 변경하지 않았다.
진단·시험의 실행 순서와 판정을 보강했고, 원시 HRESULT/bitmap 및 제품 실패 gate를 보존했다.
MSI 일반 재설치 시험은 `omus`, 강제 교체는 별도 VM의 `amus`로 명시적으로 구분했다.
이번 보고에서는 승인·상태 문서만 변경한다. #19 메인 worktree와 기존 보고서는 보존한다.

## 검증 결과

### 로컬 재검증

보고서 작성 시 아래 명령을 다시 실행했다.

```sh
node --test tests/windows-thumbnail-assessment.test.mjs tests/windows-thumbnail-diagnostics.test.mjs tests/windows-thumbnail-fixtures.test.mjs tests/windows-installer-smoke.test.mjs tests/windows-packaging.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml
git diff --check
```

- 관련 검사: **82 passed, 0 failed, 0 skipped**.
- 전체 automation: **532 passed, 0 failed, 0 skipped**.
- `Product boundary check passed (398 files scanned)`.
- actionlint 및 diff 검사: 종료 코드 0, 오류 출력 없음.
- 로컬 검사는 플랫폼 중립 검사다. 현 호스트에서 PowerShell·COM·Rust/Tauri native
  검사를 실행하지 않았으며 아래 승인된 Windows 실행의 결과와 구분한다.

### Windows 작업별 결과

| 작업 / job ID | 제품 검증 | 진단 synthetic / 증거 계약 | 관측 |
|---|---|---|---|
| Build windows-x64 / 101526127946 | 성공 | core 성공 | core fixture 11개 통과, Windows bundle 생성 |
| NSIS / 101529625309 | 실패 유지 | 성공 / 성공 | 설치·재설치·제거 0, 문서 Shell/force 12건 모두 0x80040154 |
| MSI 일반 / 101529625311 | 성공 | 성공 / 성공 | 설치·재설치·제거 0, 문서 Shell/force 성공, rollback 회귀 통과 |
| MSI 강제 교체 / 101529625268 | 재부팅 필요로 실패 유지 | 성공 / 성공 | 설치 0·재설치 3010·제거 0, 재부팅 대기 표식 관측 |

workflow 전체 conclusion은 **failure**다. 진단 gate의 성공으로 제품 gate를 우회하지 않았다.
새 Windows PowerShell 5.1 분류 회귀와 원본 증거 대조가 세 job 모두 통과했고,
미분류 실패·진단 증거 누락·기본 연결 변경은 발견되지 않았다.

#### NSIS와 MSI의 차이

- NSIS의 등록은 HKCU 전용이며 HKLM 처리기 등록은 없다. MSI는 반대다.
  설치된 DLL/worker hash·크기는 bundle verification copy와 모든 phase에서 일치한다.
- NSIS는 HWP/HWPX 연결 조회와 직접 COM 생성이 성공하고 JPG Shell/force도 성공한다.
  작은 HWP·큰 HWP·HWPX의 fresh Shell/force는 설치 직후와 재설치 뒤 모두 실패한다.
  두 phase 모두 `per-user-shell-activation-failed`, `consider-msi`로 분류됐다.
- MSI 일반은 동일 문서의 Shell/force가 두 phase 모두 181×256 bitmap을 반환했다.
  JPG는 256×134다. 설치·재설치·제거의 재부팅 표식과 로그는 모두
  `no-reboot-observed`다. 의도적 실패 주입 rollback은 예상한 1603과 정리·복원을 확인했다.
- 공통 환경은 Windows runner build 26100, image `20260824.214.3`,
  `EnableLUA=1`, elevated=true, elevationType=1, integrityRid=12288, IconsOnly=1이다.
  UAC 값 하나만으로 NSIS 실패를 설명할 수 없다.
- 사용자별 COM 등록과 Shell 실행 문맥 사이의 호환성 문제를 지지하지만,
  경로·권한·process 조건을 하나씩 통제한 인과 실험은 아니므로 단일 원인으로 확정하지 않는다.

#### 강제 교체와 재부팅

- MSI `amus` 로그는 `AlhangeulThumbnailHandler.dll`이 사용 중이라고 기록한다.
  지연 삭제와 시스템 재시작 필요 로그, 새 PendingFileRenameOperations 표식이 함께 있다.
  점유 process의 정확한 신원은 확인하지 않았다.
- 재설치 뒤 관측은 `pre-reboot-observation`으로 표시했다. bitmap 성공이 새 DLL의
  재부팅 후 동작을 증명하지 않는다. 이 job은 앱 실행과 rollback을 건너뛰었다.
- 제거 종료 코드 0과 제품 소유 상태 clean 이후에도 `reboot-pending`이 남았다.
  제품 정리와 OS 재부팅 상태를 분리한 동작이 실제 실행에서 확인됐다.

### 증거 무결성

아래 다운로드 archive SHA-256을 GitHub artifact digest와 대조했다. artifact는
14일 보존 정책이므로 ID·해시·요약을 기록하며 원본 문서나 MSI 로그는 저장소에 넣지 않는다.

| artifact ID | 역할 | archive SHA-256 |
|---|---|---|
| 9993820381 | core | `6f24bf9ab050271a8f8ba5f02dab63015b4a1974f97f628944c2ba7fbcd1aece` |
| 9994015219 | Windows bundle | `051c0085c9b0d41a4c5a32cd26e7bda5f0d62c5f20bfb21356a92f7ab7e43492` |
| 9994053205 | NSIS 진단 | `cc8910f400c95f1934d233a2c08705e07800358e527646c79b1c4ecf574fc8ab` |
| 9994048586 | MSI 일반 진단 | `6c858f134b0db46ae8138c5e7b463518dafbe87e5977ddbd76252a20fc3be195` |
| 9994045617 | MSI 강제 교체 진단 | `547eb9f2ec2678558831e5b415fa30ecbe19b0d55070493829ba4cdee67e1515` |

bundle 내부 bytes와 SHA-256도 inventory에 일치했다.

| 파일 | bytes | SHA-256 |
|---|---:|---|
| MSI | 61652992 | `43466d8dc9e4e3600a6d33ef7d3071290c7410395bc6399adf8765192012969f` |
| NSIS | 54847679 | `987e81855d614795cf1a14796b2135cb94e573b03cc7739f8b69430e9f1a6204` |
| handler DLL | 320512 | `99aef2114f52659537da566ef0973cfedfea6eaed8c97cb0ee1a1a76d0122a20` |
| worker EXE | 17583104 | `070709f060670bf2f243ccff4c6f25aa7c6141279cbdce18c5d516cfd77eff2b` |

- 세 job의 bundle inventory가 동일하다. rhwp pin은 `496333b27d21ddb9114ba9ae340bcb895870c9a7`이다.
- job별 probe 38개, 총 **114개**의 개별 JSON과 summary를 대조했다.
  phase별 환경 JSON, checkout SHA 및 workflow context도 대조했다.
- job별 fixture 무결성 32건, 총 **96건**이 unchanged이며 원래 기본 연결이 복원됐다.
  세 job 모두 설치 전·제거 후·최종 제품 소유 상태 clean이다.
- fresh cache-only의 `0x80030002`는 원시 실패로 보존했다. MSI에서는 force 이후 캐시가
  성공하지만 NSIS 문서는 여전히 실패한다. 캐시 결과를 새 생성 성공으로 대체하지 않았다.

## 잔여 위험

- NSIS 썸네일은 이 실행 문맥에서 여전히 실패한다. 엔진 무결점이나 모든 설치 환경의
  호환성을 선언하지 않는다. MSI는 검증된 대안이나 모든 client 환경의 보장은 아니다.
- 일반 Windows 10/11 Explorer UI, VDI의 성공 조건, 실제 한컴 버전별 비교는 미검증이다.
  synthetic ProgID 복원 검사는 실제 한컴 설치 호환성 시험이 아니다.
- MSI 강제 교체 후 재부팅·새 process·새 DLL 검증은 미실행이다. 정상 `omus` 통과는
  손상 복구·새 버전 업그레이드·잠긴 DLL 강제 교체의 무재부팅 완료를 뜻하지 않는다.
- 사용자 진단 진입점과 MSI 전환 안내는 아직 구현되지 않았다. #57은 열린 상태로 유지한다.

## 다음 단계 영향

- Stage 3는 구현계획서의 **수동 진단·실제 결과 기반 제한 안내·MSI 대안 안내**를 우선한다.
  standalone helper의 제공 파일·진입점·제공 경로와 회귀 범위를 먼저 확정한다.
- 수동 진단은 사용자가 명시한 문서의 임시 복사본과 JPG 대조군만 대상으로 하고,
  API 호출·캐시 영향 가능성을 고지하며 관리자 실행을 필수로 요구하지 않는다.
- 안내 위치는 기존 승인된 README, `docs/architecture/WINDOWS_THUMBNAILS.md`,
  `docs/operations/DESKTOP_RELEASE.md`를 유지한다. 새 공식 문서 루트는 만들지 않는다.
- 제품 등록 보정·NSIS 전체 사용자화는 이번 증거만으로 자동 착수하지 않는다.
  #58 선택 설치/설정, Preview Handler, 추가 원격 실행·client VM·릴리즈는 제외한다.

## 승인 요청

- Stage 2의 진단 계약 수용과 제품 실패·미검증 범위를 구분한 이 보고서를 검토하고,
  Stage 3의 수동 진단 제공 방식·제한/MSI 안내 세부계획 확정을 승인해 달라.
  아직 미정인 배포 파일·진입점까지 포괄 승인된 것으로 간주하지 않는다.
- Stage 3 구현과 필요한 Windows 추가 실행은 구체적 변경 파일·검증 범위를 제시해
  승인받는다. 이번 보고에는 코드 변경·push·dispatch·이슈 close를 포함하지 않는다.
