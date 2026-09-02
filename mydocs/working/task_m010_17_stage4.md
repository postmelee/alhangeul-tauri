# Task #17 Stage 4 완료보고서 — DEB·RPM thumbnailer package 통합

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
구현계획서: [`task_m010_17_impl.md`](../plans/task_m010_17_impl.md)
Stage: 4

## 단계 목적

Stage 3에서 disposable runner의 제품 절대 경로에 제한적으로 배치했던 Linux thumbnailer와 Freedesktop registration을 실제 Alhangeul package가 선언적으로 소유하게 하는 단계다. Tauri DEB·RPM bundle에 `/usr/lib/alhangeul/alhangeul-thumbnailer`와 `/usr/share/thumbnailers/alhangeul.thumbnailer`를 포함하고, x64 DEB/RPM과 arm64 DEB의 clean install, same-version reinstall, 이전 version update, injected failure rollback과 uninstall을 disposable native runner에서 검증했다.

GUI acceptance는 helper를 수동 배치하지 않고 검증된 x64 DEB를 먼저 설치한다. 설치된 helper·registration의 package owner, mode와 SHA-256을 native artifact와 대조한 뒤 package registration을 Nautilus·Thunar/Tumbler가 직접 발견한 상태에서 first·cached·changed screenshot과 `execve` trace를 수집했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/tauri.conf.json` | DEB·RPM에 helper와 `.thumbnailer` custom file mapping을 추가하고 AppImage registration은 제외한다. |
| `.github/workflows/alhangeul-desktop.yml` | exact helper staging, x64 DEB/RPM·arm64 DEB package lifecycle, always evidence와 final gate를 native matrix에 추가한다. |
| `.github/workflows/alhangeul-linux-gui.yml` | native artifact inventory와 단일 DEB를 검증·설치하고 package-owned helper·registration을 확인한 뒤 manager probe를 실행한다. |
| `scripts/linux-thumbnail-package-smoke.sh` | CI 전용 bounded package lifecycle entry를 제공한다. |
| `scripts/linux-thumbnail-package-smoke.mjs` | 기존 설치 preflight, DEB/RPM install·reinstall·update·failure rollback·uninstall과 path/mode/hash/ELF/owner/invariant 검증을 구현한다. |
| `scripts/linux-thumbnail-package-contract.mjs` | package metadata, archive path, MIME default, hash와 evidence 계약을 분리한다. |
| `scripts/linux-thumbnail-package-fixtures.mjs` | 이전 version과 실패 주입 DEB/RPM fixture를 disposable runner에서 생성한다. |
| `scripts/verify-linux-thumbnail-package-evidence.mjs` | native artifact inventory에 결속된 platform별 package evidence를 fail-closed 검증한다. |
| `scripts/verify-desktop-artifacts.mjs` | bundle inventory가 Linux package evidence를 포함해 기록·재검증하도록 확장한다. |
| `scripts/linux-thumbnail-manager-probe.sh` | package가 소유한 `/usr` helper·registration을 수정하지 않고 검증만 한 뒤 manager session에 전달한다. |
| `apps/linux-thumbnailer/tests/thumbnailer_contract.rs` | worker limit이 적용되기 전 짧은 process 관찰 경쟁을 bounded wait로 보정한다. 제품의 256 MiB limit 값은 변경하지 않는다. |
| `tests/linux-thumbnail-packaging.test.mjs` | package mapping, lifecycle, owner, 보존 invariant와 archive path 정규화 계약 7개를 추가한다. |
| `tests/desktop-artifacts.test.mjs` | x64 RPM, arm64 DEB와 package evidence가 포함된 inventory cardinality·변조 회귀를 추가한다. |
| `tests/actions-workflows.test.mjs` | native package lifecycle의 build 이후 순서, always evidence와 gate를 고정한다. |
| `tests/linux-gui-workflow.test.mjs` | exact native handoff, 단일 DEB 검산·설치와 package owner 검증 순서를 고정한다. |
| `tests/gui/linux/native-ui/thumbnail-files.test.mjs` | manager probe가 package-owned `/usr` 파일을 설치·제거하지 않는 경계를 고정한다. |
| `package.json`, `.gitignore` | package 계약을 automation inventory에 추가하고 build staging만 무시한다. |
| `mydocs/plans/task_m010_17_impl.md` | Stage 4 진입 시 최신 `devel` 중첩과 최소 변경 원칙을 기록한다. |
| `mydocs/orders/20260830.md` | Task #17을 Stage 4 완료·Stage 5 승인 대기로 갱신한다. |
| `mydocs/working/task_m010_17_stage4.md` | Stage 4 package·GUI 구현, 검증, 진단 이력과 다음 단계 인계 사항을 기록한다. |

### 확정 package 계약

- DEB·RPM은 helper를 `/usr/lib/alhangeul/alhangeul-thumbnailer` mode `0755`로, registration을 `/usr/share/thumbnailers/alhangeul.thumbnailer` mode `0644`로 소유한다.
- registration의 `Exec`는 `/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s`, MIME은 `application/x-hwp;application/vnd.hancom.hwpx;`다. MIME default를 변경하거나 global cache를 삭제하는 hook은 없다.
- AppImage에는 system registration file을 추가하지 않는다. Flatpak·Snap과 arm64 RPM·GUI도 Stage 1에서 확정한 이번 수용 matrix 밖이다.
- lifecycle은 package archive path와 metadata를 먼저 검증하고 기존 `alhangeul` package가 없는 disposable runner에서만 시작한다. 자신이 설치한 package와 sentinel만 targeted cleanup한다.
- installed helper·registration의 regular-file type, mode, helper SHA-256, registration bytes, ELF architecture와 단일 package owner를 매 lifecycle transition 뒤 확인한다.
- uninstall 뒤 제품 helper·registration은 없어야 한다. 기존 MIME default, 제3자 `.thumbnailer` sentinel과 무관한 cache sentinel은 유지하며 file-manager 소유 thumbnail/failure cache는 삭제하지 않는다.
- RPM install·query·remove는 모두 root RPM database를 사용한다. archive metadata·inventory 조회만 package file을 대상으로 일반 사용자 권한에서 수행한다.

## 본문 변경 정도 / 본문 무손실 여부

코드·workflow·내부 계획 문서 작업이다. 제품 공식 문서와 `third_party/rhwp` gitlink·내용은 수정하지 않았다. Stage 5에서 이번에 통과한 package matrix와 제외 범위를 공식 문서에 정렬한다.

실제 HWP/HWPX fixture는 원본을 temporary로 복사해 read-only 입력으로 사용한다. package lifecycle fixture는 helper marker와 install failure만 검증하는 별도 disposable DEB/RPM이며 제품 document fixture를 포함하지 않는다. 증적에는 package/archive/helper hash, mode, architecture, path, 호출 횟수와 공개·합성 fixture 화면만 기록하고 개인 문서 내용은 포함하지 않는다.

Stage 3의 Linux thumbnail render와 Windows thumbnail 구현은 변경하지 않았다. Linux worker resource test는 child PID가 보인 직후 `setrlimit` 전 상태를 읽을 수 있는 관찰 경쟁만 2초 bounded wait로 보정했고 256 MiB 제품 limit, 1,500 ms deadline과 fail-closed 동작은 그대로 유지했다.

Stage 4 소스는 `Stage 4.1`부터 `Stage 4.6`까지 package candidate와 exact runner 진단을 원인별로 분리 커밋했다. 이 보고서와 오늘할일 갱신만 Stage 4 종료 커밋에 포함하며, 검증된 제품 소스 SHA는 `c0cc4af46f132d199e843abf2dad014ae4a07709`다.

## 검증 결과

구현계획서의 Stage 4 로컬 계약 명령을 종료 직전에 다시 실행했다.

```bash
node --test tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs
node --test tests/actions-workflows.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-package-smoke.sh
git diff --check
```

결과:

- OK — Linux package·desktop artifact 계약 23/23 통과
- OK — desktop workflow 계약 15/15 통과
- OK — automation 전체 296/296 통과
- OK — product boundary 287개 파일 검사 통과
- OK — package lifecycle wrapper shellcheck 경고 없이 종료 코드 0
- OK — `git diff --check` 출력 없이 종료 코드 0

bundle-root를 요구하는 구현계획서 명령은 exact native workflow가 생성 직후 각 runner의 실제 bundle에 실행했다.

```bash
pnpm run check:desktop-artifacts -- --platform linux-x64 --bundle-root <x64-bundle-root>
pnpm run check:desktop-artifacts -- --platform linux-arm64 --bundle-root <arm64-bundle-root>
```

- OK — native run `33285514829`의 Linux x64 job `99187922697`에서 bundle inventory와 package evidence gate `success`
- OK — 같은 run의 Linux arm64 job `99187922567`에서 bundle inventory와 package evidence gate `success`

### exact-SHA native package 증적

- run: [33285514829](https://github.com/postmelee/alhangeul-tauri/actions/runs/33285514829), conclusion `success`
- exact source SHA: `c0cc4af46f132d199e843abf2dad014ae4a07709`
- Linux x64 job `99187922697`: helper/core, DEB·RPM bundle, package lifecycle, inventory와 artifact gate `success`
- Linux arm64 job `99187922567`: helper/core, DEB bundle, package lifecycle, inventory와 artifact gate `success`
- Windows x64 job `99187922705`와 installer smoke job `99194195353`: 기존 thumbnail·NSIS/MSI 회귀 `success`

native artifact:

| 항목 | artifact ID | bytes | artifact digest |
|---|---:|---:|---|
| `alhangeul-desktop-linux-x64` | `9724657370` | `535,864,817` | `sha256:dfddd84401fe5e613346e685580c007598b70bc6e86b029f6a37966bddf78be3` |
| `alhangeul-linux-x64-thumbnail-package` | `9724652854` | `1,333` | `sha256:27d39170a3df6a2757713a597c02ddc3fb7bee4962a56f6262831a4489691029` |
| `alhangeul-desktop-linux-arm64` | `9724444215` | `188,509,296` | `sha256:7aa53fe9924da2bb22e5b98c053141a08c677444e8808cda87cdaa2226d1622a` |
| `alhangeul-linux-arm64-thumbnail-package` | `9724442976` | `1,231` | `sha256:15fec166e328b9bc09729c19fe3d8aefaa88d6d843a23e00dc93395edaa61ee8` |

package evidence:

| platform·format | package path | archive SHA-256 | helper SHA-256 | owner·lifecycle |
|---|---|---|---|---|
| x64 DEB | `deb/Alhangeul_0.1.0_amd64.deb` | `675fe493112f160eb8fc9d0345ed4cecff45a79848cfec1779ef0dddd315795e` | `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5` | single owner, 5/5 success |
| x64 RPM | `rpm/Alhangeul-0.1.0-1.x86_64.rpm` | `a64373969c3718c31b0845c616447141c2ccf18c1219c42bc7b162f316cde5f7` | `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5` | single owner, 5/5 success |
| arm64 DEB | `deb/Alhangeul_0.1.0_arm64.deb` | `d1147b8d31b76cfa0858fc6c2f9e55416297b0f2f33f98f059beed0e995fb6c6` | `554f85681cd6518738a310d15c3c67450af9b3e35305ca9e186c5b40b3c0d725` | single owner, 5/5 success |

각 5개 lifecycle은 `clean-install`, `same-version-reinstall`, `update`, `injected-failure-rollback`, `uninstall`이다. x64·arm64 모두 MIME default, 제3자 thumbnailer, cache sentinel을 보존했고 uninstall 뒤 두 제품 파일이 제거됐다.

### package-installed Linux GUI·manager 증적

- run: [33287990400](https://github.com/postmelee/alhangeul-tauri/actions/runs/33287990400), job `99194484235`, conclusion `success`
- acceptance/build SHA: `c0cc4af46f132d199e843abf2dad014ae4a07709`
- native handoff: run `33285514829`, x64 bundle artifact ID `9724657370`
- GUI evidence artifact: `alhangeul-linux-gui-33287990400`, ID `9725165768`, 8,835,838 B, digest `sha256:fb9d1ac4a2fc825dc7a36fc571f9d6b6abc501c9a37d5a97e59cef042c8ec892`
- installed DEB SHA-256: `675fe493112f160eb8fc9d0345ed4cecff45a79848cfec1779ef0dddd315795e`
- installed helper SHA-256: `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5`; 별도 helper artifact expected/verified hash와 일치
- `dpkg-query --search` owner: `alhangeul`이 helper와 registration을 각각 유일하게 소유
- step outcomes: input, checkout, source, native/helper handoff·download·verify, inventory, install, installed thumbnail, manager와 전체 GUI 모두 `success`

manager별 호출 결과:

| manager | direct first/cached/changed | preview first/cached/changed | failure first/cached/changed | success cache PNG |
|---|---:|---:|---:|---:|
| Nautilus | 2 / 2 / 4 | 2 / 2 / 4 | 2 / 2 / 2 | 3 |
| Thunar/Tumbler | 2 / 2 / 4 | 2 / 2 / 4 | 4 / 6 / 8 | 2 |

`execve` trace에서 두 manager 모두 package-installed `/usr/lib/alhangeul/alhangeul-thumbnailer`의 public supervisor와 private worker를 호출했다. normal fixture의 cached 값이 first와 같아 cache hit를, changed 값이 각각 2 증가해 내용·mtime invalidation을 확인했다. 손상 fixture는 generic MIME icon으로 저하되고 제품 cache를 만들지 않았다.

evidence artifact의 `thumbnail-manager/nautilus/{first,cached,changed}.png`와 `thumbnail-manager/thunar/{first,cached,changed}.png`를 직접 확인했다. direct fixture는 의도적으로 내용이 없는 흰 페이지, embedded-preview fixture는 검은 페이지이므로 화면도 각각 흰 thumbnail과 검은 thumbnail이다. 이는 렌더 누락 판정용 실사용 품질 fixture가 아니라 direct·preview·failure 경로와 manager 채택을 구분하기 위한 합성 fixture다. 복잡한 공개 문서의 시각 fidelity는 Stage 6 수용 범위에 남긴다.

전체 Linux GUI acceptance의 native print와 WebDriver phase는 각각 종료 코드 0이다. HWP/HWPX open·save, direct PDF, GTK print-to-file, CUPS-PDF와 drag-in 기존 시나리오도 같은 package-installed candidate에서 성공했다.

### 진단과 보정 이력

| run | SHA | 결과 | 확인 내용과 보정 |
|---|---|---|---|
| [33280162955](https://github.com/postmelee/alhangeul-tauri/actions/runs/33280162955) | `c08c07cc` | cancelled | 실제 `dpkg-deb --contents`가 mode·owner·size·date 뒤 `./usr/...` 경로를 출력해 archive path parser가 실패했다. 마지막 path token을 절대 package path로 정규화했다. |
| [33281253848](https://github.com/postmelee/alhangeul-tauri/actions/runs/33281253848) | `9f9deb91` | cancelled | arm64 test가 child PID 관찰 직후 `setrlimit` 전 `/proc` 값을 읽는 경쟁을 확인했다. 256 MiB 값이 보일 때까지 2초 bounded wait하도록 test만 보정했다. |
| [33282679436](https://github.com/postmelee/alhangeul-tauri/actions/runs/33282679436) | `8ba81178` | failure | arm64 전체와 x64 DEB lifecycle은 성공했다. Ubuntu의 RPM reverse file lookup `rpm -qf`가 설치 파일 owner를 조회하지 못해 package inventory 조회로 보정했다. |
| [33284158189](https://github.com/postmelee/alhangeul-tauri/actions/runs/33284158189) | `30753e25` | failure | x64 DEB와 RPM 설치는 성공했지만 `sudo rpm` install 뒤 일반 사용자 RPM DB의 `rpm -ql`을 조회해 실패했다. preflight·installed inventory를 root RPM DB로 통일했다. |
| [33285514829](https://github.com/postmelee/alhangeul-tauri/actions/runs/33285514829) | `c0cc4af4` | success | x64 DEB/RPM, arm64 DEB 전체 lifecycle, inventory, Windows 회귀와 artifact gate가 통과했다. |
| [33287990400](https://github.com/postmelee/alhangeul-tauri/actions/runs/33287990400) | `c0cc4af4` | success | 검증된 DEB 설치 뒤 package owner·hash와 Nautilus·Thunar 표시/cache/invalidation 및 전체 GUI acceptance가 통과했다. |

취소·실패 run은 성공으로 처리하지 않았다. 각 원인을 소스·계약 테스트 커밋으로 보정하고 새 exact SHA에서 native matrix 전체와 package-installed GUI acceptance를 다시 실행했다.

## 잔여 위험

- 현재 화면 증거의 direct fixture는 빈 흰 문서이고 preview fixture는 검은 embedded preview라 실제 복잡한 문서의 첫 페이지 품질을 시각적으로 대표하지 않는다. package integration·cache는 통과했지만 실사용 문서 fidelity는 Stage 6 exact-SHA 공개 fixture 수용 전까지 완료로 표기하지 않는다.
- uninstall 뒤 기존 thumbnail/failure cache는 file manager 소유이므로 남을 수 있다. 이는 helper·registration 잔존과 다르며 Stage 4는 제품 파일이 제거되고 더 이상 실행 가능한 registration이 없음을 별도로 검증했다.
- Linux x64는 DEB·RPM과 Nautilus·Thunar GUI까지 검증했지만 arm64는 DEB lifecycle과 direct PNG까지만 검증했다. arm64 RPM·GUI는 수용 matrix 밖이다.
- AppImage에는 system `.thumbnailer` registration을 포함하지 않는다. Flatpak·Snap, KDE/Dolphin과 sandbox package registration도 이번 task 범위 밖이다.
- RPM lifecycle은 Ubuntu 22.04 disposable runner의 root RPM database에서 검증했다. 지원 배포판 문서에는 검증 환경과 matrix를 정확히 표기해야 한다.

## 다음 단계 영향

- Stage 5는 공식 architecture/development/operations 문서와 README에 package-owned helper·registration, direct-first fallback, 1,500 ms·256 MiB resource, cache·uninstall 경계와 실제 통과 matrix를 정렬한다.
- Linux x64는 DEB·RPM package lifecycle과 Nautilus·Thunar package-installed GUI를, Linux arm64는 DEB lifecycle을 검증 완료 조합으로만 표기한다.
- AppImage registration, arm64 RPM·GUI, KDE, Flatpak·Snap은 명시적으로 제외하고 자동 MIME default 변경이나 global thumbnail cache purge를 설치·제거 절차로 안내하지 않는다.
- 제거 후 과거 thumbnail cache가 보일 수 있음을 정상 cache 잔존으로 설명하되 helper·registration package owner와 제거 확인 방법을 operations 문서에 기록한다.
- Stage 6는 Stage 5 source candidate의 exact SHA에서 복잡한 공개 fixture의 x64 manager screenshot과 x64·arm64 package evidence를 다시 수용한다.

## 승인 요청

- Stage 4의 DEB·RPM custom file mapping, x64 DEB/RPM·arm64 DEB lifecycle, package-installed Nautilus·Thunar 표시·cache·invalidation과 exact-SHA native/GUI 검증 결과를 승인하면 Stage 5의 플랫폼 중립 회귀와 공식 문서 정렬로 진행한다.
