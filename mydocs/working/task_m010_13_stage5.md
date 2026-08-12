# Task #13 Stage 5 보고서 — upstream-first 회귀 검증과 제품 문서 정렬

GitHub Issue: [#13](https://github.com/postmelee/alhangeul-tauri/issues/13)
구현계획서: [`task_m010_13_impl.md`](../plans/task_m010_13_impl.md)
Stage: 5

## 단계 목적

Stage 2~4에서 전환한 exact upstream Studio entry와 HWP/HWPX·직접 PDF native adapter를 플랫폼 중립 gate로 통합 검증한다. 남은 override가 12개 leaf adapter뿐이고 `legacy-upstream-copy`가 0개인지 확정하며, 공개 문서에는 소스에서 확인한 범위와 Windows/Linux Stage 6에서 아직 수용해야 할 범위를 구분해 기록한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `README.md` | HWP/HWPX 저장·형식 변환과 current page SVG 직접 PDF를 현재 기능에 반영하되 native 실행·PDF 검색 가능성·package 수용은 Stage 6 전까지 미완료라고 명시했다. upstream browser recovery 상속과 별도 native recovery store 부재도 구분했다. |
| `docs/architecture/UPSTREAM.md` | exact upstream Vite root/entry, 금지 shadow, 12개 leaf alias·0개 legacy copy, drift guard, embed handler와 `getPageSvg(page)` PDF 경계를 장기 계약으로 기록했다. Rust/native 검증은 Windows/Linux에서만 수행하도록 수용 기준을 정렬했다. |
| `docs/architecture/LOCAL_FONTS.md` | upstream font loader 재사용과 local provider 경계를 바로잡고, PDF 제한 폰트 fallback·`embed_text: true` 우선·명시적 outline fallback과 native 수용 대상을 기록했다. |
| `docs/operations/DESKTOP_RELEASE.md` | Task #13 이전 Task #9 candidate와 Task #11 artifact를 승계하지 않고 Stage 6 새 exact-SHA native 수용이 Go일 때만 #9 재개 입력으로 쓰는 조건을 확정했다. Stage 6 전 외부 상태 변경과 release 게시 금지를 명시했다. |
| `apps/desktop/src-tauri/tauri.conf.json` | bundle long description을 HWP/HWPX 저장과 PDF export가 구분되도록 현재 source 기능에 맞췄다. |
| `scripts/check-release-metadata.mjs`, `tests/release-metadata.test.mjs`, `package.json` | 구현계획서에 있었지만 현재 branch에 없던 읽기 전용 release metadata gate를 추가했다. 제품·version·bundle·HWP/HWPX association·updater 비활성 계약과 drift 거부를 `test:automation`에 연결했다. |
| `apps/studio-host/src/core/upstream-boundary.test.ts` | 남은 12개 override의 실제 replacement 파일이 각각 300 LOC 이하인지 검사하는 회귀 guard를 추가했다. |

## 본문 변경 정도 / 본문 무손실 여부

기존 공식 문서의 release 역사 증적, pin·갱신 절차, 폰트 root·라이선스 정책과 공개 배포 금지 경계는 삭제하거나 재작성하지 않았다. 현재 구현과 어긋난 HWPX 미지원·local font-loader 소유 설명만 교체하고, exact entry·PDF·Stage 6 후보 재생성 계약을 해당 기존 섹션에 최소 추가했다.

코드 동작 변경은 release metadata의 읽기 전용 검증과 override 크기 guard에 한정한다. Studio runtime·Rust save/PDF pipeline은 수정하지 않았다. 모든 leaf adapter는 300 LOC 이하이고 가장 큰 production adapter는 `local-fonts.ts` 260 LOC이므로 추가 분리는 필요하지 않았다.

## 검증 결과

실행 명령:

```bash
git diff --check
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:rhwp-pin
pnpm run check:release-metadata
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

결과:

- OK — `git diff --check`: whitespace error 0.
- OK — product boundary: 165 files scanned, violation 0.
- OK — product version: root·desktop package·Cargo manifest/lock·Tauri config 모두 `0.1.0`.
- OK — `rhwp` pin: Stable `v0.8.2`, resolved commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개 일치.
- OK — release metadata: `Alhangeul 0.1.0`, HWP/HWPX association·현재 long description·updater 비활성 계약 일치.
- OK — automation suite: 65 tests passed. 신규 metadata 정상·drift·updater·CLI test 5개를 포함한다.
- OK — upstream pin/baseline/update suite: 35 tests passed. exact Studio entry, upstream HWPX/PDF menu metadata, current SVG PDF 경계와 제거 shadow가 유지됐다.
- OK — Studio suite: 16 files, 62 tests passed. 12개 leaf alias, `legacy-upstream-copy` 0개와 adapter 300 LOC 상한이 통과했다.
- OK — TypeScript와 exact upstream Vite production build: 208 modules transformed, build completed.
- 미수행 — 지원 범위 규칙에 따라 macOS에서는 Rust unit test·Clippy·Tauri build와 Windows/Linux GUI/package 검증을 실행하지 않았다. 성공으로 간주하지 않고 Stage 6 필수 gate로 유지한다.
- 참고 — Vite가 CanvasKit browser externalization, Tauri API ineffective dynamic import와 500 kB 초과 chunk를 경고했으나 production build는 성공했다.

## 잔여 위험

- HWP/HWPX native same-format·cross-format save/reopen, 외부 변경·rollback과 PDF page/text/search/fallback/cleanup은 Windows/Linux exact SHA에서 아직 수용되지 않았다.
- `embed_text: true` 우선 계약은 자동 검증했지만 실제 한글 text extraction·선택·검색, font subset과 제한 폰트 시각 대체는 native artifact 증거가 없다.
- upstream browser recovery로 복원됐으나 native session이 없는 draft의 source save 연결은 별도 native recovery store를 제공하지 않는 현재 경계에서 아직 검증되지 않았다.
- Task #9 branch에는 더 넓은 prerelease metadata·checksum 검증 작업이 존재하므로 #13 handoff 때 두 checker 계약을 축소 없이 통합해야 한다.

## 다음 단계 영향

- Stage 6은 별도 승인 뒤 이 Stage 5 commit을 포함한 exact SHA만 `publish/task13`에 push하고 CI/native workflow를 dispatch한다.
- Windows x64 MSI·NSIS, Linux x64 AppImage·DEB·RPM과 Linux arm64 DEB를 새로 만들고 inventory·SHA-256과 승인된 GUI/save/PDF/package/rollback gate를 기록해야 한다.
- Stage 6 결과가 Go이기 전에는 과거 #9/#11 candidate를 재사용하거나 Task #9 prerelease 검증을 재개하지 않는다.
- release tag·GitHub Release·서명·package 게시·updater 활성화는 Stage 6에서도 수행하지 않는다.

## 승인 요청

- Stage 5 산출물과 검증 결과를 승인하면 Stage 6 Windows/Linux exact-SHA native 수용과 Task #9 handoff로 진행한다.
