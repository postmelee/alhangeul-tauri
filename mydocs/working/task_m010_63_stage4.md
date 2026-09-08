# Task #63 Stage 4 — Cargo warm 재측정

GitHub Issue: [#63](https://github.com/postmelee/alhangeul-tauri/issues/63)
구현계획서: [task_m010_63_impl.md](../plans/task_m010_63_impl.md)
Stage: 4
검증일: 2026-09-08

## 단계 목적

PR #66의 미검증 항목이었던 실제 Cargo cache 복원과 warm 효과를 확인하고, 이전 cache 미보존 원인의 관측 근거를 기록한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| docs/operations/CI_VALIDATION.md | 보존 상태 사전 확인과 exact attempt/job 근거 고정 |
| mydocs/plans/task_m010_63_impl.md | 승인된 Stage 4 재측정 계획 |
| mydocs/working/task_m010_63_stage4.md | cold/warm 시간·restore·용량 근거 |
| mydocs/report/task_m010_63_report.md | 실제 hit 결과와 남은 위험 반영 |
| mydocs/orders/20260908.md | #63/#59 후속 진행 추적 |

## 본문 변경 정도 / 본문 무손실 여부

제품·workflow·cache 구현 코드를 변경하지 않았다. source SHA, compiler/lock/workload key와 필수 검사가 기존 후보와 같으며, 추가한 내용은 운영·계획·검증 문서다. 이전 Stage 3의 두 cold 실행 기록을 보존한다.

## 검증 결과

### 동일 후보와 실행 범위

- run `34065744901`, attempt 1과 2 모두 success. SHA `230098401df7d893a26b54b62b780081d3553dda`.
- workflow `alhangeul-desktop.yml`, `artifact_platform=linux-arm64`, `validation_profile=product`, `run_tests=true`, `publish_release=false`가 동일하다.
- [cold job 101574279815](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901/job/101574279815)과 [warm job 101985711683](https://github.com/postmelee/alhangeul-tauri/actions/runs/34065744901/job/101985711683)을 직접 대조했다.
- 두 runner image는 `ubuntu-22.04-arm 20260831.119.1`, Rust는 `1.98.1 (48a229cea 2026-09-01)`다. 동일하게 성공 실행된 step 이름 목록을 API로 대조했다.
- warm의 plan, fast Windows 29초, fast Node/Studio 77초, native 795초, result가 모두 success다. core/Windows smoke는 product profile에서 선택하지 않은 부분 검증이다.

### 실제 restore와 단계 시간

| Linux arm64 지표 | attempt 1: Cargo cold | attempt 2: Cargo warm |
|---|---:|---:|
| native job wall | 1,259초 (20:59) | 795초 (13:15) |
| 측정된 step 합계 | 1,254초 | 791초 |
| Cargo source/target 복원 | miss/miss, 2초 | exact hit/hit, 109초 |
| thumbnailer build | 161초 | 91초 |
| preview test/lint/protocol lint | 91/32/1초 | 57/21/0초 |
| thumbnailer test/lint | 65/24초 | 55/19초 |
| desktop test/lint | 216/56초 | 91/23초 |
| Tauri bundle | 373초 | 161초 |
| package lifecycle | 27초 | 24초 |
| Cargo post-save | 84초 | 0초, exact hit로 저장 생략 |
| pnpm restore | hit | hit |
| 로그의 Compiling 행 수 | 1,252 | 15 |
| 그중 rhwp Compiling 행 수 | 5 | 5 |

job wall은 **464초(7:44), 36.85% 감소**했다. 복원 추가 비용 107초와 cold post-save 84초의 생략을 모두 포함한 값이다. Tauri 단계를 포함한 native build/test/lint 아홉 step의 합계는 1,019초에서 518초로 줄었다. `Compiling` 행 수는 중복 profile 실행을 포함한 로그 행 수이며 고유 crate 개수가 아니다.

cache action 로그에서 source 93,272,881 bytes와 target 3,378,218,594 bytes의 정확한 key 복원을 확인했다. 두 key 모두 primary hit로 post-save가 생략됐고, target의 source suffix는 후보 SHA와 같다.

```text
cargo-source-v2-Linux-ARM64-ea7275363f85f8ab32f463682c8570f6f965483382e4909c4cfa50169a6f64c4
cargo-target-v2-Linux-ARM64-desktop-aarch64-unknown-linux-gnu-eab8ee6e77a5c1774f73d75e-ea7275363f85f8ab32f463682c8570f6f965483382e4909c4cfa50169a6f64c4-230098401df7d893a26b54b62b780081d3553dda
```

15개 compile 로그는 rhwp, document-preview, linux-thumbnailer, desktop에 해당하며 rhwp는 두 실행 모두 5회 컴파일했다. 외부 의존성 재컴파일은 크게 줄었지만 workspace/feature별 컴파일이 남는다. cache hit를 컴파일 0회로 표현하지 않는다.

### 이전 cache 미보존 조사

2026-09-08 조사 시 저장소 cache는 7개, 합계 10,274,246,039 bytes였다. 그중 #59의 arm64 target 3,378,218,594 bytes와 Windows target 약 3.025GB, #57의 Windows target 약 3.591GB가 큰 비중을 차지했다. #59의 Linux x64 target은 현재 목록에 없다. 현재 목록만으로 과거 cache의 정확한 삭제 시각·주체를 복원할 수는 없다.

이전 miss는 key가 달라진 경우가 아니다. 같은 SHA/compiler/lock/workload로 생성한 exact key와 restore prefix 모두 찾지 못했고, 이후 같은 key가 다시 저장됐다. 저장 후 수십 분 내 사라진 관측과 여러 GB target의 동시 저장은 용량 압박과 부합한다. GitHub의 [cache 보존 정책](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)은 한도 도달 시 마지막 접근이 오래된 항목부터 제거한다고 설명한다. 다만 저장소의 실제 한도 조회는 HTTP 402로 제한됐고 개별 제거 이력은 확인하지 못했으므로, **용량에 따른 제거는 유력한 추론이며 확정 원인은 아니다.** cache 삭제나 quota 변경을 수행하지 않았다.

재측정 직전 arm64 target ID `7394732082`와 source ID `7394743983`가 보존된 것을 확인했고, 실행 중인 다른 CI는 없었다. GitHub metadata의 마지막 접근 시각이 이번 attempt의 08:11:12 UTC와 08:11:09 UTC로 각각 갱신됐다. 실제 복원 성공 판정에는 이 단계의 job cache action 로그를 함께 사용한다.

세 큰 target cache는 합계 9,993,666,906 bytes로 관측한 전체 사용량의 97.27%였다. 현재 캐시 키 불일치를 보완하는 소스 수정은 필요하지 않았으며, 보존 상태 확인·측정 근거 고정 절차를 운영 문서에 보완했다.

### 검증 방법

`gh api .../actions/runs/34065744901/attempts/{1,2}`와 해당 `jobs?per_page=100` 응답을 보존하고 기존 `summarizeTimings`로 변환했다. `gh run view --job ... --log`의 cache/compile/image/toolchain 로그를 함께 대조했다. 기존 cold metadata가 최신 attempt로 바뀌지 않도록 번호와 job URL을 고정했다.

`git diff --check`, 변경 문서 상대 링크·보고서 필수 섹션 검증을 통과했다. 새로운 실행 코드 변경이 없어 기존 전체 native 수용과 이번 동일 코드의 fast/native 결과를 사용한다.

## 잔여 위험

- 이 결과는 동일 후보 Linux arm64 한 쌍에서 관측한 warm 효과다. Windows/Linux x64, 다른 source SHA, 전체 CI 시간의 동일 비율 개선으로 확대하지 않는다.
- runner의 물리 CPU·동시 부하를 통제하거나 반복 표본의 분산을 측정한 실험은 아니다.
- cache의 장기 보존과 source가 바뀐 뒤 prefix restore 효과는 별도 검증 대상이다. 이전 항목의 개별 삭제 사유는 미확인이다.
- 여러 GB target의 용량 경쟁과 workspace/feature별 재컴파일은 남아 있다. 유료 한도 변경이나 캐시 삭제는 수행하지 않았다.

## 다음 단계 영향

부모 #59의 최종 보고와 PR #66에서 기존 warm 미입증 상태를 이 측정 결과로 갱신한다. 최초 miss 이력과 보존 한계는 유지한다.

## 승인 요청

2026-09-08의 이번 PR 포함 지시에 따라 부모 통합과 PR 갱신을 진행한다. merge·release·이슈 close는 수행하지 않는다.
