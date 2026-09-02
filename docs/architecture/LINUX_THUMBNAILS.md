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
| worker address-space 상한 | 256 MiB `RLIMIT_AS` |
| core 수용 peak RSS 상한 | 256 MiB |
| 최종 형식 | RGBA PNG |
| helper 설치 경로 | `/usr/lib/alhangeul/alhangeul-thumbnailer` |
| registration 경로 | `/usr/share/thumbnailers/alhangeul.thumbnailer` |
| HWPX MIME XML 경로 | `/usr/share/mime/packages/alhangeul-hwpx.xml` |
| canonical MIME | `application/x-hwp`, `application/x-hwpx` |

registration은 다음 절대 경로만 사용한다.

```ini
[Thumbnailer Entry]
TryExec=/usr/lib/alhangeul/alhangeul-thumbnailer
Exec=/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s
MimeType=application/x-hwp;application/x-hwpx;
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

입력과 출력은 absolute local path여야 한다. 경로의 조상 directory가 symlink인 것은 허용하고, input과 존재하는 output parent를 canonicalize한 resolved absolute path만 worker에 전달한다. input leaf symlink·dangling symlink·directory·64 MiB 초과, output leaf symlink·non-regular file 및 resolved input과 같은 output은 요청 전에 거부한다. output parent는 canonicalize 가능한 existing directory여야 한다.

public supervisor는 같은 실행 파일의 private worker mode를 시작한다. worker 환경은 비우고 render 전에 가상 주소공간 제한인 `RLIMIT_AS=256 MiB`를 적용한다. 별도의 core acceptance는 process peak RSS를 계측해 256 MiB 이하를 요구하며, RSS 성공을 `RLIMIT_AS` 적용 증거로 대신하거나 그 반대로 해석하지 않는다. supervisor는 요청 시작부터 단일 monotonic 1,500 ms deadline을 적용하며 timeout, signal, panic, child failure에는 child를 kill·wait하고 실패한다. orphan process나 final/temporary partial PNG를 남기지 않는다.

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

DEB/RPM은 helper를 mode `0755`, registration과 HWPX MIME XML을 mode `0644`로 각각 한 번만 소유한다. MIME XML은 canonical `application/x-hwpx`, `*.hwpx` glob, ZIP `mimetype` signature와 기존 공개 MIME alias를 함께 선언한다. clean install, same-version reinstall, interim uninstall, refresh 실패 뒤 stale cache 관찰과 명시적 복구, update, injected failure rollback과 uninstall에서 세 제품 파일의 소유 상태를 검사한다. DEB는 dependency가 이미 사라진 purge도 별도로 검사한다.

install hook은 package manager가 제품 XML을 배치한 뒤 고정 경로 `update-mime-database /usr/share/mime`를 실행하며 명령 부재와 실행 실패를 그대로 실패시킨다. remove hook도 명령이 있으면 같은 갱신 실패를 전달하지만, Debian `postrm`처럼 package dependency를 더는 보장할 수 없는 단계에서는 명령 부재만 성공으로 건너뛴다. 제품은 다른 package의 MIME XML을 수정하지 않으며, 정상 제거 뒤에는 남은 system 정의를 기준으로 cache가 다시 만들어진다.

제품 XML의 ZIP magic은 local-header의 첫 entry가 저장 방식의 `mimetype=application/hwp+zip`인 문서를 판별한다. 추적된 upstream HWPX 298개 중 ZIP 292개를 조사했을 때 274개가 이 조건에 직접 맞았고, 나머지 18개는 첫 entry가 `Contents/content.hpf`(13), 압축된 `mimetype`(4), `BinData/`(1)였다. 이 문서들은 `*.hwpx` glob으로 분류되지만 확장자가 없거나 잘못된 파일까지 magic으로 판별하는 범위에는 포함되지 않는다.

설치·제거는 다음 외부 상태를 변경하지 않는다.

- HWP/HWPX MIME default와 사용자 기본 앱
- 제3자 `.thumbnailer` registration
- XDG thumbnail/failure cache
- 실행 중인 file manager process
- 제3자 MIME XML과 제품 외 system MIME 정의

제거 뒤 기존 thumbnail이 잠시 보일 수 있는 것은 file-manager cache가 남기 때문이다. 실행 가능한 제품 registration이나 helper가 남은 것과 구분해야 한다. 제품은 전역 cache를 삭제하거나 Nautilus·Thunar를 강제 종료하지 않는다.

AppImage는 `/usr` registration을 소유할 package transaction이 없으므로 이번 범위에서 thumbnail registration을 설치하지 않는다.

## 검증된 조합과 제외 범위

| 대상 | 자동 검증 범위 |
|---|---|
| Linux x64 DEB | inventory, helper·registration·MIME XML mode/hash, install/reinstall/stale refresh/recovery/update/rollback/uninstall/dependency 없는 purge, Nautilus 42.6, Thunar 4.16.10/Tumbler 4.16 |
| Linux x64 RPM | inventory, helper·registration·MIME XML mode/hash, install/reinstall/stale refresh/recovery/update/rollback/uninstall |
| Linux arm64 DEB | inventory, ELF architecture, helper·registration·MIME XML, 직접 PNG/resource, install/reinstall/stale refresh/recovery/update/rollback/uninstall/dependency 없는 purge |

Nautilus와 Thunar gate는 fresh XDG 경로와 virtual display에서 package-installed system MIME XML·helper·registration만 발견하게 한 뒤 direct, preview fallback, icon fallback, cache hit와 mtime invalidation을 검사한다. probe는 private MIME XML을 만들거나 MIME database를 갱신하지 않는다. screenshot, `execve` trace, 호출 횟수, cache PNG의 URI·mtime metadata를 함께 판정한다.

다음 항목은 검증하지 않았으므로 현재 지원 완료로 표시하지 않는다.

- Linux arm64 RPM과 실제 file-manager GUI
- KDE/Dolphin
- AppImage thumbnail registration
- Flatpak과 Snap
- 실제 사용자 desktop session의 배포판·file-manager 조합 전체

Task #50 Stage 4 exact source `241e0674d2abe41b8fc5bd521725321ddadc4398`에서는 x64/arm64 native package와 같은 x64 DEB를 사용해 공개 온새미로 HWP와 form-002 HWPX를 재수용했다. 최신 `devel` 통합 뒤 PR 리뷰 보정까지 포함한 source/workflow candidate `dbf09404e8b2e4fd07f510ddc60329e71a596643`에서도 native run [33607431684](https://github.com/postmelee/alhangeul-tauri/actions/runs/33607431684)과 Linux GUI run [33610310800](https://github.com/postmelee/alhangeul-tauri/actions/runs/33610310800)이 같은 결과를 재확인했다. Nautilus와 Thunar에서 두 문서의 서로 구분되는 첫 페이지, cached 호출 무증가, mtime 변경 뒤 재호출과 손상 HWP의 성공 cache PNG 부재를 확인했고 screenshot과 512px render를 사람이 판독했다. 이 근거는 위 matrix의 Ubuntu 22.04 hosted 환경에 한정한다.

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
