# Task #59 최종 보고서 — 변경 범위 기반 CI 통합

GitHub Issue: [#59](https://github.com/postmelee/alhangeul-tauri/issues/59)
마일스톤: M010

## 작업 요약

- 부모 #59와 하위 #60–#64, 후속 Stage 4 warm 재측정 및 Stage 5/6 리뷰 보정을 통합했다. 빠른 계약, core, 플랫폼 제품 생성, 기존 artifact 검증, 전체 수용 집계를 분리했다.
- Windows/Linux의 기존 native·package·설치 검사를 유지하고, 필요한 검증만 명시적으로 선택할 수 있게 했다.
- 리뷰 보정 후보 `f0dfe59`의 필수 11개 job, 다른 제품 SHA의 Windows archive 재사용, 후발 fast의 비취소가 통과했다. 의도한 digest 실패에서도 진단 artifact를 보존했다. 과거 동일 arm64 후보의 Cargo warm job은 20:59 → 13:15로 7:44(36.85%) 줄었다.
- 독립 worktree와 `local/task59`에서 작업했고 `publish/task59 → devel` Open PR 하나로 게시한다. Stage 6에서 #19가 병합된 devel `581d303`을 통합했다. 주 worktree와 #57 미완료 branch는 수정하지 않았다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/ci.yml` | fast/native/installer/platform/full/auto 선택 | 수동 검증 진입 |
| `alhangeul-desktop.yml`, `alhangeul-artifacts.yml` | ordinary artifact 위임, 필수 gate 집계 | Windows/Linux 전체 수용 |
| `alhangeul-ci-fast.yml`, `alhangeul-thumbnail-core.yml` | 빠른 계약과 core 독립 실행 | 조기 피드백 및 병렬 진단 |
| `alhangeul-artifact-platform.yml`, `alhangeul-windows-smoke.yml` | 기존 native/package 및 새 archive 설치 검증 이동 | 제품 생성과 플랫폼별 의존 |
| `alhangeul-installer-reuse.yml`, `scripts/ci/artifact-handoff.mjs` | exact producer/ID/digest/제품 SHA와 harness SHA 분리 | 재빌드 없는 실제 설치 |
| `scripts/verify-desktop-artifacts.mjs` | inventory sourceSha 확장 | 기존 일반 형식 읽기 호환, 명시 재사용은 SHA 필수 |
| `.github/actions/cargo-cache/action.yml`, `scripts/ci/cache-key.mjs` | compiler/target/lock/workload 격리, source별 갱신 | source 및 compiled target cache |
| `scripts/ci/`, `tests/ci-*`, 관련 기존 workflow 회귀, `package.json` | 선택·집계·측정·PowerShell 격리 회귀 | 자동화 계약 |
| 공식 가이드·계획·단계·최종 보고·보드 | 소유 위치와 실측 근거 | 운영/작업 추적 |

최신 devel 대비 제품 구현과 rhwp pin을 변경하지 않았다. 기존 Desktop entry의 `build-updater:` 이후 job 본문은 최신 devel과 byte 단위로 동일하다. native platform 파일은 기존 단계의 무손실 이동을 위한 [#64 구현계획서](../plans/task_m010_64_impl.md)의 385 LOC 예외 범위 안이다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| CI_VALIDATION.md | docs/operations | 동일 | OK | [부모 수행계획서](../plans/task_m010_59.md), 공식 CI 계약 |
| AGENTS.md, DEVELOPMENT.md, RELEASE_CHECKLIST.md | 기존 파일의 진입 링크 | 동일 | OK | 동일 계획의 문서 위치 판단 |
| DESKTOP_RELEASE.md, PUBLIC_RELEASE_RUNBOOK.md | 기존 docs/operations | 동일 | OK | #64 구현계획 Stage 3의 ordinary artifact 입력 정합성 |
| 계획·단계·최종 보고 | mydocs/plans, working, report | 동일 | OK | 개별 실행 기록, 제품 문서와 분리 |
| 오늘할일 | mydocs/orders/20260907.md, 20260908.md | 동일 | OK | 기존 통합 및 승인된 warm 재측정 상태·완료 시간 |

## 변경 전·후 정량 비교

아래 초기 실행과 warm 표는 제품 SHA `2300984` 기준의 과거 측정이다. 리뷰 보정 이후 후보의
검증 결과는 별도 Stage 6 기록과 구분한다.

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| Desktop entry | 1,435 LOC | 797 LOC; ordinary artifact 책임을 별도 workflow로 이동 |
| 빠른 검사 피드백 | native와 관련 검사가 큰 경로에 혼재 | Windows 19초, Node/Studio 70초; 두 job은 run 시작 13초 후 시작 |
| Windows core | 제품 job 안의 직렬 단계 | 883초의 별도 병렬 job |
| 기존 Windows bytes 재검사 | 제품 생성 경로 재진입 필요 | 제품 재빌드 없이 installer job 126초 |
| CI 회귀 | 선택·집계·실제 Git 변경 fixture 없음 | 52/52 통과 |
| 전체 automation | 기존 계약 집합 | 554/554 통과, failure/skip 0 |

job 시간과 전체 run 시간·step 합계는 다르다. 기존 #57의 Windows 24:51/34:37과 이번 cold 41:53은 source/cache/workload가 달라 직접적인 속도 개선 비교가 아니다. 이번 작업으로 Windows native 빌드가 빨라졌다고 주장하지 않는다.

### 전체 후보 job 시간

[전체 run 34063530307](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063530307), attempt 1, SHA `230098401df7d893a26b54b62b780081d3553dda`.

| job | wall 초 | run 시작 후 job 시작 초 | 측정된 step 합계 초 |
|---|---:|---:|---:|
| plan | 5 | 6 | 4 |
| fast Windows | 19 | 13 | 17 |
| fast Node/Studio | 70 | 13 | 69 |
| native Windows x64 | 2513 | 85 | 2508 |
| native Linux x64 | 1629 | 86 | 1624 |
| native Linux arm64 | 1164 | 88 | 1160 |
| core Windows | 883 | 88 | 880 |
| core Linux x64 | 264 | 85 | 261 |
| core Linux arm64 | 245 | 88 | 241 |
| Windows fresh smoke | 121 | 2600 | 119 |
| result | 8 | 2724 | 5 |

시작 offset에는 선행 의존과 runner 대기가 섞여 있다. Windows smoke는 Windows 제품 종료 뒤 시작하며 Linux/core에 의존하지 않는다. 이번 실제 run에서는 Linux가 먼저 끝났으므로 반대 종료 순서의 시간 단축을 실측했다고 해석하지 않는다.

### Cargo cache와 동일 후보 비교

[동일 후보 재실행 34065744901](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901), attempt 1은 success다. 동일 SHA `230098401df7d893a26b54b62b780081d3553dda`, `linux-arm64/product/run_tests=true`의 대표 native workload를 비교했다. 이 run은 core와 Windows smoke를 선택하지 않은 부분 검증이다.

| arm64 지표 | 첫 전체 run | 동일 후보 재실행 |
|---|---:|---:|
| native job wall | 1,164초 (19:24) | 1,259초 (20:59) |
| 측정된 step 합계 | 1,160초 | 1,254초 |
| thumbnailer build | 149초 | 161초 |
| preview test/lint/protocol lint | 84/30/1초 | 91/32/1초 |
| thumbnailer test/lint | 61/22초 | 65/24초 |
| desktop test/lint | 203/50초 | 216/56초 |
| Tauri bundle | 353초 | 373초 |
| package lifecycle | 23초 | 27초 |
| Cargo post-save | 47초 | 84초 |
| Cargo source/target restore | miss/miss | miss/miss |
| pnpm restore | miss | hit |

두 실행 모두 runner image `ubuntu-22.04-arm 20260831.119.1`, Rust `1.98.1 (48a229cea 2026-09-01)`다. core 포함 여부가 다르므로 전체 run 시간을 비교하지 않고 동일 native job과 step만 대조했다. runner의 물리 CPU·동시 부하를 통제한 실험은 아니다.

두 실행의 target key는 모두 다음과 같았다.

```text
cargo-target-v2-Linux-ARM64-desktop-aarch64-unknown-linux-gnu-eab8ee6e77a5c1774f73d75e-ea7275363f85f8ab32f463682c8570f6f965483382e4909c4cfa50169a6f64c4-230098401df7d893a26b54b62b780081d3553dda
```

첫 실행은 22:37:03 UTC에 해당 key 저장을 기록했으며 당시 artifact cache metadata의 target 크기는 3,378,217,868 bytes였다. 재실행은 23:06:18 UTC에 같은 key와 restore prefix 모두 `Cache not found`였고, 진행 중 cache 목록에서도 첫 arm64 target 항목은 없었다. 재실행 종료 시 23:25:16 UTC에 같은 target key와 23:25:23 UTC에 source cache를 저장했다.

따라서 9월 7일 warm canary 목적으로 시작한 재실행은 실제로 두 번째 cold Cargo 실행이다. **당시 두 실행에서는 Cargo restore 성공과 warm 컴파일 성능 개선을 입증하지 못했다.** 동일 key 생성·저장 및 cache가 없어도 모든 native 검사가 실행되는 동작은 확인했다. 이 과거 기록을 보존하고 9월 8일의 실제 hit 결과를 아래에 구분한다.

### 2026-09-08 실제 Cargo warm 재측정

기존 run 34065744901의 attempt 2를 실행했다. 동일 SHA `230098401df7d893a26b54b62b780081d3553dda`,
linux-arm64/product/tests=true, runner image `ubuntu-22.04-arm 20260831.119.1`, Rust 1.98.1이며,
성공한 실행 step 목록도 attempt 1과 같다. [warm job 101985711683](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901/job/101985711683)과 선택한 필수 job은 모두 success다.

| 동일 product profile의 arm64 지표 | attempt 1: cold | attempt 2: warm |
|---|---:|---:|
| native job wall | 1,259초 (20:59) | 795초 (13:15) |
| Cargo source/target | miss/miss, 복원 단계 2초 | exact hit/hit, 복원 109초 |
| native build/test/lint 아홉 step 합계 | 1,019초 | 518초 |
| Tauri bundle | 373초 | 161초 |
| Cargo post-save | 84초 | 0초, primary hit로 생략 |
| 로그의 Compiling 행 수 / 그중 rhwp | 1,252 / 5 | 15 / 5 |

복원 비용까지 포함한 job wall 감소는 **464초(7:44), 36.85%**다. source 93,272,881 bytes와
target 3,378,218,594 bytes의 exact key 복원 및 primary hit를 로그로 확인했다.
Compiling은 중복 profile 실행을 포함한 로그 행 수이며 고유 crate 수가 아니다.
workspace/feature별 rhwp 컴파일 5회는 남았다. 상세 key·각 step 시간·방법은
[#63 Stage 4](../working/task_m010_63_stage4.md)에 보존한다.

조사 시 cache 7개, 합계 10,274,246,039 bytes 중 세 큰 target이 97.27%를 차지했다.
같은 key가 짧은 시간 안에 사라진 관측과 이 용량 집중은 GitHub의
[용량에 따른 cache 제거 정책](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)과
부합한다. 다만 실제 한도 조회는 HTTP 402로 제한됐고 개별 삭제 사유는 확인하지 못해
용량 압박은 유력한 추론으로 기록한다. cache 삭제·quota 변경은 수행하지 않았다.
실행 코드 보완은 필요하지 않았으며 운영 가이드에 cache 보존 사전 확인과 attempt별 근거 고정을 보완했다.

## 검증 결과

### 리뷰 보정 후보의 최종 수용

제품/workflow 후보 SHA는 `f0dfe5909ceff95e7a2c54a703c82a1a2a775834`다. 이후 PR 보고
커밋은 문서만 바뀌며 새 native 제품을 생성한 것으로 표시하지 않는다.

| 검증 | 최종 결과 | 근거 |
|---|---|---|
| 새 후보 전체 artifact | 필수 11개 job success; Windows/Linux core·native/package·새 MSI/NSIS | [34209619872](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209619872) |
| 과거 제품 + 새 harness | success; 제품 2300984의 exact ID/digest/inventory 및 MSI/NSIS, 설치·제거 0 | [34209988793](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209988793) |
| 의도한 잘못된 digest | 예상 handoff failure; context·outcome·upload success, 후속 단계 skipped | [34209623502](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209623502) |
| 후발 fast와 installer | 모두 success, 진행 중 installer 취소 없음 | [34209992065](https://github.com/postmelee/alhangeul-tauri/actions/runs/34209992065) |

진단 파일을 직접 다운로드해 성공·실패 상태를 대조했다. 새 제품 archive ID/digest,
초기 EvidencePath 누락 실패와 최소 보정 후 재검증, cache 관측은
[Stage 6](../working/task_m010_59_stage6.md)에 보존한다.

### 초기 후보 수용 및 공통 계약

이 표의 원격 수용은 초기 후보 `2300984`의 근거다. 리뷰 보정 후보는
[Stage 6](../working/task_m010_59_stage6.md)에 별도로 기록하며 로컬 계약 개수는 최신 통합 결과다.

| 수용 기준 | 결과 |
|---|---|
| 기존 전체 Windows/Linux 수용 보존 | OK — all/full/run_tests=true, 필수 11개 job success |
| 빠른 검사 조기 피드백 | OK — Windows parser 11개 소스·격리 suite 1개, Node/Studio 독립 통과 |
| core와 제품 의존 분리 | OK — 세 core와 native가 병렬 시작, 최종 result에서 모두 요구 |
| exact archive 재사용 | OK — 다른 harness SHA, 정확한 archive bytes/inventory, MSI/NSIS 실검사 |
| conservative 변경 선택 | OK — 실제 Git rename/delete/누락 base/빈 diff 및 unknown fallback 회귀 |
| 실패 상태 보존 | OK — 필수 failed/cancelled/skipped/missing을 성공으로 집계하지 않는 fixture |
| cache 경계·source별 갱신 및 복원 | OK — 격리·갱신 회귀, 실제 save 및 같은 후보의 source/target exact hit; warm native 36.85% 감소 |
| 로컬 계약·제품 경계 | OK — automation 607, upstream 36, Studio 147 통과 |
| Studio build/GUI typecheck/제품 버전·metadata | OK — local 및 원격 fast에서 통과 |
| workflow/문서 정합성 | OK — actionlint, diff --check, 변경 문서 48개·상대 링크 173개와 필수 보고서 섹션 확인 |

기존 Vite chunk/dynamic import 경고는 남아 있다. 로컬에서는 중립 Node/Studio 검사만 실행했고 Rust/Tauri/PowerShell 및 실제 설치는 GitHub Windows/Linux runner에서 실행했다.

### 실제 제품과 설치 증거

전체 생산은 `alhangeul-desktop.yml`, `mode=artifact`, `artifact_platform=all`, `validation_profile=full`, `run_tests=true`, `publish_release=false`다. updater·release job은 의도적으로 skipped이며 전체 artifact 수용과 공개 릴리즈 수용을 구분한다.

| 제품 archive | artifact ID | archive SHA-256 digest |
|---|---|---|
| Windows x64 | 9998755524 | `sha256:0c67ea0a9033ee70152dc5f74565fd13a1adb8afc8453ec67ea916ba80809932` |
| Linux x64 | 9998591975 | `sha256:11f45751e3146349c944ea67994271a4b6db4c64b1d064f58e3c635b8de235d9` |
| Linux arm64 | 9998501366 | `sha256:9fac3e082e2f620f4f786bfdd594f98b403651ff268cfa428ca457588237195d` |

[재사용 run 34065755394](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065755394), attempt 1도 success다. 제품 SHA는 위 전체 후보, harness SHA는 `1d2bda6ac36405fd027498bef407d044206550c6`, Windows archive 크기는 123,181,855 bytes다. `alhangeul-installer-reuse-evidence/handoff.json`에서 producer/run/artifact/SHA/버전 0.1.0을 대조했다.

새 archive와 재사용 archive 각각의 `windows-installer-smoke-summary.json`은 Status=passed, Failures=[]다. MSI/NSIS 모두 install/uninstall exit code 0이며 제품 버전·등록 경로·handler·thumbnail 등록/제거·shortcut·기본값 검사가 통과했다. 원래 기본값과 복원 기본값이 일치하고 NSIS 재설치 및 dangling canonical default 검사도 통과했다. 실제 script는 기존 MSI→제거→NSIS 순서를 유지한다.

재사용 run은 새 제품을 빌드하지 않는다. 이번 harness SHA 차이는 문서와 workflow 입력 설명이므로 새 설치 코드의 효과를 입증하는 실험으로 해석하지 않는다.

### 단계별 검증 결과

- [부모 Stage 1](../working/task_m010_59_stage1.md): 자식 구현 통합과 운영 가이드 연결.
- [부모 Stage 2](../working/task_m010_59_stage2.md): 554개 통합 회귀와 문서 정합성.
- [부모 Stage 3](../working/task_m010_59_stage3.md): 실제 전체·재사용·cache 근거.
- [부모 Stage 4](../working/task_m010_59_stage4.md): #63의 실제 warm 결과 통합과 PR #66 갱신.
- [부모 Stage 5](../working/task_m010_59_stage5.md): 리뷰 입력·취소·진단·cache 보정과 로컬 회귀.
- [부모 Stage 6](../working/task_m010_59_stage6.md): 최신 devel 보존, 필수 EvidencePath 전달과 원격 정상·실패 검증.
- [#60 최종 보고](task_m010_60_report.md): 계층 계약·시간 측정.
- [#61 최종 보고](task_m010_61_report.md): 빠른 Node/Studio 및 Windows 검사.
- [#62 최종 보고](task_m010_62_report.md): exact artifact 재사용.
- [#63 최종 보고](task_m010_63_report.md): core/cache 경계.
- [#64 최종 보고](task_m010_64_report.md): 선택 규칙과 전체 수용 통합.

첫 dispatch [34063510854](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063510854)는 입력 SHA 오기로 취소했고 성공 근거에서 제외했다. 정확한 전체 후보로 대체했다. 기존 [fast 기준 run 34057952742](https://github.com/postmelee/alhangeul-tauri/actions/runs/34057952742)의 Windows 22초/Node 79초도 부분 검사 결과다.

Stage 4까지는 전체 native 후보 `2300984` 이후 실행 코드 diff가 없었다. Stage 5/6에서는
리뷰 보정과 최신 devel 통합으로 실행 코드가 바뀌었으므로 새 후보를 별도로 검증한다.

## 잔여 위험과 후속 작업

### 잔여 위험

- 전체 artifact 수용은 GUI/PDF handoff, updater, 서명, 공개 릴리즈 승인을 대신하지 않는다.
- #19의 병합된 결과는 devel 통합으로 포함했다. #57 미완료 진단 코드는 포함하지 않았으며 NSIS-only/MSI-only 분리 수용은 이번 기존 smoke와 다르다.
- 자동 선택은 로컬 positive/negative·실제 Git fixture로 확인했고 실제 원격 full/installer 및 대표 arm64 product 경로를 실행했다. 모든 profile의 native 경로를 각각 반복하지 않았다.
- cache는 보존이 보장되지 않으며 key 적중이 재컴파일 0회를 뜻하지 않는다. 36.85%는 같은 후보의 arm64 한 쌍에서 관측한 값이며 물리 CPU·부하와 반복 표본 분산은 통제하지 않았다. Windows/Linux x64, 다른 source SHA 또는 전체 CI의 같은 비율 개선을 의미하지 않는다.
- 최종 문서 SHA와 실제 제품 SHA를 구분해야 한다. artifact가 만료되면 같은 ID로 재사용할 수 없다.

### 후속 작업 후보

- #57 등 후속 통합 시 `CI_VALIDATION.md`의 workflow 소유 위치와 공통 handoff를 사용한다.
- cache의 장기 보존·용량 경쟁, 다른 source의 prefix restore와 남아 있는 workspace/feature별 재컴파일을 후속 검토한다. cache 삭제나 저장소 quota 변경은 이번 작업에서 수행하지 않았다.
- #27 action pin과 #28 branch protection 정책은 별도 작업 범위를 유지한다.

## 작업지시자 승인 요청

기존 구현·검증 지시와 2026-09-08의 이번 PR 포함 지시에 따라 Open PR #66을 갱신한다. 리뷰와 merge 판단은 작업지시자에게 남긴다. 이슈 close, merge, release/배포/서명은 수행하지 않았다.
