# Task #7 Stage 1 보고서 — 제품 버전 판단 근거

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 1

## 단계 목적

HOP에서 이어진 `0.3.1`을 Alhangeul이 계승할지, 독립 제품 SemVer를 `0.1.0`으로 재시작할지 결정하기 전에 현재 제품 version surface, 외부 배포 계약, 지원 설치 기반, provenance와 M010 정합성을 조사한다.

이 단계는 제품 version을 선택하거나 파일에 적용하는 단계가 아니다. hard gate별 증거와 두 대안의 영향을 기록하고 추천안을 제시해 작업지시자의 명시적 선택을 받는 데 목적이 있다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_7_stage1.md` | 제품 version surface, HOP/Alhangeul 계보, 외부 계약 hard gate, 대안 비교와 추천안 기록 |

제품 코드, package/Cargo/Tauri 설정, workflow와 공식 문서는 수정하지 않았다.

## 현재 제품 version surface

| 경로·연결 | 현재 값 | 분류 | 근거 |
|---|---:|---|---|
| root `package.json` | `0.3.1` | 제품 version 진실 원천 후보 | workspace root의 현재 version |
| `apps/desktop/package.json` | `0.3.1` | 제품 package version | Tauri CLI를 소유하는 desktop package |
| `apps/desktop/src-tauri/Cargo.toml` | `0.3.1` | Rust 제품 package version | `alhangeul-desktop` package |
| `apps/desktop/src-tauri/tauri.conf.json` | `0.3.1` | bundle·사용자 노출 version | Tauri bundle metadata |
| `apps/desktop/src-tauri/Cargo.lock` | `0.3.1` | 잠긴 Rust 제품 package version | 단일 `alhangeul-desktop` entry |
| Vite define → About 대화상자 | Tauri config에서 파생 | 사용자 노출 연결 | `desktopConfig.version`을 `__ALHANGEUL_VERSION__`으로 주입 |

다섯 저장 surface는 현재 모두 `0.3.1`로 일치한다. 그러나 일치 여부를 지속 검사하는 별도 자동 검증은 아직 없다.

## 제품 version이 아닌 값

| 경로·문맥 | 값 | 제외 이유 |
|---|---:|---|
| `apps/studio-host/package.json` | `0.1.0` | private adapter package 자체 version이며 사용자 제품 version이 아님 |
| `apps/studio-host/vendor/rhwp-core/package.json` | `0.8.2` | 지속 upstream `rhwp` Stable release version |
| `tests/desktop-artifacts.test.mjs`의 파일명 | `0.3.1` | Task #5 artifact verifier fixture와 당시 bundle 예시 |
| Task #5 보고서·운영 문서 inventory | `0.3.1` | exact-SHA build smoke의 immutable 역사 증적 |
| dependency·tool version | 다수 | Tauri, pnpm, Rust dependency의 독립 version |

따라서 선택 결과를 전역 숫자 치환으로 적용하면 안 된다. Stage 2는 수행계획서의 현재 제품 surface allowlist만 변경·검사해야 한다.

## 계보와 공개 상태 증거

| 시점·대상 | 확인 결과 | 판단 영향 |
|---|---|---|
| HOP 초기 Git 이력 | `0.1.1`부터 `0.3.1`까지 release commit이 이어진다. 기준 commit `bbd6bf69…`은 `chore(release): bump version to v0.3.1`이다. | `0.3.1`은 무작위 placeholder가 아니라 HOP의 실제 배포 계보에서 유래했다. |
| HOP `0.3.1` README/config | `golbin/hop` GitHub Releases, Windows/Linux/macOS 다운로드, AUR, `latest.json` updater와 identifier `net.golbin.hop`이 있었다. | HOP의 `0.3.1` 외부 계약은 역사로 존중해야 하지만 자동으로 Alhangeul 계약이 되지는 않는다. |
| Task #1 독립화 | package/crate, 제품명, Tauri identifier를 Alhangeul로 바꾸고 HOP updater·release 경로를 제거했다. 현재 identifier는 `io.github.postmelee.alhangeul`이다. | 제품 소유권, 설치 identity와 release channel이 HOP에서 분리됐다. |
| Task #1 최종 판단 | workspace·desktop `0.3.1`을 Alhangeul 독립 release version으로 확정하거나 재설정하지 않았다고 명시했다. 후속 후보는 `v0.1.0` version·tag·bundle 정책이다. | 현재 `0.3.1`은 승인된 Alhangeul version 정책이 아니라 미결정 잔존값이다. |
| Alhangeul GitHub 상태 | 2026-07-28 조회에서 repository는 PUBLIC이고 GitHub Release와 local/remote tag 목록은 모두 0건이다. | 공개 Alhangeul version 계약이 확인되지 않는다. |
| 현재 updater·publication 경로 | 현재 package/Tauri/Studio source에서 updater surface가 0건이고 workflow/script에서 Release·package publication 명령이 0건이다. | `0.3.1`을 단조 증가시켜야 할 자동 배포·update channel이 없다. |
| 현재 공식 문서 | README, DEVELOPMENT, DESKTOP_RELEASE는 공식 설치 파일·공개 release·package 게시·자동 업데이트가 없다고 명시한다. | 공식 지원 설치 기반 계약이 확인되지 않는다. |
| Task #5 artifact | exact SHA에서 `0.3.1` installer를 만들었지만 14일 Actions artifact build smoke이며 설치·실행, 서명, Release와 updater를 검증하지 않았다. | 역사 증적은 보존해야 하나 공식 release나 지원 upgrade baseline으로 취급하지 않는다. |
| M010와 Issue #7 | M010 설명은 `v0.1.0 — HOP 기반 코드를 독립적인 Alhangeul Windows/Linux 제품 기준으로 전환`이다. | `0.1.0` 재시작이 milestone의 명시 목표와 직접 일치한다. |

## hard gate 판정

| 우선순위 | 판단 기준 | 결과 | 판정 |
|---|---|---|---|
| 1 | Alhangeul 외부 version 계약 | Release 0건, tag 0건, updater·publication 경로 0건, 공식 다운로드 미제공 | `0.1.0` 재시작을 막는 계약을 찾지 못함 |
| 2 | 지원 설치 기반·downgrade | 공식 release·설치 지원·update channel 없음. Task #5 artifact는 비배포 smoke | 공식 지원 계약 기준으로 재시작 가능 |
| 3 | 제품 정체성과 provenance | HOP는 초기 코드·Git 이력 출처이고 Alhangeul identifier·release channel은 독립 | `0.1.0` 재시작 우세 |
| 4 | M010 정합성 | milestone이 독립 제품 `v0.1.0` 전환을 명시 | `0.1.0` 재시작 우세 |
| 5 | 역사 증적 보존 | Task #5 `0.3.1` inventory는 선택과 무관하게 보존 가능 | 두 대안 모두 가능, 재시작 시 새 exact-SHA 증적 필요 |
| 6 | 향후 SemVer 의미 | 아직 Alhangeul 공식 release가 없고 첫 독립 계보를 정해야 함 | `0.1.0`이 사용자 기대를 더 명확히 표현 |
| 7 | 구현·검증 | 다섯 surface가 식별됐고 조건부 native matrix 계획이 승인됨 | 두 대안 모두 구현 가능 |

hard gate는 공개된 공식 지원 계약을 기준으로 통과했다. PUBLIC repository의 Actions artifact를 권한 있는 사용자가 내려받아 임의 설치했을 가능성까지 부정하지 않는다. 다만 그 설치는 공식 다운로드·지원·updater 계약이 아니며, 이번 task는 HOP 또는 임의 설치본에 대한 downgrade migration을 제공하지 않는다.

## 대안 비교

| 대안 | 장점 | 비용·오해 위험 | 필요한 후속 검증 |
|---|---|---|---|
| `0.1.0` 재시작 | 독립 제품 identity와 M010 목표 일치, Alhangeul 첫 release 계보를 명확히 시작 | 숫자상 `0.3.1 → 0.1.0` 하향이며 HOP/Task #5 역사와 혼동 가능 | 다섯 surface 원자적 변경, 새 exact-SHA Windows/Linux artifact 이름·inventory 검증 |
| `0.3.1` 계승 | HOP code/version chronology와 숫자 단조성을 유지, native packaging 재실행 불필요 | Alhangeul이 과거 `0.1.x`~`0.3.0` release를 제공했다는 인상과 M010 `v0.1.0` 모순을 별도 설명해야 함 | 값은 유지하되 version drift checker와 exact-SHA CI 검증 |

## 추천안

**`0.1.0` 재시작을 추천한다.**

근거는 다음과 같다.

- Task #1은 HOP를 지속 upstream이나 배포 channel이 아닌 초기 출처로 한정하고 Alhangeul 제품 identity를 분리했다.
- HOP의 `0.3.1` 외부 계약은 `golbin/hop`, `net.golbin.hop`과 HOP updater에 속하며 현재 Alhangeul 계약으로 이어지지 않는다.
- Alhangeul repository에는 release/tag/updater/package publication과 공식 지원 설치 기반이 없다.
- Task #1은 `0.3.1`을 Alhangeul release version으로 확정하지 않았고 후속 기준으로 `v0.1.0`을 명시했다.
- M010의 이름과 목표가 첫 독립 제품 `v0.1.0`에 직접 맞는다.
- Task #5 `0.3.1` artifact는 당시 사실로 보존하고 Task #7에서 새 `0.1.0` exact-SHA artifact를 별도 검증할 수 있다.

추천 승인의 전제는 Alhangeul `0.3.1`을 공식적으로 배포·지원하거나 version 단조성을 약속한 외부 계약이 작업지시자에게 별도로 알려져 있지 않다는 것이다. 그런 계약이 있다면 `0.3.1` 계승을 선택하거나 migration을 별도 Issue로 승인해야 한다.

## 작업지시자 선택

| 항목 | 상태 |
|---|---|
| 추천안 | `0.1.0 재시작` |
| 작업지시자 선택 | **`0.1.0 재시작` 승인** |
| 승인일 | 2026-07-28 |
| 승인 근거 | 같은 스레드에서 작업지시자가 `0.1.0 재시작`을 명시 |
| Stage 2 제약 | 현재 제품 surface 다섯 곳만 변경하고 Task #5 `0.3.1` 증적은 보존 |
| 선택 반영 commit | `Task #7 [Stage 1.1]: 제품 버전 선택 승인 반영` |

## 본문 변경 정도 / 본문 무손실 여부

- 신규 Stage 1 조사 보고서만 작성했다.
- 제품 코드, package/Cargo/Tauri version, workflow와 공식 문서 본문은 변경하지 않았다.
- Task #5 보고서 6개와 `DESKTOP_RELEASE.md`의 `0.3.1` run·artifact·checksum은 읽기만 했으며 수정하지 않았다.

## 검증 결과

실행 명령:

```bash
git log --all --date=short --format='%h %ad %s' -- package.json apps/desktop/package.json apps/desktop/src-tauri/Cargo.toml apps/desktop/src-tauri/tauri.conf.json
git show bbd6bf69db05f275d714e7c61cef58b662809c6a:package.json
gh release list --repo postmelee/alhangeul-tauri --limit 100
git ls-remote --tags origin
rg -n '0\.1\.0|0\.3\.1|version|updater|releases/latest|package repository' README.md package.json apps docs scripts tests mydocs/report/task_m010_1_report.md
git diff --name-only
git diff --check
```

결과:

- OK — HOP release chronology와 기준 commit의 `0.3.1`을 확인했다.
- OK — Alhangeul 제품 surface 다섯 곳이 모두 `0.3.1`이고 About 표시가 Tauri config에서 파생됨을 확인했다.
- OK — GitHub Release와 remote tag 명령은 출력 0건으로 종료했다.
- OK — current updater·release/package publication source는 좁은 교차 검색에서 0건이었다.
- OK — Task #1의 version 미확정 결정과 Task #5의 비배포 artifact 경계를 확인했다.
- OK — Stage 1 변경 파일은 이 보고서 한 개뿐이며 `git diff --check`가 통과했다.

## 잔여 위험

- PUBLIC repository의 Actions artifact를 개인이 임의 설치했는지 저장소만으로 증명하거나 배제할 수 없다. 공식 지원 계약과 분리했으며 migration은 범위 밖이다.
- GitHub 밖의 비공식 재배포를 전 세계 registry에서 완전 탐색하지 않았다. 현재 공식 문서·source·workflow에는 이를 승인하거나 지원하는 계약이 없다.
- `0.1.0` 선택 시 Task #5의 `0.3.1` 증적과 현재 product surface를 전역 치환하지 않도록 Stage 2 allowlist가 필요하다.

## 다음 단계 영향

- 작업지시자가 `0.1.0 재시작`을 선택하면 이 보고서에 결정을 기록하는 Stage 1.1 commit 뒤 Stage 2에서 다섯 제품 surface를 원자적으로 변경한다.
- `0.3.1 계승`을 선택하면 Stage 1.1에 그 이유를 기록하고 Stage 2에서는 값 변경 없이 drift verifier만 도입한다.
- 선택이 없거나 별도 외부 계약이 제시되면 Stage 2로 진행하지 않는다.

## 승인 요청

- Stage 1 조사 결과와 `0.1.0 재시작` 추천을 검토해 제품 version을 `0.1.0 재시작` 또는 `0.3.1 계승` 중 하나로 명시해 주기를 요청한다.
- 선택 승인 후 이 보고서의 `작업지시자 선택`을 Stage 1.1 commit으로 먼저 갱신하고, 그 다음 Stage 2 진입 승인을 별도로 확인한다.
