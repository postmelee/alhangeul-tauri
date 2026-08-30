# Linux 파일 관리자 thumbnail 아키텍처

Alhangeul은 Linux에서 Freedesktop thumbnailer 계약으로 `.hwp`와 `.hwpx`의 첫 페이지 PNG를 만든다. 파일 관리자는 설치된 registration을 발견해 제한된 native helper를 호출하며, Tauri 앱이나 WebView를 시작하지 않는다.

현재 자동 검증 범위는 Linux x64의 DEB/RPM package lifecycle과 Nautilus·Thunar/Tumbler, Linux arm64의 DEB lifecycle과 직접 PNG다. Actions artifact는 임시 검증물이며 공식 설치 파일이나 공개 release가 아니다.

## 고정 계약

| 항목 | 값 |
|---|---|
| Public CLI | `alhangeul-thumbnailer <absolute-input> <absolute-output> <edge>` |
| 요청 edge | `1..=1024` px |
| 입력 상한 | 64 MiB |
| worker deadline | 1,500 ms |
| worker address-space 상한 | 256 MiB |
| 최종 형식 | RGBA PNG |
| helper 설치 경로 | `/usr/lib/alhangeul/alhangeul-thumbnailer` |
| registration 경로 | `/usr/share/thumbnailers/alhangeul.thumbnailer` |
| MIME | `application/x-hwp`, `application/vnd.hancom.hwpx` |

registration은 다음 절대 경로만 사용한다.

```ini
[Thumbnailer Entry]
TryExec=/usr/lib/alhangeul/alhangeul-thumbnailer
Exec=/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s
MimeType=application/x-hwp;application/vnd.hancom.hwpx;
```

`%u`, shell wrapper, 원격 URI와 PATH lookup은 허용하지 않는다.

## Process와 소유권

```text
Nautilus 또는 Thunar/Tumbler
  └─ /usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s
       ├─ public supervisor가 경로·크기·출력 대상 검증
       ├─ 같은 ELF의 private worker를 빈 환경으로 실행
       │    └─ document-preview와 pinned rhwp로 첫 페이지 render
       ├─ deadline 안의 child 성공과 PNG를 재검증
       └─ sibling temporary를 final output에 게시
```

- `apps/linux-thumbnailer`는 CLI, process supervision, Linux resource limit와 PNG 게시를 소유한다.
- `crates/document-preview`는 bytes-only direct render, embedded preview, raster와 공통 byte/pixel 상한을 소유한다.
- `third_party/rhwp`는 현재 Stable pin의 HWP/HWPX parse와 첫 페이지 SVG 생성에 사용하며 이 통합을 위해 수정하지 않는다.
- 파일 관리자는 호출, persistent thumbnail/failure cache와 변경 감지를 소유한다.
- helper는 network API, Tauri, WebView, persistent daemon과 자체 cache를 사용하지 않는다.

## 입력과 실패 계약

입력은 canonical absolute local regular file이어야 한다. symlink, 상대 경로, directory, 64 MiB 초과, 입력과 같은 출력은 요청 전에 거부한다. 출력 parent도 canonical absolute local directory여야 한다.

public supervisor는 같은 실행 파일의 private worker mode를 시작한다. worker 환경은 비우고 render 전에 `RLIMIT_AS=256 MiB`를 적용한다. supervisor는 요청 시작부터 단일 monotonic 1,500 ms deadline을 적용하며 timeout, signal, panic, child failure에는 child를 kill·wait하고 실패한다. orphan process나 final/temporary partial PNG를 남기지 않는다.

문서 경로·본문은 log나 artifact에 기록하지 않는다. 자동 evidence는 공개 fixture class, hash, byte 크기, 시간, RSS와 구조화 결과만 사용한다.

## Direct-first render와 fallback

Linux helper는 embedded preview를 성공으로 먼저 확정하지 않는다.

1. 원본 bytes를 현재 pinned native `rhwp`로 직접 parse·render한다.
2. 직접 결과가 성공하면 요청 edge에 맞춰 raster한다.
3. 직접 render가 실패할 때만 제한을 통과한 embedded preview를 decode·raster한다.
4. 둘 다 실패하면 nonzero로 종료하고 final output을 만들지 않는다.

이는 오래되거나 누락된 embedded preview가 정상 첫 페이지를 덮어쓰는 일을 막는다. 손상, 암호화, 제한 초과 문서는 placeholder PNG 대신 file manager의 MIME icon fallback에 맡긴다.

## PNG 게시와 Tumbler 호환

worker는 final output에 직접 쓰지 않고 같은 directory의 고유 sibling temporary에만 쓴다. supervisor는 child 성공 뒤 PNG decode, RGBA8, 최대 축 edge와 pixel byte 수를 다시 확인한다.

- 새 output이나 기존 non-empty regular output은 검증된 sibling temporary를 rename한다.
- 실패하면 기존 final output을 보존하고 temporary를 제거한다.
- symlink와 non-regular output은 거부한다.
- Tumbler 4.16은 빈 regular output을 미리 만들고 helper 종료 뒤 같은 inode에서 읽는다. 이 경우에만 `O_NOFOLLOW`로 다시 열어 device/inode가 최초 값과 같은지 검증한 뒤 같은 inode에 PNG를 기록한다.

이 예외는 Tumbler가 제공한 0-byte regular file에만 적용되며 임의 existing file의 in-place overwrite를 허용하지 않는다.

## Package와 cache lifecycle

DEB/RPM은 helper를 mode `0755`, registration을 mode `0644`로 각각 한 번만 소유한다. clean install, same-version reinstall, update, injected failure rollback과 uninstall에서 두 제품 파일의 소유 상태를 검사한다.

설치·제거는 다음 외부 상태를 변경하지 않는다.

- HWP/HWPX MIME default와 사용자 기본 앱
- 제3자 `.thumbnailer` registration
- XDG thumbnail/failure cache
- 실행 중인 file manager process
- system-wide MIME database

제거 뒤 기존 thumbnail이 잠시 보일 수 있는 것은 file-manager cache가 남기 때문이다. 실행 가능한 제품 registration이나 helper가 남은 것과 구분해야 한다. 제품은 전역 cache를 삭제하거나 Nautilus·Thunar를 강제 종료하지 않는다.

AppImage는 `/usr` registration을 소유할 package transaction이 없으므로 이번 범위에서 thumbnail registration을 설치하지 않는다.

## 검증된 조합과 제외 범위

| 대상 | 자동 검증 범위 |
|---|---|
| Linux x64 DEB | inventory, helper·registration mode/hash, install/reinstall/update/rollback/uninstall, Nautilus 42.6, Thunar 4.16.10/Tumbler 4.16 |
| Linux x64 RPM | inventory, helper·registration mode/hash, install/reinstall/update/rollback/uninstall |
| Linux arm64 DEB | inventory, ELF architecture, 직접 PNG/resource, install/reinstall/update/rollback/uninstall |

Nautilus와 Thunar gate는 fresh XDG 경로와 virtual display에서 package-installed helper를 발견하게 한 뒤 direct, preview fallback, icon fallback, cache hit와 mtime invalidation을 검사한다. screenshot, `execve` trace, 호출 횟수와 cache PNG를 함께 판정한다.

다음 항목은 검증하지 않았으므로 현재 지원 완료로 표시하지 않는다.

- Linux arm64 RPM과 실제 file-manager GUI
- KDE/Dolphin
- AppImage thumbnail registration
- Flatpak과 Snap
- 실제 사용자 desktop session의 배포판·file-manager 조합 전체

Stage 6에서는 Stage 5와 같은 exact SHA의 x64/arm64 native artifact를 다시 만들고, 공개 실사용 HWP/HWPX가 Nautilus와 Thunar에서 서로 구분되는 첫 페이지로 보이는지 screenshot을 사람이 확인한다.

## Build와 검증

Linux host에서 helper source를 검증한다.

```sh
cargo fmt --manifest-path apps/linux-thumbnailer/Cargo.toml -- --check
pnpm run test:linux-thumbnailer
pnpm run clippy:linux-thumbnailer
pnpm run build:linux-thumbnailer -- \
  --target x86_64-unknown-linux-gnu \
  --output <absolute-output-directory> \
  --repository-sha <40-character-sha>
```

arm64 build는 target을 `aarch64-unknown-linux-gnu`로 바꾼다. build script는 ELF64 little-endian, executable mode와 machine을 검사하고 binary SHA-256이 든 summary를 만든다.

플랫폼 중립 source·workflow 계약은 모든 host에서 실행한다.

```sh
pnpm run test:automation
pnpm run check:product-boundary
```

실제 ELF build, `RLIMIT_AS`, DEB/RPM lifecycle과 file-manager 실행은 Linux native workflow가 소유한다. 다른 host의 source test는 이를 대신하지 않는다.

## Upstream 갱신 영향

Stable `rhwp` pin 갱신은 Windows worker, desktop preview와 Linux helper의 직접 render를 함께 바꾼다. 새 exact SHA에서 Linux x64·arm64 helper test/Clippy/build, package lifecycle과 x64 Nautilus·Thunar 시각 수용을 반복해야 한다.

## 관련 문서

- [개발 환경과 명령](../DEVELOPMENT.md)
- [upstream rhwp 경계](UPSTREAM.md)
- [desktop artifact와 배포 준비](../operations/DESKTOP_RELEASE.md)
