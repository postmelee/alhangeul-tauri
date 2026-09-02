# Task #17 Stage 1 완료보고서 — Freedesktop와 resource 계약

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
구현계획서: [`task_m010_17_impl.md`](../plans/task_m010_17_impl.md)
Stage: 1

## 단계 목적

Linux thumbnailer 구현 전에 pinned `rhwp`의 첫 페이지 direct render와 embedded preview를 Linux x64·arm64에서 독립 process로 계측하고, Freedesktop `.thumbnailer` discovery와 GNOME Files/Nautilus·Thunar/Tumbler의 cache·invalidation·failure 동작을 관찰하는 단계다.

정상 HWP/HWPX와 preview 없음·stale preview·손상·64 MiB+1 파생 fixture를 128/256/512/1024 px로 실행했다. Linux x64 GUI runner의 disposable XDG 경로에서는 제품 renderer 대신 유효 PNG marker를 반환하는 probe를 등록했다. 이 결과를 Stage 2의 supervisor/self-child, deadline·memory cap, atomic output 계약과 Stage 3·4의 설치 경로·file-manager 판정 기준에 반영했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/benchmark-linux-thumbnail-core.sh` | 246줄. x64·arm64에서 fixture 불변성, direct/preview 결과, wall time, peak RSS와 timeout을 비식별 JSON으로 기록한다. |
| `tests/linux-thumbnail-core-probe.test.mjs` | 115줄, 8개 계약. 입력·architecture·독립 process·fixture 변형·유효 stale PNG·privacy·크기 상한을 고정한다. |
| `.github/workflows/alhangeul-desktop.yml` | Linux x64·arm64 probe의 준비·실행·outcome·artifact·final gate를 native matrix에 추가한다. |
| `.github/workflows/alhangeul-linux-gui.yml` | exact native artifact handoff 뒤 disposable Nautilus·Thunar discovery, cache/invalidation/failure probe와 환경·스크린샷·호출 증거를 보존한다. |
| `tests/actions-workflows.test.mjs` | Linux core probe의 architecture·순서·artifact·gate 계약을 추가한다. |
| `tests/linux-gui-workflow.test.mjs` | manager probe, exact handoff, 환경 증거와 성공/failure cache 분리 계약을 추가한다. |
| `package.json` | Linux core probe 계약 테스트를 `test:automation` inventory에 추가한다. |
| `mydocs/plans/task_m010_17_impl.md` | 실측에 따라 격리·resource·출력·cache·설치 경로·package·수용 matrix와 workflow 분리 조건을 확정한다. |
| `mydocs/orders/20260830.md` | Task #17을 Stage 1 완료·Stage 2 승인 대기로 기록한다. |
| `mydocs/working/task_m010_17_stage1.md` | Stage 1 구현·실측·보정 이력·확정 계약·잔여 위험을 기록한다. |

### 확정 resource와 process 계약

최종 exact-SHA native run은 x64·arm64 각각 88개 record를 모두 timeout 없이 완료했다.

| runner | wall p95 / max | peak RSS p95 / max | 성공 경로 | timeout |
|---|---:|---:|---:|---:|
| Linux x64 | 42 / 122 ms | 70,647,808 / 70,778,880 B | direct 36, preview 16 | 0 |
| Linux arm64 | 46 / 125 ms | 69,992,448 / 69,992,448 B | direct 36, preview 16 | 0 |

성공한 이전 candidate까지 포함한 상단 관찰값은 x64 p95 74 ms·max 167 ms·RSS max 70,778,880 B, arm64 p95 48 ms·max 129 ms·RSS max 70,123,520 B다. 공유 core의 1,500 ms frame-selection deadline과 256 MiB worker memory limit를 Linux에서도 재사용한다.

public `%i %o %s` entry는 supervisor로 두고 같은 ELF의 private worker mode를 child로 실행한다. child는 render 전에 256 MiB `RLIMIT_AS`를 설정하고, parent는 monotonic 1,500 ms deadline 뒤 `kill`·`wait`와 sibling temporary cleanup을 수행한다. worker는 temporary PNG만 쓰며 parent가 child 성공·PNG decode·크기/alpha를 확인한 뒤 final path로 atomic rename한다. direct 실패 뒤에만 preview를 시도하고 두 경로가 모두 실패하면 final을 만들지 않으며 기존 final은 보존한다.

### Freedesktop·file-manager·package 결정

- 제품 helper는 GNOME thumbnail sandbox가 노출하는 `/usr/lib/alhangeul/alhangeul-thumbnailer`, registration은 `/usr/share/thumbnailers/alhangeul.thumbnailer`에 설치한다.
- Stage 1의 `SNAP_NAME` marker는 disposable XDG probe executable만 GNOME nested sandbox 밖에서 호출하기 위한 진단 수단이다. 제품 코드에는 포함하지 않는다.
- fresh XDG session이 별도 global cache 삭제나 MIME database 변경 없이 registration을 발견했다. lifecycle refresh hook은 추가하지 않고 DEB/RPM `files` mapping이 두 제품 파일을 선언적으로 소유하게 한다.
- uninstall은 helper와 registration만 제거한다. Nautilus/Tumbler 소유 thumbnail·failure cache는 제품 제거 대상이 아니다.
- x64는 helper·DEB·RPM과 Nautilus·Thunar GUI, arm64는 helper·DEB와 직접 PNG/resource를 필수 수용한다. arm64 RPM·GUI, KDE, AppImage registration, Flatpak/Snap은 이번 task 범위 밖이다.

최종 manager 관찰값:

| manager | aggregate first/cached/changed | success first/cached/changed | failure first/cached/changed |
|---|---:|---:|---:|
| Nautilus 42.6 | 3 / 3 / 5 | 2 / 2 / 4 | 1 / 1 / 1 |
| Thunar 4.16.10 + Tumbler 4.16.0 | 3 / 4 / 7 | 2 / 2 / 4 | 1 / 2 / 3 |

정상 HWP/HWPX 두 건은 양쪽 manager에서 최초 각 1회 생성되고 같은 원본 재요청에서는 success 호출이 늘지 않았으며 mtime 변경 뒤 각 1회 재생성됐다. 손상 문서의 `partial-exit-42`는 Nautilus가 failure cache로 유지하고 Thunar/Tumbler는 재시도했다. 따라서 정상 cache/invalidation만 공통 gate로 강제하고 failure 재시도 횟수는 관찰값으로 남긴다.

## 본문 변경 정도 / 본문 무손실 여부

코드·workflow·내부 계획 문서 작업이다. 제품 공식 문서는 수정하지 않았고 `third_party/rhwp` gitlink와 내용도 변경하지 않았다. fixture artifact에는 class, SHA-256, 크기, 시간, RSS와 구조화 결과만 기록하며 문서 이름·절대 경로·본문을 기록하지 않는다.

Windows thumbnail core와 installer smoke를 포함한 기존 desktop matrix는 유지했다. Linux 단계만 조건부로 추가했고 최종 run에서 Windows x64 build·worker·handler·installer smoke가 함께 통과했다.

`.github/workflows/alhangeul-linux-gui.yml`은 기존 제품 GUI acceptance와 disposable manager probe를 exact artifact handoff·단일 outcome gate에 결속해 500줄이다. Stage 3에서 제품 registration 수용을 추가하기 전에 manager probe를 역할별 shell helper로 분리한다.

## 검증 결과

구현계획서의 Stage 1 로컬 명령:

```bash
node --test tests/linux-thumbnail-core-probe.test.mjs
node --test tests/actions-workflows.test.mjs tests/linux-gui-workflow.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/benchmark-linux-thumbnail-core.sh
git diff --check
```

결과:

- OK — Linux core probe 계약 8/8 통과
- OK — desktop·Linux GUI workflow 계약 24/24 통과
- OK — automation 전체 269/269 통과
- OK — product boundary 267개 파일 검사 통과
- OK — shellcheck 경고 없이 종료 코드 0
- OK — `git diff --check` 출력 없이 종료 코드 0

추가 정적 검증:

```bash
actionlint .github/workflows/alhangeul-desktop.yml .github/workflows/alhangeul-linux-gui.yml
```

- OK — 두 workflow 모두 경고 없이 종료 코드 0

### 최종 Linux x64·arm64 native 증적

- run: [33258100737](https://github.com/postmelee/alhangeul-tauri/actions/runs/33258100737), conclusion `success`
- exact SHA: `e2468165cd24f03ca58f62bafb5a405bbbe9064a`
- pinned `rhwp`: `496333b27d21ddb9114ba9ae340bcb895870c9a7`
- jobs: Linux x64 `99115216885`, Linux arm64 `99115216973`, Windows x64 `99115216936`, Windows installer smoke `99118754752`; 모두 `success`
- Linux x64 core artifact: ID `9716482997`, 3,449 B, digest `sha256:afd0e6055ecb35f25335359dbf105c266bc4620841e2a8d73a31bbfde72931c8`
- Linux arm64 core artifact: ID `9716479779`, 3,396 B, digest `sha256:dc4a1fda5f8424b1fe5e7ffe2a3d485c6b9390857737fa2c482c7d1bbc2c2675`
- outcome: 두 summary status `passed`, 원본 hash·size·mtime 불변, 88개 record, timeout 0

보정 전에도 run [33169803019](https://github.com/postmelee/alhangeul-tauri/actions/runs/33169803019)에서 SHA `55654538860be583be5662cb58538af64a949896`의 Linux x64·arm64와 Windows 회귀가 모두 성공했다. 이 실행의 Linux core artifact는 x64 ID `9685222600`, digest `sha256:4f2e86ae7c9a62a98a9d3449ff40618beff53a6ca8a5b7fb453387ab16ffca1c`; arm64 ID `9685227533`, digest `sha256:c5dd51b2eb213a3170b03d4dfeea2bb7da83a85e7349e6800edd0a2199d5a131`이다. 구현계획의 보수적 상단 관찰값은 이 성공 candidate까지 포함한다.

### 최종 Linux GUI·manager 증적

- run: [33259556431](https://github.com/postmelee/alhangeul-tauri/actions/runs/33259556431), job `99119042224`, conclusion `success`
- exact acceptance/build SHA: `e2468165cd24f03ca58f62bafb5a405bbbe9064a`
- native handoff: run `33258100737`, Linux x64 bundle artifact ID `9716711212`, digest `sha256:1a2045d05b15f92e98e1cb50517d98bfb2c3c8e60631f4427d19c6b2ba3faf5a`
- GUI evidence artifact: ID `9716952730`, 8,827,010 B, digest `sha256:70f60fea636d34ec1154a883bc0113c3a89bed3ad32ac76e54bd0d3c931bb5a3`
- step outcomes: input·checkout·source·handoff·download·inventory·install·thumbnail manager·GUI 모두 `success`
- GUI phases: native print `0`, WebDriver `0`; 저장·직접 PDF·GTK print-to-file·CUPS-PDF·drag-in과 HWP/HWPX open 시나리오 모두 `success`
- manager environment: Nautilus `1:42.6-0ubuntu2`, Thunar `4.16.10-1`, Tumbler `4.16.0-1`; HWP/HWPX MIME lookup과 두 manager status `0`

first/changed screenshot에서는 정상 두 문서에 Stage 1용 검은 PNG marker가, 손상 문서에는 generic MIME icon이 표시됐다. 이 marker는 제품 첫 페이지가 아니며 renderer visual acceptance로 사용하지 않는다. cached phase의 headless screenshot은 compositor redraw 전에 검은 frame을 캡처할 수 있어 cache 판정은 screenshot pixel이 아니라 exact invocation log 증가 없음으로 고정했다. Stage 3에서는 실제 제품 PNG가 안정적으로 보이는 screenshot 판정을 별도로 추가한다.

### 진단과 보정 이력

| run | SHA | 결과 | 확인 내용과 보정 |
|---|---|---|---|
| [33165312985](https://github.com/postmelee/alhangeul-tauri/actions/runs/33165312985) | `88803acee7de3d19590c63b3f22bea49499b896a` | failure | GNOME nested thumbnail sandbox가 disposable helper를 직접 실행하지 못함을 확인하고 probe 전용 sandbox marker와 상세 진단을 추가했다. artifact ID `9683544344`. |
| [33168633979](https://github.com/postmelee/alhangeul-tauri/actions/runs/33168633979) | `c798196619f01feb446fd060ac9bbf343b72a167` | failure | manager가 probe의 구조적으로 잘못된 PNG를 거부함을 확인하고 CRC가 유효한 PNG를 사용하도록 수정했다. artifact ID `9684861725`. |
| [33169441473](https://github.com/postmelee/alhangeul-tauri/actions/runs/33169441473) | `18672ddbae4e73d3d3afa3c05c124850c1046d59` | cancelled | stale preview PNG 보정이 뒤따라 superseded candidate를 취소했다. |
| [33237509795](https://github.com/postmelee/alhangeul-tauri/actions/runs/33237509795) | `55654538860be583be5662cb58538af64a949896` | failure | 제품 GUI 두 phase는 모두 0이었으나 manager별 failure cache 차이를 aggregate 동일성으로 잘못 판정했다. success/failure count를 분리하고 headless `--version` 대신 `dpkg-query`를 사용했다. artifact ID `9710455445`, digest `sha256:721c370b2bb1c7bba69b45050d4251af621a74f1ab81b8eeab877486f7815a26`. |
| [33257927968](https://github.com/postmelee/alhangeul-tauri/actions/runs/33257927968) | `0c837011e9080270f77cfe52131f3ae24706a3ac` | cancelled | 환경 증거 보정 commit으로 superseded되어 최종 candidate 재실행 전에 취소했다. |

실패 artifact를 삭제하거나 성공처럼 취급하지 않았다. 최종 gate는 위 보정이 반영된 exact SHA에서 native와 GUI를 각각 새로 실행해 모두 통과했다.

## 잔여 위험

- Stage 1은 공유 core와 probe marker 기준이다. 실제 Linux ELF supervisor, `RLIMIT_AS`, child kill/wait, PNG raster와 atomic rename은 Stage 2 구현·native test가 필요하다.
- peak RSS는 virtual address-space limit과 같은 지표가 아니다. Stage 2에서 256 MiB `RLIMIT_AS`가 정상 x64·arm64 dynamic mapping을 허용하는지 실제 helper로 검증하고, 실패하면 수치 변경 전에 구현계획 보정과 승인을 받는다.
- 정상 fixture는 pinned upstream sample이며 복잡한 실사용 문서 전체를 대표하지 않는다. 실제 first-page 품질과 fallback은 Stage 2·3·6에서 확대 검증한다.
- cached headless screenshot은 compositor redraw timing으로 검은 frame일 수 있다. Stage 1 cache 주장은 invocation log에 한정하며 Stage 3 제품 UI 수용은 안정된 visible screenshot을 별도로 요구한다.
- GNOME Files의 disposable helper에는 진단용 sandbox marker가 필요했다. 제품 helper는 `/usr` 설치 경로만 사용하므로 Stage 3·4에서 sandbox 내부 실행과 fresh install/update/uninstall을 다시 확인한다.
- arm64 GUI와 RPM runner는 제공되지 않아 이번 task 수용 matrix에서 제외했다.

## 다음 단계 영향

- Stage 2는 같은 ELF의 supervisor/private worker, 1,500 ms hard deadline, 256 MiB `RLIMIT_AS`, kill/wait와 sibling temporary cleanup을 구현한다.
- direct render를 먼저 시도하고 embedded preview는 fallback으로만 사용한다. worker output은 parent의 PNG decode·edge·alpha 검증 뒤 atomic rename하며 기존 final을 실패 시 보존한다.
- Stage 2 x64·arm64 probe는 final Stage 1 수치와 비교하고 timeout·memory-limit·signal·panic·동시 요청·symlink·readonly·same-path 회귀를 포함한다.
- Stage 3는 manager probe를 workflow에서 역할별 script로 분리한 뒤 실제 제품 PNG의 Nautilus·Thunar visible screenshot, success cache/invalidation과 failure fallback을 수용한다.
- Stage 4는 DEB/RPM `files` mapping으로 `/usr/lib/alhangeul/alhangeul-thumbnailer`와 `/usr/share/thumbnailers/alhangeul.thumbnailer`만 소유하고 별도 cache purge나 MIME refresh hook을 추가하지 않는다.

## 승인 요청

- Stage 1 산출물, supervisor/resource/atomic-output 계약, file-manager cache 판정과 package matrix를 승인하면 Stage 2의 bounded Linux CLI와 atomic PNG 구현으로 진행한다.
