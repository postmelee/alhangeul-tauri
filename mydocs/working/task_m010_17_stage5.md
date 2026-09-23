# Task #17 Stage 5 완료보고서 — Linux thumbnail 문서와 회귀 gate 정렬

GitHub Issue: [#17](https://github.com/postmelee/alhangeul-tauri/issues/17)
구현계획서: [`task_m010_17_impl.md`](../plans/task_m010_17_impl.md)
Stage: 5

## 단계 목적

Stage 2~4에서 구현·검증한 Linux Freedesktop thumbnail helper, direct-first fallback, resource/PNG 계약, DEB·RPM 소유권과 Nautilus·Thunar/Tumbler 수용 범위를 공식 문서에 정렬하는 단계다. Stage 4에서 실제 통과한 조합만 README와 architecture/development/operations 문서에 표시하고 AppImage registration, arm64 RPM/GUI, KDE, Flatpak/Snap 등 미검증 범위를 명시적으로 제외했다.

Windows thumbnail, product boundary, upstream과 Studio 회귀를 함께 실행했다. Linux 전용 helper test·Clippy는 macOS 결과로 대체하지 않고 official Rust Linux container의 read-only source mount에서 별도로 통과시켰다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/architecture/LINUX_THUMBNAILS.md` | Freedesktop CLI, supervisor/private worker, direct-first fallback, 1,500 ms·256 MiB 상한, RGBA PNG 게시, Tumbler inode 예외, package/cache lifecycle과 지원 matrix를 공식화한다. |
| `README.md` | Linux thumbnail의 자동 검증 완료 범위, Stage 6 잔여 시각 수용과 제외 범위를 사용자 진입점에 기록한다. |
| `docs/README.md` | Linux thumbnail architecture 문서를 공식 문서 tree에 등록한다. |
| `docs/DEVELOPMENT.md` | Linux helper 소유 경계, Linux-only locked test/Clippy/build와 package 검증 환경을 기록한다. |
| `docs/architecture/UPSTREAM.md` | Stable `rhwp` pin이 Linux direct render에 미치는 영향과 재수용 gate를 추가한다. |
| `docs/operations/DESKTOP_RELEASE.md` | native workflow 순서, package-installed manager evidence, Stage 4 run/artifact/package hash, uninstall/cache 판정 절차를 기록한다. |
| `mydocs/plans/task_m010_17_impl.md` | Stage 6에 공개 실사용 HWP/HWPX와 Nautilus·Thunar 캡처의 대화 제시를 완료 조건으로 추가한다. |
| `mydocs/orders/20260830.md` | Task #17을 Stage 5 완료·Stage 6 승인 대기로 갱신한다. |
| `mydocs/working/task_m010_17_stage5.md` | Stage 5 문서 정렬, 회귀 결과와 Stage 6 인계 사항을 기록한다. |

### 공식화한 지원·소유 경계

- public helper 계약은 `alhangeul-thumbnailer <absolute-input> <absolute-output> <edge>`이며 edge는 `1..=1024`, 입력은 canonical local regular file 최대 64 MiB다.
- public supervisor는 빈 환경의 동일 ELF private worker를 실행한다. 단일 deadline은 1,500 ms, worker `RLIMIT_AS`는 256 MiB이며 timeout·signal·panic·child failure에는 kill·wait와 partial cleanup으로 닫는다.
- 정상 순서는 direct render → embedded preview → nonzero/no final output이다. 손상·암호화·제한 초과 문서는 제품 placeholder가 아니라 file-manager MIME icon으로 저하한다.
- RGBA PNG는 sibling temporary에서 검증 뒤 rename한다. Tumbler가 미리 만든 0-byte regular file만 `O_NOFOLLOW`와 device/inode 재검증 뒤 같은 inode에 게시한다.
- DEB/RPM은 `/usr/lib/alhangeul/alhangeul-thumbnailer` mode `0755`와 `/usr/share/thumbnailers/alhangeul.thumbnailer` mode `0644`를 소유한다.
- uninstall은 두 제품 파일만 제거한다. MIME default, 제3자 thumbnailer, XDG thumbnail/failure cache와 file manager process는 변경하지 않는다.
- 검증 완료 표기는 x64 DEB/RPM package lifecycle과 Nautilus 42.6·Thunar 4.16.10/Tumbler 4.16, arm64 DEB lifecycle·직접 PNG에 한정한다.

## 본문 변경 정도 / 본문 무손실 여부

공식 문서에 Linux thumbnail 내용을 추가한 작업이며 제품 코드, workflow, package 설정과 `third_party/rhwp`는 변경하지 않았다. 기존 README·DEVELOPMENT·UPSTREAM의 Windows와 제품 경계 설명은 유지하고 인접 Linux 섹션만 추가했다.

`docs/operations/DESKTOP_RELEASE.md`는 최신 `origin/devel`의 Task #45 공개배포 정렬과 중첩되는 파일이다. Task #45가 변경한 후반 공개배포 순서를 역으로 복제하거나 덮어쓰지 않고, 현재 native workflow 설명과 `의도적으로 포함하지 않는 작업` 앞의 독립 Task #17 evidence 섹션만 수정했다. 진행 중 branch에는 merge/rebase를 수행하지 않았다.

Stage 6 계획의 screenshot 범위만 작업지시자의 이번 지시에 맞춰 보강했다. 합성 fixture는 path·cache·failure 계약에 남기되, 첫 페이지 text·table·image가 식별되는 공개 실사용 HWP 1건 이상과 HWPX 1건 이상을 Nautilus·Thunar 각각에서 캡처하고 에이전트가 이미지를 직접 확인한 뒤 대화에서 제시해야 완료로 판정한다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo test --manifest-path crates/document-preview/Cargo.toml --locked
cargo clippy --manifest-path crates/document-preview/Cargo.toml --locked --all-targets -- -D warnings
cargo test --manifest-path apps/linux-thumbnailer/Cargo.toml --locked
cargo clippy --manifest-path apps/linux-thumbnailer/Cargo.toml --locked --all-targets -- -D warnings
git diff --check
```

결과:

- OK — `pnpm install --frozen-lockfile`, lockfile 변경 없이 479 package 준비
- OK — product boundary 288개 파일, product version `0.1.0`, release metadata와 `rhwp v0.8.4` pin 검증
- OK — automation 296/296, upstream 35/35 통과
- OK — Studio 23개 test file·105/105 test와 production build 통과
- OK — `document-preview` contract 11/11, representative content 4/4와 Clippy `-D warnings` 통과
- OK — `rust:1.94-bookworm` Linux arm64 container에서 read-only source로 Linux helper unit 3/3·contract 10/10과 Clippy `-D warnings` 통과
- OK — `git diff --check` 출력 없이 종료 코드 0

Linux container는 local Colima VM에서 실행하고 검증 뒤 VM을 중지했다. image tag는 `rust:1.94-bookworm`, pull digest는 `sha256:6ae102bdbf528294bc79ad6e1fae682f6f7c2a6e6621506ba959f9685b308a55`다. source는 `/workspace:ro`, Cargo home/target은 container 임시 경로를 사용해 repository를 수정하지 않았다.

## 잔여 위험

- Stage 4 file-manager screenshot은 빈 흰 direct fixture와 검은 합성 preview라 실제 문서 fidelity를 대표하지 않는다. 공개 실사용 HWP/HWPX 시각 수용은 Stage 6에서 수행한다.
- Stage 5 local Linux container는 helper test·Clippy만 검증한다. exact x64/arm64 ELF, DEB/RPM lifecycle과 package-installed manager GUI는 Stage 6 Actions에서 새 candidate SHA로 다시 실행해야 한다.
- Linux arm64 RPM/GUI, KDE/Dolphin, AppImage registration, Flatpak/Snap과 physical user session 전체는 현재 지원 완료 범위가 아니다.
- Actions artifact는 임시 검증물이며 공식 설치 파일, release, 서명, package 게시와 updater를 뜻하지 않는다.

## 다음 단계 영향

- Stage 6은 이 Stage 5 완료 commit의 exact SHA를 `publish/task17`에 push하고 native x64/arm64 workflow와 Linux GUI workflow를 순서대로 실행한다.
- x64 DEB/RPM과 arm64 DEB lifecycle, helper/package/artifact hash를 새 exact SHA에서 다시 기록한다.
- 공개 실사용 HWP/HWPX를 Nautilus와 Thunar에서 각각 확인한다. 합성 direct/preview/failure fixture의 cache 계약도 유지한다.
- Nautilus와 Thunar의 대표 실사용 문서 screenshot을 artifact에서 직접 확인하고 작업지시자에게 대화에서 이미지로 제시한다.
- Stage 6에서도 release·배포·PR 생성은 수행하지 않는다.

## 승인 요청

- Stage 5 공식 문서 정렬과 전체 회귀 결과를 승인하면 Stage 6 Linux x64·arm64 exact-SHA native·실사용 문서 시각 수용으로 진행한다.
