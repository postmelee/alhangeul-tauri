# Task #57 Stage 6.1.2 완료 보고 — 최소 설치 검증 연결과 테스트 전용 artifact 전달

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 6.1.2
작성일: 2026-09-17
상태: 재조정된 범위 구현·검증 완료, 단계 보고 검토 및 6.1.3 진입 승인 대기

## 단계 목적

Stage 6.1.1의 순수 판정을 실제 Windows 설치 증거와 CI 종료 조건에 연결한다.
원시 실패를 보존하면서 알려진 제한의 진단 계약 통과와 제품 기능 성공을 구분한다.
작업지시자가 승인한 `21d15fe`·`4a130e3` 범위 재조정에 따라 독립 재다운로드·재검산
고도화는 #67로 분리하고, #57에는 실제 개별 검사·경량 상태 집계·안전한 추가 테스트용
artifact 전달만 남겼다. #67 완성이나 NSIS 제한 해결을 이 단계 완료로 주장하지 않는다.

## 산출물

| 파일 / 영역 | 변경 요약 |
|---|---|
| `scripts/windows-installer-acceptance-*.ps1`, `scripts/ci/installer-input*.mjs`, `installer-evidence.mjs` | 실제 증거 수집·진단 read-back·입력 binding·순수 평가 연결. raw 종료 코드와 계약 결과 분리 |
| `.github/workflows/alhangeul-windows-smoke.yml`, `scripts/ci/installer-status.mjs` | NSIS/MSI/forced-reinstall 격리 job 유지; 현재 run/attempt와 필수 step·upload 성공을 확인하는 경량 종료 gate |
| `scripts/ci/profiles.mjs`, `artifact-result.mjs` | `contract_status=passed`, `product_observation=see-scenario-evidence` 확인. 독립 재검산 완료·릴리즈 수용으로 확대하지 않음 |
| `scripts/verify-workflow-artifact.mjs`, `scripts/ci/producer-metadata.mjs`, `artifact-handoff.mjs` | 성공 producer·exact source/run/attempt/artifact 확인, `additional-validation-only` 전달 |
| `.github/workflows/alhangeul-installer-reuse.yml`, `scripts/ci/installer-reuse-input.mjs` | 동일 bytes의 digest/inventory 확인 후 개별 계약 재평가. 원시 실패·upload 실패 보존 및 마지막 gate |
| `.github/workflows/alhangeul-windows-pdf.yml` | 테스트 전용 전달 및 inventory source SHA 확인. Desktop/CI 두 producer만 허용하며 설치·선택 시나리오·cleanup 유지 |
| `tests/ci-*.test.mjs`, Windows PowerShell·PDF 관련 회귀 | 잘못된 source/attempt/bytes, 누락·실패·skip, 업로드 실패, 제품 성공 오표시 거부 및 소비자 연결 검사 |
| 기존 독립 집계/replay/producer guard 모듈 | #67 참고 구현·결정적 회귀로 보존. 활성 workflow의 필수 경로에서는 분리; 고도화 수용 미완료 |
| 계획 두 문서·오늘할일·본 보고서 | 승인·검증 후보·이전 실패·현재 한계·다음 단계 상태 정합화 |

## 본문 변경 정도 / 본문 무손실 여부

이번 단계는 CI 판정과 소비자 연결 변경이다. 앱 UI·썸네일 엔진·NSIS 사용자별/MSI 설치
정책을 바꾸지 않았다. Linux/updater 전용 artifact의 공용 verifier 계약을 보존했다.
원시 HRESULT/bitmap/종료 코드/실패 목록은 성공으로 덮어쓰지 않았다.

단계 중간의 소스 커밋은 실제 원격 검증을 위해 먼저 게시했다. `2c7ea77`부터 `6ffb3af`까지
승인된 중간 이력을 같은 `local/task57`에 보존하고, 이 마감 커밋에는 보고·상태 문서만 담는다.
이미 게시된 소스를 squash/rebase/force push하여 보고서와 소급 결합하지 않는다.
기존 문서의 실패·이전 계획은 이력으로 유지하며 공식 문서 수정은 6.1.3에 남긴다.

## 검증 결과

### 최신 후보와 실제 실행

검증 코드 SHA: `6ffb3afce47608bf512f4145ec741d9ce8137eb4`.

| 실행 | 결과 / 수용 범위 |
|---|---|
| [fast 35113599791, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35113599791/attempts/1) | 성공. automation 950개, Windows PowerShell 66 source·9 격리 회귀, Node/Studio 검사·빌드 |
| [Windows open-only 35114102129, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35114102129/attempts/1) | 성공. 기존 `6f5c939` 제품의 handoff·digest/inventory·NSIS 설치·HWP 6쪽/HWPX 10쪽 문서 식별·열기·제거·정책 복원·upload. PDF 내보내기는 미실행 |
| [full 35115949615, attempt 1](https://github.com/postmelee/alhangeul-tauri/actions/runs/35115949615/attempts/1) | 성공. exact `6ffb3af`의 Windows/Linux x64/arm64 core·native/package, fast, 세 설치 계약, 경량 상태 gate·최종 집계 |

full의 별도 `fast`/`installer`/`Unit tests` 진입은 profile 분기로 skipped이며, 실제 검사는
`artifacts / fast`, 플랫폼 build/core, smoke 아래서 수행했다. 추가 context 실험은 비활성화다.
최종 출력은 `contract_status=passed`, `product_observation=see-scenario-evidence`다.

### full의 설치별 관측 — 모든 기능 성공을 뜻하지 않음

| 시나리오 / job | raw 결과 | 계약 결과 | 실제 기능·제한 |
|---|---|---|---|
| [MSI / 104871740271](https://github.com/postmelee/alhangeul-tauri/actions/runs/35115949615/job/104871740271) | exit 0, 실패 0 | strict-product passed | thumbnail/lifecycle passed, 해당 시나리오만 수용 |
| [NSIS / 104871740138](https://github.com/postmelee/alhangeul-tauri/actions/runs/35115949615/job/104871740138) | exit 1, 실패 12 | hosted-nsis-diagnostic passed | thumbnail not-accepted; 초기/재설치·세 문서·Shell/force 요청의 `0x80040154` 유지, lifecycle passed |
| [MSI forced / 104871739938](https://github.com/postmelee/alhangeul-tauri/actions/runs/35115949615/job/104871739938) | exit 1, 재설치 3010 한 건 | msi-forced-reinstall-reboot passed | thumbnail passed, reboot-required, post-reboot-unverified |

세 증거 archive를 내려받아 평가 JSON과 raw summary/process를 대조했다.
`installer-input.json` 실제 bytes의 SHA-256이 evaluation 및 binding의 input hash와 모두
일치하고, source/run/attempt/product artifact identity도 일치함을 확인했다. 이는 이번 보고의
제한된 대조이며 #67의 독립 PowerShell replay/전체 증거 재계산을 수행했다는 뜻은 아니다.
순수 evaluator의 `requires-io-verification`, `reuseEligible=false`는 그대로 보존했다.

full Windows 제품: run `35115949615` attempt 1, artifact `10456281520`,
digest `sha256:82b86fc14cb8f1f62b5b6aa09e16815c30a0bffc157f6924348c36041056a5d3`.
설치 증거 artifact ID는 NSIS `10456147416`, MSI `10457083205`, forced `10455842494`다.

### 기존 bytes 재사용과 이전 실패 보존

최소 연결 후보 `6f5c939f8d2befc673904bc9c5d0ab3e2b159364`의
[full 34951330430](https://github.com/postmelee/alhangeul-tauri/actions/runs/34951330430/attempts/1)이 성공했다.
제품 artifact `10390178917`, digest
`sha256:1ee2ade7a0b6278c9d4a4b27f393dc88c350c170247fff1a8de581ce39fdca6c`를 고정해
[installer reuse 34958764635](https://github.com/postmelee/alhangeul-tauri/actions/runs/34958764635/attempts/2)를 검증했다.
MSI 두 결과는 attempt 1, NSIS는 attempt 2다. 최초 NSIS upload의 FinalizeArtifact HTTP 403으로
attempt 1 최종 gate가 실패했고, 승인된 NSIS-only 재시도에서 upload·gate가 성공했다.
최초 실패를 제품 성공이나 의도된 실패로 바꾸지 않는다. NSIS 제한도 그대로다.

PDF open-only는 위 기존 제품을 새 harness `6ffb3af`로 검사한 별도 소비자 검증이다.
새 full 제품 `10456281520`의 PDF 확인으로 소급하지 않는다. raw 증거는 artifact
`10454301707`, digest `sha256:9be1c6c182157ffb86f217e84cf6e532e8996391da5a416ea8d81c46fbe029d5`다.
그 이전 독립 집계 실패·회복 이력은 구현계획서에 보존했으며 #67 완료로 재분류하지 않았다.

### 단계 종료 로컬 재검증

```sh
pnpm run test:automation
pnpm run check:product-boundary
actionlint .github/workflows/alhangeul-windows-smoke.yml .github/workflows/alhangeul-installer-reuse.yml .github/workflows/alhangeul-windows-pdf.yml .github/workflows/alhangeul-artifacts.yml
git diff --check
```

결과: **950 passed / 0 failed / 0 skipped**, boundary **586 files**, actionlint 및 diff 통과.
Windows PS/native 검증은 원격 Windows에서 수행했으며 Mac에서 실행하지 않았다.
마감은 문서-only이므로 검증 코드 SHA를 마감 커밋으로 바꾸지 않고 추가 제품 빌드를 하지 않는다.

## 잔여 위험

- NSIS per-user Shell 활성화 제한은 해결되지 않았다. hosted 결과를 모든 사용자 환경이나
  PC방 원인 완전 규명으로 확대하지 않는다. MSI도 모든 환경의 해결책이라고 보장하지 않는다.
- forced MSI 재부팅 후 동작, 최신 일반 사용자 VDI의 새 문서·앱 진단 확인은 미검증이다.
- PDF 최소 검사는 artifact 소비자 연결·문서 열기 확인이며 내보내기 전체 수용이 아니다.
- #67 독립 재검산 고도화는 백로그다. 첫 릴리즈 필수 선행으로 복귀시키지 않는다.
- CI 성공은 공개 릴리즈 수용이 아니다. 실제 게시 bytes·서명·설치·승인·게시 후 대조는 별도다.
- #57 전체 완료·PR 게시·이슈 종료는 아직 승인하거나 수행하지 않았다.

## 다음 단계 영향

6.1.3은 이미 승인된 공식 문서 위치의 CI/릴리즈 판정·추가 테스트용 재사용 설명을 현재
구현과 정합화한다. 문서-only 검증을 수행하고 제품 재빌드를 불필요하게 반복하지 않는다.
그 뒤 6.2 사용자 진단 UI와 조건부 MSI 안내, 6.3 최신 패키지/VDI·최종 수용을 별도 승인으로
진행한다. NSIS 전체 사용자화·UAC/HKLM 실험은 재개하지 않는다.

## 승인 요청

Stage 6.1.2의 재조정된 산출물·검증 결과를 검토하고 **6.1.3 공식 문서 정합화 진입**을
승인받는다. 이번 보고에서는 다음 단계 구현·추가 원격 CI·push·PR·릴리즈·이슈 close를 하지 않는다.
