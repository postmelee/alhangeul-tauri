# Task #9 Stage 4.6 완료 보고서 — 최신 통합 exact 후보 native 재검증

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 4.6

## 단계 목적

PR #18과 PR #22가 merge된 최신 `devel`을 포함하는 Stage 4.5 commit을 새 prerelease
후보 exact SHA로 고정한다. 같은 SHA의 CI와 Windows/Linux native artifact를 다시 만들고,
승인된 여섯 baseline bundle의 inventory·checksum·설치·실행·제거와 대표 문서 시나리오를
과거 candidate와 섞지 않고 다시 수용하는 것이 목적이다.

## 산출물

| 파일·상태 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_9_stage4_6.md` | exact run, artifact, checksum, native package·GUI와 증거 승계 판단 기록 |
| `docs/operations/DESKTOP_RELEASE.md` | PR #18·#22 통합 exact 후보를 현재 candidate로 승격하고 이전 Task #11 후보를 역사 증적으로 전환 |
| `mydocs/orders/20260812.md` | Stage 4.6 완료와 Stage 5 승인 대기 상태 기록 |
| `publish/task9` | candidate exact SHA `8b4ae60bb0f9619caa6c1f4d9f5a3796a42edcd9` 고정 |
| repository 외부 Actions artifact | Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM, Linux arm64 DEB와 Windows smoke 진단 |

## exact workflow 결과

후보 source:

```text
8b4ae60bb0f9619caa6c1f4d9f5a3796a42edcd9
```

| Workflow | Run | Event·branch·SHA | 결과 |
|---|---:|---|---|
| Alhangeul CI | [31584608310](https://github.com/postmelee/alhangeul-tauri/actions/runs/31584608310) | `workflow_dispatch`, `publish/task9`, exact SHA 일치 | `Unit tests` success |
| Desktop Artifact Build | [31584610236 attempt 2](https://github.com/postmelee/alhangeul-tauri/actions/runs/31584610236/attempts/2) | `workflow_dispatch`, `publish/task9`, exact SHA 일치 | Windows x64·Linux x64·Linux arm64·Windows smoke success |

native run 첫 attempt의 Windows job은 `Fetch rhwp pinned release tag` 중 Corepack의 npm
registry 연결이 `UND_ERR_SOCKET`으로 끊겨 실패했다. Linux 두 job은 성공했고 source test나
build 실패는 없었다. 실패 job만 재실행한 attempt 2에서 Windows build와 그 artifact를 받는
installer smoke가 모두 통과했다. 최종 판정은 attempt 2의 같은 head SHA와 job 결과를
사용하며, 첫 attempt의 불완전 smoke artifact는 수용 증거에서 제외한다.

## artifact archive와 bundle inventory

2026-08-12 확인 시점의 최종 Actions artifact metadata:

| 대상 | ID | Archive 크기 (bytes) | API archive digest | 만료 시각 (UTC) |
|---|---:|---:|---|---|
| Windows x64 | `9137450619` | 101,025,675 | `sha256:f3601d84db7bb4f21164dd08c797d69960f770870f37a8dd6314188b4d27d954` | `2026-08-26T10:18:46Z` |
| Linux x64 | `9136991403` | 501,470,030 | `sha256:4949881df1a4ded2185865759891e85a683646a9a914f164214e4198fd3fffa1` | `2026-08-26T10:03:00Z` |
| Linux arm64 | `9136797239` | 163,943,754 | `sha256:3d07a862822334edf76f2141025577db32ed12f8be4b5b38f039a3742d539282` | `2026-08-26T09:56:49Z` |
| Windows smoke | `9137484741` | 31,127 | `sha256:cf1413fa5b1ade9a860dea15a496c0bd17aef561d9fa46cf5abd9e3d77cc50f2` | `2026-08-26T10:20:00Z` |

다운로드한 세 platform inventory를 독립 재계산해 build 시 기록과 일치함을 확인했다.

| Platform | 종류 | 파일 크기 (bytes) | SHA-256 |
|---|---|---:|---|
| Windows x64 | MSI | 52,785,152 | `5ac82b3a8298dcb3f05f1259d6b96701ffd39c34d1b465b04072a4646ab12864` |
| Windows x64 | NSIS | 48,469,684 | `f13e7335d2737c5d74a775646ffb6416d32ff0fe2ec2a4124c26feb9e3d49384` |
| Linux x64 | AppImage | 131,144,184 | `256becf050212db787f728f43f0dd1073bbeb0d77505f33f12f7ae5cc91d6dc4` |
| Linux x64 | DEB | 54,729,740 | `e4edd4d794f2d88fccba39e9e8c9121811d889b02f6dca69c722b3460e6aab33` |
| Linux x64 | RPM | 54,729,462 | `6689bd8658e16c498f6d6c105f5d143527c4f09f34f00725fab3d325d1580baf` |
| Linux arm64 | DEB | 54,685,236 | `691b6e5835003f32a2169e38dc3380ff8106cfb4edee67b38d2f8408e48e57e9` |

여섯 installer만 평탄화한 임시 root에서 생성·재검증한 `SHA256SUMS`:

```text
6689bd8658e16c498f6d6c105f5d143527c4f09f34f00725fab3d325d1580baf  Alhangeul-0.1.0-1.x86_64.rpm
256becf050212db787f728f43f0dd1073bbeb0d77505f33f12f7ae5cc91d6dc4  Alhangeul_0.1.0_amd64.AppImage
e4edd4d794f2d88fccba39e9e8c9121811d889b02f6dca69c722b3460e6aab33  Alhangeul_0.1.0_amd64.deb
691b6e5835003f32a2169e38dc3380ff8106cfb4edee67b38d2f8408e48e57e9  Alhangeul_0.1.0_arm64.deb
f13e7335d2737c5d74a775646ffb6416d32ff0fe2ec2a4124c26feb9e3d49384  Alhangeul_0.1.0_x64-setup.exe
5ac82b3a8298dcb3f05f1259d6b96701ffd39c34d1b465b04072a4646ab12864  Alhangeul_0.1.0_x64_en-US.msi
```

`shasum -a 256 -c SHA256SUMS`는 여섯 파일을 모두 `OK`로 판정했다. 568 bytes인
`SHA256SUMS` 자체 SHA-256은
`6c43efe3a3b3d84c9ebd3204b48a4b058ee4b54537c6f11bed2253d39a4d348a`다.
이는 candidate 검증용 초안이며 공개 asset이 아니다.

## Windows x64 package와 대표 기능 수용

attempt 2 smoke의 checkout SHA는 candidate exact SHA와 일치했다. MSI·NSIS 각각 설치와
제거 exit code `0`, version·설치 경로·HWP/HWPX handler·Open With·shortcut·기존 기본 연결
보존, 5초 제한 실행, 최종 process/path clean과 owned registry 잔여 0건을 통과했다. installer
범위 밖 fixture의 전후 SHA-256도 같았다.

이번 candidate에서 Windows GUI를 직접 다시 조작할 수 있는 VDI session은 없었다. 따라서
자동 smoke를 GUI 기능 성공으로 확대하지 않고 다음 source·증거 연속성으로 대표 기능 gate를
수용했다.

- Task #13의 Windows GUI에서 upstream Studio, 중앙 open·drag-in, HWP/HWPX 저장·재열기,
  직접 PDF 저장과 한글 검색·선택·복사를 확인했다.
- Task #15의 Windows GUI에서 별도 Alhangeul preview 없이 system dialog 직접 진입,
  Microsoft Print to PDF modal handoff, 상태 복원과 반복 인쇄를 확인했다.
- Task #15 최종 제품 source `b5b75e2bea6258338e6df5bd6d36fa10e78a4ced`에서 이번
  candidate까지 `apps/desktop/src-tauri/src`, `apps/studio-host/src`, `third_party/rhwp`,
  `assets/fonts` diff는 0건이다. Stage 4.5의 추가 제품 변경은 Linux desktop template과
  release metadata/checksum 계약뿐이다.
- 같은 최종 runtime source의 새 exact Windows bundle과 MSI·NSIS smoke를 이번 단계에서
  다시 통과했다.

따라서 Windows 대표 기능은 승인된 GUI 근거·runtime 무변경·새 exact package gate의 결합으로
수용한다. `8b4ae60…` installer의 직접 GUI 반복이 아니라는 제한은 Stage 5 release notes와
Go/No-Go 대조에서 계속 공개한다.

## Linux x64 native package와 GUI 재검증

Colima의 native x86_64 Ubuntu 24.04.4 VM과 같은 CPU의 Fedora 42 x86_64 container를
사용했다. qemu나 다른 architecture emulation은 사용하지 않았다.

| Bundle | 설치·launcher | 실제 관찰 | 제거·rollback | 결과 |
|---|---|---|---|---|
| DEB | `0.1.0 amd64` clean install, 설치된 `Alhangeul.desktop`의 `%F`로 HWP와 HWPX 실행 | HWP 6쪽·HWPX 10쪽 중앙 표시, 한글 UI·본문 정상, argv에 전체 경로 전달 | package·binary·desktop entry 제거, 두 fixture hash 유지 | 통과 |
| AppImage | exact artifact, 내부 desktop entry 확인, integration과 같은 `%F` launcher로 HWP 실행 | HWP 6쪽 중앙 표시, 한글 UI·본문 정상, argv에 전체 경로 전달 | 임시 launcher 제거 대상, fixture hash 유지 | 통과 |
| RPM | Fedora 42에서 `0.1.0-1 x86_64` clean install, 설치된 desktop launcher로 HWP 실행 | HWP 6쪽 중앙 표시, argv에 전체 경로 전달 | `dnf remove`, package·binary·desktop entry 제거, fixture hash 유지 | 통과 |

네 package가 사용하는 실제 desktop entry는 모두 다음 계약을 포함했다.

```text
Exec=Alhangeul %F
MimeType=application/x-hwp;application/vnd.hancom.hwpx
```

최소 Fedora container에는 한국어 system fallback font가 없어 일부 비번들 글꼴 한글이
네모로 표시됐다. 이는 package launch나 문서 parsing 실패가 아니며, Ubuntu x64와 arm64의
동일 exact 문서에서는 한글 UI·본문이 정상 표시됐다. Linux 대표 저장·direct PDF·6쪽 system
print 기능은 Task #13·#15에서 통과했고 `b5b75e2…` 이후 runtime diff가 0건이다. 이번
candidate에서는 package별 `%F` launch, HWP/HWPX open·중앙 표시와 rollback을 직접 다시
수행해 Stage 4.5에서 추가된 Linux packaging 경계를 별도로 수용했다.

## Linux arm64 native package와 GUI 재검증

native aarch64 Ubuntu 24.04.4 VM에서 exact arm64 DEB를 설치했다.

- package: `alhangeul 0.1.0`, architecture `arm64`, status `install ok installed`
- artifact SHA-256:
  `691b6e5835003f32a2169e38dc3380ff8106cfb4edee67b38d2f8408e48e57e9`
- 설치 desktop entry: `%F`와 HWP/HWPX MIME 일치
- `gtk-launch Alhangeul <biz_plan.hwp>`의 process argv에 전체 fixture 경로 전달
- HWP 6쪽 중앙 표시와 한글 UI·본문 정상
- fixture SHA-256 `8b786d6824622afae2220b203beeef6e5592157e1896fea055ebc602817113c1`
  설치·실행·제거 전후 동일
- `dpkg --remove` 뒤 binary와 desktop entry 제거

Task #15의 Linux arm64 GUI에서 같은 runtime source 계열의 CUPS-PDF 6쪽·direct PDF·반복
인쇄를 통과했고, 최종 `b5b75e2…`에서 이번 candidate까지 runtime diff가 없다. 이번
candidate의 arm64 package·launcher·문서 표시와 rollback을 직접 다시 수행했으므로 arm64
대표 기능과 새 package 경계를 함께 수용한다.

## 본문 변경 정도 / 본문 무손실 여부

제품 runtime, upstream submodule, font binary, workflow와 installer source는 이번 단계에서
수정하지 않았다. Stage 4.6은 Stage 4.5 exact source의 remote·native 검증과 그 결과의 공식
운영·task 문서화만 수행한다. 과거 candidate의 역사 증거는 삭제하지 않고 현재 candidate와
명확히 분리했다. tag, GitHub Release, `main` PR, 공개 asset, signing과 updater는 만들지
않았다.

## 검증 결과

실행·대조한 핵심 명령:

```bash
gh run view 31584608310 --repo postmelee/alhangeul-tauri \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run view 31584610236 --repo postmelee/alhangeul-tauri --attempt 2 \
  --json event,headBranch,headSha,status,conclusion,url,jobs
gh run download 31584610236 --repo postmelee/alhangeul-tauri \
  --dir <temporary-directory>
pnpm run check:desktop-artifacts -- --platform <platform> \
  --root <artifact-root> --verify-inventory <inventory-path>
pnpm run create:release-checksums -- \
  --root <temporary-release-assets> --output <temporary-release-assets>/SHA256SUMS
shasum -a 256 -c SHA256SUMS
git diff --name-status b5b75e2bea6258338e6df5bd6d36fa10e78a4ced..8b4ae60 \
  -- apps/desktop/src-tauri/src apps/studio-host/src third_party/rhwp assets/fonts
git diff --check
```

결과:

- OK — CI와 native attempt 2의 event·branch·head SHA가 candidate와 일치하고 모든 required
  job이 success다.
- OK — 세 platform artifact inventory와 여섯 installer 크기·SHA-256이 일치한다.
- OK — 여섯 installer의 결정적 `SHA256SUMS` 생성·독립 재검증을 통과했다.
- OK — Windows MSI·NSIS 설치·제한 실행·제거와 최종 clean state가 통과했다.
- OK — Linux x64 AppImage·DEB·RPM과 Linux arm64 DEB의 native install/launch/`%F`/MIME/
  rollback을 통과했다.
- OK — exact Linux x64에서 HWP 6쪽, HWPX 10쪽을 중앙에서 열었고 exact arm64에서 HWP
  6쪽을 중앙에서 열었다. 모든 원본 fixture hash가 유지됐다.
- OK — 최종 승인 runtime source와 candidate 사이의 Studio·Rust·upstream·font diff 0건을
  확인했다.
- OK — 플랫폼 중립 재검증은 product boundary 188 files, version·release metadata
  `0.1.0`, rhwp `v0.8.2` exact pin, automation 84/84, upstream 35/35, Studio 97/97와
  production build 213 modules를 통과했다.
- OK — GitHub Release, remote tag와 `main` 대상 open PR이 모두 0건이다.
- INFO — CanvasKit browser externalization, ineffective dynamic import와 500 kB chunk 경고는
  기존 비차단 build 경고다.

## 잔여 위험

- candidate Windows GUI는 직접 반복하지 않았으며 승인된 Task #13·#15 GUI 결과, runtime
  무변경과 새 exact build·installer smoke를 결합한 수용이다.
- 실제 system dialog를 5분 넘게 유지하는 Windows 시나리오와 Linux 혼합 페이지 크기 media
  전환은 Task #15에서 공개한 미검증 제한으로 남는다.
- Fedora 최소 container의 한국어 fallback font 부재는 일반 배포판 desktop의 기본 font
  구성을 대체하지 않는다. 실제 사용자 환경에서 누락 글꼴 대체 품질은 문서별로 달라질 수 있다.
- Windows installer는 unsigned이므로 공개 prerelease라면 SmartScreen 경고 가능성과
  `SHA256SUMS`를 반드시 고지해야 한다.
- Actions artifact는 14일 후 만료되고 최종 tag artifact가 아니다.

## 다음 단계 영향

- Stage 5에서 Stage 1 required matrix와 이 보고서를 항목별로 대조해 최종 Go/No-Go를
  판정한다.
- Stage 5는 release notes와 후속 게시 Issue 초안만 작성하며 tag·Release·main PR·asset
  게시를 수행하지 않는다.
- 실제 게시 task는 `main`의 immutable `v0.1.0` tag exact SHA에서 artifact와 checksum을
  다시 생성해야 하며 이번 Actions artifact를 공개 asset으로 재사용하지 않는다.

## 승인 요청

- Stage 4.6 exact workflow, baseline bundle과 native 수용 결과를 승인하면 Stage 5
  Go/No-Go 판정과 후속 게시 입력 확정으로 진행한다.
