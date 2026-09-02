# Task #50 Stage 6 보고서 — PR 리뷰 package lifecycle·evidence 보정

GitHub Issue: [#50](https://github.com/postmelee/alhangeul-tauri/issues/50)
구현계획서: [`task_m010_50_impl.md`](../plans/task_m010_50_impl.md)
Stage: 6

## 단계 목적

PR #52 리뷰 `issuecomment-5504713215`의 7개 지적을 제품 동작과 검증 근거에
반영한다. install과 remove hook의 의존성 경계를 분리하고, 실제 stale MIME
cache·명시적 복구·dependency 없는 DEB purge를 package lifecycle로 만든다.
shared-mime-info 2.5 원본 fixture와 MIME subtree allowlist로 canary와 archive
계약의 독립성을 강화하고, 최종 source/native/GUI evidence chain을 다시 수용한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/linux/update-mime-database-remove.sh` | remove 전용 dependency-tolerant MIME refresh hook 추가 |
| `apps/desktop/src-tauri/tauri.conf.json` | DEB/RPM post-remove만 새 hook에 연결 |
| `tests/fixtures/shared-mime-info-2.5-hwpx.xml` | upstream 2.5 HWPX 정의를 독립 fixture로 고정 |
| `scripts/linux-thumbnail-mime-contract.mjs`, `scripts/linux-thumbnail-mime-smoke.sh` | 실제 upstream 세대 canary와 executable mode 정렬 |
| `scripts/linux-thumbnail-package-contract.mjs` | MIME subtree allowlist와 format별 lifecycle 계약 강화 |
| `scripts/linux-thumbnail-package-fixtures.mjs` | 실제 제품 파일 기반 refresh fixture와 제한 PATH 생성 |
| `scripts/linux-thumbnail-package-smoke.mjs` | stale refresh, Debian trigger 복구, purge-without-command 전이 구현 |
| `scripts/verify-linux-thumbnail-package-evidence.mjs` | stale cache·purge·format별 transition을 required evidence로 판정 |
| `tests/desktop-artifacts.test.mjs`, `tests/linux-thumbnail-mime.test.mjs`, `tests/linux-thumbnail-packaging.test.mjs` | archive, hook, upstream fixture와 cross-platform mode 음성 계약 추가 |
| `docs/architecture/LINUX_THUMBNAILS.md`, `docs/operations/DESKTOP_RELEASE.md` | hook 경계, magic 한계와 최종 Stage 6 evidence chain 정렬 |
| `mydocs/plans/task_m010_50.md`, `mydocs/plans/task_m010_50_impl.md`, `mydocs/orders/20260902.md` | 승인 범위, 단계 계획과 진행 상태 기록 |

## 본문 변경 정도 / 본문 무손실 여부

제품 renderer, 공유 `document-preview`, Windows handler, `third_party/rhwp`와
실사용 fixture 원본은 변경하지 않았다. Linux package hook과 검증 producer/
consumer만 보정했고, 기존 공식 문서의 Stage 4·최신 `devel` 통합 이력은 보존한
채 Stage 6 최종 chain을 추가했다.

## 검증 결과

실행 명령:

```bash
node --test tests/linux-thumbnail-mime.test.mjs tests/linux-thumbnail-packaging.test.mjs tests/desktop-artifacts.test.mjs
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
shellcheck apps/desktop/src-tauri/linux/update-mime-database.sh apps/desktop/src-tauri/linux/update-mime-database-remove.sh scripts/linux-thumbnail-mime-smoke.sh scripts/linux-thumbnail-package-smoke.sh
git diff --check
```

결과:

- OK — 대상 Node test **48 pass**, 전체 automation **413 pass**, 제품 경계
  **332 files scanned**.
- OK — upstream **36 pass**, Studio **23 files / 125 pass**, production build
  **228 modules transformed**. 첫 Studio 실행의 `EPERM`은 격리 worktree
  `.vite-temp` 쓰기를 막은 host sandbox 결과였고, 동일 명령을 worktree 쓰기
  권한으로 재실행해 통과했다.
- OK — 두 refresh hook과 MIME/package wrapper ShellCheck, `git diff --check`.
- OK — exact source `dbf09404e8b2e4fd07f510ddc60329e71a596643`의
  [native run 33607431684](https://github.com/postmelee/alhangeul-tauri/actions/runs/33607431684):
  Linux x64·arm64, Windows x64와 fresh MSI/NSIS smoke **4개 job 전체 성공**.
- OK — x64 DEB/RPM과 arm64 DEB에서 XML이 배치됐지만 glob/magic cache는
  `application/zip`인 실제 refresh failure를 관측했다. DEB는
  `shared-mime-info` trigger를 정상 PATH에서 복구한 뒤 candidate reinstall로
  `application/x-hwpx`를 회복했고, dependency command가 없는 purge도 성공했다.
- OK — 같은 source/native run을 입력한
  [GUI run 33610310800](https://github.com/postmelee/alhangeul-tauri/actions/runs/33610310800):
  Ubuntu 22.04 x64의 Nautilus·Thunar 및 제품 GUI 전체 성공. 두 manager 모두
  온새미로 HWP·form-002 HWPX의 first/cached/changed 호출이 각각 2/2/4였고,
  손상 문서 성공 cache PNG는 0개였다.
- OK — 실사용 512 px render SHA-256은 온새미로
  `2a499693e01e811eff49c6aff3102720945ae54c00d75bb102e56cbdd94a8abf`,
  form-002
  `35bd3ce2d05def6bf9ad525bc2a0a5b62f30ad3e1eb7c208e085a9e01a7be8ee`로
  이전 수용본과 동일했다.

| 최종 artifact | ID | archive SHA-256 |
|---|---:|---|
| `alhangeul-desktop-linux-x64` | `9838398934` | `894e30e3f8263030973e132902b1ee06cb2026639f7d770036ba93785f43576b` |
| `alhangeul-linux-x64-thumbnail-package` | `9838383469` | `fd5b04a91463658eb215bfd493857378773947705dbc43abe0255cea5c8ecfa5` |
| `alhangeul-desktop-linux-arm64` | `9838079862` | `b6eee9f4ac431327574949662e8d1cf6f8af1faab43d7d712f4305135db736fc` |
| `alhangeul-linux-arm64-thumbnail-package` | `9838076153` | `8e77e197aa61c6c040bb171d56c1d00e8cd83221ff52d05834a78e39c539f50e` |
| `alhangeul-desktop-windows-x64` | `9838574457` | `a286da318cc91dd635ebfe9352f31bcfc2cfbaf5359b7a5686dfe8a74e350e78` |
| `alhangeul-desktop-windows-x64-installer-smoke` | `9838661554` | `27d4d8405a93045a950606cd9698a0f9f51d3156f053090995b2627aabe79a5c` |
| `alhangeul-linux-gui-33610310800` | `9838928525` | `1e3dcf66d04d5c249925392234f87845d2330048c7a656f323e62dd816c92f11` |

진단 실행은 수용 근거에서 제외했다. Run `33595872896`은 Windows host의 POSIX
mode 판정과 과도하게 비운 DEB PATH를 발견했고, run `33605957600`은 stale cache
주입 성공 뒤 Debian `shared-mime-info` pending trigger 상태 복구 누락을 발견해
중단했다. 잘못 확장한 SHA 입력으로 시작한 run `33605922043`은 즉시 취소했다.

## 잔여 위험

- GUI 수용은 Ubuntu 22.04 x64의 Nautilus 42.6, Thunar/Tumbler 4.16과
  shared-mime-info 2.1 조합에 한정한다.
- x64 RPM은 Ubuntu runner의 `rpm --nodeps` transaction이며 Fedora dependency
  resolution이나 RPM GUI 근거가 아니다.
- Linux arm64 GUI, KDE/Dolphin, AppImage, Flatpak과 Snap은 검증하지 않았다.
- HWPX magic은 pin corpus의 비표준 ZIP 배치 18개를 직접 식별하지 못하며 정상
  `.hwpx` 확장자에서는 glob이 canonical type을 제공한다.
- Actions artifact는 임시 보존되며 공개 배포물이나 release가 아니다.

## 다음 단계 영향

- Stage 6 구현과 수용은 완료됐다. PR #52 본문과 리뷰 응답을 최종 chain으로
  정렬한 뒤 작업지시자가 merge 여부를 판단한다.
- merge, release, package 게시와 Issue #50 close는 이 단계 승인에 포함하지 않는다.

## 승인 요청

- Stage 6 산출물과 검증 결과를 승인하면 PR #52의 merge 판단으로 진행한다.
