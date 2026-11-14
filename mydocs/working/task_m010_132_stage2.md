# Task #132 Stage 2 — NSIS 잠금 정리와 지원 환경 필수 검증

GitHub Issue: [#132](https://github.com/postmelee/alhangeul-tauri/issues/132)
구현계획서: [task_m010_132_impl.md](../plans/task_m010_132_impl.md)
Stage: 2
상태: 구현·자동 기능 회귀 완료. Stage 3의 실제 Explorer 화면 수용은 미완료.

## 단계 목적

Stage 1에서 확인한 표준 사용자 NSIS 제거 시 처리기 DLL 잔존을 수정한다.
사용자가 선택한 일반 사용자 NSIS·관리자 MSI 정책에 맞춰 실제 bitmap과 제품 자체 제거를
필수 조건으로 검사한다. Stage 1의 공개 설치본도 표준 사용자 bitmap 생성은 성공했으며,
이번 제품 수정 대상은 일시적인 DLL 잠금에 따른 설치·제거 생명주기 결함이다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| apps/desktop/src-tauri/windows/thumbnail-cleanup.nsh, nsis-hooks.nsh | 설치·제거 전 최대 60초 대기, 제거 후 소유 DLL 삭제 재시도, 실패 1603, 빈 설치 폴더만 정리 |
| scripts/windows-thumbnail-cleanup-regression.ps1, tests/fixtures/thumbnail-cleanup.nsi | 실제 NSIS compiler로 잠금 해제/영구 잠금 × 대기/삭제 4개 회귀 |
| scripts/windows-thumbnail-user-{context,probe}.ps1, user-{input,acceptance}.mjs | 고정 bytes·일반 사용자 token·새 설치/반복 재설치/공개본 업그레이드/제품 제거의 엄격한 판정 |
| scripts/windows-thumbnail-user-visual.{ps1,cs}, tests/windows-thumbnail-owned-process.test.ps1 | 같은 사용자·session의 Explorer만 관측, 별도 자식 45초 제한, 미완료 checkpoint 보존 |
| .github/workflows/ci.yml, alhangeul-{artifacts,artifact-platform,windows-smoke}.yml 및 scripts/ci | 표준 사용자 필수 job, 최초 공개본 재설치 opt-in, 현재 실행 증거·upload·최종 gate 결속 |
| scripts/ci/ubuntu-mirror.py, 관련 tests/workflows | hosted Ubuntu DNS 실패 시 고정 HTTPS 미러와 기존 archive keyring 서명 검증을 거친 fallback |
| README.md, docs/architecture/WINDOWS_THUMBNAILS.md, docs/operations의 기존 문서 | 설치 형식별 지원 조건, API·화면·릴리즈 수용 구분 |
| 계획서·오늘할일 | 승인 선택, 실패 원인·재검증 조건·실제 결과 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 변경은 Windows NSIS hook과 분리한 55줄 helper다. currentUser/HKCU 등록,
관리자 MSI/HKLM 경계, Rust renderer/handler/worker와 upstream pin은 그대로 유지했다.
Explorer/dllhost 종료, 전역 캐시 삭제, UAC 변경, 격리 해제, 무관한 파일 재귀 삭제는 추가하지 않았다.
기존 문서의 지원 조건·검증 기준만 보완하고 새 공식 문서 루트는 만들지 않았다.
이전 실패와 원시 결과를 삭제하거나 성공으로 소급 변경하지 않았다.

## 검증 결과

최종 제품·harness source: `a2796fc0fd93002ccdcf1e5c313701525b1668c6`.

실행 명령:

```bash
pnpm run test:automation
pnpm run check:product-boundary
actionlint -shellcheck='' .github/workflows/*.yml
git diff --check
gh workflow run ci.yml --ref publish/task132 -f profile=full -f thumbnail_same_version_upgrade=true
```

[최종 full run 43102583324](https://github.com/postmelee/alhangeul-tauri/actions/runs/43102583324),
attempt 1, 전체 success. 이 보고서 commit은 위 검증 source 뒤에 추가되는 문서 commit이다.
native 검사는 Windows/Linux CI에서 수행했으며 Mac에서 Rust desktop/Tauri를 실행하지 않았다.

| 검증 | 실제 결과 |
|---|---|
| Node·upstream·Studio | automation 1,412, upstream 39, Studio 290 passed; Studio build·boundary 831 files 통과 |
| Windows PowerShell | parser/격리 회귀 통과; 소유 자식 exit 0/7 보존, 3,034 ms timeout 후 종료 확인 |
| Windows native | document-preview·desktop·worker·handler Rust test/clippy, core probe, Tauri bundle 통과 |
| Linux x64·arm64 | core·native·package lifecycle·artifact upload 통과 |
| 실제 NSIS 잠금 회귀 | 대기 해제 2,245 ms, 삭제 해제 2,030 ms에 exit 0; 영구 잠금 60,250/60,210 ms에 1603 |
| 잠금 회귀 보존 | 네 경우 모두 무관한 파일 보존; 대기와 timeout에서 기존 내용 보존; 성공한 삭제에서만 대상 제거 |
| 표준 사용자 fresh | 24개 probe, 문서 bitmap 12개 181×256, JPG 4개 256×134, install/reinstall/uninstall exit 0 |
| 공개 v0.1.3 → 같은 버전 후보 → 반복 재설치 | 36개 probe, 문서 bitmap 18개 181×256, JPG 6개 256×134, baseline/install/reinstall/uninstall exit 0 |
| 두 NSIS 경로의 제품 제거 | productUninstallPassed=true, 설치 폴더·handler 등록·잔여 파일 없음, 시험 도구의 잔여 DLL 삭제 없음 |
| 공개본 재설치의 사용자 데이터 | Local/Roaming AppData 합성 sentinel 두 개의 hash가 제거 이후까지 보존됨 |
| 관리자 MSI 일반 경로 | strict-product 통과, raw exit 0·failureCount 0·thumbnail/lifecycle passed |
| 관리자 NSIS 관측 | raw exit 1·실패 12개, thumbnailStatus=not-accepted 유지; 알려진 제한의 진단 계약만 통과 |
| MSI 강제 재설치 관측 | raw exit 1·실패 1개, 3010 reboot-required·post-reboot-unverified 유지 |
| 최종 집계 | 네 격리 설치 job의 평가·증거 upload·필수 gate와 전체 artifact result 통과 |

NSIS 표준 계정은 medium 8192/elevated=false, x64 STA, session 2,
Windows build 26100.33674/image 20261103.298.1이었다. API 검사는 고유 fixture 복사본의
Shell/force-extract를 사용했다. 재설치는 설치기를 직접 `/S /UPDATE`로 실행한 자동화이며,
설치 wizard를 사람이 조작한 GUI 수용이나 동일 버전 updater 알림 검증이 아니다.
합성 파일 보존은 installer의 비삭제 검사이며 실제 앱 설정 UI의 의미를 검증한 것은 아니다.


보고서 추가 후 product boundary 850 files, 상대 링크·검증 source·artifact digest·설치 binary hash
대조와 git diff --check도 통과했다. 동일 제품 검사를 문서 추가만으로 반복하지 않았다.

### 검증한 제품·증거 식별자

| 대상 | 식별자 |
|---|---|
| Windows 제품 artifact | ID 13896135792 / sha256:df0ea77f50a2880119f5e1878be1bd98b9e0e732e4ced074c982e3f4d5d464bb |
| 후보 NSIS | SHA256 1d439358949785485c28a8a4815d76490cd37d65523abbbd37aa88c6918c220b |
| 설치된 handler, 320,000 bytes | SHA256 3dc269ad4163509817d8e6cb533f497a3fcffb655b20cde3c388b90d34db3e1e |
| 설치된 worker, 40,396,800 bytes | SHA256 1cef26def67a82dd7c8e6e32afa9a9fd4d7480da3016085c4113b212370d3acc |
| 최초 공개 v0.1.3 NSIS | source bcb892d49a9003615f3acd980babd71e59e147dd / SHA256 932c3316d9ea83cd5c38e3fe528518535751ac60fedd72776c5306085437c490 |
| 표준 사용자 evidence | ID 13896560758 / sha256:51d81c75c53e306a4fb7e8943f2917a5a64b82f07ed24b3becaa4525e4a108e4 |
| NSIS 잠금 evidence | ID 13894704957 / sha256:38ee8e79131d24f2024b48cbd81b60360af2717d8c6462a76f40f6372a43b3e8 |
| MSI 일반 evidence | ID 13896126759 / sha256:d1e72d784cdd18d365da2c2f3023de00eec3079f0b91bf91bbfb33073b18c0dc |
| 관리자 NSIS evidence | ID 13896361110 / sha256:2a0823478eccc90873a15b3fe5bc82fcdd2397f39cd1d42a8c04597b34d196e2 |
| MSI 강제 재설치 evidence | ID 13897035193 / sha256:c14373069c91b75d89f34d11a0277153a6e774386460e19292b63b8492c43579 |

증거 archive의 다운로드 SHA256을 GitHub metadata와 대조하고 raw JSON을 읽었다.
제품 installer/DLL/worker와 fixture hash는 해당 job의 입력·설치·평가에서 확인했다.
원시 자료는 T7 private output에 보존하며 저장소에는 포함하지 않는다.

### 실패 실행의 처리

- 43061139226: 공개본 재설치 36개 probe 뒤 Explorer 관측 timeout. 최종 제거 증거가 없어 실패 유지.
  a2796fc0에서 관측 자식의 제한·소유 desktop 사전 검사·checkpoint를 보완했다.
- 43074541367: 제품 검사 뒤 90분 제한으로 cache 저장 중 취소. 저장 완료된 exact source target cache를
  API로 확인한 뒤 재검증했고, 최종 run에서 동일 key 복원을 실제 로그로 확인했다.
- 43089630194: Linux 양쪽 artifact 생성 요청이 HTML을 반환해 5회 재시도 뒤 실패.
  Windows support upload도 장기 지연해 실행을 취소했다. 제품 수용으로 재사용하지 않았다.
- 43101751100: 같은 source fast와 작은 artifact의 upload/download hash 대조로 전송 복구를 확인했다.
  이후 별도 run ID 43102583324의 새 제품·증거로 전체 수용을 다시 검사했다.
- 선행 DNS·미러 403 실패와 모든 후보·보정 순서는 구현계획서에 보존했다.
  변경하지 않은 font-performance workflow의 shellcheck SC2016은 별도 기존 경고다.

## 잔여 위험

- Explorer 관측은 preflight의 interactive-shell-owner-mismatch로 unavailable이다.
  interactive=true/session 2였지만 desktopOwnerMatches=false이며 캡처 파일은 없다.
  실제 Windows 10/11 화면과 첫 페이지 표시를 수용한 것으로 기록하지 않는다.
- 관리자 NSIS 실패와 MSI 3010 이후 재부팅 상태는 미해결/미검증 범위를 그대로 유지한다.
- 이 ordinary build의 성공은 새 서명 installer bytes·게시·같은 버전 updater 수용이 아니다.
- v0.1.3은 같은 version을 자동 업데이트로 판단하지 않아 재배포 시 기존 사용자의 수동 재설치가 필요하다.

## 다음 단계 영향

Stage 3의 API·설치 생명주기 증거는 확보했다. 실제 Explorer 수용 환경은 현재 없다는
작업지시자 답변을 기록했다. 기존 수행계획의 화면 조건을 유지할지 명시적으로 후속 검증으로
이관할지 답변 전에는 Stage 3 완료·최종 보고·PR 생성·이슈 close로 진행하지 않는다.
기존 v0.1.3 tag/asset/feed는 보존한다. 같은 버전 재배포는 별도 구체적 배포·복구안을 확정해야 한다.

## 승인 적용

이슈 해결까지 연속 진행 승인에 따라 Stage 2 구현과 검증을 완료했다.
PR 생성 전 보고 약속은 유지하며, 실제 Explorer 수용 기준 변경에 대한 답변을 기다린다.
