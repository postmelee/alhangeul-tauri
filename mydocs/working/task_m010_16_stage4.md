# Task #16 Stage 4 보고서 — production key와 release 운영 통합

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
구현계획서: [`task_m010_16_impl.md`](../plans/task_m010_16_impl.md)
Stage: 4

## 단계 목적

Stage 3에서 정적으로 고정한 updater artifact·manifest 계약을 실제 production 공개키, repository
Secret 경계와 Windows/Linux exact-SHA 원격 빌드에 연결한다. 일반 artifact mode는 signing Secret
없이 Windows x64·Linux x64·Linux arm64를 계속 만들고, updater mode만 Windows x64 MSI·NSIS와
Linux x64 AppImage를 서명하도록 분리한다. `publish_release=false`에서도 최종 installer·`.sig`와
완전한 release inventory를 검증 증적으로 남기되 GitHub Release, tag와 Pages stable manifest는
생성하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/tauri.updater.conf.json` | production 공개키, stable HTTPS endpoint, `createUpdaterArtifacts: true`와 Windows passive install만 포함한 tracked release overlay 추가 |
| `.github/workflows/alhangeul-desktop.yml` | exact-SHA updater mode, release environment Secret 격리, 최종 installer·`.sig` 전용 slice와 게시 독립 read-only complete inventory job 추가 |
| `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs` | base/release config 분리, 공개키·endpoint·artifact·Windows install mode와 plugin pin drift를 fail-closed 검증 |
| `scripts/updater/release-config.mjs`, `tests/updater-release.test.mjs` | tracked overlay와 임시 test config의 updater artifact mode 정합성 및 filesystem 경계 보강 |
| `apps/desktop/src-tauri/src/updater/target.rs`, `target_tests.rs` | Windows host에서도 synthetic Linux AppImage 절대 경로를 host-independent하게 판정하고 relative path를 거부 |
| `tests/actions-workflows.test.mjs` | updater config path의 Windows shell 안전성, signing Secret 단일 사용, 최종 파일 slice, read-only inventory와 publish gate 계약 추가 |
| `docs/architecture/UPDATER.md` | Rust ownership, command/event/state, target 판정, dirty guard와 source→signature→manifest 신뢰 사슬 기록 |
| `docs/operations/DESKTOP_RELEASE.md` | key 보관·유실·rotation, Secret 책임, exact-SHA build, inventory read-back, no-rerun과 게시 순서 기록 |
| `site/updates/index.html` | 현재 unreleased 상태를 유지하면서 MSI·NSIS·AppImage의 향후 updater 지원 범위와 수동 fallback 문구 정렬 |
| `.gitignore` | repository 밖 key와 재생성 가능한 local updater 작업 산출물의 오추적 방지 보강 |
| `mydocs/orders/20260830.md` | Task #16을 Stage 4 완료·Stage 5 승인 대기로 갱신 |

Stage 4 source 변경은 Stage 3 commit `6040c9b` 이후 13개 파일, 496줄 추가·45줄 삭제다.
원격 Windows/Linux gate에서 발견한 원인마다 `[Stage 4.1]`~`[Stage 4.5]` 보정 commit을 만들었고,
원인 변경 없는 재실행이나 이미 공개한 commit의 history rewrite는 수행하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

코드·automation·운영 문서 작업이다. 일반 artifact mode의 세 platform matrix, Windows thumbnail
진단과 MSI·NSIS fresh-install smoke는 보존했다. base `tauri.conf.json`에는 updater endpoint,
공개키나 `createUpdaterArtifacts`를 넣지 않았고 signing Secret은 updater의 signed build step에서만
참조한다. private key와 password는 repository, workflow cache, Actions artifact, 문서와 로그에
기록하지 않았으며 Secret read-back도 시도하지 않았다.

현재 `site/release.json`은 version/tag/publishedAt null과 `manifestPublished=false`를 유지한다.
`_site/updater/stable.json`, GitHub Release `v0.1.0`과 같은 이름의 remote tag는 생성되지 않았다.
Pages 배포와 updater 활성화도 수행하지 않았다.

## 검증 결과

로컬 실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run build:pages
pnpm run check:pages
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

결과:

- OK — sandbox 격리 상태의 첫 install은 registry DNS와 non-TTY purge에서 중단됐고, 원인을
  network·CI 환경으로 한정한 뒤 `CI=true pnpm install --frozen-lockfile`로 재검증해 lockfile up to
  date와 dependency 변경 없음을 확인했다.
- OK — `Product boundary check passed (317 files scanned).`
- OK — 제품 version surface 전부 `0.1.0`, release metadata 검증 통과.
- OK — `Pages build completed: 11 source files, 2 root assets`,
  `Pages check passed: source=11, output=13`; stable updater manifest 미생성.
- OK — automation `320` tests, `320` pass, `0` fail.
- OK — upstream `35` tests, `35` pass, `0` fail.
- OK — studio `24` files·`111` tests 통과, production build 통과.
- OK — `git diff --check` 출력 없음.

Windows/Linux exact-SHA gate 기준 commit:

```text
fe797b5ac03cd84bf86aeb26e27ba7c58d9c71a8
```

일반 artifact run:

- OK — [run 33286473567](https://github.com/postmelee/alhangeul-tauri/actions/runs/33286473567),
  run number 141, exact head SHA 일치, conclusion `success`.
- OK — Windows x64 job `99190414846` 59m52s, Linux x64 job `99190414801` 14m41s,
  Linux arm64 job `99190414864` 8m55s.
- OK — Windows MSI·NSIS fresh-install smoke job `99196647937` 1m29s.
- OK — 일반 artifact 5개가 non-expired·non-zero이고 run exact SHA에 결속됨.
  Windows bundle `9725204487`, Linux x64 `9724743268`, Linux arm64 `9724681009`,
  Windows thumbnail 진단 `9724739953`, installer smoke 진단 `9725312368`.

비게시 updater run:

- OK — [run 33288874842](https://github.com/postmelee/alhangeul-tauri/actions/runs/33288874842),
  run number 142, exact head SHA 일치, `publish_release=false`, conclusion `success`.
- OK — signed Linux x64 job `99196855308` 10m59s, signed Windows x64 job `99196855384`
  22m27s, complete inventory job `99199112683` 23s.
- OK — publish job `99199159047`은 boolean gate에 의해 `skipped`.
- OK — updater artifact는 최종 AppImage+`.sig` 2개, MSI·NSIS+각 `.sig` 4개,
  complete inventory 1개만 포함하며 AppDir·library·private-key-like 중간 파일과 symlink가 없음.
- OK — Linux slice `9725440856`, Windows slice `9725569973`, inventory `9725575155`가
  non-expired·non-zero이고 run ID·repository ID·exact SHA에 결속됨.
- OK — 내려받은 세 slice를 workflow의 `merge-multiple: true` 구조로 재구성해 공개키로 서명을
  재검증했으며, 로컬 deterministic inventory와 원격 inventory가 byte 단위로 일치함.
- OK — key fingerprint
  `100c8f3183b25de3366574c46a1a2a66950a1d5f24862f3461c27b095713ffdd` 일치.
- OK — installer SHA-256 read-back:
  - AppImage: `63937fdc05d696a5afd0eaf60466b9ab24c0211b262ccc1358df254e0804a0e6`
  - MSI: `2dfb823dea947a6afcd46aee84b3e129ac681d203154df0117f93b1f2d2a3bff`
  - NSIS: `cb502affed4a3ea0b28bcb9c0d65363e1a6ca1956f1633b8ae4da2a992a92c61`
- OK — GitHub API에서 `v0.1.0` Release는 HTTP 404, remote tag 조회는 빈 결과이며
  source·output의 stable manifest도 없음.

원격 보정 이력:

- Windows에서 synthetic Linux `/tmp` path가 native absolute가 아니었던 실패는 host-independent
  target 판정과 relative path 회귀 테스트 추가 후 보정했다.
- Windows bash에서 config path backslash가 JavaScript string escape로 해석된 실패는
  `process.env.UPDATER_CONFIG` 전달로 보정했다.
- 첫 signed artifact read-back에서 Linux AppDir 중간 트리 포함과 비게시 mode inventory 누락을
  발견해 최종 installer·`.sig` glob과 게시 독립 read-only inventory job으로 보정했다.
- 각 원인 변경 뒤에만 새 exact SHA로 일반 mode와 updater mode를 실행했다.

## 잔여 위험

- MSI·NSIS·AppImage의 실제 설치본 `N → N+1`, download 뒤 dirty document 차단, restart,
  read-only AppImage, 변조·cross-format·network 실패는 아직 native 수용하지 않았다.
- production 공개키와 signing Secret 경계는 검증했지만 key 유실·rotation은 운영 절차만 고정한
  상태이며 실제 rotation drill은 수행하지 않았다.
- stable GitHub Release, tag, `site/release.json` 반영과 Pages `updater/stable.json` 게시를 하지
  않았으므로 현재 사용자 앱에는 updater가 활성화되지 않는다.

## 다음 단계 영향

- Stage 5 시작 전에 checkpoint D로 test용 N/N+1 SemVer, prerelease tag, endpoint와 공개 범위,
  종료 뒤 asset/tag 보존·삭제 방식을 별도 승인받아야 한다.
- Stage 5 test binary와 manifest는 production stable endpoint와 분리하며 이번 exact SHA와 같은
  production key·세 target inventory 계약을 사용한다.
- Stage 5 완료만으로 stable Release나 Pages를 게시하지 않는다. 최종 공개는 checkpoint E와 별도
  release 승인을 다시 받아야 한다.

## 승인 요청

- Stage 4 산출물과 exact-SHA 검증 결과를 승인하면 Stage 5 MSI·NSIS·AppImage 실제
  `N → N+1` 수용의 checkpoint D 제안으로 진행한다.
