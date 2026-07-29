# Task #9 수행계획서 — v0.1.0 prerelease 후보 준비와 공개 배포 Go/No-Go 검증

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
마일스톤: M010

## 목적

Alhangeul `v0.1.0`을 바로 공개하지 않고, GitHub prerelease로 게시할 수 있는 후보의 계약과 Go/No-Go 기준을 먼저 확정한다. 제품·패키지 설명을 실제 기능 범위와 맞추고, 최신 `devel`을 기준으로 한 exact-SHA Windows/Linux bundle 생성, artifact 무결성, 설치·실행·핵심 시나리오·제거와 rollback을 검증한다. 공개 baseline은 HOP의 Windows/Linux direct-download bundle 범위를 계승하고, Windows ARM64는 별도 Issue의 성공 여부에 따라 게시 단계에서 추가할 수 있는 조건부 확장으로 둔다.

이 task는 되돌리기 쉬운 준비와 검증까지만 소유한다. `devel → main` release PR, `v0.1.0` tag와 GitHub Release 게시는 Go 판정 후 별도 Issue에서 수행하며, Task #9의 Actions artifact를 공식 배포물로 재사용하지 않는다.

## 배경

M010의 Task #1, #3, #5, #7에서 Alhangeul 독립 제품 경계, `rhwp v0.8.2` Stable pin, Windows/Linux native artifact build smoke와 독립 제품 버전 `0.1.0`을 확정했다. 기존 구현 이슈는 닫혔고 공개 배포 준비 Issue #9와 조건부 Windows ARM64 Issue #10을 M010에서 계속 추적한다.

- root 제품 version과 desktop package, Cargo, Tauri surface는 `0.1.0`으로 정렬되어 있다.
- `rhwp`는 Stable tag `v0.8.2`, resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`에 고정되어 있다.
- Task #7 exact commit `02931beb43e2944083e78d792603bff82200478c`에서 CI와 Windows x64, Linux x64, Linux arm64 native artifact build·inventory가 성공했다.
- Task #7 검증 SHA와 현재 `devel` merge SHA `a00000a5fa91c9f407eb4340c5df67060b5f6211` 사이에는 운영·작업 문서만 다르지만, 공식 release provenance는 최종 tag exact SHA에서 다시 검증해야 한다.
- 현재 `main`은 `devel`보다 42 commits 뒤이며, 저장소 운영 규칙은 일반 task PR과 `devel → main` release PR을 분리한다.
- GitHub tag와 Release는 없고 Actions artifact는 14일 후 만료되는 build smoke다.
- `README.md`와 `docs/DEVELOPMENT.md`는 HWPX 열기와 HWP 저장만 지원한다고 설명하지만 `apps/desktop/src-tauri/tauri.conf.json`의 long description은 HWPX 저장까지 지원하는 것으로 읽힐 수 있다.
- HWPX 저장, autosave/recovery와 외부 파일 변경 감지는 현재 미지원 기능이며 이번 release 준비 task에서 구현하지 않는다.
- `rhwp v0.8.2`에는 PDF 안내 modal과 페이지 repaint 관련 upstream known issue가 있으나, known issue라는 이유만으로 검증 성공으로 간주할 수 없다.
- HOP v0.4.1의 Windows/Linux direct-download asset은 Windows x64 MSI·EXE, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB이며, golbin/hop#80은 Windows ARM64 MSI·EXE를 추가로 요청한다.

`docs/operations/DESKTOP_RELEASE.md`는 공개 배포 전 version/tag/bundle/checksum 정책, Windows signing과 Linux package metadata, 설치·실행과 rollback, 사용자 문서·지원 범위를 별도 승인 경계로 검증하도록 요구한다. Task #9는 이 후속 준비 범위를 하나의 release candidate 수용 매트릭스로 묶는다.

## 범위

### 포함

- `v0.1.0` prerelease 후보의 version, 예정 tag, bundle 이름, 지원 artifact와 checksum 게시 계약
- GitHub prerelease 표시, Windows signing과 unsigned 후보 허용 여부, Linux package metadata의 Go/No-Go 기준
- HOP Windows/Linux bundle parity에 해당하는 Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB의 필수 build·inventory·native 수용 범위
- 별도 Issue #10의 Windows ARM64 결과를 후속 게시 Issue에서 조건부 asset으로 판정하기 위한 경계
- package metadata, README와 공식 운영 문서가 실제 지원 기능·플랫폼·배포 상태를 정확히 설명하도록 정렬
- 제품 설명의 HWPX 저장 오인 가능성을 제거하고 회귀 검증을 추가
- 최신 `devel` 기반 reviewable exact SHA의 플랫폼 중립 검증과 native candidate build
- 다운로드한 artifact의 inventory, 파일 크기와 SHA-256 독립 재검증
- 승인된 Windows/Linux 환경에서 설치·실행·파일 연결·문서 열기·편집·HWP 저장·PDF 내보내기·인쇄 경계·제거와 rollback smoke
- 지원 bundle별 실제 설치 가능 환경, 자동/수동 검증 책임과 증적 형식 결정
- upstream known issue와 Alhangeul 회귀의 분류, 미지원 기능과 서명 상태를 포함한 release notes 초안
- Go/No-Go 최종 판단과 후속 prerelease 게시 Issue의 입력·차단 조건

### 제외

- `devel → main` release PR 생성·병합
- `v0.1.0` tag 생성, 이동 또는 삭제
- GitHub Release 생성·게시와 고정/latest 다운로드 URL 노출
- Task #9 candidate artifact를 공식 release asset으로 재사용
- 인증서 구매, 외부 CA 계약, repository secret 등록 등 signing 인프라 구축
- package registry 또는 Linux 배포판 repository 게시
- updater manifest, update artifact, update key와 updater 활성화
- HWPX 저장, autosave/recovery와 외부 파일 변경 감지 기능 구현
- `rhwp` 갱신, `third_party/rhwp` 수정과 upstream known issue backport
- macOS build, CI, 설치, 패키징과 배포 검증
- Windows ARM64 workflow·artifact verifier·installer 구현과 native 검증 — Issue #10 소유
- Arch Linux AUR와 같은 외부 배포 채널 게시
- 물리 프린터나 특정 상용 애플리케이션을 필수 검증 의존성으로 추가
- M010 마일스톤 close

## 설계 방향

### 준비 task와 게시 task의 분리

Task #9는 일반 `local/task9 → publish/task9 → devel` PR로 release 준비에 필요한 제품 metadata, 자동 검증과 공식 운영 문서를 반영한다. 모든 candidate gate가 통과하면 후속 Issue를 등록해 `devel → main` release PR, tag, tag exact-SHA build, GitHub prerelease 게시와 공개 후 smoke를 수행한다.

| 경계 | Task #9 — 후보 준비·검증 | 후속 게시 Issue |
|---|---|---|
| 기준 ref | 최신 `devel` 기반 reviewable exact SHA | release PR로 병합된 `main`과 immutable `v0.1.0` tag |
| source 변경 | metadata, 검증 자동화, 운영·사용자 문서 | Task #9에서 승인된 release 승격에 필요한 최소 변경만 |
| artifact | 14일 Actions candidate artifact | tag exact SHA에서 새로 만든 release asset |
| 외부 공개 | 금지 | 별도 단계 승인 후 GitHub prerelease 게시 |
| rollback | candidate 폐기, 공식 상태 불변 | tag 이동 없이 withdrawn/superseded 또는 fix-forward 정책 적용 |
| 종료 조건 | Go/No-Go 보고와 reviewable task PR | 공개 다운로드 재검증 후 Issue·M010 종료 승인 |

Issue #9 본문의 “최종 `devel` exact SHA”는 두 exact-SHA gate로 구체화한다.

1. Task #9에서는 최신 `devel`을 기준으로 모든 준비 변경을 포함한 `publish/task9` reviewable commit을 candidate exact SHA로 검증한다.
2. Task #9 merge 뒤 생기는 최종 `devel`, release PR merge 뒤의 `main`과 `v0.1.0` tag exact SHA는 후속 게시 Issue에서 다시 검증한다.

Task #9 candidate SHA와 최종 tag SHA의 tree가 같아 보이더라도 artifact를 재사용하지 않는다. 이 해석은 하이퍼-워터폴의 task PR 완료 시점과 release PR·tag 생성 시점을 혼합하지 않기 위한 승인 대상이다.

Issue #10은 Task #9 baseline을 차단하지 않는 조건부 Windows ARM64 확장이다. Task #9은 Windows x64와 Linux bundle의 Go/No-Go를 완결하고, 후속 게시 Issue는 Issue #10이 별도로 Go이면 ARM64 MSI·NSIS를 추가한다. Issue #10이 실패하거나 native 증적을 확보하지 못하면 Windows ARM64만 제외하며, Task #9에서 지원 성공으로 기록하지 않는다.

### release candidate 계약과 결정 게이트

Stage 1에서 다음 항목을 증거표로 확정한다. 미결정 항목을 암묵적인 허용으로 처리하지 않는다.

| 항목 | 기본 제안 | Go 조건 | No-Go 또는 분리 조건 |
|---|---|---|---|
| 공개 등급 | GitHub `prerelease` | 미지원 기능과 위험을 release notes에 명시 | stable/latest로 오인될 표현이 남음 |
| 예정 version/tag | source `0.1.0`, 예정 tag `v0.1.0` | 모든 product surface와 bundle 이름 일치 | version drift 또는 기존 tag 충돌 |
| checksum | 모든 release asset의 immutable filename과 SHA-256을 `SHA256SUMS`로 게시 | 다운로드 후 독립 재계산 일치 | 누락 asset 또는 hash 불일치 |
| Windows signing | 첫 prerelease는 unsigned 허용 | SmartScreen 경고와 `SHA256SUMS`가 package·release notes에 일치 | unsigned 상태가 누락되거나 stable로 오인됨 |
| Linux metadata | package name, version, architecture, license, description, MIME/file association와 dependency 검토 | 각 bundle의 metadata가 실제 범위와 일치 | 허위 기능 설명, 잘못된 architecture/dependency |
| baseline bundle | Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB | 모든 형식의 build·checksum·native 수용 증적 | 하나라도 필수 gate 미충족 |
| Windows ARM64 | Issue #10의 unsigned experimental MSI·NSIS | Issue #10 별도 Go와 후속 게시 시점 재검증 | 실패·미검증이면 ARM64만 제외 |
| updater | 사용하지 않음 | binary와 문서에 update channel을 안내하지 않음 | updater 또는 latest channel이 암묵적으로 활성화됨 |
| rollback | candidate는 폐기 가능, tag는 immutable | tag 이동 없는 withdraw/supersede/fix-forward 절차 승인 | tag 이동·덮어쓰기가 필요함 |

첫 prerelease의 Windows installer는 unsigned를 허용하되 SmartScreen 경고와 `SHA256SUMS`를 필수로 표시한다. signing 인프라는 별도 Issue로 분리하며 인증 정보나 secret은 저장소, 로그와 작업 문서에 기록하지 않는다.

### artifact와 checksum 계약

- candidate workflow는 exact commit을 checkout하고 실제 SHA가 요청 ref와 같은지 먼저 확인한다.
- artifact 이름은 `alhangeul-desktop-{platform}`을 유지하고 내부 bundle은 제품 version, architecture와 installer 종류를 식별할 수 있어야 한다.
- 기존 `alhangeul-artifact-inventory.json`은 bundle별 파일 크기와 SHA-256의 build-time 증적이다.
- 다운로드 후 별도 임시 디렉터리에서 inventory를 독립 검증하고, 검증이 끝난 artifact는 공식 배포 경로로 옮기지 않는다.
- 최종 게시용 `SHA256SUMS` 생성·검증 방식은 candidate 단계에서 자동화하되 Task #9에서는 Release asset으로 올리지 않는다.
- 이전 Task #5와 #7의 artifact·checksum은 역사 증적으로 보존하고 새 candidate 결과로 덮어쓰지 않는다.

### 지원 플랫폼 검증 매트릭스

macOS 호스트에서 Windows/Linux native 결과를 대신 판정하지 않는다. Stage 1에서 각 bundle을 실제로 해석할 수 있는 Windows/Linux 환경과 자동/수동 책임을 확정한다.

| 플랫폼 | 후보 bundle | build·inventory | 설치·실행 smoke | 미충족 처리 |
|---|---|---|---|---|
| Windows x64 | MSI, NSIS | `windows-2025` exact-SHA build와 독립 checksum 검증 | 각각 clean install, launch, file association, uninstall을 native Windows에서 확인 | Task #9 No-Go |
| Linux x64 | AppImage, DEB, RPM | Linux x64 exact-SHA build와 독립 checksum 검증 | AppImage 실행, DEB는 Debian 계열, RPM은 RPM 계열 호환 환경에서 install·launch·uninstall 확인 | 다른 package manager 결과로 대체하지 않고 Task #9 No-Go |
| Linux arm64 | DEB | Linux arm64 exact-SHA build와 독립 checksum 검증 | arm64 Debian 계열 호환 환경에서 install·launch·uninstall 확인 | x64 결과로 대체하지 않고 Task #9 No-Go |

설치 뒤 핵심 시나리오는 개인·비공개 문서를 사용하지 않고 저장소에서 재현 가능한 비민감 fixture 또는 Stage 1에서 승인한 샘플을 사용한다.

Windows ARM64 MSI·NSIS의 build·inventory·native 시나리오는 이 표에 대체 증적으로 넣지 않고 Issue #10에서 독립 검증한다. macOS bundle은 제품 지원 경계 밖이고 AUR은 GitHub Release bundle이 아닌 외부 배포 채널이므로 이번 공개 baseline에 포함하지 않는다.

1. 앱 launch와 제품명·version 확인
2. HWP와 HWPX 열기, 기본 rendering과 편집 확인
3. HWP 저장·다른 이름으로 저장 후 재열기
4. HWPX 직접 저장이 차단되고 HWP 저장 안내가 실제 정책과 일치하는지 확인
5. PDF 내보내기 결과 생성
6. 인쇄 명령이 지원 OS print 경계에 도달하는지 확인
7. HWP/HWPX 파일 연결과 이미 실행 중인 앱으로의 open routing 확인
8. 앱 종료·재실행, 제거와 잔여 등록 확인
9. candidate 재설치 또는 승인된 rollback 절차 확인

인쇄는 물리 프린터를 요구하지 않고 지원 OS의 print dialog 또는 승인된 virtual printer까지를 기본 경계로 제안한다. GUI 상호작용을 GitHub-hosted runner에서 신뢰성 있게 자동화할 수 없는 항목은 수동 시나리오로 남기되, 실행 환경·절차·관찰 결과와 한계를 단계 보고서에 기록한다. 필수 시나리오가 실행되지 않은 상태는 단순한 검증 한계가 아니라 No-Go로 분류한다.

### package metadata와 사용자 기대

- `tauri.conf.json` long description은 HWP/HWPX 열기·편집과 HWP 저장·PDF 내보내기의 실제 범위를 오해 없이 설명해야 한다.
- short description, Cargo description, package name, identifier, publisher, category, copyright, file association와 MIME type을 함께 검토한다.
- metadata 정합성은 문자열 한 건 수정으로 끝내지 않고 read-only 검사나 회귀 테스트로 보호한다.
- 미지원 기능은 기능 결함을 숨기지 않되 prerelease의 알려진 제한으로 명시하고, 구현은 별도 feature Issue로 넘긴다.
- `rhwp v0.8.2` known issue는 pinned source, 재현 조건과 실패 지점이 기존 기록과 같을 때만 upstream known issue로 분류한다. Alhangeul adapter나 다른 실패 지점은 회귀 후보로 보고 Go 판정을 중지한다.

### rollback과 불변성

- Task #9 이전에는 공개 Alhangeul release가 없으므로 legacy Alhangeul 설치본으로의 downgrade를 가정하지 않는다.
- candidate 실패 시 Actions artifact를 폐기하고 문서에 공개 성공으로 기록하지 않는다.
- install rollback은 앱 제거, 파일 연결 정리와 candidate 재설치를 확인하되 사용자 문서를 자동 삭제하지 않는다.
- 후속 게시 뒤 문제가 발견되면 `v0.1.0` tag를 이동하거나 같은 asset을 덮어쓰지 않는다. release를 withdrawn/superseded로 표시하거나 수정 version으로 fix-forward하는 정책을 Stage 1에서 확정한다.
- release, tag, signing, package 게시와 rollback의 외부 상태 변경은 각각 해당 단계의 명시 승인 뒤에만 수행한다.

## 문서 위치 판단

공개 배포 계약과 지속적인 운영 절차는 기존 공식 운영 문서 `docs/operations/DESKTOP_RELEASE.md`가 소유한다. 사용자와 기여자가 처음 확인해야 하는 현재 기능·지원 플랫폼·비배포 상태는 root `README.md`에 두되, Task #9 동안에는 실제 GitHub Release가 없다는 표현과 다운로드 링크 금지를 유지한다. 개발자가 실행할 검증 명령이 추가되면 기존 `docs/DEVELOPMENT.md`에 반영한다.

candidate 수용 매트릭스의 조사 결과, 실행 환경, checksum과 수동 시나리오 증적은 Issue #9에 종속된 작업 기록이므로 `mydocs/working/`에 둔다. release notes 초안과 Go/No-Go 판단도 Task #9 단계·최종 보고서에 두고, 후속 게시 Issue에서 승인된 내용을 GitHub Release 본문으로 옮긴다. `mydocs/manual`에는 제품 release 문서를 추가하지 않는다.

| 파일 | 분류 | 대상 독자 | 선택 위치 | 대안 위치 | 선택 이유 |
|---|---|---|---|---|---|
| `README.md` | 공식 제품 진입 문서 | 사용자/기여자 | 저장소 루트 | `site/` | 기능, 미지원 범위와 현재 공개 상태를 첫 화면에서 확인한다. Task #9에서는 존재하지 않는 download를 안내하지 않는다. |
| `docs/operations/DESKTOP_RELEASE.md` | 공식 제품 운영 문서 | 유지보수자 | `docs/operations/` | `mydocs/manual/` | artifact, checksum, signing, install smoke와 release 경계의 기존 진실 원천이다. |
| `docs/DEVELOPMENT.md` | 공식 기여자 문서 | 기여자 | `docs/` | `README.md` | 새 read-only 검증 명령이나 재현 절차가 생길 때만 기존 개발 검증 목록을 갱신한다. |
| `apps/desktop/src-tauri/tauri.conf.json` | package metadata | 설치 사용자/package 도구 | desktop Tauri config | 별도 metadata 문서 | 실제 bundle에 들어가는 제품 설명과 file association의 진실 원천이다. |
| `mydocs/working/task_m010_9_stage*.md` | candidate 검증·승인 증적 | 작업지시자/내부 작업자 | `mydocs/working/` | `docs/operations/` | 환경별 로그, 후보 hash와 Go/No-Go 근거는 특정 task의 실행 기록이다. |
| `mydocs/report/task_m010_9_report.md` | 작업 최종 결과·release notes 초안 | 작업지시자/후속 게시 작업자 | `mydocs/report/` | GitHub Release | 공개 전 초안과 승인 근거를 공식 공개 문서와 분리한다. |

새 공식 제품 문서는 만들지 않고 기존 책임 문서를 필요한 범위에서만 수정한다. `docs/operations/DESKTOP_RELEASE.md`가 권장 300 LOC에 가까워지면 Stage 2 구현계획서에서 책임이 명확한 하위 운영 문서 분리를 제안하고 별도 승인을 받는다.

## 예상 변경 파일

신규 가능:

- `scripts/check-release-metadata.mjs` — package 설명·지원 범위와 release metadata의 read-only 검사 필요성이 Stage 1에서 승인될 때
- `tests/release-metadata.test.mjs` — metadata drift와 허위 기능 설명 회귀 검사

수정:

- `apps/desktop/src-tauri/tauri.conf.json`
- `package.json` — 새 release metadata 검사 명령이 승인될 때
- `.github/workflows/ci.yml` — 새 read-only 검사 연결이 필요할 때
- `.github/workflows/alhangeul-desktop.yml` — candidate checksum 또는 installer smoke 안전장치가 승인될 때
- `tests/actions-workflows.test.mjs` — workflow 계약 변경이 있을 때
- `README.md`
- `docs/DEVELOPMENT.md` — 새 검증 명령이 생길 때
- `docs/operations/DESKTOP_RELEASE.md`

이번 task 산출물:

- `mydocs/orders/20260729.md`
- `mydocs/plans/task_m010_9.md`
- `mydocs/plans/task_m010_9_impl.md`
- `mydocs/working/task_m010_9_stage1.md`
- `mydocs/working/task_m010_9_stage2.md`
- `mydocs/working/task_m010_9_stage3.md`
- `mydocs/working/task_m010_9_stage4.md`
- `mydocs/working/task_m010_9_stage5.md`
- `mydocs/report/task_m010_9_report.md`

## 잠정 단계

- **Stage 1 — prerelease 계약과 수용 매트릭스 확정**
  - version/tag/bundle/checksum, prerelease 표시, signing, package metadata, rollback과 release notes 필수 항목을 증거표로 정리한다.
  - Windows/Linux bundle별 build·설치·실행 환경, 자동/수동 시나리오와 필수 fixture를 확정한다.
  - unsigned Windows prerelease, baseline bundle 전체의 필수 수용, print 검증 경계와 미충족 시 No-Go 규칙을 작업지시자 승인으로 결정한다.
  - Windows ARM64는 Issue #10으로 분리하고 후속 게시 Issue에서 성공 시에만 포함하는 조건부 경계를 기록한다.
- **Stage 2 — 제품 metadata·공식 문서와 자동 검증 정렬**
  - Tauri package description과 실제 HWP/HWPX 기능 범위를 정렬하고 관련 metadata를 함께 검토한다.
  - metadata drift를 거부하는 최소 read-only 검사와 회귀 테스트를 추가하고 CI/native workflow 연결을 검토한다.
  - README, DEVELOPMENT와 DESKTOP_RELEASE의 기존 책임 경계 안에서 prerelease 후보 정책과 현재 비공개 상태를 반영한다.
- **Stage 3 — 플랫폼 중립 수용 검증과 exact-SHA candidate 생성**
  - frozen install, product boundary·version, release metadata, `rhwp` pin, automation, upstream, Studio build와 지원 OS용 Rust 검증을 실행한다.
  - reviewable commit을 `publish/task9`에 push하고 exact SHA의 CI·Windows/Linux native matrix를 실행한다.
  - Actions artifact를 별도 임시 디렉터리에 내려받아 inventory와 SHA-256을 독립 재검증하고 candidate checksum 초안을 만든다.
- **Stage 4 — Windows/Linux 설치·실행·rollback 시나리오 검증**
  - Stage 1에서 승인한 native 환경에서 bundle별 clean install, launch, 핵심 문서 시나리오, file association, uninstall과 rollback을 수행한다.
  - 자동화할 수 없는 GUI 항목은 승인된 수동 절차의 환경·관찰 결과와 한계를 기록한다.
  - 필수 형식이나 시나리오가 누락되면 Stage 4를 완료하지 않고 Task #9를 No-Go로 판정한다.
- **Stage 5 — Go/No-Go 판정과 후속 게시 입력 확정**
  - 모든 자동·원격·수동 증적을 수용 매트릭스에 대조하고 upstream known issue와 Alhangeul 회귀를 구분한다.
  - prerelease notes 초안, asset·checksum 목록, signing 표시, rollback과 남은 위험을 정리한다.
  - Go인 경우에만 후속 “v0.1.0 prerelease 게시와 배포 후 검증” Issue의 입력을 확정하며 release PR, tag와 Release는 생성하지 않는다.

## 검증 계획

### 단계별 검증

- Stage 1
  - GitHub tag·Release, M010, Issue #5·#7과 Actions run의 현재 상태 확인
  - Tauri bundle config와 생성 artifact inventory, Windows/Linux package metadata 항목 조사
  - bundle별 native 설치 환경과 시나리오의 실행 가능성 검토
  - 계약표의 미결정 항목, 승인 필요 항목과 차단 조건 확인
  - `git diff --check`
- Stage 2
  - `node --test tests/release-metadata.test.mjs` — 파일이 도입될 때
  - `pnpm run check:product-boundary`
  - `pnpm run check:product-version`
  - `pnpm run test:automation`
  - package metadata의 HWPX 저장 오인 문구, platform·identifier·file association 회귀 검사
  - README와 DESKTOP_RELEASE가 실제 Release 생성 전 비공개 상태를 유지하는지 확인
  - `git diff --check`
- Stage 3
  - `pnpm install --frozen-lockfile`
  - `pnpm run check:product-boundary`
  - `pnpm run check:product-version`
  - `pnpm run check:rhwp-pin`
  - `pnpm run test:automation`
  - `pnpm run test:upstream`
  - `pnpm run test:studio`
  - `pnpm run build:studio`
  - Windows/Linux 환경의 `pnpm run test:desktop`, `pnpm run clippy:desktop`
  - exact-SHA 수동 CI와 native workflow의 모든 required job 성공
  - `pnpm run check:desktop-artifacts -- --verify-inventory ...`
  - 다운로드 파일의 독립 SHA-256 재계산과 candidate checksum 초안 대조
- Stage 4
  - Windows x64 MSI·NSIS native install/launch/file association/uninstall
  - Linux x64 AppImage·DEB·RPM native install/launch/uninstall
  - Linux arm64 DEB native install/launch/uninstall
  - HWP/HWPX open, HWP save/reopen, HWPX save block, PDF export와 print boundary 시나리오
  - 제거 후 file association·실행 경로와 사용자 문서 보존 확인
  - 환경, package, exact SHA, 관찰 결과와 증적 위치 기록
- Stage 5
  - Issue #9 수용 기준과 Stage 1 matrix의 모든 required 항목 대조
  - candidate exact SHA, workflow run, artifact IDs, inventory와 checksum 추적 가능성 확인
  - release notes 초안에 지원 플랫폼, 서명 상태, 미지원 기능과 known issue 포함
  - 후속 게시 Issue에서 final `devel`·`main`·tag exact SHA를 재검증하고 Task #9 artifact를 재사용하지 않는 조건 확인
  - `git diff --check`

### 통합 검증

- package metadata와 사용자 문서에 실제 지원 범위와 다른 설명이 없다.
- 승인된 candidate exact SHA에서 플랫폼 중립 검사와 Windows/Linux native build가 모두 성공한다.
- 다운로드한 모든 후보 artifact의 inventory와 SHA-256이 일치한다.
- release 후보에 포함할 모든 bundle의 승인된 설치·실행·핵심 시나리오·제거·rollback 결과가 있다.
- signed/unsigned 상태, 미지원 기능, known issue와 검증 한계가 release notes 초안과 운영 문서에 일관되게 기록된다.
- 필수 gate 미충족은 검증 한계로 숨기지 않고 No-Go 또는 후보 bundle 제외로 처리한다.
- Go 판정 전 release PR, tag, GitHub Release, updater와 package repository가 생성되지 않는다.
- PR 준비 전 `git status --short`가 빈 출력이다.
- `git diff --check`가 경고 없이 통과한다.

## 리스크

- **task SHA와 release SHA 혼동**: task PR merge 전 candidate SHA는 최종 tag SHA가 아니다. 후속 게시 Issue에서 `main`과 tag exact SHA를 다시 build하고 artifact를 새로 만든다.
- **main과 devel의 큰 차이**: 현재 `main`은 `devel`보다 42 commits 뒤다. Task #9에서 release PR을 만들지 않고 후속 Issue에서 diff와 승격 범위를 별도 검토한다.
- **서명되지 않은 Windows installer**: SmartScreen과 사용자 신뢰에 영향을 준다. 첫 prerelease의 unsigned 허용 상태와 경고를 명시하고 `SHA256SUMS`를 제공하되 signing을 대체한다고 표현하지 않는다.
- **Linux 배포판 차이**: Ubuntu runner의 DEB 성공으로 RPM을 검증한 것으로 간주하지 않는다. RPM 호환 native 환경이 없으면 Task #9를 No-Go로 판정한다.
- **GUI smoke 자동화 한계**: hosted runner에서 file dialog, print와 desktop session이 불안정할 수 있다. 승인된 native 수동 시나리오를 사용하고 필수 검증 미실행을 성공으로 처리하지 않는다.
- **package 설명과 실제 기능 불일치**: HWPX 저장을 지원하는 것으로 오인될 수 있다. metadata와 문서를 함께 수정하고 회귀 테스트로 보호한다.
- **known issue의 과도한 면제**: upstream 기록과 재현 조건이 다른 실패는 Alhangeul 회귀일 수 있다. 실패 지점이 일치하지 않으면 Stage를 중지한다.
- **artifact 만료와 잘못된 재사용**: candidate artifact는 14일 후 만료되고 공식 배포물이 아니다. 후속 release는 tag exact SHA에서 새로 생성한다.
- **rollback 의미의 모호성**: 첫 공식 release라 이전 Alhangeul 버전이 없다. uninstall·candidate 재설치와 공개 후 withdraw/fix-forward를 분리해 정의한다.
- **외부 상태 조기 변경**: tag, Release, signing secret과 package 게시를 Task #9 범위 밖으로 유지하고 단계별 명시 승인 없이 실행하지 않는다.
- **계획 문서 LOC 초과**: 수행계획서와 구현계획서는 이미 역할별로 분리했지만 release 계약·5단계 검증·승인 이력을 한 task 안에서 추적하기 위해 권장 300 LOC를 소폭 초과한다. 추가 구현 상세는 단계 보고서와 역할별 script로 분리해 두 계획서를 더 확대하지 않는다.

## 승인 요청 사항

- Task #9는 후보 준비·검증만 소유하고 `devel → main` release PR, tag, GitHub Release와 공개 후 검증은 별도 Issue로 분리하는 경계
- Issue #9의 exact-SHA 수용 기준을 Task #9 reviewable candidate SHA와 후속 게시 Issue의 final `devel`·`main`·tag SHA 재검증이라는 두 gate로 구체화하는 해석
- GitHub `prerelease`를 기본 공개 등급으로 두되 unsigned Windows installer 허용 여부는 Stage 1에서 별도 명시 결정하는 방식
- Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB 전체에 native 호환 환경의 install/launch/uninstall 증적을 요구하고, 하나라도 미충족이면 Task #9를 No-Go로 처리하는 원칙
- Windows ARM64는 Issue #10으로 분리하고 별도 Go일 때만 후속 게시 Issue에서 포함하는 조건부 경계
- print는 물리 프린터가 아니라 지원 OS print dialog 또는 승인된 virtual printer까지를 기본 검증 경계로 두는 제안
- `README.md`, `docs/operations/DESKTOP_RELEASE.md`, 조건부 `docs/DEVELOPMENT.md`만 공식 문서로 수정하고 candidate 증적과 release notes 초안은 `mydocs`에 두는 문서 위치 판단
- 새 metadata verifier·test, CI/native workflow 변경은 Stage 1 계약에서 필요한 최소 범위를 확정한 뒤 도입하는 방향
- Stage 3에서 PR 전 remote canary ref로 `publish/task9`을 사용하고, exact-SHA CI/native artifact를 검증하는 순서 예외
- signing 인프라, updater, package repository, HWPX 저장 등 신규 기능, macOS, release PR·tag·Release와 M010 close를 제외하는 범위
- 위 5개 단계와 단계별 승인·검증 계획

2026-07-29 Stage 1.1에서 unsigned prerelease, HOP Windows/Linux bundle parity와 Windows ARM64 조건부 분리를 승인받았다. Stage 2 진입, remote push, Actions dispatch, release PR, tag 또는 GitHub Release는 각각 후속 승인 없이는 수행하지 않는다.
