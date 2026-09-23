# Task #7 수행계획서 — 제품 버전 기준과 공개 프로젝트 상태 정렬

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
마일스톤: M010

## 목적

Alhangeul의 첫 독립 제품 버전을 `0.1.0`으로 재시작할지, 초기 코드 출처인 HOP의 마지막 버전 `0.3.1`을 계승할지 provenance, 외부 호환성, 배포 계약과 사용자 기대를 근거로 비교하고 작업지시자 승인으로 확정한다.

선택한 버전은 workspace package, desktop package, Rust package, Tauri bundle과 사용자 노출 경계에서 일관되게 관리하고, 불일치를 자동으로 거부한다. README와 공식 운영 문서는 활성화된 Actions, 검증 완료된 Windows/Linux native artifact smoke, 아직 공식 release가 없다는 현재 상태를 함께 설명해야 한다.

## 배경

M010의 Task #1, #3, #5에서 Alhangeul 독립 제품 경계, `rhwp v0.8.2` Stable pin, Windows/Linux exact-SHA native artifact smoke를 순서대로 검증했다. 그러나 GitHub M010 마일스톤은 `v0.1.0`을 목표로 설명하는 반면 다음 제품 버전 표면은 모두 `0.3.1`이다.

- root `package.json`
- `apps/desktop/package.json`
- `apps/desktop/src-tauri/Cargo.toml`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src-tauri/Cargo.lock`의 `alhangeul-desktop` package
- `tauri.conf.json`을 통해 주입되는 About 대화상자의 Alhangeul 버전

현재까지 확인한 사실은 다음과 같다. 이 항목은 선택 결과가 아니라 Stage 1 판단을 시작하기 위한 증거 기준선이다.

- `0.3.1`은 HOP 기준 commit `bbd6bf69db05f275d714e7c61cef58b662809c6a`의 `chore(release): bump version to v0.3.1`에서 유래했다. 그 이전 이력에는 HOP `0.1.x`, `0.2.0`, `0.3.0` 버전과 공개 다운로드·updater 운영 기록이 있다.
- Task #1은 제품명, package/crate, Tauri identifier를 Alhangeul로 바꾸고 HOP updater와 release 경로를 제거했지만 버전 값은 유지했다. Task #1 최종 보고서는 `0.3.1`을 Alhangeul 독립 release 버전으로 확정하거나 재설정하지 않았다고 명시한다.
- Alhangeul의 Tauri identifier는 `net.golbin.hop`에서 `io.github.postmelee.alhangeul`로 바뀌었고, HOP release channel은 지속 upstream이나 Alhangeul 업데이트 경로가 아니다.
- 2026-07-28 조회 기준 `postmelee/alhangeul-tauri`에는 GitHub Release와 원격 tag가 없다. README와 공식 운영 문서도 공식 설치 파일, 공개 release, updater와 package 게시가 없다고 명시한다.
- Task #5는 `0.3.1` 이름의 Windows/Linux installer를 exact SHA에서 생성했지만 Actions artifact를 14일 보존되는 build smoke로만 검증했다. 설치·실행, 서명, GitHub Release, package 게시와 updater는 검증하거나 제공하지 않았다.
- `README.md`는 아직 Actions 비활성과 native build 미검증 상태를 안내해 Task #5 이후 실제 상태와 어긋난다. `docs/operations/DESKTOP_RELEASE.md`는 활성 상태와 native smoke를 이미 기록한다.
- `apps/studio-host/package.json`의 `0.1.0`은 내부 private adapter package 버전이고 `apps/studio-host/vendor/rhwp-core/package.json`의 `0.8.2`는 upstream 의존성 버전이다. Stage 1에서 이처럼 제품 버전이 아닌 숫자를 분류해 일괄 치환 대상에서 제외한다.

## 범위

### 포함

- 현재 제품 버전 사용 지점, 사용자 노출 경계와 HOP에서 이어진 버전 이력 조사
- Alhangeul repository release/tag, updater, package repository, 문서화된 다운로드와 지원되는 설치 기반 존재 여부 확인
- 아래 판단 기준에 따른 `0.1.0` 재시작과 `0.3.1` 계승 비교, 추천안 기록과 작업지시자의 명시적 선택
- 선택한 버전에 따른 root package, desktop package, Rust package, Tauri config와 Cargo lock 정렬
- 제품 버전과 내부 package 버전, `rhwp` upstream 버전, 과거 artifact 증적의 분류
- 제품 버전 단일 기준과 나머지 surface의 일치를 검사하는 read-only 자동 검증기와 회귀 테스트
- CI와 native workflow가 build 전에 제품 버전 검증을 실행하도록 연결
- README의 Actions 활성 상태, Windows/Linux native smoke 완료와 비배포 상태 갱신
- `PROVENANCE.md`, `DEVELOPMENT.md`, `DESKTOP_RELEASE.md`의 버전 계보, 검증 명령, M010·공식 release 경계 정렬
- 제품 버전 값이 `0.3.1`에서 변경될 때 final exact SHA의 Windows/Linux native artifact 이름과 inventory 재검증
- Task #5의 `0.3.1` canary 기록과 checksum을 당시 사실로 보존

### 제외

- GitHub Release, release tag, package repository와 사용자 다운로드 채널 생성
- signing, 인증서·secret 등록, updater와 자동 배포 활성화
- Windows/Linux installer 실제 설치·실행 smoke와 기존 HOP 설치본 migration 지원
- `rhwp` 버전 변경과 `third_party/rhwp` 수정
- 새로운 viewer/editor 기능과 범위 밖 리팩터링
- 자동 trigger, required check와 workflow 권한 확대
- macOS build, CI, 개발 검증, 패키징과 배포
- Task #5의 과거 `0.3.1` artifact 파일명, 크기, checksum, run과 보고서 증적 재작성
- GitHub M010 마일스톤 close 또는 metadata 변경
- 제품 버전 선택 전에 package, Cargo, Tauri, README와 workflow의 구현 변경

## 설계 방향

### 버전 정책 판단 기준과 결정 게이트

버전 선택은 숫자 크기나 M010 명칭만으로 정하지 않는다. 먼저 되돌리기 어려운 외부 계약을 hard gate로 확인하고, 두 선택지가 모두 허용될 때 제품 계보의 의미를 작업지시자가 선택한다. 가중치 점수로 외부 호환성 위험을 상쇄하지 않는다.

| 우선순위 | 판단 기준 | 확인할 증거 | `0.1.0` 재시작 조건과 의미 | `0.3.1` 계승 조건과 의미 |
|---|---|---|---|---|
| 1 — hard gate | Alhangeul 외부 버전 계약 | repository release/tag, updater endpoint, package repository, 사용자 다운로드 문서, 서명된 배포물 | Alhangeul 명의의 공개 `0.3.1` 계약이 없어야 한다. 계약이 발견되면 별도 migration 승인 없이 하향할 수 없다. | 공개 계약이 하나라도 있거나 버전 단조 증가를 보장해야 하면 계승한다. |
| 2 — hard gate | 지원되는 설치 기반과 downgrade 영향 | 공식 배포 여부, 지원 대상 설치본, Windows/Linux package upgrade 의미, 기존 설치본 migration 약속 | Task #5 artifact가 비배포 smoke이고 지원되는 Alhangeul `0.3.1` 설치 기반이 없음을 입증해야 한다. `0.3.1 → 0.1.0`을 지원 upgrade로 오인시켜서는 안 된다. | 지원 설치본 또는 migration 약속이 있거나 그 존재를 배제할 수 없으면 단조 증가를 유지한다. |
| 3 | 제품 정체성과 provenance | HOP release 이력, Task #1 독립화 결정, Tauri identifier와 updater 경계 | HOP의 `0.3.1`은 출처 이력으로 보존하되 Alhangeul의 독립 SemVer 계보는 `0.1.0`부터 시작한다고 선언한다. | 코드·제품 버전 계보를 HOP에서 연속된 것으로 선언하되 제품 소유권, identifier와 배포 채널은 독립임을 분리 설명한다. |
| 4 | 공개 설명과 M010 정합성 | M010 `v0.1.0` 설명, README, release 운영 문서 | M010 목표와 첫 Alhangeul 버전이 직접 일치한다. 아직 official release가 아니라는 상태는 별도로 유지한다. | M010은 독립화 완료 마일스톤이고 제품 버전은 계승한다는 이유를 공식 문서에 명시해 숫자 불일치를 설명한다. |
| 5 | 역사 증적 보존 | Task #5 report, stage report, `DESKTOP_RELEASE.md`의 `0.3.1` inventory | 과거 `0.3.1` smoke를 수정하지 않고, 새 exact-SHA `0.1.0` artifact 증적을 별도 기록한다. | 기존 `0.3.1` 증적을 그대로 유지하고 새 verifier 도입 결과와 공식 release 부재만 구분한다. |
| 6 | 향후 SemVer 의미 | 첫 공개 release 계획, 사용자 기대, 다음 version 증가 규칙 | 독립 제품의 초기 불안정 API·기능 상태를 `0.1.0`부터 설명한다. HOP 사용자에 대한 자동 upgrade 경로를 암시하지 않는다. | 이미 진행된 HOP code lineage를 버전에도 반영한다. Alhangeul이 이전 `0.1.x`~`0.3.0` release를 직접 제공했다는 오해를 방지한다. |
| 7 | 구현·검증 가능성 | 모든 product surface, About 표시, bundle 이름, Cargo lock, 자동 검증 | 모든 현재 surface를 원자적으로 `0.1.0`으로 맞추고 새 native artifact 이름을 exact SHA에서 검증할 수 있어야 한다. | 현재 값을 유지하더라도 같은 자동 정합성 검증을 도입해 이후 drift를 거부해야 한다. |

결정 규칙은 다음 순서를 따른다.

1. Alhangeul 명의의 공개 version 계약이나 지원 설치 기반이 하나라도 확인되면 `0.1.0` 재시작은 이번 task에서 선택하지 않는다. 하향 migration이 필요하면 별도 Issue와 승인 대상으로 분리한다.
2. 공개 계약과 지원 설치 기반이 없고 Task #1의 독립 제품 경계를 버전 계보에도 적용하기로 하면 `0.1.0` 재시작을 선택할 수 있다.
3. 외부 계약이 없더라도 작업지시자가 HOP code lineage와 버전의 연속성을 제품 정책으로 채택하면 `0.3.1`을 계승할 수 있다. 이 경우 M010 `v0.1.0` 설명과 과거 HOP release를 Alhangeul release로 오인하지 않도록 공식 문서에 이유를 남긴다.
4. 외부 계약 또는 설치 기반 존재 여부가 모호하면 버전 값을 변경하지 않는다. Stage 1을 완료로 처리하지 않고 추가 확인이나 별도 migration 범위 승인을 요청한다.
5. Stage 1 보고서에 증거표, 두 대안의 영향, 추천안을 기록한 뒤 작업지시자가 `0.1.0 재시작` 또는 `0.3.1 계승`을 명시적으로 선택해야 Stage 2로 진행한다. 이 수행계획서 승인만으로 버전 선택이 승인된 것으로 간주하지 않는다.

### 제품 버전 진실 원천과 자동 검증

- root `package.json`의 `version`을 repository-level 제품 버전 진실 원천으로 사용한다.
- read-only 검증기는 SemVer 형식과 다음 surface가 root 값과 같은지 검사한다.
  - `apps/desktop/package.json`
  - `apps/desktop/src-tauri/Cargo.toml`
  - `apps/desktop/src-tauri/tauri.conf.json`
  - `apps/desktop/src-tauri/Cargo.lock`의 단일 `alhangeul-desktop` entry
- Studio About 대화상자는 기존처럼 `tauri.conf.json` 값을 build-time으로 주입받는다. 제품 버전을 별도 상수로 복제하지 않고 이 연결이 유지되는지 회귀 검사한다.
- `apps/studio-host`의 private package 버전, `rhwp` release 버전, dependency/tool version과 역사 증적의 `0.3.1`은 제품 버전 비교 대상에서 명시적으로 제외한다.
- 검증기는 파일을 수정하지 않으며 누락, 중복 package entry, parse 실패와 값 불일치를 모두 비정상 종료로 보고한다.
- `pnpm run check:product-version`을 모든 호스트의 기본 검증으로 추가하고, CI와 native workflow에서 build 전에 실행한다.

### 공개 상태와 역사 증적

- README는 Actions가 활성 상태이고 수동 CI·Windows/Linux native matrix가 성공했다는 현재 사실을 안내한다.
- Actions artifact는 만료되는 build smoke이며 공식 release, 지원 설치 파일, updater source가 아니라는 경계를 README와 운영 문서에서 유지한다.
- Task #5 당시 `0.3.1` artifact inventory와 `mydocs` 보고서는 선택 결과와 관계없이 수정하지 않는다.
- `0.1.0`을 선택하면 Task #5 표를 바꾸지 않고 Task #7의 새 exact-SHA run과 artifact inventory를 별도 항목으로 추가한다.
- `0.3.1`을 선택하면 HOP version 계보의 연속성과 Alhangeul release/channel의 독립성을 동시에 설명하고, Alhangeul의 과거 release가 존재했다는 표현을 사용하지 않는다.
- release, tag, signing, package 게시와 updater는 선택 결과와 무관하게 후속 승인 대상이다.

## 문서 위치 판단

버전 선택의 비교 증거와 작업지시자 결정은 특정 Issue의 승인 기록이므로 `mydocs/working/task_m010_7_stage1.md`에 둔다. 장기 제품 계보는 기존 공식 출처 문서 `docs/architecture/PROVENANCE.md`, build·version·release 운영 경계는 `docs/operations/DESKTOP_RELEASE.md`, 기여자용 검증 명령은 `docs/DEVELOPMENT.md`, 사용자가 보는 현재 공개 상태는 root `README.md`에 반영한다. 새 공식 version 문서를 만들지 않고 기존 책임 문서에 필요한 내용만 최소 추가한다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `mydocs/working/task_m010_7_stage1.md` | 작업 판단·승인 증적 | 작업지시자/내부 작업자 | `mydocs/working/` | `docs/architecture/` | 두 대안 비교, 추천과 선택은 Issue #7의 단계 산출물이다. |
| `README.md` | 공식 제품 진입 문서 | 사용자/기여자 | 저장소 루트 | `site/` | Actions, native smoke와 비배포 상태를 첫 화면에서 바로 설명한다. |
| `docs/architecture/PROVENANCE.md` | 공식 제품 계보 문서 | 기여자/유지보수자 | `docs/architecture/` | `README.md` | HOP version 이력과 Alhangeul 독립 version 정책의 관계를 출처 경계와 함께 기록한다. |
| `docs/operations/DESKTOP_RELEASE.md` | 공식 운영 문서 | 유지보수자 | `docs/operations/` | `mydocs/manual/` | 제품 version, exact-SHA artifact와 release 전 경계의 기존 진실 원천이다. |
| `docs/DEVELOPMENT.md` | 공식 기여자 문서 | 기여자 | `docs/` | `README.md` | 새 version 정합성 명령을 기존 검증 명령 목록에 추가한다. |
| `mydocs/plans/task_m010_7*.md`, `mydocs/working/task_m010_7_stage*.md`, `mydocs/report/task_m010_7_report.md` | 작업 산출물 | 작업지시자/내부 작업자 | `mydocs/` | `docs/` | 수행·승인·검증 기록을 공식 제품 문서와 분리한다. |

## 예상 변경 파일

신규:

- `scripts/check-product-version.mjs`
- `tests/product-version.test.mjs`

수정:

- `package.json`
- `apps/desktop/package.json` — `0.1.0` 재시작 선택 시 version 변경
- `apps/desktop/src-tauri/Cargo.toml` — `0.1.0` 재시작 선택 시 version 변경
- `apps/desktop/src-tauri/tauri.conf.json` — `0.1.0` 재시작 선택 시 version 변경
- `apps/desktop/src-tauri/Cargo.lock` — `0.1.0` 재시작 선택 시 Alhangeul package entry 변경
- `.github/workflows/ci.yml`
- `.github/workflows/alhangeul-desktop.yml`
- `tests/actions-workflows.test.mjs`
- `tests/rhwp-baseline.test.mjs` — About 제품 버전 주입 계약 보강이 필요할 때만
- `README.md`
- `docs/DEVELOPMENT.md`
- `docs/architecture/PROVENANCE.md`
- `docs/operations/DESKTOP_RELEASE.md`

이번 task 산출물:

- `mydocs/orders/20260728.md`
- `mydocs/plans/task_m010_7.md`
- `mydocs/plans/task_m010_7_impl.md`
- `mydocs/working/task_m010_7_stage1.md`
- `mydocs/working/task_m010_7_stage2.md`
- `mydocs/working/task_m010_7_stage3.md`
- `mydocs/working/task_m010_7_stage4.md`
- `mydocs/working/task_m010_7_stage5.md`
- `mydocs/report/task_m010_7_report.md`

## 잠정 단계

- **Stage 1 — 버전 계보 조사와 선택 승인**
  - 제품 version surface와 비제품 version을 분류하고 HOP 이력, Alhangeul release/tag·배포 계약, 지원 설치 기반과 downgrade 영향을 증거표로 정리한다.
  - 위 hard gate를 적용한 두 대안 비교와 추천안을 Stage 1 보고서에 기록한다.
  - 제품 파일은 변경하지 않고, 작업지시자의 `0.1.0 재시작` 또는 `0.3.1 계승` 명시 승인을 요청한다.
- **Stage 2 — 선택 버전 정렬과 자동 검증**
  - 승인된 값을 root 진실 원천과 package, Cargo, Tauri, Cargo lock에 원자적으로 맞춘다. `0.3.1` 계승 시 기존 값은 유지한다.
  - read-only version checker, 불일치·누락·중복·형식 오류 회귀 테스트와 package script를 추가한다.
  - About 대화상자가 Tauri 제품 version을 계속 표시하고 `rhwp` version과 혼합하지 않는지 검증한다.
- **Stage 3 — CI 연결과 공개 문서 정렬**
  - CI와 native workflow가 build 전에 version checker를 실행하도록 연결하고 automation test를 보강한다.
  - README, DEVELOPMENT, PROVENANCE와 DESKTOP_RELEASE에 선택 근거, M010 관계, Actions/native smoke와 비배포 경계를 반영한다.
  - Task #5의 `0.3.1` run·artifact 증적과 Pages workflow가 변경되지 않았는지 확인한다.
- **Stage 4 — 플랫폼 중립 수용 검증**
  - frozen install, 제품 version·boundary·`rhwp` pin, automation, upstream, Studio와 offline Cargo 검증을 통합 실행한다.
  - 선택한 version이 모든 현재 제품 surface와 사용자 노출 경계에서 일치하고 금지 범위가 추가되지 않았는지 확인한다.
  - remote canary에 사용할 reviewable commit을 확정한다.
- **Stage 5 — exact-SHA 원격 검증과 최종 경계 확정**
  - 별도 단계 승인 후 reviewable commit을 `publish/task7`에 push하고 모든 선택에서 수동 CI를 exact SHA로 실행해 version checker 연결을 확인한다.
  - 제품 version 값이 `0.3.1`에서 바뀐 경우에만 Windows x64, Linux x64, Linux arm64 native artifact matrix를 실행하고 bundle 이름·크기·inventory를 다운로드 후 재검증한다.
  - version 값을 유지하면 Task #5 native 증적을 재작성하거나 같은 packaging을 불필요하게 재실행하지 않고, 원격 CI와 역사 증적 보존을 최종 확인한다.
  - 새 원격 증적을 공식 운영 문서와 최종 보고에 반영하되 Release, tag와 배포물은 만들지 않는다.

## 검증 계획

### 단계별 검증

- Stage 1
  - `git log`, `git show`, `git blame`으로 `0.3.1` 도입과 Task #1의 의도적 미확정 상태 확인
  - GitHub Release 목록과 remote tag, updater·package repository·다운로드 경로 확인
  - `rg`로 제품 version surface, 내부 package, upstream version과 역사 증적 분류
  - Stage 1 보고서의 hard gate별 증거, 추천안, 미확인 항목 검토
  - 제품 파일과 공식 문서 diff가 없는지 확인
- Stage 2
  - `node --test tests/product-version.test.mjs`
  - `pnpm run check:product-version`
  - 정상 일치와 package, Cargo, Tauri, Cargo lock의 개별 변조 실패 fixture 확인
  - About의 Alhangeul version과 `rhwp` version 분리 확인
  - `cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps`
  - `git diff --check`
- Stage 3
  - `pnpm run test:automation`
  - 두 workflow에서 제품 version 검증이 build 전에 실행되는지 정적 확인
  - README의 Actions 비활성·native 미검증 과거 표현 제거 확인
  - `git diff origin/devel -- .github/workflows/pages.yml`이 빈 출력
  - Task #5 `mydocs` 보고서와 `0.3.1` artifact inventory의 역사 값 보존 확인
  - `git diff --check`
- Stage 4
  - `pnpm install --frozen-lockfile`
  - `pnpm run check:product-version`
  - `pnpm run check:product-boundary`
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:automation`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - `cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps`
  - `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check`
  - `git diff --check`
- Stage 5
  - `publish/task7` remote SHA와 수동 CI run head SHA 일치 확인
  - CI log에서 `check:product-version`과 플랫폼 중립 검증 성공 확인
  - version 변경 시 native run의 Windows x64, Linux x64, Linux arm64 job 성공 확인
  - version 변경 시 artifact 세 개 다운로드 후 `check:desktop-artifacts --verify-inventory` 재실행
  - 선택한 version과 생성 bundle 이름 일치 확인
  - GitHub Release, tag, Pages 실행, secret, updater와 자동 trigger가 생성·추가되지 않았는지 확인
  - `git diff --check`

### 통합 검증

- Stage 1에서 외부 version 계약과 설치 기반 hard gate를 먼저 확인하고 작업지시자가 두 선택지 중 하나를 명시적으로 승인했다.
- root, desktop package, Rust package, Tauri config와 Cargo lock의 Alhangeul version이 일치한다.
- About 대화상자가 같은 Alhangeul version을 표시하고 `rhwp v0.8.2`와 제품 version을 구분한다.
- 제품 version surface가 어긋나면 read-only 자동 검증과 fixture test가 실패한다.
- CI와 native workflow가 build 전에 version 검증을 실행한다.
- README가 Actions 활성, Windows/Linux native smoke 완료와 공식 release 부재를 정확히 안내한다.
- M010 `v0.1.0` 설명과 선택한 제품 version 정책의 관계가 공식 문서에 설명된다.
- Task #5의 `0.3.1` artifact 파일명, checksum, run과 보고서가 당시 사실로 보존된다.
- version 변경 시 최종 exact SHA의 Windows/Linux artifact 이름과 inventory가 선택한 version으로 재검증된다.
- Actions artifact를 공식 release, 지원 설치 파일이나 사용자 배포물로 안내하지 않는다.
- macOS, Release, tag, signing, updater, package 게시, 자동 trigger와 required check가 추가되지 않는다.
- `git status --short`가 PR 준비 전 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **하향 version과 upgrade 의미 충돌**: `0.3.1 → 0.1.0`은 package manager와 updater 관점에서 downgrade다. 지원되는 Alhangeul 설치 기반이나 외부 계약을 배제하지 못하면 재시작하지 않고 migration을 별도 task로 분리한다.
- **HOP와 Alhangeul 계보 혼동**: `0.3.1` 계승은 Alhangeul이 HOP의 과거 release·배포 채널까지 소유하거나 제공한다는 오해를 만들 수 있다. provenance와 release channel 독립성을 공식 문서에서 명확히 분리한다.
- **M010 숫자 불일치**: `0.3.1`을 계승하면 M010의 `v0.1.0` 설명과 다르게 보인다. milestone metadata는 변경하지 않고 독립화 마일스톤과 제품 SemVer의 관계를 문서로 설명하되, 설명이 충분하지 않으면 선택 승인을 요청하지 않는다.
- **역사 증적의 일괄 치환**: 전역 `0.3.1 → 0.1.0` 치환은 Task #5 증거를 훼손한다. 변경 대상은 현재 제품 surface로 allowlist하고 과거 report, checksum, artifact 이름은 immutable evidence로 취급한다.
- **분산된 version 진실 원천**: package, Cargo와 Tauri를 사람이 따로 갱신하면 drift가 재발한다. root version을 기준으로 read-only checker와 fixture test를 두고 workflow build 전에 실행한다.
- **비제품 version 오탐**: internal Studio package `0.1.0`, `rhwp 0.8.2`, dependency version과 fixture 문자열은 다른 책임을 가진다. surface inventory와 package 이름을 기준으로 검사하고 숫자 전역 검색만으로 실패시키지 않는다.
- **remote canary 순서 예외**: 수정된 workflow와 version bundle은 remote ref 없이 검증할 수 없다. Stage 4의 reviewable commit과 Stage 5 별도 승인을 전제로 `publish/task7`을 PR보다 먼저 push하고 최종 PR에 같은 branch를 사용한다.
- **hosted runner 비용과 drift**: version 변경 시 Windows/Linux native matrix가 시간과 quota를 사용하고 runner/toolchain drift가 발생할 수 있다. 먼저 로컬·CI 검증을 통과시키고 실패 log를 분석한 뒤 Issue 범위 안의 최소 보정만 승인 요청한다.
- **검증과 배포의 혼동**: 새 version artifact가 생성돼도 서명, 설치·실행, Release와 updater가 준비된 것은 아니다. artifact는 task 검증 증적으로만 보존하고 공개 다운로드 경로를 만들지 않는다.

## 승인 요청 사항

- 외부 version 계약과 지원 설치 기반을 hard gate로 먼저 확인하고, provenance·M010 정합성·SemVer 의미를 그 다음 판단 기준으로 사용하는 방향
- 수행계획서 승인과 실제 version 선택을 분리하고, Stage 1 보고서에서 작업지시자가 `0.1.0 재시작` 또는 `0.3.1 계승`을 명시해야 제품 변경을 시작하는 결정 게이트
- root `package.json`을 제품 version 진실 원천으로 하고 desktop package, Cargo, Tauri와 Cargo lock을 read-only checker로 대조하는 방향
- internal package, `rhwp` version, dependency version과 Task #5 역사 증적을 제품 version 일괄 변경 대상에서 제외하는 분류
- README, PROVENANCE, DEVELOPMENT, DESKTOP_RELEASE의 기존 책임 경계를 유지하고 새 공식 version 문서를 만들지 않는 문서 위치 판단
- Task #5의 `0.3.1` run·artifact·checksum 증적을 수정하지 않고, version 변경 시 Task #7 exact-SHA 증적을 별도로 추가하는 원칙
- Stage 5에서 `publish/task7`을 PR 전에 remote canary ref로 사용하는 순서 예외와, 모든 선택의 exact-SHA CI 및 version 변경 시에만 Windows/Linux native matrix를 실행하는 조건
- release, tag, signing, updater, package 게시, 설치·실행 smoke, 자동 trigger, required check, macOS와 milestone metadata 변경을 제외하는 범위
- 위 5개 단계와 검증 계획

이 수행계획서가 승인돼도 제품 version 선택은 아직 승인되지 않는다. 승인되면 `task_m010_7_impl.md`에서 단계별 산출물, 검증 명령과 커밋 메시지를 구체화하고, Stage 1 조사 결과에 대한 별도 선택 승인을 받은 뒤에만 제품 파일을 변경한다.
