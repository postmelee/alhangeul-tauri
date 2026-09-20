# Task #57 Stage 3 보고서 — 수동 썸네일 진단 도구와 제한 안내 검증

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 3
검증일: 2026-09-07 (KST)
작업 브랜치: `local/task57`, 분리 worktree: `.claude/worktrees/task57`
상태: 수동 진단·증거 계약 검증 완료 — 보고 검토 및 Stage 4 진입 승인 대기

## 단계 목적

Stage 2에서 관측한 사용자별 COM/Shell 실패를 사용자가 명시한 문서에서도 안전하게
진단하고, 실제 결과에 따라 MSI 대안을 안내한다. 승인된 Stage 3 범위는 독립 지원 묶음·
수동 진단·안내이며 installer 등록 모델이나 엔진의 수정이 아니다.

단계 수용은 사전 승인한 진단 계약과 Windows 패키지 실사용 검증에 한정한다.
이 검사는 모두 통과했다. NSIS 제품 실패와 MSI 강제 교체의 재부팅 필요는 그대로 남기며,
workflow 전체 성공·현장 해결·#57 전체 완료·릴리즈 승인을 선언하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-thumbnail-check.ps1` | 문서·JPG·새 결과 폴더·명시적 동의의 사용자 진입점, 묶음 무결성·종료 코드 |
| `scripts/windows-thumbnail-check-support.ps1` | 로컬 입력 보호·임시 복사·원본 무결성·비식별 probe·안전한 정리 |
| `scripts/windows-thumbnail-check-assessment.ps1` | 1문서+JPG 10개 probe의 순수 분류, 기존 CI 19-probe 기준 보존 |
| `scripts/build-windows-thumbnail-support.mjs` | Windows 전용 지원 묶음 생성, 12개 payload와 manifest의 정확한 파일·해시 계약 |
| `scripts/windows-thumbnail-check-tests.ps1` | PS 5.1 반례·입력·정리·개인정보 검사, 실제 suite process의 성공/실패 종료 코드 회귀 |
| `scripts/windows-thumbnail-fixtures.ps1` | 최초 CI 관측 뒤·재설치 전 제공 묶음 그대로 공개 문서 3종 검사 |
| `.github/workflows/alhangeul-desktop.yml` | 별도 support artifact, native 회귀와 원시 증거 대조; 기존 제품 gate 유지 |
| `tests/windows-thumbnail-check.test.mjs`, `tests/windows-thumbnail-support.test.mjs`, `package.json` | 플랫폼 중립 계약 검사와 automation 연결 |
| `README.md`, `docs/architecture/WINDOWS_THUMBNAILS.md`, `docs/operations/DESKTOP_RELEASE.md` | 시험용 진단·한계·MSI 전환 안내, 승인된 기존 문서 위치 유지 |
| 수행·구현계획, 오늘할일, 본 보고서 | 승인·실패 보완 이력·검증 근거·Stage 4와 #58 경계 |

### 후보와 원격 실행

- Stage 3.1: `b4fa125bccaad03e0aabf025fe861b488bde5105`,
  [run 34052696931](https://github.com/postmelee/alhangeul-tauri/actions/runs/34052696931).
  build와 묶음 생성은 성공했지만 테스트의 의도적 자식 종료 코드가 남아 suite가 실패했다.
  installer/Shell 검사는 skipped였으며 이 실행을 패키지 실사용 통과로 수용하지 않았다.
- 종료 코드 보완 최종 후보: `f1cdd0711f747b443c723a750f868faa5c0349f1`,
  [run 34056210236](https://github.com/postmelee/alhangeul-tauri/actions/runs/34056210236), attempt 1.
  모든 assertion과 finally 정리 뒤에만 `exit 0`을 반환하고 실제 suite process도 검사한다.
  잘못된 묶음 입력의 nonzero와 사용자 진단의 실패 코드 1·2는 보존한다.
- 각 구현·후보 커밋과 각 게시·1회 실행은 별도로 “진행해줘” 승인을 받았다.
  최종 실행 분석 뒤 같은 지시로 이번 Stage 3 보고와 Stage 4 잔여 범위 정리를 승인받았다.
- 실행 입력: `mode=artifact`, `artifact_platform=windows-x64`,
  `build_ref=f1cdd0711f747b443c723a750f868faa5c0349f1`,
  `run_tests=true`, `publish_release=false`.
- 세 installer job의 workflow SHA·requested build ref·checkout SHA가 최종 후보와 같다.
  원격 게시 브랜치는 `publish/task57`이며 force push·release/updater 게시를 하지 않았다.
- 본 보고 커밋은 검증한 후보의 후속 문서 기록이다. 승인된 조기 CI 후보 게시에 따른
  코드/결과 보고 분리를 유지하며 history를 재작성하지 않는다. 보고 SHA를 native 검증 SHA로
  표현하지 않는다. 이번 보고 턴에는 소스 변경·추가 push/dispatch가 없다.

## 본문 변경 정도 / 본문 무손실 여부

제품 NSIS/WiX·등록 Rust·엔진·앱 설정은 변경하지 않았다. 설치 여부나 활성화 UI는 #58 소유다.
기존 진단 의존 파일 7개를 재사용하고, 명시된 단일 문서의 임시 복사본만 처리한다.
등록 범위·DLL/worker reference가 맞지 않으면 문서 API 실행을 생략하며 자동 승격·등록 변경·
설치·업로드·전역 캐시 삭제를 하지 않는다. 원본 파일명·경로·hash·내용을 보고서로 내보내지 않는다.

기존 VDI 성공 기록과 새 격리 검사 실패를 함께 보존했다. 이번 보고 작성에서는 기존 제품
문서를 다시 고치지 않는다. 그 문서의 “이번 변경 Windows 실검증 전” 표현은 당시 후보 상태이며,
Stage 4에서 검증 SHA와 함께 갱신할 대상이다. 이전 단계 보고서와 #19 작업은 보존한다.

## 검증 결과

### 보고 시 로컬 재검증

```sh
node --test tests/windows-thumbnail-check.test.mjs tests/windows-thumbnail-support.test.mjs tests/windows-thumbnail-assessment.test.mjs tests/windows-thumbnail-diagnostics.test.mjs tests/windows-thumbnail-fixtures.test.mjs tests/windows-thumbnail-registration.test.mjs tests/windows-packaging.test.mjs tests/actions-workflows.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
actionlint -shellcheck='' .github/workflows/alhangeul-desktop.yml
git diff --check
```

- 대상 검사: **104 passed, 0 failed, 0 skipped**.
- 전체 automation: **560 passed, 0 failed, 0 skipped**.
- product boundary: **405 files scanned**, 통과. actionlint·diff 검사 통과.
- 플랫폼 중립 검사만 현 호스트에서 실행했다. PowerShell/C#·Rust/Tauri·실제 묶음 생성은
  아래 Windows 실행의 증거이며 로컬에서 실행한 것으로 표현하지 않는다.

### Windows 결과

| 작업 / job ID | 제품 판정 | 진단 검사 | 핵심 결과 |
|---|---|---|---|
| Build / 101548472463 | 성공 | core 성공 | 11 fixture, Windows native 검사·bundle·support 생성 성공 |
| NSIS / 101552855188 | 실패 유지 | 모두 성공 | 설치·재설치·제거 0; 문서 Shell/force 12건 0x80040154 |
| MSI 일반 / 101552855193 | 성공 | 모두 성공 | 설치·재설치·제거 0; 문서 Shell/force 성공; rollback 회귀 통과 |
| MSI 강제 교체 / 101552855143 | 재부팅 필요로 실패 유지 | 모두 성공 | 설치 0·재설치 3010·제거 0; 문서 bitmap 성공, OS 재부팅 대기 |

workflow conclusion은 **failure**다. `manualTests`, `manualEvidence`, `diagnosticContract`는
세 job 모두 success다. continue-on-error 단계의 표시만 보지 않고 `step-outcomes.json`의
실제 smoke outcome 및 summary를 대조했다. NSIS와 강제 교체는 실제 failure를 유지한다.

- 새 process 종료 코드 회귀가 세 job에서 통과했다. 이전 통과 문구/실패 종료 불일치는 해소됐다.
- 수동 진단은 공개 작은 HWP·큰 HWP·HWPX 각각을 JPG와 함께 실행했다. 총 9회 모두
  `phase=complete`, `referenceStatus=matched`, `integrity=true`, `cleanup=true`다.
- NSIS의 세 문서는 `registrationScope=user-only`, `per-user-shell-activation-failed`,
  `consider-msi`, **exit 1**이다. JPG와 직접 COM/연결은 성공하고 문서 Shell/force는 실패했다.
- MSI 두 job의 세 문서는 `registrationScope=machine-only`, `thumbnail-api-ok`,
  **exit 0**이다. 수동 도구의 `lifecycleStatus`는 모두 `not-tested`로 유지한다.
  별도 installer의 재부팅 결과를 수동 도구가 시험했다고 주장하지 않는다.
- MSI 일반의 실패 주입 rollback은 예상 코드 1603으로 동작했다. 일반 설치·재설치·제거에서는
  `no-reboot-observed`이며 기본 연결과 제품 소유 상태 정리 검사를 통과했다.
- 강제 교체의 새 pending-file-renames 표식·지연 작업·restartRequired 로그가 3010과 일치한다.
  재설치 뒤는 `pre-reboot-observation`; 제거 0·제품 상태 clean 뒤에도 `reboot-pending`이다.
  실제 재부팅·그 이후 새 DLL 동작은 검증하지 않았다.
- 공통 문맥은 Windows build 26100, image `20260824.214.3`, EnableLUA=1,
  elevated=true, elevationType=1, integrityRid=12288, IconsOnly=1이다.
  실제 한컴이 아니라 synthetic ProgID 복원 입력을 사용했다. UAC나 한글 버전 하나를 원인으로 확정하지 않는다.

### 산출물·증거 무결성

다운로드 완료된 archive 6개의 SHA-256을 GitHub digest와 대조했다. 지원 묶음은 14일
임시 검증물이며 공개 release asset이 아니다. 개인 문서나 원시 MSI 로그를 저장소에 넣지 않는다.

| artifact ID | 역할 | archive SHA-256 |
|---|---|---|
| 9996228852 | core | `a76918e57289ceb504d2f1d6aa40b783c68c038f1022d206911459988ccc415e` |
| 9996501824 | Windows bundle | `ccd578fb0b09f816cc6381defb5cfecf1909199e3360c0dbc761fa21f20a4c46` |
| 9996500164 | thumbnail support | `9bd87968e1791a8cca9e170e6db995ea8734823ae39e33da87172cb4d832d155` |
| 9996550485 | NSIS 진단 | `8ddfe85ed1f16cd3ca5a06b6eec000daf9e282ca6f7c4dff2da93a7a639e1302` |
| 9996548751 | MSI 일반 진단 | `79fbdd03202d17d4c3af8d02f8e91cfd6232ce09cbd4bb4da1f9da861db4d8fa` |
| 9996546631 | MSI 강제 교체 진단 | `ac0d544a5604b4aecfc77bdc3a2fd8d0ee604163a4b4fecd262f83d31a0e7c12` |

| bundle 파일 | bytes | SHA-256 |
|---|---:|---|
| MSI | 61652992 | `8d54fb8268f26fedc65d36cdd7df4b5019a5e27ead6efb2a124ccab996033e71` |
| NSIS | 54852733 | `ded5ac9a91f4ca95cbb632ec7588a354d36459fb00975af7cf7dbd76d4e029b2` |
| handler DLL | 320512 | `d1d0c1e5ab0738ac195424c2bb29232ef1f074fdc147ac77cb52b31ba0a9473e` |
| worker EXE | 17583104 | `21264ba7fcdd901f78e65c4e1b8a6204d0d684306bc5ab0beed3eb6a2cc855e2` |

- bundle 4개 파일의 bytes/hash와 support inventory가 일치한다. support는 manifest 포함
  정확히 13개 파일이며 12개 payload의 hash·크기·source SHA를 확인했다.
- 기존 CI probe 114개와 수동 probe 90개, 총 **204개**의 개별 JSON과 summary를 대조했다.
  수동 state **18개**, CI fixture 무결성 **96건**, 수동 결과 9개의 등록·참조·종료 코드를 확인했다.
- 수동 실행 전후 등록 snapshot이 같고 DLL/worker bytes/hash가 inventory와 맞는다.
  모든 job의 `FinalCleanCheck`, `ProbeEvidenceCheck`, 기본 연결 보존 검사는 통과했다.
  clean은 제품 소유 파일·등록 정리 기준이며 강제 교체의 OS 재부팅 완료를 뜻하지 않는다.
- rhwp pin은 `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 유지했다.

## 잔여 위험

- NSIS 실패는 해결되지 않았다. 사용자별 등록과 Shell 문맥의 호환성 가설을 지지하지만
  단일 원인 인과 실험이나 모든 PC에서의 재현 보장은 아니다.
- Windows 10/11 일반 로그인 Explorer, 실제 한컴, VDI 성공 조건과 MSI 전환 UI 절차는
  이번 CI 범위 밖이다. API 성공은 실제 아이콘 모양·내용의 시각 수용을 대신하지 않는다.
- MSI 3010 이후 재부팅·새 process·새 DLL 검증은 미실행이다. MSI 일반 성공만으로
  모든 복구·업데이트·파일 잠금 시나리오가 무재부팅이라고 보장하지 않는다.
- 진단 원본은 보호하지만 처리기가 실행되고 Windows 캐시에 내용이 남을 수 있다.
  임시 복사본 정리는 전역 캐시 삭제가 아니다. 비민감 샘플과 명시적 동의가 필요하다.
- unsigned support의 hash는 출처 인증이 아니다. 같은 run·source SHA·artifact digest를
  확인해야 하며 만료 후 재빌드한 bytes를 이 근거와 동일시하지 않는다.
- #58의 “포함 설치·활성 상태에서 실제 Shell 생성” 수용 기준은 NSIS의 현재 제한과
  충돌할 수 있다. 토글 성공·COM 등록 성공만으로 그 수용 기준을 충족했다고 쓰지 않는다.

## 다음 단계 영향

- Stage 4 제안은 기존 run의 exact SHA·bytes 근거를 재사용해 승인된 공식 문서 5곳의
  검증 상태를 정합화하고, 현장 미검증 항목과 #58 경계를 문서화하는 것이다.
  구체적 파일·검증·승인 경계는 구현계획서 Stage 4의 실행안에 둔다.
- #58에는 설치됨/등록 활성/실제 API 동작 상태의 분리, HKCU/HKLM 권한·다른 사용자 영향,
  제3자 소유 등록 보존, 사용자 선택의 업데이트 보존, 3010·부분 실패·재부팅 대기를 인계한다.
  새로운 registry state schema나 권한 helper 구현을 이 보고에서 확정하지 않는다.
- NSIS 전체 사용자 설치는 **추가 검증·별도 설계 승인 필요**로 분류한다.
  불필요하다고 확정하지도, MSI 성공만으로 자동 도입하지도 않는다.

## 승인 요청

- Stage 3의 진단 도구 수용과 제품 실패·현장 미검증을 분리한 보고를 검토하고,
  Stage 4의 문서 정합화·기존 증거 재사용·플랫폼 중립 회귀·#58 인계 정리를 승인해 달라.
- 이번 승인 요청에는 추가 Actions·client VM/VDI 실행·재부팅·제품 등록 변경·#58 구현·
  최종 PR 게시·issue close·릴리즈를 포함하지 않는다. 각각 필요한 시점에 별도 승인받는다.
