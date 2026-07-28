# Task #7 최종 보고서 — 제품 버전 기준과 공개 프로젝트 상태 정렬

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
마일스톤: M010

## 작업 요약

- 대상 이슈: #7
- 마일스톤: M010
- 단계 수: 5개 Stage와 선택 승인 하위 단계 1개
- 작업 목적: 외부 계약과 지원 설치 기반을 먼저 확인해 독립 Alhangeul의 제품 version 기준을 확정하고, 모든 현재 surface·검증·CI·공개 문서와 Windows/Linux artifact 증적을 같은 의미로 정렬
- 선택 결과: 작업지시자가 `0.1.0 재시작`을 명시 승인

Stage 1의 hard gate 조사에서 Alhangeul 명의의 공개 release·tag·updater·package repository·지원 설치 기반이 없고 Task #5의 `0.3.1` artifact가 비배포 build smoke임을 확인했다. 이전 제품의 `0.3.1`은 provenance와 역사 증적으로 보존하고, 독립 Alhangeul SemVer 계보는 M010 `0.1.0`부터 시작하도록 결정했다.

root `package.json`을 제품 version 진실 원천으로 삼아 desktop package, Cargo manifest·lock과 Tauri config를 `0.1.0`으로 맞췄다. read-only verifier와 fixture test를 도입하고 CI·native workflow의 build 전 gate로 연결했다. 공개 문서에는 Actions 활성·수동 실행·native build smoke 성공과 공식 release 부재를 함께 기록했다.

최종 원격 검증은 canary `02931beb43e2944083e78d792603bff82200478c`에서 수행했다. CI run `30383886807`과 native run `30384403366`이 성공했고, Windows/Linux artifact 세 개를 내려받아 `0.1.0` installer 6개의 inventory를 독립 재검증했다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `package.json` | 제품 version `0.1.0`, `check:product-version`과 automation fixture 연결 | repository 제품 version 진실 원천과 기본 검증 |
| `apps/desktop/package.json` | desktop package version `0.1.0` 정렬 | TypeScript desktop package |
| `apps/desktop/src-tauri/Cargo.toml` | Rust package version `0.1.0` 정렬 | Rust crate와 Cargo metadata |
| `apps/desktop/src-tauri/tauri.conf.json` | Tauri bundle·About source version `0.1.0` 정렬 | 사용자 노출 version과 installer 이름 |
| `apps/desktop/src-tauri/Cargo.lock` | 단일 `alhangeul-desktop` entry만 `0.1.0` 정렬 | locked Rust root package |
| `scripts/check-product-version.mjs` | 다섯 surface strict SemVer·exact match read-only verifier | version drift 차단 |
| `tests/product-version.test.mjs` | 정상·개별 drift·parse·누락·중복·CLI fixture 13개 | verifier 회귀 계약 |
| `tests/actions-workflows.test.mjs` | 두 workflow의 version gate 순서와 조건 검증 | CI/native automation 계약 |
| `.github/workflows/ci.yml` | dependency 설치 뒤 build 전 version gate 추가 | Ubuntu CI |
| `.github/workflows/alhangeul-desktop.yml` | `run_tests` 조건부 version gate 추가 | Windows/Linux native artifact workflow |
| `README.md` | `0.1.0` source 기준선, 활성 수동 Actions와 비배포 상태 정렬 | 사용자·기여자 진입 문서 |
| `docs/DEVELOPMENT.md` | 제품 version 상태와 verifier 명령 추가 | 기여자 검증 절차 |
| `docs/architecture/PROVENANCE.md` | 이전 제품 `0.3.1`과 독립 Alhangeul `0.1.0` 계보 분리 | 장기 제품 출처·계보 |
| `docs/operations/DESKTOP_RELEASE.md` | Task #7 exact SHA·run, `0.1.0` artifact metadata와 installer inventory 추가 | release 전 운영 증적 |
| `mydocs/plans/task_m010_7*.md` | 판단 기준, 승인 게이트와 5단계 구현·검증 계획 | Task #7 수행 기록 |
| `mydocs/working/task_m010_7_stage*.md` | Stage 1–5 조사·구현·검증·원격 증적 | 단계별 승인 기록 |
| `mydocs/orders/20260728.md` | Issue #7 등록과 완료 상태·시각 기록 | M010 오늘할일 보드 |

제품 기능, `rhwp` pin, Pages workflow와 Task #5 보고서는 수정하지 않았다.

## 문서 위치 검증

수행계획서의 문서 위치 판단과 실제 산출물 위치가 모두 일치한다. 새 공식 version 문서를 만들지 않고 기존 책임 문서에 필요한 내용만 추가했다.

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `README.md` | repository root | repository root | OK | 사용자가 처음 보는 source version·Actions·비배포 상태만 갱신 |
| `docs/architecture/PROVENANCE.md` | `docs/architecture/` | `docs/architecture/` | OK | 이전 제품과 Alhangeul의 version 계보를 출처 경계와 함께 기록 |
| `docs/operations/DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/` | OK | exact-SHA run, artifact inventory와 release 전 경계를 기존 운영 문서에 기록 |
| `docs/DEVELOPMENT.md` | `docs/` | `docs/` | OK | 기여자용 version 검증 명령과 개발 상태 추가 |
| `mydocs/plans/task_m010_7*.md` | `mydocs/plans/` | `mydocs/plans/` | OK | 수행·구현 계획을 제품 문서와 분리 |
| `mydocs/working/task_m010_7_stage*.md` | `mydocs/working/` | `mydocs/working/` | OK | 판단 승인과 단계별 증적을 제품 문서와 분리 |
| `mydocs/report/task_m010_7_report.md` | `mydocs/report/` | `mydocs/report/` | OK | 장기 보관용 Task 최종 결과 |

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 독립 제품 version 정책 | 이전 제품 값 `0.3.1` 유지, Alhangeul 계보 미확정 | 작업지시자 승인 `0.1.0 재시작`, 공식 문서 계보 확정 |
| 현재 제품 version surface | 5곳이 `0.3.1` | 5/5가 `0.1.0` |
| 자동 비교 surface | 전용 verifier 없음 | root 기준 4개 비교 surface와 Cargo lock 단일 package 검증 |
| 전용 version fixture | 0개 | 13/13 통과 |
| automation test | 23개 | 36/36 통과 |
| upstream·About 분리 test | 기존 baseline | 32/32 통과, Alhangeul `0.1.0`과 `rhwp v0.8.2` 분리 유지 |
| Studio test | 21개 파일, 114개 | 21개 파일, 114/114 통과 |
| Task #7 native version 증적 | 없음 | 3개 platform artifact, 필수 `0.1.0` installer 6개 독립 검증 |
| GitHub Release / remote tag | 0 / 0 | 0 / 0 |
| verifier·fixture 파일 크기 | 없음 | 191 LOC / 238 LOC, 권장 상한 이내 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| 외부 version 계약과 지원 설치 기반 hard gate 확인 후 명시 선택 | OK — Stage 1 조사에서 release·tag·updater·package·지원 설치 기반 부재 확인, Stage 1.1에서 `0.1.0 재시작` 승인 기록 |
| root, desktop package, Rust package, Tauri config와 Cargo lock 일치 | OK — `check:product-version`이 다섯 surface `0.1.0` 일치 확인 |
| About의 Alhangeul version과 `rhwp` version 분리 | OK — upstream baseline test 32/32와 `alhangeul-desktop@0.1.0` Cargo metadata 통과 |
| version drift·누락·중복·parse 오류 거부 | OK — 전용 fixture 13/13과 전체 automation 36/36 통과 |
| CI와 native workflow의 build 전 version gate | OK — 정적 workflow 계약과 두 exact-SHA run의 `Check product version` 성공 |
| README와 공식 문서의 M010·Actions·비배포 상태 | OK — root·개발·provenance·운영 문서 책임 위치에 같은 경계로 기록 |
| Task #5 `0.3.1` 역사 증적 보존 | OK — run `30357007192`, `30357240402`, installer 이름·크기·checksum과 Stage 보고서 무변경 확인 |
| 최종 exact SHA의 Windows/Linux `0.1.0` artifact | OK — native run `30384403366` 세 job 성공, artifact 세 개 다운로드 후 필수 installer 6개 inventory 일치 |
| Actions artifact를 공식 release·지원 설치 파일로 안내하지 않음 | OK — Release·tag 없음, README/운영 문서에 14일 build smoke와 비배포 경계 유지 |
| macOS·signing·updater·package 게시·자동 trigger·required check 미추가 | OK — workflow 정적 계약과 변경 경로 확인 |
| Pages와 canary 실행 경로 무변경 | OK — Pages가 `origin/devel` 대비 무변경, canary 이후 product·test·workflow diff 없음 |
| 최종 platform-neutral 통합 검증 | OK — frozen install, version·boundary·pin, automation, upstream, Studio, Cargo metadata·format과 diff 검사 통과 |

최종 platform-neutral 핵심 결과:

- 제품 경계: 181개 파일 통과
- `rhwp` pin: `v0.8.2`, `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, 관리 artifact 6개 일치
- automation: 36/36
- upstream: 32/32
- Studio: 21개 파일, 114/114와 production build 성공
- Cargo: locked/offline metadata `alhangeul-desktop@0.1.0`, format 검사 성공
- CI: [run `30383886807`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30383886807), canary SHA, Ubuntu Rust test·Clippy 포함 성공
- native: [run `30384403366`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30384403366), Windows x64·Linux x64·Linux arm64 성공

Studio build에는 기존 runtime SVG 해석, static·dynamic import 혼합과 500 kB 초과 chunk warning이 남았고 Cargo metadata에는 `--format-version` 권고가 출력됐다. 모두 종료 코드 0이며 이번 version 정렬에서 새로 발생한 실패가 아니다.

### 단계별 검증 결과

- [Stage 1](../working/task_m010_7_stage1.md): 이전 제품 계보, Alhangeul 외부 계약·설치 기반 hard gate 조사와 `0.1.0 재시작` 추천·승인 기록
- [Stage 2](../working/task_m010_7_stage2.md): 제품 surface 다섯 곳 정렬, read-only verifier와 fixture 13개 도입
- [Stage 3](../working/task_m010_7_stage3.md): CI/native version gate와 공개 상태 문서 정렬, Task #5·Pages 증적 보존
- [Stage 4](../working/task_m010_7_stage4.md): 전체 platform-neutral 수용 검증과 remote canary 확정
- [Stage 5](../working/task_m010_7_stage5.md): exact-SHA CI·native matrix와 다운로드 후 `0.1.0` inventory 독립 검증

## 잔여 위험과 후속 작업

### 잔여 위험

- Actions artifact는 14일 retention이므로 만료 뒤 해당 run에서 다시 다운로드할 수 없다.
- 필수 installer 생성·크기·inventory는 검증했지만 Windows/Linux 실제 설치·실행과 signing은 검증하지 않았다.
- archive API digest와 installer SHA-256은 각 run의 무결성 증적이며 재현 가능한 byte-for-byte build를 입증하지 않는다.
- `0.1.0`은 source 기준선이고 아직 공식 release, tag, 고정 다운로드 채널이나 updater가 아니다.
- Studio build와 Cargo metadata의 기존 warning은 별도 구조·성능 작업 없이 남아 있다.

### 후속 작업 후보

- `0.1.0` 공식 release를 시작할 경우 version·tag·checksum 게시와 장기 artifact 보존 정책 확정
- Windows signing, Linux package metadata와 installer 설치·실행 smoke를 별도 Issue로 검증
- 필요할 경우 독립 updater 보안 모델과 key 보관·rollback 정책 설계
- Studio runtime SVG, chunk 크기와 import 구조 warning을 별도 성능·구조 작업으로 평가

## 작업지시자 승인 요청

- 최종 보고서와 PR의 수용 기준·검증 한계·남은 위험을 검토하고 merge 여부를 승인해 주세요.
