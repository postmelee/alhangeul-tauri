# Task #9 Stage 4 작업 기록 — Windows/Linux 설치·실행·rollback 검증

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 4 (진행 중)

> 이 문서는 Stage 4 진행 중 증적이다. Stage 4.3 보정 commit의 exact-SHA candidate 생성과 Linux x64 UI 재검증은 통과했지만 Windows x64 실제 GUI native gate가 남아 있으므로 완료 보고서가 아니며 현재 판정은 No-Go다.

## 단계 목적

Stage 4는 승인된 Windows/Linux baseline bundle의 native 설치·실행·문서·제거와 rollback을 검증한다. 하위 Stage 4.2는 Linux x64 화면에서 발견한 Alhangeul host 서식 ribbon 구조 불일치와 한글 button 글리프 손실을 Windows/Linux 공통 source에서 보정한다. Stage 4.3은 upstream 기본 브랜치 이동 뒤 shallow submodule checkout에서 누락된 pinned stable tag를 exact ref로 확보해 새 candidate 재검증 입력을 재현 가능하게 만든다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/studio-host/index.html` | current upstream CSS가 전제하는 grouped ribbon markup으로 서식 도구 모음 정렬 |
| `apps/studio-host/src/style.css` | form control이 bundle UI font를 상속하는 host 규칙 추가 |
| `tests/studio-shell.test.mjs` | host ribbon 계층·필수 field·UI font 상속 회귀 계약 추가 |
| `scripts/fetch-rhwp-pin-tag.mjs` | lock의 exact stable tag만 shallow fetch하고 origin·HEAD·resolved commit 검증 |
| `tests/rhwp-pin-fetch.test.mjs` | 최소 refspec·실패 방어·CI/desktop workflow 순서 계약 추가 |
| `.github/workflows/ci.yml` | pin 검증 전 exact tag fetch 연결 |
| `.github/workflows/alhangeul-desktop.yml` | Windows/Linux pretest에서 exact tag fetch 연결 |
| `package.json` | host shell 및 rhwp pin fetch contract를 automation 명령에 연결 |
| `mydocs/plans/task_m010_9_impl.md` | 승인된 Stage 4.2·4.3 범위·검증·commit·native 재검증 경계 기록 |
| `mydocs/orders/20260802.md` | Stage 4.1과 Linux arm64·x64 native 완료 시각·판정 보존 |
| `mydocs/orders/20260804.md` | Stage 4.2·4.3과 exact-SHA bundle·Linux UI 재검증 완료 기록 |
| `mydocs/working/task_m010_9_stage4.md` | 기존 native 증적을 보존하고 Stage 4.2·4.3 원인·보정·잔여 gate 추가 |

## 본문 변경 정도 / 본문 무손실 여부

- 제품 기능 API와 Toolbar control ID·event 계약은 보존했다.
- `apps/studio-host/index.html`은 style bar 영역만 current grouped ribbon 구조로 재배치했고 메뉴·editor·상태표시줄과 문서 처리 본문은 수정하지 않았다.
- Stage 4.3은 Actions와 pin 준비 script만 변경했으며 Stage 4.2 UI source와 제품 기능 동작을 다시 수정하지 않았다.
- `third_party/rhwp`는 수정하지 않았다.
- 기존 Stage 4.1 candidate의 build·설치·기능 증적은 삭제하거나 성공으로 재해석하지 않고, UI 결함 발견 뒤 최종 release 수용만 폐기한 이력으로 보존했다.

## 폐기된 Stage 4.1 candidate

Stage 4에서 Linux desktop entry의 문서 인자 field code 누락을 확인해 candidate `dd67d58f5367b478315417279ac8f6561bd5b718`을 폐기했다. Stage 4.1에서 AppImage·DEB·RPM 공통 template에 `%F`를 고정하고 회귀 검증을 추가한 뒤 다음 source commit을 새 candidate로 사용했다.

```text
fb9b8f49113b7c2be1857ccd917476902ea251f5
```

원격 `publish/task9`과 두 workflow의 head SHA가 모두 위 commit과 일치했다. 이후 Stage 4.2 UI 결함을 확인해 이 candidate도 폐기했으며 현재 candidate는 없다.

| Workflow | Run | Event | Head branch | 결과 |
|---|---:|---|---|---|
| Alhangeul CI | [30713325005](https://github.com/postmelee/alhangeul-tauri/actions/runs/30713325005) | `workflow_dispatch` | `publish/task9` | success |
| Alhangeul Desktop Artifact Build | [30713326496](https://github.com/postmelee/alhangeul-tauri/actions/runs/30713326496) | `workflow_dispatch` | `publish/task9` | success |

Native run의 Windows x64, Linux x64, Linux arm64 build와 Windows x64 installer smoke 네 job이 모두 success였다. CI에서는 release metadata, automation, upstream, studio, desktop Rust test와 Clippy가 모두 통과했다.

## artifact archive와 bundle inventory

| Actions artifact | ID | 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64-installer-smoke` | `8822661358` | 28,999 | `sha256:9f2761d90dd43924a90fea529e722420571438423528b1890e1bbaa2be09a386` | `2026-08-15T18:56:37Z` |
| `alhangeul-desktop-windows-x64` | `8822653312` | 53,659,947 | `sha256:05c1e2afce1df0c092b2b28339a86341c2bfdb96f7c8f7f243433e1f4f630af4` | `2026-08-15T18:55:52Z` |
| `alhangeul-desktop-linux-x64` | `8822647788` | 353,969,660 | `sha256:6cd87cb9edfaab4c61b6985d9a69bb0327a119e3dfdbe4f2776c68779bd52daf` | `2026-08-15T18:55:06Z` |
| `alhangeul-desktop-linux-arm64` | `8822601701` | 90,029,373 | `sha256:024806bea89e96fd83de460ab394de5b3e4c7d5473d2f8b04ab7c4e3dc3d6971` | `2026-08-15T18:51:02Z` |

새 run의 네 artifact를 `/private/tmp/alhangeul-task9-stage41.JO6HxJ`에 내려받고 세 platform inventory를 독립 재계산했다. 필수 bundle과 inventory SHA-256은 모두 일치했다.

| Platform | 종류 | 파일 크기 (bytes) | SHA-256 |
|---|---|---:|---|
| Windows x64 | MSI | 28,188,672 | `0c658f0547c23297a4ddbb5ba73b48ec79fa0782456fbe1edecc21fc9fcbacf8` |
| Windows x64 | NSIS | 25,706,796 | `2b78a0eaf35ae9a9a02ead2646109e5660e28e33d907f4b999887171c80ac16d` |
| Linux x64 | AppImage | 106,838,520 | `e810c1e1614e37d5022290a3b6895de3220e8bf08151fded53d96b02e63d87af` |
| Linux x64 | DEB | 30,092,904 | `e29c1ec9654b078bf06989117df2a9976af5abd55b22b8e56bf8d4011ec72e96` |
| Linux x64 | RPM | 30,093,110 | `864bd59619f5ade36f00a49726ea6b82f03824ba3e5a95612b1fdd74b749ffbe` |
| Linux arm64 | DEB | 30,050,134 | `f45193aa3cb1b0b76ae4e49ec8919bed82a5832b13f74c881a7912f6cb4a044b` |

필수 installer 여섯 개로 `SHA256SUMS`를 다시 생성하고 `shasum -a 256 -c SHA256SUMS`를 통과했다. 파일 크기는 568 bytes, `SHA256SUMS` 자체 SHA-256은 `957fe27d541a18d9d289bf1d13421d6a78450da4e4b5bc1aa5f7c776077b7851`이다. 이 checksum은 임시 검증 입력이며 공개 asset이 아니다.

## Windows 자동 installer smoke

진단 artifact의 checkout SHA가 candidate full SHA와 일치하고 `windows-installer-smoke-summary.json`의 전체 상태는 `passed`, failure는 0건이었다.

| Installer | 설치 | version·path·handler·shortcut | 기존 기본 연결 보존 | 제한 실행 | 제거 | 최종 clean |
|---|---:|---|---:|---|---:|---:|
| MSI | exit `0` | 모두 `true` | `true` | 5초 생존 | exit `0` | `true` |
| NSIS | exit `0` | 모두 `true` | `true` | 5초 생존 | exit `0` | `true` |

- `.hwp`와 `.hwpx` open command가 각각 `"Alhangeul.exe" "%1"`을 포함했다.
- installer 범위 밖 fixture의 전후 SHA-256이 같았다.
- 이 자동 smoke는 실제 Explorer 문서 열기와 GUI 편집·저장·내보내기·인쇄를 대체하지 않는다.

## Stage 4.1 Linux launcher 재검증

생성된 AppImage, x64 DEB, x64 RPM, arm64 DEB의 실제 `Alhangeul.desktop`을 각각 확인했다. 네 파일이 모두 다음 핵심 계약을 포함했다.

```text
Exec=Alhangeul %F
MimeType=application/x-hwp;application/vnd.hancom.hwpx
```

clean install 또는 AppImage launcher 등록 뒤 desktop launcher를 통해 비민감 HWP·HWPX fixture를 각각 열었다. 직접 binary 실행 결과만으로 성공을 주장하지 않고 launcher command, payload process argv, 가시 창, fixture hash와 제거 상태를 함께 확인했다.

| Bundle | 실행 환경 | Launcher | HWP/HWPX argv | 가시 창 | 제거·fixture | Stage 4.1 결과 |
|---|---|---|---|---|---|---|
| Linux arm64 DEB | Ubuntu 22.04 arm64, Colima arm64 native container | `gtk-launch Alhangeul` | 두 경로 모두 확인 | 확인 | 통과 | 통과 |
| Linux x64 DEB | Ubuntu 22.04 amd64, arm64 host의 qemu user emulation | `gtk-launch Alhangeul` | 두 경로 모두 확인 | 확인 | 통과 | 통과 |
| Linux x64 RPM | Fedora 42 x86_64, arm64 host의 qemu user emulation | `gio launch Alhangeul.desktop` | 두 경로 모두 확인 | 확인 | 통과 | 통과 |
| Linux x64 AppImage | Ubuntu 22.04 amd64, arm64 host의 qemu user emulation | `gtk-launch Alhangeul` | 두 경로 모두 확인 | 확인 | 통과 | 통과 |

Linux arm64 native 캡처에서 HWP 상태표시줄의 `KTX-launcher.hwp — 1페이지`, HWPX 상태표시줄의 `form-002-launcher.hwpx — 10페이지`와 문서 보정 대화상자를 확인했다. x64 qemu 캡처는 흰색 또는 검은색으로 저장되어 내용 시각 증거로 사용하지 않고 launcher argv·가시 창·package rollback 보조 증거로만 사용한다. 따라서 x64 결과는 `%F` 보정 수용에는 충분하지만 Stage 4의 x64 native GUI gate를 대체하지 않는다.

로컬 비공개 증거는 `/private/tmp/alhangeul-task9-stage41.JO6HxJ/evidence`에 형식별 환경, desktop entry, process argv, 관찰 결과, 화면과 fixture hash로 분리했다. 임시 경로이므로 최종 Stage 4 증적은 승인된 native 환경의 지속 가능한 기록으로 다시 남겨야 한다.

## Linux arm64 DEB native 수동 시나리오

Ubuntu 22.04 arm64 native container에서 candidate의 arm64 DEB `0.1.0`을 clean install하고 desktop launcher로 문서를 열었다. Stage 4.1 launcher 검증에 이어 동일 설치본으로 핵심 문서 시나리오와 제거·rollback을 수행했다.

| 시나리오 | 실제 관찰 | 결과 |
|---|---|---|
| HWP open·edit | `edit-save.hwp`를 launcher로 열어 `STAGE41_EDIT_20260802`를 입력하자 상태표시줄이 `수정됨`으로 바뀜 | 통과 |
| HWP save·reopen | `Ctrl+S` 뒤 `저장 완료`를 확인했고 파일 SHA-256이 `6c1a027d…`에서 `5994793019f04540d0afdab61ec5036bda6a01ee92d103857a77ed976d63d7a9`로 바뀜. 앱을 종료한 뒤 launcher로 같은 파일을 다시 열어 `edit-save.hwp — 1페이지`와 정상 파싱을 확인 | 통과 |
| HWPX edit·직접 저장 차단 | `save-block.hwpx`를 편집해 `수정됨`을 확인한 뒤 `Ctrl+S`에서 HWPX 원본 저장 미지원과 다른 이름의 HWP 저장 안내가 표시됨. 원본 SHA-256 `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4` 유지 | 통과 |
| PDF export | 저장된 HWP에서 PDF 내보내기를 수행해 PDF 1.7, 1 page, 118,453 bytes, SHA-256 `ff3e0b59a9872a947c07be678b4e60a3003070454d04db5c2e815ba183917511` 생성. `file`과 `pdfinfo` 통과, 원본 HWP hash 유지 | 통과 |
| print 경계 | 편집 입력 모드를 빠져나온 뒤 `Ctrl+P`로 인쇄 전용 렌더 상태에 진입했고 `Esc` 취소 뒤 정상 편집 화면으로 복귀. 실제 프린터 출력은 수행하지 않음 | 통과 |
| association·relaunch | 설치된 `Alhangeul.desktop`의 `%F`를 통해 HWP/HWPX 경로가 process argv로 전달됐고, 저장한 HWP를 launcher로 재실행 | 통과 |
| uninstall·rollback | `apt-get remove alhangeul` 뒤 `/usr/bin/Alhangeul`과 `/usr/share/applications/Alhangeul.desktop`이 사라짐. 편집 HWP, 원본 HWPX, 내보낸 PDF의 제거 전후 SHA-256이 각각 유지됨 | 통과 |

화면 증거는 edit 전후, save, reopen, HWPX save block, PDF 대화상자, print 진입·취소로 구분해 임시 evidence 디렉터리에 보관했다. PDF 저장 대화상자 자동 입력 과정에서 출력 파일명이 `edit-save.pdfkeyReturn.pdf`가 되었지만, 내보내기 결과의 형식·page 수·크기·hash 검증에는 영향이 없다. 이 결과로 Linux arm64 DEB native gate는 통과했다.

## Linux x64 native 수동 시나리오

GitHub Codespaces의 2-core Linux x64 머신 `task9-linux-x64-stage4-pqrxgg9rj4f6gvj`에서 candidate checkout과 artifact를 다음과 같이 독립 확인했다.

- checkout: `publish/task9`의 exact SHA `fb9b8f49113b7c2be1857ccd917476902ea251f5`
- host: Ubuntu 24.04.4 LTS, kernel·userland `x86_64`/`amd64`
- Docker server: Linux `x86_64`; RPM은 같은 CPU의 Fedora 42 `x86_64` container에서 실행하고 qemu·다른 architecture emulation을 사용하지 않음
- AppImage·DEB: Ubuntu host의 일반 `codespace` 사용자로 실행. AppImage는 FUSE가 없는 임시 환경에서 자체 `APPIMAGE_EXTRACT_AND_RUN=1` 경로를 사용하고 생성된 desktop entry와 사용자 launcher를 등록
- RPM: Fedora container에서 `dnf`로 설치·제거하고 설치된 `/usr/sbin/Alhangeul` payload를 desktop launcher로 실행
- fixture: 공개 비민감 `KTX.hwp`와 `form-002.hwpx`만 작업 복사본으로 사용

Codespace 안에서 세 artifact SHA-256을 다시 계산했으며 artifact inventory와 일치했다.

| Bundle | Version·architecture | Artifact SHA-256 | Launcher·문서 argv | 결과 |
|---|---|---|---|---|
| AppImage | `0.1.0`, x86_64 | `e810c1e1614e37d5022290a3b6895de3220e8bf08151fded53d96b02e63d87af` | 사용자 `Alhangeul.desktop`의 `Exec=Alhangeul %F`, HWP/HWPX 경로 확인 | 통과 |
| DEB | `0.1.0`, amd64, `install ok installed` | `e29c1ec9654b078bf06989117df2a9976af5abd55b22b8e56bf8d4011ec72e96` | `/usr/share/applications/Alhangeul.desktop`, HWP/HWPX 경로 확인 | 통과 |
| RPM | `0.1.0-1`, x86_64 | `864bd59619f5ade36f00a49726ea6b82f03824ba3e5a95612b1fdd74b749ffbe` | `/usr/share/applications/Alhangeul.desktop`, HWP/HWPX 경로 확인 | 통과 |

각 bundle을 독립 작업 디렉터리에서 같은 시나리오로 검증했다.

| 시나리오 | AppImage 실제 관찰 | DEB 실제 관찰 | RPM 실제 관찰 | 결과 |
|---|---|---|---|---|
| HWP open·edit | launcher로 열고 입력 뒤 `수정됨` | 동일 | 동일 | 모두 통과 |
| HWP save·reopen | `저장 완료`, hash `6c1a027d…` → `b7d089d9…`, 재실행 뒤 `edit-save.hwp — 1페이지` | `6c1a027d…` → `e75320da…`, 재실행 정상 | `6c1a027d…` → `2f74b78f…`, 재실행 정상 | 모두 통과 |
| HWPX edit·직접 저장 차단 | `수정됨` 뒤 HWPX 원본 저장 미지원 안내, 원본 hash `5ab8f7c3…` 유지 | 동일 | 동일 | 모두 통과 |
| PDF export | PDF 1.7, 1 page, 118,386 bytes, SHA `7600e6a3…`; source HWP hash 유지 | PDF 1.7, 1 page, 118,386 bytes, SHA `5ecd3691…`; source 유지 | PDF 1.7, 1 page, 118,386 bytes, SHA `2ac625c2…`; source 유지 | 모두 통과 |
| print 경계 | 파일 메뉴에서 native `Print` 대화상자 진입, `Esc` 뒤 편집 화면 복귀 | 동일 | Fedora GTK print 대화상자 진입·복귀 | 모두 통과 |
| association·relaunch | `%F` launcher argv로 HWP/HWPX와 저장한 HWP 재실행 | 동일 | 동일 | 모두 통과 |
| uninstall·rollback | 사용자 launcher·desktop entry 제거, HWP/HWPX/PDF hash 유지 | `apt-get remove`, package·binary·desktop entry 제거, 세 파일 hash 유지 | `dnf remove`, `rpm -q` 미설치와 desktop entry 제거, 세 파일 hash 유지 | 모두 통과 |

최종 증거는 bundle마다 환경·package metadata·desktop entry·process argv·전후 hash·PDF `file`/`pdfinfo`·14개 화면을 포함한 39개 파일로 회수했다. 세 최종 디렉터리 117개 파일의 정렬된 SHA-256 manifest digest는 `63b1291d1f29cf6da8f367dcca99224cd52e111d88b69769ca8e9849dd54ea04`다. 화면에서 `수정됨`, `저장 완료`, 저장한 HWP 재열기, PDF 저장 대화상자와 완료 상태, native print 대화상자와 취소 복귀, HWPX 저장 실패 안내를 직접 대조했다. 이 문단과 위 표를 Stage 4의 지속 가능한 텍스트 증적으로 사용하며 원본 캡처는 `/private/tmp/alhangeul-task9-stage41.JO6HxJ/evidence/linux-x64-native`에 임시 보관한다.

증거 회수와 artifact·clean rollback 최종 확인 뒤 위 검증용 Codespace를 중지·삭제하고 Codespaces 목록에서 사라진 것을 확인했다. 당시 기능 시나리오는 Linux x64 AppImage·DEB·RPM에서 모두 통과했지만, 아래 Stage 4.2 UI 결함으로 해당 candidate의 최종 release 수용 판정은 폐기한다.

## Stage 4.2 Windows/Linux UI 리본·한글 버튼 보정

Linux x64 native 캡처를 Mac browser extension의 current `rhwp-studio` 화면과 대조해 다음 두 결함을 확인했다.

- Alhangeul host의 `#style-bar`는 control이 직접 배치된 과거 평면 markup인 반면 계승한 current style·responsive CSS는 grouped ribbon 계층을 전제했다. 이 때문에 select, 크기 control과 명령 button이 서로 다른 수직 기준선에 배치됐다. DOM·CSS 구조 문제라 Windows에도 동일하게 적용된다.
- dialog와 icon toolbar의 한글 label은 모두 `button` 내부에서 네모 글리프로 표시됐다. bundle에는 한글 UI font가 있지만 form control이 body font를 상속하지 않아 Linux WebKitGTK의 glyph가 부족한 기본 button font를 사용한 것이 원인이다. Windows system fallback이 이를 가릴 수 있으나 source 계약은 동일하게 불완전했다.

작업지시자 승인에 따라 구현계획서에 Stage 4.2를 추가하고 다음 source correction을 적용했다.

- `apps/studio-host/index.html`: style, 언어, 글꼴, 크기, 줄 간격과 글자·색·문단 명령을 current grouped ribbon 계층으로 정렬하고 기존 control ID와 event 계약을 보존
- `apps/studio-host/src/style.css`: button·input·select·textarea의 `font-family: inherit`를 upstream import 뒤에 적용해 bundle UI font를 Linux와 Windows에서 공통 사용
- `tests/studio-shell.test.mjs`: grouped ribbon 구조, 필수 field, label과 form control font 상속 계약을 고정하고 `test:automation`에 연결

지원 범위 밖 현재 macOS host의 플랫폼 중립 검증은 다음과 같이 통과했다.

| 검증 | 결과 |
|---|---|
| `pnpm run check:product-boundary` | 통과 — 192 files |
| `pnpm run test:automation` | 통과 — 85 tests |
| `pnpm run test:upstream` | 통과 — 32 tests |
| `pnpm run test:studio` | 통과 — 114 tests |
| `pnpm run build:studio` | 통과 — TypeScript·Vite production build |
| build output contract | 통과 — grouped ribbon markup과 `button,input,select,textarea{font-family:inherit}` 포함 |
| `git diff --check` | 통과 |

이 결과는 source correction의 정적·build 수용이며 Windows/Linux native 화면을 대체하지 않는다. 새 exact-SHA candidate에서 Linux toolbar·서식 ribbon·문서 보정 modal의 한글 label과 배치를 다시 확인해야 한다.

## Stage 4.3 exact-SHA Actions rhwp release tag 확보 보정

2026-08-04 작업지시자 승인에 따라 Stage 4.2 correction을 다음 commit으로 확정하고 `publish/task9`에 push했다.

- candidate source commit: `d5c2447a64a7adafe8c8cd13dfd485151816ea82`
- commit message: `Task #9 [Stage 4.2]: Windows Linux UI 리본과 한글 글꼴 보정`
- CI run: `30875968531`
- desktop artifact run: `30875969765`

두 workflow의 head SHA와 build ref는 candidate source commit과 일치했다. 그러나 CI와 Windows x64·Linux x64·Linux arm64 build job이 모두 source build 전 `Verify rhwp pin`에서 다음 오류로 실패했으며 bundle artifact는 생성되지 않았다.

```text
rhwp pin verification failed: git rev-parse --verify refs/tags/v0.8.2^{commit} 실패
fatal: Needed a single revision
```

원격 tag와 lock을 다시 대조한 결과 `refs/tags/v0.8.2`는 계속 `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`을 가리켜 pin 이동이나 upstream release 결함은 없었다. 실패 원인은 checkout 입력의 시간 의존성이었다.

- 2026-08-01 성공 run `30713325005`, `30713326496`은 `fetch-depth: 1`, `fetch-tags: false`였지만 당시 shallow submodule clone에 pinned commit과 tag가 함께 포함돼 pin 검증이 통과했다.
- 현재 upstream 기본 브랜치 HEAD는 `2dced7bfe10c6597cead634264c7c1781c01f1e7`로 이동했다.
- 실패 run에서 checkout은 pinned commit을 SHA로 `FETCH_HEAD`에 보충해 worktree HEAD는 올바르게 만들었지만 `refs/tags/v0.8.2`를 만들지 않았다.
- pin verifier는 stable release tag와 commit의 동시 고정을 검증하기 위해 local tag ref를 요구하므로 세 runner에서 같은 실패가 발생했다.

실패 candidate는 artifact가 없으며 native 수용 근거로 사용할 수 없다. 승인된 Stage 4.3은 lock의 exact release tag 하나만 shallow fetch하고 origin·HEAD·resolved tag commit을 전후 검증하는 cross-platform script를 두 workflow의 `check:rhwp-pin` 앞에 연결한다. 전체 history·모든 tag fetch나 `third_party/rhwp` source 변경은 범위에서 제외한다.

보정 구현과 회귀 계약은 다음과 같다.

- `scripts/fetch-rhwp-pin-tag.mjs`가 `rhwp-core.lock`을 읽고 fetch 전 submodule origin·HEAD를 lock과 대조한다.
- fetch refspec은 `+refs/tags/v0.8.2:refs/tags/v0.8.2` 하나이며 `--no-tags --depth=1`로 전체 history·다른 tag를 제외한다.
- fetch 직후 tag commit을 lock commit과 다시 대조하고, 이후 기존 `check:rhwp-pin`이 source·tag·managed artifact 전체 계약을 검증한다.
- CI는 항상, desktop matrix는 `run_tests`가 켜진 pretest에서만 같은 script를 실행한다.
- 독립 테스트는 origin·HEAD 불일치의 fetch 전 거부, tag 이동 거부, exact refspec과 두 workflow의 fetch→verify 순서를 검사한다. 기존 300 LOC 초과 workflow test 집중 파일에는 새 계약을 누적하지 않았다.

Stage 4.3 플랫폼 중립 검증 결과는 모두 통과했다.

| 검증 | 결과 |
|---|---|
| `pnpm run fetch:rhwp-pin-tag` | 통과 — `v0.8.2` exact tag가 `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`으로 resolve |
| `pnpm run check:rhwp-pin` | 통과 — release tag·commit·managed artifact 6개 정합 |
| `pnpm run check:product-boundary` | 통과 — 194 files |
| `pnpm run test:automation` | 통과 — 91 tests, pin fetch·workflow contract 6건 포함 |
| `pnpm run test:upstream` | 통과 — 32 tests |
| `pnpm run test:studio` | 통과 — 21 files, 114 tests |
| `pnpm run build:studio` | 통과 — TypeScript·Vite production build, 기존 warning만 유지 |
| `git diff --check` | 통과 |
| submodule 무손실 | 통과 — clean `9b16aa9e… (v0.8.2)`, gitlink 변경 없음 |

Stage 4.3 source correction과 당시 보고서를 다음 commit으로 묶어 `publish/task9`에 push했고, 이 commit을 새 candidate exact SHA로 고정했다.

- candidate: `96938d476cf5f47f1c4e64f5930acc67f376caf9`
- commit message: `Task #9 [Stage 4.3]: Actions rhwp release tag 확보 보정`
- CI: [30876932406](https://github.com/postmelee/alhangeul-tauri/actions/runs/30876932406) — success
- desktop artifact: [30876933811](https://github.com/postmelee/alhangeul-tauri/actions/runs/30876933811) — success

두 workflow의 `headBranch`는 `publish/task9`, `headSha`는 candidate full SHA와 일치했다. CI의 exact tag fetch, pin·release metadata, automation·upstream·studio, production build, desktop Rust test·Clippy가 모두 통과했다. Native workflow의 Windows x64, Linux x64, Linux arm64 build와 Windows installer smoke 네 job도 모두 통과했다.

| Actions artifact | ID | 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---:|---:|---|---|
| `alhangeul-desktop-windows-x64-installer-smoke` | `8880003730` | 29,102 | `sha256:a23119674cf681153a0d744a5aa0f7064d34747f3139651a4502f539ea947b87` | `2026-08-18T04:20:20Z` |
| `alhangeul-desktop-windows-x64` | `8879988096` | 53,661,797 | `sha256:a5a1952e89de6cef12ee084ce0259307ae11244d7898893a3f9e0edb77a31d4b` | `2026-08-18T04:19:23Z` |
| `alhangeul-desktop-linux-x64` | `8879956809` | 353,972,765 | `sha256:6a4f8ee2e1c9bc631ddced10fc38d5094451d812d76b80fd4e803cd697321e35` | `2026-08-18T04:17:21Z` |
| `alhangeul-desktop-linux-arm64` | `8879922835` | 90,030,940 | `sha256:336a69d84936a2fdf64b6aec16c8af9d9063050c0fb8eb91e33497ace2dadebb` | `2026-08-18T04:15:28Z` |

세 platform inventory를 독립 검증하고 여섯 필수 installer의 형식과 SHA-256을 다시 대조했다.

| Platform | 종류 | SHA-256 |
|---|---|---|
| Windows x64 | MSI | `5007ae45d8fd3518983cd645001fd5fe7eeb893f29afab11f8ced9a4d954ff6e` |
| Windows x64 | NSIS | `2eea2a5f1a2028cdc709c263686153827a5e49585bb62fe0ee7130560b80f160` |
| Linux x64 | AppImage | `88202828feb6a9f9bb70afa24c1c1f0676f280f709f4216ebf0a17815fef9ed6` |
| Linux x64 | DEB | `8595fefd1263ba9c0ed565dc8a9fecba6417ff984ae8c357cc07f01ebf7c6dfc` |
| Linux x64 | RPM | `945d1640af38395da80d0f11d33b633ee33e8e66161816b250a24e271886fa3c` |
| Linux arm64 | DEB | `f127ca919fe5c72305d42f43b96140b76de10b158ec675edb00c66c218cab6a4` |

정렬한 여섯 installer hash line의 결합 digest는 `63b6c72ee5f3cd7a64d334227fe23e77a52cd15cc5c912187224c0a20973cd1a`다. Windows installer smoke summary는 expected version `0.1.0`, MSI·NSIS 모두 `passed`, failure 0건이며 smoke checkout SHA도 candidate와 일치했다. 이 자동 smoke는 아래의 실제 Windows GUI gate를 대체하지 않는다.

## Stage 4.2 exact-SHA Linux x64 UI 재검증

GitHub Codespaces의 2-core `basicLinux32gb` 머신 `task9-stage43-linux-ui-7w7j5w44v9php477`에서 candidate의 Linux x64 AppImage를 직접 실행했다.

- host: Ubuntu 24.04.4 LTS, kernel·userland `x86_64`
- checkout: `publish/task9`, exact SHA `96938d476cf5f47f1c4e64f5930acc67f376caf9`
- AppImage: `Alhangeul_0.1.0_amd64.AppImage`, SHA-256 `88202828feb6a9f9bb70afa24c1c1f0676f280f709f4216ebf0a17815fef9ed6`
- fixture: 공개 비민감 `form-002.hwpx`, SHA-256 `5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4`
- 실행: 일반 `codespace` 사용자, `APPIMAGE_EXTRACT_AND_RUN=1`, Xvfb 1280×900·Openbox
- 최소 Codespace 이미지에 없던 `libEGL.so.1`, `libGLESv2.so.2`는 각각 `libegl1`, `libgles2`로 보충했다. 이는 UI source correction이 아니라 AppImage 실행 환경 준비다.

payload process argv에서 AppImage와 `form-002.hwpx` 경로를 함께 확인한 뒤 문서 보정 modal과 자동 보정 뒤 화면을 각각 캡처했다.

| 화면 | SHA-256 | 육안 판정 |
|---|---|---|
| `correction-modal.png` | `db51608b32bbefd669e3b40b52a0a258480676c0d0885ce44f7c5ca25e4b90c6` | 상단 명령 ribbon과 grouped style ribbon 정렬 정상, modal의 `자동 보정`·`그대로 열기` 한글 label 정상, 네모 글리프 없음 |
| `grouped-ribbon-after-correction.png` | `c7a19e3c86bf7bcab7a15b2e60934592964a8f41d688758f2a01a497ffeb5471` | 선택 field와 명령 group의 수직 기준·구분선 정상, 상태표시줄의 `form-002.hwpx — 10페이지`와 자동 보정 완료 표시 확인 |

두 PNG는 1280×900이며 로컬 임시 증적 `/private/tmp/alhangeul-task9-stage43-resume/evidence-linux-x64/evidence`에 환경·process argv·실행 로그와 함께 회수했다. 화면을 확대 대조해 Stage 4.2의 Linux ribbon 정렬과 form control 한글 글리프 gate를 **통과**로 판정했다. 증적 회수 뒤 이번 Codespace만 삭제했고, 기존 `edwardkim/rhwp` Codespace는 정지 상태 그대로 보존했다.

## 현재 판정과 잔여 gate

Stage 4.2 source correction, Stage 4.3 Actions 보정, candidate bundle과 Linux x64 UI 재검증은 통과했다. 다음 Stage 4 필수 조건만 남아 있다.

- Windows x64 실제 GUI 환경에서 MSI와 NSIS 각각 HWP/HWPX open·edit, HWP save/reopen, HWPX save block, PDF export, print 경계, Explorer file association, relaunch, uninstall·rollback
- Windows 시나리오의 OS·architecture·installer·candidate SHA, 절차, 실제 관찰과 지속 가능한 증적

현재 Task #9와 Stage 4의 판정은 **No-Go**다. 위 필수 gate를 임의 면제하거나 다른 architecture·package·자동 smoke 결과로 대체하지 않는다. Stage 4 완료 보고서 작성, Stage 4 commit과 Stage 5 진입은 보류한다.

## 검증 결과

Stage 4.2 확정 전에 구현계획서의 검증 명령을 현재 working tree에서 다시 실행했다.

```bash
pnpm run check:product-boundary
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

- OK — product boundary 192 files 통과.
- OK — automation 85 tests 통과. 새 host shell contract 2건을 포함한다.
- OK — upstream 32 tests 통과.
- OK — studio 21 files, 114 tests 통과.
- OK — TypeScript와 Vite production build 통과. 기존 dynamic import·chunk size warning 외 실패 없음.
- OK — `git diff --check` 통과.

## 잔여 위험

- Linux WebKitGTK exact-SHA 화면은 통과했지만 Windows WebView2 실제 화면 결과는 아직 없다.
- artifact archive는 `2026-08-18`에 만료되므로 Windows 실제 검증 입력은 위 candidate hash와 inventory로 먼저 고정하고 필요하면 같은 exact SHA에서 다시 받아야 한다.
- Windows x64 MSI·NSIS 실제 GUI 전체 시나리오는 여전히 필수 gate다.

## 다음 단계 영향

- candidate SHA `96938d476cf5f47f1c4e64f5930acc67f376caf9`의 Windows MSI·NSIS를 실제 Windows x64 GUI 환경에서 검증한다.
- Windows gate 통과 뒤 Stage 4 최종 기록을 확정하고 Stage 5 진입 승인을 요청한다.

## 승인 요청

- 2026-08-04 작업지시자가 Stage 4.2 결과 확정·commit과 새 exact-SHA bundle 생성, Linux 화면 재검증을 승인했다.
- 이 승인은 Stage 5 진입이나 Windows x64 필수 gate 면제를 의미하지 않는다.
