# Task #7 Stage 4 보고서 — 플랫폼 중립 수용 검증

GitHub Issue: [#7](https://github.com/postmelee/alhangeul-tauri/issues/7)
구현계획서: [`task_m010_7_impl.md`](../plans/task_m010_7_impl.md)
Stage: 4

## 단계 목적

Stage 1에서 승인한 `0.1.0 재시작`이 제품 version surface, read-only verifier, CI/native workflow와 공개 문서에 같은 의미로 반영됐는지 교차 확인하고, Stage 1–3 결과에 대한 전체 platform-neutral 수용 검증을 수행한다.

현재 macOS host에서는 지원 범위 밖인 Windows/Linux native Rust test·Clippy와 Tauri build의 성공을 주장하지 않는다. 검증을 통과한 실행 가능 head와 한계를 고정해 Stage 5 exact-SHA Actions 검증의 입력 조건으로 넘긴다.

## 산출물

| 파일 또는 상태 | 변경 요약 |
|---|---|
| `mydocs/working/task_m010_7_stage4.md` | 명령별 수용 검증 결과, 기존 warning, 검증 한계와 Stage 5 canary 조건을 기록 |
| 검증 기준 source/workflow SHA | `1a74832b8e33fff1decbf3ef9d0c997d286624e7` |

Stage 4에서는 검증 실패 보정이 필요하지 않아 제품, workflow와 공개 문서를 수정하지 않았다.

## 교차 확인 결과

- root `package.json`, desktop `package.json`, Cargo manifest, Tauri config와 Cargo lock의 `alhangeul-desktop` entry가 모두 `0.1.0`으로 일치한다.
- `check:product-version`은 root version을 기준으로 다섯 surface의 strict SemVer와 exact match를 검증한다.
- CI와 native workflow는 dependency 설치와 제품 경계 검사 뒤, `rhwp`와 build 검사 전에 version gate를 실행한다.
- README, DEVELOPMENT, PROVENANCE와 DESKTOP_RELEASE는 `0.1.0`을 M010에서 승인한 독립 Alhangeul의 첫 source 기준선으로 설명한다.
- 같은 문서들은 `0.1.0`이 아직 공식 설치 파일, tag, GitHub Release나 updater를 뜻하지 않는다고 명시한다.
- 이전 제품과 Task #5의 `0.3.1` 증적은 출처·과거 native build smoke로만 보존되고 Alhangeul 공식 release 계보로 재분류되지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

- 본 Stage의 repository 변경은 이 단계 보고서 신규 작성뿐이다.
- `pnpm install --frozen-lockfile`은 lockfile과 tracked source를 변경하지 않았다.
- build 산출물은 기존 ignore 경계 안에 생성됐으며 tracked 제품·문서 diff를 만들지 않았다.
- `.github/workflows/pages.yml`은 `origin/devel` 대비 무변경이다.

검증된 source/workflow SHA는 `1a74832b8e33fff1decbf3ef9d0c997d286624e7`이다. 본 보고서를 묶은 Stage 4 commit은 이 SHA와 실행 가능 경로가 같고 보고서만 추가한다. 자기 자신을 포함하는 commit SHA는 보고서 작성 시점에 본문에 넣을 수 없으므로, Stage 5 remote canary에는 Stage 4 commit 완료 후 승인 handoff에 제시되는 clean `local/task7` HEAD 전체 SHA를 사용한다.

## 검증 결과

실행 명령:

```bash
pnpm install --frozen-lockfile
pnpm run check:product-version
pnpm run check:product-boundary
pnpm run check:rhwp-pin
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml --locked --offline --no-deps
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml --all -- --check
git diff --exit-code origin/devel -- .github/workflows/pages.yml
git diff --check
```

결과:

- OK — frozen lockfile 설치 완료, workspace 3개와 package 54개 정렬
- OK — 제품 version 다섯 surface가 모두 `0.1.0`으로 일치
- OK — 제품 경계 181개 파일 검사 통과
- OK — `rhwp v0.8.2`, resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`와 관리 artifact 6개 pin 일치
- OK — automation 36/36 통과
- OK — upstream 32/32 통과
- OK — Studio test 21개 파일, 114/114 통과
- OK — Studio TypeScript와 production build 성공
- OK — locked offline Cargo metadata가 `alhangeul-desktop@0.1.0`으로 성공
- OK — Rust format 검사 통과
- OK — Pages workflow가 `origin/devel` 대비 무변경
- OK — `git diff --check` 통과

### 환경 처리와 기존 warning

첫 frozen install 시도는 비대화형 terminal에서 기존 modules directory 재생성 확인을 받을 수 없어 `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`로 중단됐다. 같은 명령에 PTY를 제공한 재시도는 modules directory를 재생성하기 시작했지만 sandbox DNS 제한으로 registry 조회를 완료하지 못해 중단했다. 승인된 네트워크 경로에서 같은 frozen 명령을 다시 실행해 lockfile 변경 없이 캐시된 package 54개를 복원하고 성공 결과를 확보했다.

Studio build에는 기존과 같은 다음 warning이 있었지만 종료 코드는 0이었다.

- runtime에 해석되는 `/images/icon_small_ko_dark.svg`
- `@tauri-apps/api/core.js`의 static·dynamic import 혼합
- minify 후 500 kB를 넘는 일부 chunk

Cargo metadata에는 호환성을 위해 `--format-version`을 명시하라는 기존 권고가 출력됐지만 locked/offline metadata 생성은 성공했다. 구현계획서에 승인된 명령을 그대로 실행했으며 이번 Stage에서 warning 보정을 위한 범위 확장은 하지 않았다.

### 현재 host에서 실행하지 않은 검증

- `pnpm run test:desktop`
- `pnpm run clippy:desktop`
- `pnpm tauri build`

현재 host는 지원 대상이 아닌 macOS이므로 위 native 검증은 실행하지 않았다. Stage 5에서 같은 exact SHA의 Ubuntu CI와 Windows/Linux native artifact matrix 결과로 판정한다.

## 잔여 위험

- workflow 계약은 로컬 정적 automation test로 통과했지만 새 version gate를 포함한 GitHub-hosted runner 실행은 아직 없다.
- Windows/Linux About UI, installer 파일명의 `0.1.0` 반영과 실제 native bundle 생성은 아직 확인하지 않았다.
- Studio와 Cargo의 기존 warning은 이번 version 정렬로 새로 발생한 실패가 아니지만 별도 성능·구조 작업 없이 제거되지는 않았다.
- `0.1.0` 공식 release, installer 설치·실행, signing, tag, GitHub Release와 updater는 계속 검증·배포 범위 밖이다.

## 다음 단계 영향

- Stage 5는 이 보고서를 포함한 clean Stage 4 HEAD를 `publish/task7`에 push하고 local·remote 전체 SHA 일치를 먼저 확인한다.
- `Alhangeul CI`를 `publish/task7` ref에서 dispatch하고 event, branch, head SHA, conclusion과 `check:product-version` 성공을 확인한다.
- 선택값이 `0.1.0 재시작`이므로 같은 SHA를 `build_ref`로 사용해 Windows x64, Linux x64와 Linux arm64 native workflow를 실행한다.
- MSI·NSIS, AppImage·DEB·RPM과 arm64 DEB artifact를 임시 경로에 내려받아 동봉 inventory를 독립 재검증한다.
- canary 실패가 source나 workflow 보정을 요구하면 Stage 5 안에서 임의 수정하지 않고 구현계획서 변경 승인을 요청한다.
- canary 성공 뒤에는 실행 대상 경로를 바꾸지 않고 Stage 5 보고서와 운영 증적 문서만 추가한다.

## 승인 요청

- Stage 4의 platform-neutral 수용 검증, 실행 가능 SHA와 검증 한계를 승인하면 Stage 5 exact-SHA 원격 CI·Windows/Linux native 검증으로 진행한다.
