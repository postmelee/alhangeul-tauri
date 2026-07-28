# Task #7 Stage 3 보고서 — 버전 검증 CI와 공개 상태 문서 정렬

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 3

## 단계 목적

Stage 2에서 도입한 `check:product-version`을 수동 CI와 Windows/Linux native artifact workflow의 build 전 gate로 연결하고, 공개 문서에 승인된 `0.1.0` 재시작의 의미와 기존 `0.3.1` 증적의 역사적 경계를 일관되게 기록한다.

workflow의 수동 trigger, 최소 권한, Windows/Linux exact matrix와 비배포 경계는 유지하고 Pages workflow는 변경하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `.github/workflows/ci.yml` | dependency 설치와 제품 경계 검사 뒤, `rhwp`·build 검사 전에 제품 version gate 추가 |
| `.github/workflows/alhangeul-desktop.yml` | `run_tests` 조건을 유지한 제품 version pretest gate 추가 |
| `tests/actions-workflows.test.mjs` | 두 workflow의 version gate 순서와 desktop 조건부 실행 계약 추가 |
| `README.md` | `0.1.0` source 기준선, 활성 수동 Actions와 native smoke·비배포 상태 정렬 |
| `docs/DEVELOPMENT.md` | 제품 source version 상태와 기본 version 검증 명령 추가 |
| `docs/architecture/PROVENANCE.md` | 이전 제품 `0.3.1`과 독립 Alhangeul `0.1.0`의 계보·검증·배포 경계 기록 |
| `docs/operations/DESKTOP_RELEASE.md` | M010 `0.1.0` 기준, verifier 책임과 후속 exact-SHA 검증 상태 기록 |

## 구현 결과

### build 전 version gate

두 workflow 모두 dependency 설치와 `check:product-boundary` 뒤에 `pnpm run check:product-version`을 실행하고, 이후 `check:rhwp-pin`, automation과 build 단계로 진행한다. desktop workflow에서는 기존 pretest와 동일한 `if: inputs.run_tests` 조건을 적용했다.

automation test는 다음 계약을 정적으로 검증한다.

- CI와 desktop workflow에서 제품 경계, 제품 version, `rhwp` pin과 후속 검사가 순서대로 존재한다.
- desktop 제품 version gate가 다른 platform-neutral pretest와 같이 `run_tests` 입력을 따른다.
- 기존 수동 `workflow_dispatch`, `contents: read`, Windows/Linux exact matrix와 release·Pages·deploy action 금지 계약을 유지한다.

### 공개 상태 문서

- `0.1.0`은 M010에서 승인된 독립 Alhangeul의 첫 source 기준선이며 아직 공식 release나 tag가 아님을 기록했다.
- 이전 제품의 `0.3.1` release 계보와 Task #5의 `0.3.1` native build smoke를 Alhangeul 공식 release로 재분류하지 않는다고 명시했다.
- root `package.json`을 기준으로 다섯 제품 surface를 검사하는 verifier와 로컬 실행 명령을 공개 문서에 연결했다.
- Actions가 활성 상태이되 CI와 native artifact workflow는 수동 전용이고, 14일 artifact는 공식 설치 파일이나 자동 배포 결과가 아님을 README의 오래된 설명까지 정정했다.
- `0.1.0` exact-SHA Windows/Linux native artifact 검증은 완료로 선기록하지 않고 후속 Stage 5 대상으로 남겼다.

## 본문 변경 정도 / 본문 무손실 여부

- workflow에는 version gate만 추가했고 trigger, permissions, runner matrix, checkout, artifact 종류·retention과 비배포 동작은 변경하지 않았다.
- 공개 문서는 승인된 version 판단과 현재 Actions 상태에 필요한 문장·명령만 수정하거나 추가했다.
- `DESKTOP_RELEASE.md`의 Task #5 run 번호, `0.3.1` installer 이름, 크기와 SHA-256 본문은 변경하지 않았다.
- Task #5 최종·단계 보고서와 `.github/workflows/pages.yml`은 `origin/devel` 대비 무변경임을 확인했다.

## 검증 결과

실행 명령:

```bash
pnpm run check:product-version
pnpm run test:automation
pnpm run check:product-boundary
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --exit-code origin/devel -- \
  mydocs/report/task_m010_5_report.md \
  mydocs/working/task_m010_5_stage1.md \
  mydocs/working/task_m010_5_stage2.md \
  mydocs/working/task_m010_5_stage3.md \
  mydocs/working/task_m010_5_stage4.md \
  mydocs/working/task_m010_5_stage5.md
rg -n '0\.3\.1|30357007192|30357240402|bfab2269|f0b84183' \
  docs/operations/DESKTOP_RELEASE.md
git diff --check
```

결과:

- OK — 실제 repository의 제품 version 다섯 surface가 모두 `0.1.0`으로 일치
- OK — automation 36/36 통과, 두 workflow의 version gate 순서·조건과 기존 보안·platform·비배포 계약 유지
- OK — 제품 경계 검사 181개 파일 통과
- OK — Pages workflow와 Task #5 최종·Stage 1–5 보고서가 `origin/devel` 대비 무변경
- OK — Task #5 CI run `30357007192`, native run `30357240402`, `0.3.1` installer와 대표 checksum `bfab2269…`, `f0b84183…` 보존
- OK — workflow·test 파일은 모두 300 LOC 권장 상한 이내
- OK — `git diff --check` 통과

첫 제품 경계 검사에서는 운영 문서에 추가한 이전 제품명이 허용 위치 밖의 legacy 이름으로 탐지됐다. 운영 문서는 “초기 코드의 이전 제품”이라는 중립 표현으로 고치고, 명시적 이름과 계보는 책임 문서인 `PROVENANCE.md`에만 유지한 뒤 전체 검증을 다시 실행해 최종 성공했다.

현재 호스트는 macOS이므로 지원 범위 밖의 Rust desktop test나 Tauri native build는 실행하지 않았다. 이번 단계는 workflow·정적 계약·문서 변경이며 실제 Windows/Linux exact-SHA native 검증은 Stage 5에 남긴다.

## 잔여 위험

- workflow 변경은 정적 automation 계약으로 검증했으며 GitHub Actions runner에서의 실제 실행은 아직 확인하지 않았다.
- 공개 문서는 `0.1.0`을 source 기준선으로만 안내한다. 공식 설치 파일, tag, GitHub Release나 updater가 생겼다는 의미로 해석하면 안 된다.
- 마지막 검증 완료 native artifact는 Task #5의 역사적 `0.3.1` build smoke다. 새 `0.1.0` artifact와 About 표시 검증은 Stage 5 exact-SHA matrix 실행 전까지 미확인 상태다.

## 다음 단계 영향

- Stage 4는 변경 diff를 기준으로 로컬 platform-neutral 전체 회귀 검증을 수행한다.
- `0.1.0` 공식 release·tag·다운로드는 계속 범위 밖이며 Stage 4에서도 생성하거나 안내하지 않는다.
- Stage 5 native 실행 전까지 Task #5의 `0.3.1` 증적을 삭제하거나 새 source version의 성공 증적으로 대체하지 않는다.

## 승인 요청

- Stage 3의 version CI gate, 공개 문서 정렬과 검증 결과를 승인하면 Stage 4의 로컬 전체 회귀 검증으로 진행한다.
