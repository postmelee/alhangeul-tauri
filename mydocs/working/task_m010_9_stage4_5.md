# Task #9 Stage 4.5 완료 보고서 — PR #18·#22 최신 devel 통합

GitHub Issue: [#9](https://github.com/postmelee/alhangeul-tauri/issues/9)
구현계획서: [`task_m010_9_impl.md`](../plans/task_m010_9_impl.md)
Stage: 4.5

## 단계 목적

과거 candidate `96938d476cf5f47f1c4e64f5930acc67f376caf9` 이후 merge된 Task #13
PR #18과 Task #15 PR #22를 Task #9 branch에 통합한다. upstream-first Studio,
HWP/HWPX 저장·PDF 내보내기와 Windows/Linux 시스템 인쇄 구현을 canonical 제품 구조로
계승하면서, Task #9의 공개 checksum 및 Linux 문서 연결 계약을 잃지 않는 것이 목적이다.

## 산출물

| 파일·영역 | 변경 요약 |
|---|---|
| 최신 `devel` merge 전체 | PR #18·#22의 검증된 제품 코드·문서·테스트와 merge cleanup을 계승 |
| `apps/desktop/src-tauri/tauri.conf.json` | HWP/HWPX 저장 설명, PDF font license resource와 print CSP를 유지하고 DEB·RPM 공통 desktop template을 결합 |
| `apps/desktop/src-tauri/linux/main.desktop` | AppImage·DEB·RPM launcher의 `Exec={{exec}} %F`와 HWP/HWPX MIME 계약 유지 |
| `scripts/check-release-metadata.mjs` | 최신 product version·HWPX metadata guard에 Linux template 일반 파일·경로·내용 검증 결합 |
| `scripts/create-release-checksums.mjs` | Windows/Linux 공개 installer의 결정적 `SHA256SUMS` 생성 계약 유지 |
| `tests/linux-desktop-entry.test.mjs` | `%F` 누락·중복·URL field code와 MIME 누락 거부 |
| `tests/release-metadata.test.mjs` | HWPX metadata와 DEB·RPM template drift를 같은 fixture에서 거부 |
| `tests/release-checksums.test.mjs` | installer allowlist·정렬·중복·빈 파일·unsupported 입력 검증 유지 |
| `package.json` | checksum 명령과 세 release test를 최신 automation suite에 연결 |
| Task #9 계획·증적·오늘할일 | 과거 candidate 폐기와 Stage 4.5/4.6 승인 경계를 기록 |

## 본문 변경 정도 / 본문 무손실 여부

PR #18의 upstream v0.8.2 전체 Studio bundle과 얇은 Tauri adapter 경계를 보존했다. 충돌한
과거 `apps/studio-host/index.html`, 자체 toolbar/view 구현과 `tests/studio-shell.test.mjs`는
복원하지 않았다. form control 한글 fallback, CSP 초기 숨김과 print surface CSS는 최신
`apps/studio-host/src/style.css` 하나에 유지된다.

Task #9에서 실제 native artifact로 검증했던 Linux `%F` launcher와 checksum 생성기는
제품 UI 구현과 독립된 prerelease 계약이므로 보존했다. release metadata checker는 PR #18의
HWPX 저장 설명과 product version canonical guard를 기준으로 삼고 Linux template 검사만
합성했다. `third_party/rhwp` source와 gitlink는 수정하지 않았다.

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
git diff --check
```

결과:

- OK — `pnpm install --frozen-lockfile`: lockfile 변경 없이 workspace 3개 package 설치.
- OK — product boundary 189 files, 제품 version surface 5개 모두 `0.1.0`.
- OK — release metadata: HWP/HWPX 저장 설명, Windows template, Linux DEB·RPM 공통
  template와 updater 비활성 계약 통과.
- OK — rhwp pin: Stable `v0.8.2`, resolved commit
  `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — automation 84/84. Linux `%F` desktop entry 5건, release checksum 6건과 최신
  product version·release metadata·workflow·Windows packaging 계약을 포함한다.
- OK — upstream 35/35. upstream-first Studio, HWPX/PDF leaf override와 system print
  경계 및 pin/update fixture를 포함한다.
- OK — Studio 21 files, 97/97 tests.
- OK — TypeScript와 Vite production build, 213 modules. CanvasKit browser
  externalization, ineffective dynamic import와 500 kB chunk 경고는 기존 비차단 경고다.
- OK — `git diff --check`, conflict marker 0건, submodule gitlink
  `9b16aa9e…` 유지.

## 잔여 위험

- 현재 host는 지원 범위 밖 macOS이므로 Windows/Linux Rust test·Clippy·Tauri build와 GUI
  성공을 Stage 4.5 결과로 주장하지 않는다.
- `96938d4…` artifact와 PR #18·#22의 서로 다른 exact 후보는 최신 통합 commit의 artifact가
  아니다. 공개 prerelease Go 판정에 재사용할 수 없다.
- remote `publish/task9`은 아직 Stage 4.5 commit을 가리키지 않으며 Actions도 dispatch하지
  않았다.

## 다음 단계 영향

- Stage 4.5 commit 승인 뒤에만 `publish/task9`을 이동하고 새 exact SHA에서 CI와
  Windows x64·Linux x64·Linux arm64 artifact workflow를 실행한다.
- 새 artifact inventory와 `SHA256SUMS`, Windows/Linux native 설치·GUI·rollback 수용 결과를
  Stage 4.6에서 기록한다.
- Stage 4.6 완료 전 Task #9는 No-Go이며 tag·Release·main PR·asset 게시를 수행하지 않는다.

## 승인 요청

- Stage 4.5 산출물과 플랫폼 중립 검증 결과를 승인하면 Stage 4.6 exact-SHA 후보 생성과
  Windows/Linux native 재검증으로 진행한다.
