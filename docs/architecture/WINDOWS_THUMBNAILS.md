# Windows Explorer thumbnail 아키텍처

Alhangeul은 Windows Explorer가 `.hwp`와 `.hwpx` 파일의 첫 페이지 thumbnail을 요청할 때 작은 COM handler DLL과 제한된 별도 worker를 사용한다. 문서 parse와 raster는 Shell process 안에서 실행하지 않는다.

Stage 6 VDI 수동 UI에서 일부 문서의 직접 bitmap에 text가 빠지는 결함을 확인해 Stage 6.1에서 font-aware raster와 representative visual gate를 보정했다. 일회성 Windows worker는 system font directory를 스캔하지 않고 pinned NotoSansKR 두 파일만 process-local database에 등록한다. exact SHA `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`의 CI, Windows/Linux native build, fresh-install MSI·NSIS 실제 Shell bitmap smoke와 Windows VDI Explorer 재수용이 모두 통과했다. 이는 공개 installer, release, 서명이나 updater 승인을 뜻하지 않는다.

## 고정 계약

| 항목 | 값 |
|---|---|
| 지원 대상 | Windows x64 |
| COM CLSID | `{C1DCF316-0771-49DD-BFEA-C85F69B1674B}` |
| Thumbnail provider category | `{E357FCCD-A995-4576-B01F-234630154E96}` |
| Handler DLL | `AlhangeulThumbnailHandler.dll` |
| Worker executable | `AlhangeulThumbnailWorker.exe` |
| COM threading model | `Apartment` |
| 연결 확장자 | `.hwp`, `.hwpx` |

CLSID, filename과 category는 source test, artifact inventory, installer source test와 실제 Windows smoke가 함께 고정한다. 값을 바꾸는 작업은 handler, installer, smoke와 기존 설치 upgrade·rollback을 같은 exact SHA에서 다시 검증해야 한다.

## Process와 소유권

```text
Windows Shell
  └─ COM host가 thumbnail handler DLL을 load
       ├─ bounded IStream에서 문서 bytes를 읽음
       ├─ anonymous pipe와 Job Object로 worker를 시작
       │    └─ shared document-preview render와 pinned rhwp 사용
       ├─ direct/preview frame을 검증하고 하나를 선택
       └─ Shell에 BGRA HBITMAP을 반환
```

### COM handler DLL

`apps/thumbnail-handler`는 Shell과 native 경계만 소유한다.

- `IInitializeWithStream`과 `IThumbnailProvider`를 구현한다.
- 입력 stream 크기와 요청 edge를 제한하고 worker protocol request로 변환한다.
- worker process, pipe handle, Job Object, deadline과 frame 순서를 관리한다.
- 검증된 BGRA payload만 `HBITMAP`으로 변환한다.
- COM activation과 machine/user registration export를 제공한다.
- `rhwp`, document parser, renderer, Tauri 또는 WebView를 직접 link하지 않는다.

handler가 bitmap을 만들 수 없으면 실패 HRESULT를 반환한다. 이때 Explorer가 일반 파일 icon을 표시하는 것이 최종 fallback이며 handler가 임의 placeholder를 생성하지 않는다.

### Thumbnail worker

`apps/thumbnail-worker`는 문서 bytes를 받아 첫 페이지를 raster하는 일회성 process다.

- stdin으로 고정 header와 문서 bytes를 받고 stdout으로 고정 frame만 보낸다.
- `crates/document-preview`의 bounds, protocol과 render 기능을 사용한다.
- 현재 Stable pin의 native `rhwp`로 직접 첫 페이지 SVG를 만들고 BGRA로 raster한다.
- SVG parse 시 pinned `rhwp`의 NotoSansKR TTF만 process-local font database에 등록한다.
- 문서의 유효한 embedded preview가 있으면 먼저 제한된 후보 frame을 보낸다.
- 직접 render 결과나 명시적 실패를 보낸 뒤 종료한다.

worker executable은 handler DLL과 같은 설치 디렉터리에 있어야 한다. handler는 상대 이름으로 worker를 확인하며 임의 PATH lookup을 하지 않는다.

### Font와 visual fidelity

`rhwp`가 만든 SVG는 원본 HWP family와 대체 family 목록을 포함한다. rasterizer는 이를 해석할 실제 font database를 명시적으로 제공해야 하며 빈 기본 database로 parse하지 않는다.

- 일회성 worker는 설치된 system font directory를 스캔하지 않는다. 이는 문서마다 새 process를 시작하는 현재 격리 모델에서 1,500 ms cold-start 한도를 지키기 위한 경계이며 desktop editor·PDF의 system font 우선 규칙에는 영향을 주지 않는다.
- pinned `third_party/rhwp/ttfs/opensource`의 `NotoSansKR-Regular.ttf`와 `NotoSansKR-ExtraLight.ttf`를 worker에 compile-time 포함해 설치 경로나 current directory와 무관한 한글 glyph를 보장한다.
- 두 TTF의 고정 SHA-256, 저작권과 SIL OFL 1.1은 `assets/fonts/FONTS.md`에 기록하고 desktop bundle의 `licenses/fonts/`에 manifest와 license 원문을 함께 포함한다.
- 원본 family가 worker database에 없으면 SVG text는 실제 등록된 Noto Sans KR family로 해석한다. generic serif, sans-serif와 monospace도 같은 실존 family를 사용한다.
- 한컴·HY·Microsoft proprietary font file은 제품에 복사하거나 번들하지 않는다. 원본 font가 없을 때 metric과 줄바꿈은 fallback 차이의 영향을 받을 수 있다.
- HWP/HWPX 대표 fixture는 SVG의 text/image node inventory와 text·background·table 영역의 non-white pixel을 함께 검사한다. 성공 HRESULT, bitmap 크기와 alpha만으로 visual 성공을 판정하지 않는다.

## Direct-first IPC와 fallback

embedded preview는 빠른 후보일 뿐 최신 문서 내용의 진실 원천이 아니다. 최종 선택은 다음 순서를 따른다.

1. handler가 request header, 요청 edge, payload 길이와 문서 hash를 pipe로 전달한다.
2. worker는 embedded preview가 있고 형식·bytes·dimension·raster 검증을 통과하면 `PreviewCandidate` frame을 먼저 보낸다.
3. worker는 같은 원본 bytes를 native `rhwp`로 직접 parse·render한다.
4. `DirectBitmap`이 deadline 안에 도착하면 후보 유무와 관계없이 직접 결과를 사용한다.
5. 직접 render 실패, worker disconnect 또는 deadline에는 이미 검증된 후보만 사용한다.
6. 후보도 없으면 handler가 실패하고 Explorer의 일반 icon fallback에 맡긴다.

반복 후보, terminal frame 뒤 추가 frame, 잘못된 kind·크기·pixel 길이, 잘못된 request hash는 protocol 위반으로 거부한다. worker는 preview 후보를 성공으로 확정하지 않으므로 오래된 embedded preview가 정상 직접 render를 덮어쓰지 못한다.

## Resource budget

| 자원 | 상한 |
|---|---:|
| 입력 문서 | 64 MiB |
| 요청 edge | 1024 px |
| 직접 render SVG | 16 MiB |
| embedded preview bytes | 16 MiB |
| embedded preview decode | 16,777,216 pixels |
| 최종 bitmap | 1,048,576 pixels |
| bitmap payload | 4,194,304 bytes |
| frame header | 64 bytes |
| 전체 frame | 4,194,368 bytes |
| worker process memory | 256 MiB |
| 직접 결과 대기 | 1,500 ms |
| protocol 전체 ceiling | 2,000 ms |

요청 edge `0`은 거부하고 1024보다 큰 값은 1024로 제한한다. 현재 handler는 직접 결과 deadline인 1,500 ms에 후보를 선택하거나 실패하고 worker를 종료하므로 2,000 ms 전체 ceiling을 넘지 않는다.

worker는 `CREATE_NO_WINDOW | CREATE_SUSPENDED`로 시작하고 명시한 pipe handle만 상속한다. handler는 active process 1, kill-on-close와 256 MiB process memory 제한을 가진 Job Object에 worker를 배정한 뒤 실행한다. 반환 또는 오류 뒤에는 worker를 종료하고 pipe thread를 join한다.

## Explorer cache와 변경 알림

thumbnail cache, 보기 크기별 결과, DPI별 요청과 파일 변경 invalidation은 Windows Explorer가 소유한다. Alhangeul handler와 worker는 별도 persistent thumbnail cache를 만들지 않으며 문서 경로나 내용을 저장하지 않는다.

install과 uninstall 뒤에는 `SHChangeNotify(SHCNE_ASSOCCHANGED)`를 호출해 연결 변경을 알린다. Explorer나 `dllhost.exe`를 강제 종료하거나 system thumbnail cache를 전역 삭제하지 않는다. Stage 6 수동 gate에서는 파일 내용 변경 뒤 갱신, Explorer 재진입, 보기 크기와 DPI 변화가 실제 UI에 반영되는지 확인한다.

## Registry와 installer transaction

등록은 extension 기본값이나 ProgID 전체가 아니라 thumbnail ShellEx slot만 소유한다.

```text
Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}\InprocServer32
Software\Classes\.hwp\ShellEx\{E357FCCD-A995-4576-B01F-234630154E96}
Software\Classes\.hwpx\ShellEx\{E357FCCD-A995-4576-B01F-234630154E96}
Software\Alhangeul\ThumbnailHandlerBackup
```

- MSI는 64-bit HKLM scope, NSIS는 64-bit HKCU scope에 등록한다.
- active ProgID, `SystemFileAssociations`와 `UserChoice`는 읽거나 변경하지 않는다.
- 설치 전에 각 ShellEx slot의 부재 또는 기존 raw registry kind/data를 snapshot한다.
- `State` 값을 마지막에 기록해 snapshot commit marker로 사용한다.
- upgrade에서 현재 owner가 Alhangeul이면 이미 commit된 원본 snapshot을 덮어쓰지 않는다.
- 제거할 때 현재 owner가 여전히 Alhangeul인 slot만 원래 값 또는 부재로 복원한다.
- 설치 뒤 제3자가 slot을 바꿨다면 그 값을 보존하고 Alhangeul snapshot만 정리한다.

MSI는 native System64 `regsvr32`를 deferred action과 rollback action으로 실행한다. NSIS는 x64 filesystem redirection을 끈 native `regsvr32 /n /i:user` 경로를 사용한다. 설치 실패, 재설치와 제거는 binary, CLSID, association과 backup key의 제품 소유 상태가 남지 않는지 실제 Windows smoke로 확인한다.

## Build와 자동 gate

thumbnail binary build는 Windows x64 MSVC target에서만 수행한다.

```sh
pnpm run build:thumbnail-binaries -- --target x86_64-pc-windows-msvc
pnpm run test:thumbnail-worker:windows
pnpm run test:thumbnail-handler:windows
pnpm run clippy:thumbnail-worker:windows
pnpm run clippy:thumbnail-handler:windows
```

build script는 DLL과 worker를 고정 filename으로 stage하고 PE x64 machine과 DLL/EXE 종류를 검사한다. native workflow는 bundle inventory에 두 binary를 포함하고 Windows installer smoke에서 다음을 확인한다.

- COM class activation과 `IThumbnailProvider` 호출
- MSI·NSIS install, upgrade/reinstall, uninstall과 injected rollback
- clean, absent, 기존 handler와 제3자 takeover registry fixture의 조건부 복원
- 실제 HWP/HWPX fixture의 요청 edge 256 px Shell bitmap과 성공 HRESULT
- 온새미로 HWP, `biz_plan.hwp`, `form-002.hwpx`의 text/image/table 구조와 영역별 raster content
- fixture hash 불변, worker 잔류 없음과 제품 소유 registry cleanup

다른 host의 platform-neutral test는 protocol, bounds와 source 계약을 고정하지만 PE, COM host, installer transaction과 실제 Shell 호출을 대신하지 않는다.

## 수동 Explorer gate와 한계

Stage 6과 시각 보정 Stage 6.1에서는 source와 hosted 자동 gate를 통과한 같은 exact SHA의 installer를 Windows VDI에 설치해 다음을 확인한다.

1. HWP와 HWPX의 첫 페이지가 Explorer에서 파일별로 구분되어 보인다.
2. 작은·중간·큰·매우 큰 아이콘 보기와 100%·고DPI 환경에서 비율과 여백이 정상이다.
3. 문서 내용을 바꾸고 저장한 뒤 cache가 갱신된 첫 페이지를 표시한다.
4. 손상, 암호화, 제한 초과 문서는 Explorer를 멈추지 않고 일반 icon으로 fallback한다.
5. 한컴 설치 환경의 기존 handler/default app을 설치 전 snapshot대로 보존하고 제거 뒤 복원한다.
6. install, Explorer 사용과 uninstall 뒤 orphan worker, 제품 registry와 backup 상태가 남지 않는다.

Stage 6.1 수용본은 exact SHA `2a1a9c556fdb844ecea4fddb0a6336d9d9481078`이다. CI run `33044851424`와 desktop artifact run `33044853129`가 성공했고, installer smoke job `98431213787`은 MSI·NSIS 각각에서 HWP와 embedded preview가 없는 HWPX의 256 px 실제 Shell bitmap을 `HRESULT=0`으로 확인했다. 2026-08-28 Windows VDI에서는 온새미로, `biz_plan`, `form-002`의 text/background/table과 첫 페이지 비율을 재수용했다. 복학원서 왼쪽 위의 고려대학교 문장과 wordmark는 원본 PDF·upstream 기대 이미지와 위치·내용이 일치하며, 256 px 축소에서 세밀한 검은 선이 뭉쳐 보이는 것은 허용 가능한 축소 결과로 판정했다.

unsigned test installer는 Windows SmartScreen이나 보안 정책에 의해 차단될 수 있다. 이는 코드 서명이나 공개 배포를 승인한 것이 아니며, VDI에서는 검증용 exact artifact와 SHA를 확인한 뒤 조직 정책 안에서만 실행한다. 자동 gate와 수동 UI gate가 모두 Go여도 release tag, GitHub Release, 서명, package 게시와 updater는 별도 승인 작업이다.

## 관련 문서

- [개발 환경과 명령](../DEVELOPMENT.md)
- [upstream rhwp 경계](UPSTREAM.md)
- [desktop artifact와 배포 준비](../operations/DESKTOP_RELEASE.md)
