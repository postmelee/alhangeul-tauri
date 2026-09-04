# Task #50 Stage 1 — HWPX MIME와 package lifecycle 계약

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
구현계획서: [`task_m010_50_impl.md`](../plans/task_m010_50_impl.md)
Stage: 1
검증일: 2026-08-31

## 단계 목적

HWPX를 ZIP으로 분류하던 구 shared-mime-info 환경과 최신 canonical MIME의
차이를 제품 패키지에서 해결한다. DEB/RPM이 MIME XML을 소유하고 설치·제거 후
database를 갱신하며, 기존 정의·기본 앱을 보존하는지 실제 transaction으로 확인한다.
이름 목록만 있던 lifecycle 증거도 전후 관측값을 요구하는 schema 2로 강화한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/linux/alhangeul-hwpx.xml` | canonical `application/x-hwpx`, glob, ZIP subclass·magic와 세 alias |
| `apps/desktop/src-tauri/linux/alhangeul.thumbnailer` | HWPX canonical MIME으로 정렬; 절대 helper와 `%i %o %s` 유지 |
| `apps/desktop/src-tauri/linux/update-mime-database.sh` | 고정 `/usr/share/mime` refresh; 명령 부재·실패를 전파 |
| `apps/desktop/src-tauri/tauri.conf.json` | DEB/RPM XML mapping, shared-mime-info dependency, post-install/remove hook |
| `scripts/linux-thumbnail-mime-contract.mjs`, `scripts/linux-thumbnail-mime-smoke.sh` | old/new 정의 공존 canary와 system MIME·기본 앱·설정 hash 관측 |
| `scripts/linux-thumbnail-package-{smoke,contract,fixtures}.mjs` | 세 파일 owner·mode·hash, 실제 lifecycle, pre-install 실패와 refresh 실패·명시적 복구 |
| `scripts/verify-linux-thumbnail-package-evidence.mjs` | MIME·기본 앱·owner·버전·exit·전환 누락을 거부하는 schema 2 소비자 |
| `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs` | canonical MIME과 이전 alias로의 drift 거부 |
| `tests/linux-thumbnail-{mime,packaging,registration}.test.mjs`, `tests/desktop-artifacts.test.mjs` | hook 실패, 보존·중복 owner·불완전 evidence 음성 테스트 |
| `.github/workflows/alhangeul-desktop.yml`, `tests/actions-workflows.test.mjs`, `package.json` | MIME canary 필수 gate, 실패 시 전환 기록 보존, 테스트 inventory |
| `mydocs/plans/task_m010_50_impl.md`, `mydocs/orders/20260831.md` | 승인과 검증 보정·진행 상태 기록 |

HWPX 선언은 [shared-mime-info의 canonical 정의](https://cgit.freedesktop.org/xdg/shared-mime-info/tree/data/freedesktop.org.xml.in)를 따른다.
추가 dependency와 기본 GTK/WebKit dependency의 병합은
[Tauri CLI 2.10.1 코드](https://github.com/tauri-apps/tauri/blob/tauri-cli-v2.10.1/crates/tauri-cli/src/interface/rust.rs)와 실제 package metadata 양쪽에서 확인했다.

## 본문 변경 정도 / 본문 무손실 여부

- 공유 renderer, worker deadline·memory limit, `third_party/rhwp` pin과 원본 문서는 변경하지 않았다.
- Windows ProgID·extension·installer template, updater 및 release 정책은 유지했다.
- 제품/운영 공식 문서 수정은 Stage 5에 남겼다. 수행·구현계획의 기존 단계는 보존하고 승인·검증 보정만 추가했다.
- 주요 변경 스크립트는 300 LOC 이내, 함수는 50 LOC 이내다.
- 원격 변경은 `local/task50:publish/task50` 일반 push와 승인된 native workflow dispatch뿐이다. PR·release·tag 게시나 이슈 close는 하지 않았다.

## 검증 결과

### 플랫폼 중립

```bash
node --test tests/linux-thumbnail-mime.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs tests/actions-workflows.test.mjs
node --test tests/release-metadata.test.mjs
node scripts/check-release-metadata.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck apps/desktop/src-tauri/linux/update-mime-database.sh scripts/linux-thumbnail-mime-smoke.sh scripts/linux-thumbnail-package-smoke.sh
actionlint .github/workflows/alhangeul-desktop.yml
git diff --check
```

- 관련 계약 테스트: 67 pass; release metadata: 6 pass, 합계 73 pass.
- 전체 automation: **351 pass, 0 fail**.
- Product boundary: **308 files scanned, passed**.
- Release metadata, ShellCheck, Actionlint, diff whitespace: OK.
- hook의 성공·exit 42·명령 부재를 command double로 검사했다. 호스트의 실제 system MIME 도구는 실행하지 않았다.
- name-only lifecycle, MIME 관측 누락, 기본 앱/설정 변조, 잘못된 owner·버전, half-configured DEB, hook/dependency 누락, 제거 후 XML 잔존을 거부했다.

### Exact native candidate

- 기준 `devel`: `8b865fa55b55aea232d0fb034a518c807ac4c003`
- source/workflow candidate: `dd1e2a308158854c9ec69a2e7eec4b3bc5ccfd31`
- [Native run 33370108591](https://github.com/postmelee/alhangeul-tauri/actions/runs/33370108591)
- `run_tests=true`; Linux x64·arm64의 core/helper build, Rust test/lint, desktop test/lint, bundle, package lifecycle 및 artifact inventory가 통과했다.
- 동일 실행의 Windows 추가 회귀 검증은 보고서 작성 시점에 진행 중이다. 전체 workflow 성공으로 표현하지 않는다.

| 환경 | 실제 package | 관측점 | 결과 |
|---|---|---:|---|
| Ubuntu 22.04 x64 | DEB amd64 | 10 | OK |
| Ubuntu 22.04 x64 | RPM x86_64 (`--nodeps` transaction) | 10 | OK |
| Ubuntu 22.04 arm64 | DEB arm64 | 10 | OK |

세 package 모두 baseline, clean install, same-version reinstall, interim uninstall,
old install, update, pre-install failure, refresh failure, explicit recovery, uninstall을
기록했다. helper/registration/XML의 archive cardinality와 설치된 mode
`0755/0644/0644`, hash, 단일 owner `alhangeul`, default dependency·hook을 확인했다.

| 검증 항목 | 관측 결과 |
|---|---|
| 시스템 HWPX glob와 magic | 설치 전 `application/zip` → 설치 후 `application/x-hwpx` → 제거 후 baseline |
| 일반 ZIP | 모든 단계 `application/zip` 유지 |
| old canary | 정의 부재에서 제품 등록으로 HWPX 인식, 제거 후 ZIP 원복 |
| new canary | 기존 canonical 정의와 공존; 제품 XML 제거 후에도 기존 HWPX 인식 유지 |
| 기본 앱 | 임시 사용자 설정의 제3자 default가 설치 전부터 유효하며 모든 단계 동일 |
| 제3자 XML·thumbnailer 및 cache sentinel | 보존 |
| pre-install 실패 | DEB/RPM command exit 1, 기존 설치의 hash·owner 유지 |
| refresh 실패 | hook exit 42; DEB는 command exit 1과 `half-configured`, RPM은 command exit 0이지만 `%post` 실패를 별도 관측 |
| 명시적 복구 | 알려진 candidate 재설치 후 정상 버전·파일·MIME 확인, 이후 제품 파일 3종 제거 |

RPM의 `%post` 실패를 transaction exit 0만으로 성공 처리하거나 자동 rollback으로
기록하지 않았다. DEB `--remove` 후 package DB의 `config-files` 기록은 남을 수
있지만 세 제품 파일과 제품 MIME XML은 모두 제거됐고 MIME 의미는 baseline으로 복귀했다.

### 재현 식별값

| Package | Archive SHA-256 |
|---|---|
| `deb/Alhangeul_0.1.0_amd64.deb` | `c01d96f3ec87fe963a0807c961352790c89148ab67805a59f54eae6ae3e4d02f` |
| `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | `7382571e1fe04bcaf67b8c0607305fcbfa11fe9839663c530a2d7908cfa11186` |
| `deb/Alhangeul_0.1.0_arm64.deb` | `4225fa9cc9310b2945c4fd3da9ab92ab7b8c20bad76bedb9241bb00943da6f86` |

- MIME XML: `b2fb7fda666bc217da9c90b48fcf09e7b68b6ad5275a97ce12db5a1bcd528c50`
- Registration: `42146f0cc8dd9397cf4885bcda0fded980c05ea1004a8fe641b970c6e06433da`
- x64 helper: `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5`
- arm64 helper: `554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725`
- 기본 앱 fixture 설정 SHA (전체 30개 관측점 동일): `b038be2c0442e11f3d484a4d9276d2b148032d513a66e423b55a6d4103adbe62`

| 진단 artifact | ID | Artifact SHA-256 |
|---|---|---|
| [x64 package evidence](https://github.com/postmelee/alhangeul-tauri/actions/runs/33370108591/artifacts/9750645126) | `9750645126` | `5b169a60aa8269728d32353929866881080e51725d8f3e4ccc5b5c66489bc4c9` |
| [arm64 package evidence](https://github.com/postmelee/alhangeul-tauri/actions/runs/33370108591/artifacts/9750359794) | `9750359794` | `4a1121c633840e763786d3426300ff9e7f35f962349ca737f2fdc2e50419a3e9` |

각 artifact의 `linux-thumbnail-packages.json`, format별 transition JSON,
`mime-canary.json`, lifecycle log와 step outcome을 내려받아 source SHA·관측값을 대조했다.
GitHub artifact 보존 기간은 14일이다.

### 검증 중 보정

- `56c2ce7` / [33367986557](https://github.com/postmelee/alhangeul-tauri/actions/runs/33367986557): arm64의 실제 HWPX 등록과 canary는 성공했으나, 기본 앱 미설정 환경의 HWP fallback 선택을 기존 설정 변경으로 판정했다. 명시적인 제3자 기본 앱 fixture와 설정 hash 보존 검사로 보정했다. 실패 증거 확보 후 나머지 실행은 취소했다.
- `b303483` / [33369852970](https://github.com/postmelee/alhangeul-tauri/actions/runs/33369852970): 기본 앱 보정 candidate. 이전 Task #17에서 확인한 Ubuntu RPM reverse lookup 제약을 재검토해 전체 package inventory 검사로 유지한 뒤 최신 candidate로 대체·취소했다.
- 처음의 잘못된 `build_ref` 입력 실행 `33367963133`은 취소했다. 검증 근거는 정확한 `dd1e2a3` 실행으로 한정한다.

## 잔여 위험

- GUI probe의 private MIME 주입 제거와 실제 문서의 파일 관리자 수용은 Stage 4다. 이번 canary나 package 검사를 GUI 통과로 확대하지 않는다.
- Core 결과/시간/RSS gate와 조상 symlink 정책은 각각 Stage 2·3에서 수정한다. Task #50 전체 완료가 아니다.
- x64 RPM은 Ubuntu에서의 transaction 검증이다. Fedora dependency resolution·RPM GUI, arm64 RPM/GUI, AppImage 자동 등록을 검증했다고 주장하지 않는다.
- 기존 사용자 기본 앱 보존은 격리된 명시적 fixture로 확인했다. 실제 사용자 설정이나 사용자 MIME database를 수정하지 않았다.

## 다음 단계 영향

- Stage 2는 core probe의 독립 기대값 manifest와 결과·exit·시간·RSS의 필수 판정을 구현한다.
- Stage 4는 system MIME과 설치 package만으로 공개 HWP/HWPX를 검사하고 Nautilus·Thunar 캡처를 제공한다.
- 이후 native 실행은 새 schema 2 package evidence를 생성해야 한다. 이전 name-only schema 1 artifact는 재사용하지 않는다.
- source candidate push는 계획의 native 검증 예외를 따랐으며, 단계 보고와 승인 상태를 완료 커밋으로 묶는다.

## 승인 요청

- Stage 1 산출물과 Linux 수용 결과를 검토한 뒤 Stage 2 진입 승인을 요청한다.
- 승인 전 Stage 2 소스 변경, PR 게시, release 또는 이슈 close는 진행하지 않는다.
