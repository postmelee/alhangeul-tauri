# Task #17 Stage 3 완료보고서 — GNOME Files와 Thunar thumbnail 통합

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
구현계획서: [`task_m010_17_impl.md`](../plans/task_m010_17_impl.md)
Stage: 3

## 단계 목적

Stage 2의 Linux thumbnailer를 실제 Freedesktop `.thumbnailer` discovery와 GNOME Files(Nautilus)·Thunar/Tumbler에 연결해 첫 페이지 PNG 표시, success cache hit, 원본 변경 뒤 invalidation과 손상 문서 fallback을 수용하는 단계다. 제품 package mapping은 Stage 4까지 건드리지 않고, exact-SHA native artifact의 helper와 registration을 disposable XDG 환경에 배치해 실제 file manager process가 `/usr/lib/alhangeul/alhangeul-thumbnailer`를 호출하는지 확인했다.

초기 candidate에서 Nautilus는 제품 PNG를 채택했지만 Thunar/Tumbler는 helper 성공 뒤에도 cache PNG를 만들지 않았다. Tumbler 4.16의 `desktop-thumbnailer.c`는 0바이트 output을 먼저 열어 둔 뒤 helper 종료 후 같은 open stream에서 PNG를 읽는다. Stage 2의 atomic rename은 pathname의 inode를 교체하므로 Tumbler가 기존 빈 inode를 읽는 것이 원인이었다. manager가 만든 0바이트 regular output에 한해 검증 완료 PNG를 같은 inode에 게시하고, 새 output과 기존 non-empty output에는 기존 sibling temporary atomic rename을 유지하도록 보정했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/linux/alhangeul.thumbnailer` | HWP/HWPX MIME과 절대 제품 `TryExec`·`Exec=%i %o %s`만 선언하는 4줄 registration을 추가한다. |
| `scripts/linux-thumbnail-manager-probe.sh` | 142줄. exact helper·registration·fixture·edge PNG를 준비하고 disposable XDG/DBus session에서 두 manager 역할 probe를 실행하며 증적과 cleanup을 소유한다. |
| `scripts/linux-thumbnail-manager-session.sh` | 128줄. Nautilus/Thunar별 first·cached·changed 화면, bounded `execve` trace, cache file과 호출 수를 수집하고 success cache/invalidation을 판정한다. |
| `apps/linux-thumbnailer/src/output.rs` | 147줄. Tumbler가 선점한 0바이트 regular output의 device/inode를 보존하고 `O_NOFOLLOW`로 다시 연 뒤 identity를 확인해 같은 inode에 게시한다. 그 밖의 output은 atomic rename을 유지한다. |
| `apps/linux-thumbnailer/tests/thumbnailer_contract.rs` | 298줄. manager가 output descriptor를 열어 둔 상태에서 helper 실행 후 pathname inode와 열린 inode가 같고 내용이 게시됐는지 Linux integration test로 고정한다. |
| `tests/linux-thumbnail-registration.test.mjs` | 84줄, 4개 계약. MIME·절대 실행 경로·artifact handoff·automation inventory를 고정한다. |
| `tests/gui/linux/native-ui/thumbnail-files.test.mjs` | 115줄, 4개 계약. edge matrix, disposable XDG, 실제 제품 `execve`, cache lifecycle, 제한 cleanup과 크기 상한을 고정한다. |
| `.github/workflows/alhangeul-linux-gui.yml` | manager probe를 역할별 script로 분리하고 exact native helper artifact의 metadata·ELF·SHA-256을 검증한 뒤 제품 경로에 배치한다. manager·GUI outcome과 evidence gate를 유지한다. |
| `tests/linux-gui-workflow.test.mjs` | exact candidate concurrency, native helper handoff, 역할별 bounded script, dependency와 final gate 계약을 갱신한다. |
| `tests/linux-thumbnail-build.test.mjs` | `O_NOFOLLOW`, device/inode 재검증과 precreated-output Linux 계약 테스트를 정적 경계에 추가한다. |
| `package.json` | Linux thumbnail registration 계약을 `test:automation` inventory에 추가한다. |
| `mydocs/plans/task_m010_17_impl.md` | Tumbler 4.16 pre-open output 계약과 same-inode 예외, atomic rename 유지 범위를 Stage 3 계획에 기록한다. |
| `mydocs/orders/20260830.md` | Task #17을 Stage 3 완료·Stage 4 승인 대기로 갱신한다. |
| `mydocs/working/task_m010_17_stage3.md` | Stage 3 구현·원인 분석·exact-SHA 검증·잔여 위험과 Stage 4 인계 사항을 기록한다. |

### 확정 registration·manager 계약

- registration은 `MimeType=application/x-hwp;application/vnd.hancom.hwpx;`, `TryExec=/usr/lib/alhangeul/alhangeul-thumbnailer`, `Exec=/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s`만 사용한다. URI, shell wrapper, MIME default 변경은 없다.
- GUI workflow는 같은 source SHA의 native run에서 `alhangeul-linux-x64-thumbnailer` artifact를 별도로 받아 repository·run·workflow·artifact metadata, ELF64 x86-64 identity와 SHA-256을 확인한 뒤에만 제품 절대 경로로 배치한다.
- direct render, embedded-preview fallback과 둘 다 실패하는 파생 fixture를 앱에서 열지 않은 상태로 manager icon grid에 둔다. first·cached·changed 세 phase의 제품 `execve`, cache metadata와 screenshot을 함께 남긴다.
- 정상 HWP/HWPX는 같은 원본을 다시 표시할 때 helper 호출 수가 늘지 않아야 하고, 내용·mtime 변경 뒤에는 각각 다시 호출돼야 한다. failure cache는 Nautilus와 Tumbler의 정책 차이 때문에 관찰만 하고 공통 호출 수로 강제하지 않는다.
- manager process·trace는 bounded session으로 종료한다. file manager 강제 종료, 전체 thumbnail cache 삭제, 전역 MIME database 변경과 다른 `.thumbnailer` 제거는 하지 않는다.
- Tumbler가 미리 만든 0바이트 regular output만 같은 inode에 게시한다. 게시 전 완성된 sibling PNG의 RGBA·edge를 검증하고, destination은 `O_NOFOLLOW|O_CLOEXEC`로 열어 최초 device/inode와 일치하는지 재확인한다.
- 새 output과 기존 non-empty regular output은 Stage 2의 atomic rename 경계를 유지한다. render 실패는 same-inode commit 전에 닫히므로 기존 output을 수정하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

코드·workflow·내부 계획 문서 작업이다. 제품 공식 문서와 `third_party/rhwp` gitlink·내용은 수정하지 않았다. fixture는 repository 원본을 temporary로 복사해 사용하며 원본 HWP/HWPX를 수정하지 않는다. 증적에는 테스트용 temporary path, hash, 구조·크기와 invocation만 기록하고 개인 문서 내용은 포함하지 않는다.

Stage 3은 DEB/RPM package mapping을 수정하지 않았다. 따라서 제품 설치본의 Linux registration 소유권은 아직 바뀌지 않았고, exact candidate GUI에서는 검증된 artifact를 disposable runner의 동일 제품 절대 경로에 제한적으로 배치했다.

GNOME Files·Thunar manager 수용을 추가했지만 기존 앱 저장·직접 PDF·GTK print-to-file·CUPS-PDF·drag-in과 Windows thumbnail 설치 경로를 변경하지 않았다. 최종 exact-SHA native와 GUI run에서 Windows/Linux 기존 수용 matrix를 함께 재검증했다.

Stage 3 소스는 `Stage 3.1`부터 `Stage 3.4`까지 원인별 분리 커밋으로 보존했다. 이 보고서와 오늘할일 갱신만 Stage 3 종료 커밋에 포함하며, 검증된 제품 소스 SHA는 `cce3bd6686e607720787e59975824ff4f0376c3d`다.

## 검증 결과

구현계획서의 Stage 3 로컬 명령을 종료 직전에 그대로 재실행했다.

```bash
node --test tests/linux-thumbnail-registration.test.mjs
node --test tests/linux-gui-probe.test.mjs tests/linux-gui-workflow.test.mjs
pnpm run test:automation
pnpm run check:product-boundary
shellcheck scripts/linux-thumbnail-manager-probe.sh scripts/linux-thumbnail-manager-session.sh
actionlint .github/workflows/alhangeul-linux-gui.yml
git diff --check
```

결과:

- OK — Linux registration·artifact handoff 계약 4/4 통과
- OK — Linux GUI probe·workflow 계약 24/24 통과
- OK — automation 전체 288/288 통과
- OK — product boundary 281개 파일 검사 통과
- OK — 두 manager script shellcheck 경고 없이 종료 코드 0
- OK — Linux GUI workflow actionlint 경고 없이 종료 코드 0
- OK — `git diff --check` 출력 없이 종료 코드 0

추가 구현 경계 검증:

```bash
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
node --test tests/linux-thumbnail-build.test.mjs tests/linux-thumbnail-registration.test.mjs tests/linux-gui-workflow.test.mjs tests/linux-thumbnail-files.test.mjs
```

- OK — Rust format 차이 없이 종료 코드 0
- OK — Linux thumbnail build·registration·GUI·file 계약 22/22 통과
- OK — `thumbnailer_contract.rs` 298줄, 신규 함수는 구현계획 크기 상한 안에 있음

### exact-SHA native 증적

- run: [33277343505](https://github.com/postmelee/alhangeul-tauri/actions/runs/33277343505), conclusion `success`
- exact source SHA: `cce3bd6686e607720787e59975824ff4f0376c3d`
- Windows x64 job `99166277845`: build, automation, 기존 thumbnail worker·handler test/Clippy와 Tauri bundle `success`
- Linux x64 job `99166277943`: Linux thumbnailer build, same-inode integration test, strict Clippy와 Tauri bundle `success`
- Linux arm64 job `99166277945`: Linux thumbnailer build, same-inode integration test, strict Clippy와 Tauri bundle `success`
- Windows installer smoke job `99169779983`: NSIS/MSI fresh 설치·재설치·제거와 Windows thumbnail 회귀 `success`

Linux x64 helper artifact handoff:

| 항목 | 값 |
|---|---|
| artifact | `alhangeul-linux-x64-thumbnailer` |
| artifact ID | `9721983353` |
| artifact bytes | `7,592,054` |
| artifact digest | `sha256:c748d29f1b6040d1ca3cce62b8309326733e5aa0ddd7cdd69974dc97921ff466` |
| helper SHA-256 | `5773973c142b84412eb7a51491daf36babf38bf008a2c3dea1ea655ad6ba7af5` |

GUI runner가 기록한 expected/verified helper SHA-256은 일치하고, `execve` trace의 public·private worker 모두 이 검증된 `/usr/lib/alhangeul/alhangeul-thumbnailer`에서 실행됐다.

### exact-SHA Linux GUI·manager 증적

- run: [33278688018](https://github.com/postmelee/alhangeul-tauri/actions/runs/33278688018), job `99169979521`, conclusion `success`
- acceptance/build SHA: `cce3bd6686e607720787e59975824ff4f0376c3d`
- native handoff: run `33277343505`, Linux x64 bundle artifact ID `9722156320`, digest `sha256:6fe0145803d2c92a5ba55c6be6cf3b173a3812ccaec04b7bcd8dea90f8220fa9`
- GUI evidence artifact: ID `9722426605`, 8,831,892 B, digest `sha256:f356899e771e936f0e24f94b58dd2f3a5fd9090614ec442996db750285153a53`
- step outcomes: input validation, checkout, source, native handoff/download, helper handoff/download/verify, inventory, install, thumbnail manager와 GUI 모두 `success`
- GUI phases: native print `0`, WebDriver `0`; HWP/HWPX open, save, direct PDF, GTK print-to-file, CUPS-PDF와 drag-in 시나리오 모두 `success`
- manager environment: Nautilus `1:42.6-0ubuntu2`, Thunar `4.16.10-1`, Tumbler `4.16.0-1`; HWP/HWPX MIME lookup과 제품 helper hash 확인

manager별 결과:

| manager | direct first/cached/changed | preview first/cached/changed | failure first/cached/changed | success cache PNG |
|---|---:|---:|---:|---:|
| Nautilus | 2 / 2 / 4 | 2 / 2 / 4 | 2 / 2 / 2 | 3 |
| Thunar/Tumbler | 2 / 2 / 4 | 2 / 2 / 4 | 4 / 6 / 8 | 2 |

호출 수는 public supervisor와 private worker를 각각 세기 때문에 정상 fixture 1회 render가 2회로 기록된다. 두 manager에서 direct·preview의 cached 값이 first와 같아 cache hit를 확인했고, changed 값은 각각 2 증가해 내용·mtime invalidation을 확인했다. Nautilus는 failure cache를 유지하고 Tumbler는 손상 문서를 재시도했으며 이는 Stage 1 관찰과 일치한다.

first·cached·changed screenshot을 직접 확인했다. direct fixture는 내용이 빈 흰 페이지이므로 흰 thumbnail로, embedded-preview fixture는 검은 페이지로 표시되고 손상 fixture만 generic MIME icon으로 남는다. 이전 candidate의 Thunar 화면처럼 정상 두 문서가 generic icon으로 남지 않는다.

edge matrix는 direct와 preview 각각 128, 256, 333, 512, 1024 최대 edge의 PNG 10개다. 모두 8-bit RGBA, non-interlaced이고 direct는 페이지 비율을 유지하며 preview는 정사각형 비율을 유지했다.

### 진단과 보정 이력

| run | SHA | 결과 | 확인 내용과 보정 |
|---|---|---|---|
| [33271366722](https://github.com/postmelee/alhangeul-tauri/actions/runs/33271366722) | `e3310dac` | cancelled | `strace -f`가 file manager의 persistent DBus child를 계속 추적해 manager probe가 종료되지 않았다. Stage 3.2에서 trace와 manager session을 bounded timeout으로 감쌌다. |
| [33273424255](https://github.com/postmelee/alhangeul-tauri/actions/runs/33273424255) | `d5d9d8ab` | failure | session은 bounded됐으나 EXIT trap이 함수 local PID를 참조해 unbound variable로 닫혔고 Thunar assertion 전에 증적이 복사되지 않았다. Stage 3.3에서 global cleanup state와 assertion 전 evidence copy를 적용했다. |
| [33276516318](https://github.com/postmelee/alhangeul-tauri/actions/runs/33276516318) | `d14c23c8` | failure | 완전한 증적에서 Nautilus cache PNG 3개, Thunar cache PNG 0개와 Tumbler의 `/tmp/tumbler-*.png` output을 확인했다. Tumbler 4.16 source의 pre-open stream과 atomic rename inode 교체가 원인임을 확정했다. |
| [33278688018](https://github.com/postmelee/alhangeul-tauri/actions/runs/33278688018) | `cce3bd66` | success | same-inode 게시 보정 뒤 Nautilus·Thunar success cache/invalidation, visible screenshot과 전체 앱 GUI acceptance가 통과했다. |

Tumbler source 확인 기준은 upstream tag `tumbler-4.16.0`, resolved commit `6a88a63be2c7f86605c2f3bf196dc1d337c79573`의 `plugins/desktop-thumbnailer/desktop-thumbnailer.c`다. `g_file_new_tmp("tumbler-XXXXXXX.png", &stream, NULL)`로 output을 먼저 연 뒤 helper 종료 후 같은 `stream`을 decoder에 전달하는 경로를 확인했다.

실패·취소 run을 성공으로 취급하지 않았다. 각 진단을 분리 커밋으로 보정하고 native helper 변경 뒤 전체 native matrix와 Linux GUI acceptance를 모두 새 exact SHA로 다시 실행했다.

## 잔여 위험

- Stage 3 registration은 disposable acceptance에만 배치됐다. DEB/RPM `files` mapping에 helper와 `.thumbnailer`가 아직 포함되지 않았으므로 현재 배포 설치본만으로 Linux thumbnail을 사용할 수 있다는 의미는 아니다.
- 같은 inode 게시 경로는 Tumbler가 선점한 0바이트 regular temporary에만 적용되며 atomic rename일 수 없다. 완성 PNG 검증, `O_NOFOLLOW`, device/inode 재검증 뒤 쓰지만 write 중 I/O 오류가 나면 manager 소유 temporary에 partial bytes가 남을 수 있다. helper가 nonzero로 종료해 manager가 이를 채택하지 않는 계약을 Stage 4·6에서도 유지한다.
- direct GUI fixture가 빈 흰 문서여서 screenshot에서 배경과 구분이 약하다. cache PNG 구조·helper 호출 수와 black embedded-preview fixture를 함께 사용해 채택을 판정했다. 복잡한 실사용 첫 페이지 품질은 Stage 6 exact-SHA 수용 전까지 완료로 표기하지 않는다.
- x64는 Nautilus·Thunar 실제 GUI를 검증했지만 arm64 file-manager GUI runner는 수용 matrix 밖이다. arm64는 native build/test/strict Clippy와 direct PNG artifact까지 검증했다.
- 손상 문서 failure cache 정책은 manager마다 다르다. 제품은 nonzero·no-final로 일관되게 닫고 failure 재시도 횟수는 지원 계약으로 고정하지 않는다.

## 다음 단계 영향

- Stage 4는 DEB·RPM package가 `/usr/lib/alhangeul/alhangeul-thumbnailer`와 `/usr/share/thumbnailers/alhangeul.thumbnailer` 두 파일을 선언적으로 소유하게 한다.
- fresh install, update, uninstall에서 helper·registration의 존재·hash·실행 권한과 제거를 검증한다. uninstall은 file manager 소유 thumbnail/failure cache를 삭제하지 않는다.
- package lifecycle에 전역 MIME database 변경, 전체 cache purge, file manager 강제 종료와 다른 thumbnailer 제거 hook을 추가하지 않는다.
- x64 DEB·RPM과 arm64 DEB의 package mapping을 검증하고, 설치 artifact의 helper SHA가 native exact-SHA artifact와 일치하는지 확인한다.
- Stage 3에서 확정한 Tumbler same-inode integration test와 manager cache 수용을 Stage 4 package-installed helper에서도 그대로 재사용한다.

## 승인 요청

- Stage 3의 Freedesktop registration, exact helper handoff, GNOME Files·Thunar/Tumbler 표시·cache·invalidation과 same-inode 보정, exact-SHA native/GUI 검증 결과를 승인하면 Stage 4의 DEB·RPM 설치·업데이트·제거 통합으로 진행한다.
